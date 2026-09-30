# backend/api/routes/coaching.py
# Real-time confidence coaching over a WebSocket. The browser sends each
# typed snapshot or recorded clip as it happens, and gets back live pace,
# filler and confidence feedback without a new HTTP request each time.

import json

import structlog
from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from api import services
from api.deps import limiter, require_user_id
from api.errors import APIError
from auth import create_ws_ticket, decode_ws_ticket
from database import db_session
from engines.confidence_coach import CoachingFeedback, ConfidenceCoach
from models import InterviewSession

logger = structlog.get_logger()
router = APIRouter(tags=["coaching"])


MAX_AUDIO_CHUNK_BYTES = 5 * 1024 * 1024   # ~5 minutes of opus audio
MAX_TEXT_CHUNK_CHARS = 20000              # same cap as a submitted answer


def _owns_session(session_id: int, user_id: int) -> bool:
    with db_session() as db:
        return db.query(InterviewSession.id).filter(
            InterviewSession.id == session_id,
            InterviewSession.user_id == user_id
        ).first() is not None


def _payload(feedback: CoachingFeedback) -> dict:
    return {
        "confidence_score": feedback.confidence_score,
        "words_per_minute": feedback.words_per_minute,
        "pace_source": feedback.pace_source,
        "fillers_found": feedback.fillers_found,
        "filler_count": feedback.filler_count,
        "word_count": feedback.word_count,
        "suggestion": feedback.suggestion,
    }


@router.post("/ws/coaching/{session_id}/ticket")
@limiter.limit("30/minute")
def issue_coaching_ticket(session_id: int, request: Request, user_id: int = Depends(require_user_id)):
    """One-minute ticket to open the coaching socket for this session."""
    if not _owns_session(session_id, user_id):
        raise APIError(404, "Session not found")
    return {"ticket": create_ws_ticket(user_id, session_id)}


@router.websocket("/ws/coaching/{session_id}")
async def coaching_websocket(websocket: WebSocket, session_id: int, ticket: str = None):
    user_id = decode_ws_ticket(ticket, session_id) if ticket else None
    # Ownership is re-checked even with a valid ticket: the session may have
    # been deleted in the minute since it was issued.
    if not user_id or not await run_in_threadpool(_owns_session, session_id, user_id):
        await websocket.close(code=1008)  # 1008 = policy violation
        return

    # Every blocking call below (DB, Whisper, replay writes) goes through
    # run_in_threadpool. This handler runs ON the event loop — a
    # transcription run inline would freeze every other user's requests.
    await websocket.accept()
    coach = ConfidenceCoach()
    # Typed snapshots arrive on every typing pause and each carries the whole
    # answer, so only moments that changed the advice are kept in the replay
    # (an intervention, or a new suggestion) — not one copy per pause.
    last_logged_suggestion = None
    logger.info("websocket_connected", session_id=session_id, user_id=user_id)

    async def log_moment(source: str, text: str, payload: dict):
        # Persist to the replay, so coaching_moments shows what was said live.
        await run_in_threadpool(services.replay_system.log_event, session_id, "coaching_feedback", {
            "source": source, "text": text, **payload,
        })

    try:
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                raise WebSocketDisconnect(message.get("code", 1000))

            # Audio path: one complete recording (webm/ogg) per message.
            if message.get("bytes"):
                audio_bytes = message["bytes"]
                if len(audio_bytes) > MAX_AUDIO_CHUNK_BYTES:
                    await websocket.send_json({"type": "error", "message": "Audio chunk too large"})
                    continue

                transcript = await run_in_threadpool(services.transcriber.transcribe, audio_bytes)
                if transcript.text:
                    payload = _payload(coach.analyze_spoken(transcript.text, transcript.audio_seconds))
                    await websocket.send_json({"type": "transcription", "text": transcript.text, **payload})
                    await log_moment("audio", transcript.text, payload)

            # Text path: the whole typed answer so far.
            elif message.get("text"):
                try:
                    data = json.loads(message["text"])
                except json.JSONDecodeError:
                    await websocket.send_json({"type": "error", "message": "Malformed message"})
                    continue
                msg_type = data.get("type")

                if msg_type == "text_chunk":
                    snapshot = str(data.get("text", ""))[:MAX_TEXT_CHUNK_CHARS]
                    if snapshot.strip():
                        feedback = coach.analyze_typed(snapshot)
                        intervention = None
                        if data.get("pause_detected") and feedback.confidence_score < 5:
                            intervention = "Take a breath. Start with: 'The approach I'd take is...'"
                        payload = {**_payload(feedback), "intervention": intervention}
                        await websocket.send_json({"type": "coaching_update", **payload})
                        if intervention or feedback.suggestion != last_logged_suggestion:
                            last_logged_suggestion = feedback.suggestion
                            await log_moment("text", snapshot, payload)

                elif msg_type == "reset":
                    # The frontend sends this when the next question starts.
                    coach.reset()
                    last_logged_suggestion = None
                    await websocket.send_json({"type": "reset_ack"})

                elif msg_type == "ping":
                    await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        logger.info("websocket_disconnected", session_id=session_id, user_id=user_id)
    except Exception as e:
        logger.error("websocket_error", session_id=session_id, user_id=user_id, error=str(e))
        try:
            # Generic message only — raw exception text can leak internals.
            await websocket.send_json({"type": "error", "message": "Coaching connection error"})
            await websocket.close(code=1011)
        except Exception:
            pass
