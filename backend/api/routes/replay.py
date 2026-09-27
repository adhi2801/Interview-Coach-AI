# backend/api/routes/replay.py
# Session replays and ending a session.

import structlog
from fastapi import APIRouter, Depends

from api import services
from api.deps import require_user_id
from api.errors import APIError
from database import SessionLocal
from models import InterviewSession
from timeutil import utcnow

logger = structlog.get_logger()
router = APIRouter(tags=["replay"])


@router.get("/replay/{session_id}")
def get_replay(session_id: int, user_id: int = Depends(require_user_id)):
    db = SessionLocal()
    try:
        session_record = db.query(InterviewSession).filter(
            InterviewSession.id == session_id,
            InterviewSession.user_id == user_id
        ).first()
        if not session_record:
            raise APIError(404, "Replay not found")
    finally:
        db.close()

    return services.replay_system.get_replay(session_id)


@router.get("/replays")
@router.get("/replay/{session_id}/list")  # legacy path, kept for old clients
def list_replays(user_id: int = Depends(require_user_id)):
    db = SessionLocal()
    try:
        own_session_ids = [
            sid for (sid,) in db.query(InterviewSession.id).filter(
                InterviewSession.user_id == user_id
            ).all()
        ]
    finally:
        db.close()

    # Previously loaded EVERY user's replay manifest (full event logs
    # included) and filtered in Python — now only this user's rows are read.
    return {"replays": services.replay_system.list_replays(session_ids=own_session_ids)}


@router.post("/replay/{session_id}/end")
def end_session(session_id: int, user_id: int = Depends(require_user_id)):
    """
    Marks an InterviewSession as ended — the only place ended_at ever
    gets set. Called by the frontend's handleFinish() on both a normal
    "End Session" and an "Abort". Idempotent: if it's already ended,
    calling it again is a harmless no-op rather than an error.
    """
    db = SessionLocal()
    try:
        session_record = db.query(InterviewSession).filter(
            InterviewSession.id == session_id,
            InterviewSession.user_id == user_id
        ).first()
        if not session_record:
            raise APIError(404, "Session not found")

        if not session_record.ended_at:
            session_record.ended_at = utcnow()
            db.commit()
            # The replay manifest has its own ended_at, which nothing ever
            # set — so every replay reported the session as still running.
            services.replay_system.end_recording(session_id)

        return {"status": "ended", "ended_at": session_record.ended_at.isoformat()}
    finally:
        db.close()
