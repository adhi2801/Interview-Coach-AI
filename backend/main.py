from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db, create_tables, SessionLocal
from models import InterviewSession, Answer, Topic, ScoringJob
from dotenv import load_dotenv
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from engines.adaptive_difficulty import AdaptiveDifficultyEngine
from engines.scoring import MultiDimensionalScorer
from engines.company_dna import CompanyDNAEngine
from engines.knowledge_graph import KnowledgeGapGraph
from engines.confidence_coach import ConfidenceCoach
from engines.peer_comparison import PeerComparisonEngine
from engines.replay_system import ReplaySystem
from auth import hash_password, verify_password, create_access_token, decode_access_token
from content_filter import contains_profanity, sanitize_for_storage
from models import User
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int | None:
    """
    Extracts the user_id from a JWT token if present.
    Returns None if no token is provided — endpoints can still work
    for anonymous/guest use, but will personalize when a token exists.
    """
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return None
    return payload.get("user_id")
import os
import structlog
import logging

load_dotenv()

# Structured logging: every log line is now a parseable JSON object
# with consistent fields, instead of plain print() strings.
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer()
    ]
)
logger = structlog.get_logger()
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="InterviewCoach AI", version="1.0.0")

# Rate limiter: protects the Anthropic API budget by capping how many
# requests a single IP can make per time window.
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.up.railway.app"],
    allow_origin_regex=r"https://.*\.up\.railway\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class StartSessionRequest(BaseModel):
    user_name: str
    company: str
    role: str
    elo: float = 1200.0

class SubmitAnswerRequest(BaseModel):
    session_id: int
    question: str
    answer: str
    difficulty: int
    elo: float
    company: str = None

class CoachTextRequest(BaseModel):
    text: str
    session_id: int

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

# Engine instances
difficulty_engine = AdaptiveDifficultyEngine()
scorer = MultiDimensionalScorer()
company_engine = CompanyDNAEngine()
gap_engine = KnowledgeGapGraph()
peer_engine = PeerComparisonEngine()
replay_system = ReplaySystem()

@app.on_event("startup")
def startup():
    print("Application started — schema managed by Alembic migrations")

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "InterviewCoach AI is running"}

@app.get("/")
def root():
    return {"message": "Welcome to InterviewCoach AI"}

@app.get("/companies")
def list_companies():
    return {"companies": company_engine.list_companies()}

@app.post("/auth/signup")
def signup(payload: SignupRequest):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            return {"error": "An account with this email already exists"}

        user = User(
            email=payload.email,
            name=payload.name,
            hashed_password=hash_password(payload.password),
            elo_rating=1200.0
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token({"user_id": user.id, "email": user.email})
        logger.info("user_signed_up", user_id=user.id, email=user.email)

        return {
            "access_token": token,
            "user": {"id": user.id, "email": user.email, "name": user.name, "elo_rating": user.elo_rating}
        }
    finally:
        db.close()


@app.post("/auth/login")
def login(payload: LoginRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == payload.email).first()
        if not user or not verify_password(payload.password, user.hashed_password):
            return {"error": "Invalid email or password"}

        token = create_access_token({"user_id": user.id, "email": user.email})
        logger.info("user_logged_in", user_id=user.id)

        return {
            "access_token": token,
            "user": {"id": user.id, "email": user.email, "name": user.name, "elo_rating": user.elo_rating}
        }
    finally:
        db.close()

@app.post("/session/start")
@limiter.limit("10/minute")
def start_session(payload: StartSessionRequest, request: Request, user_id: int = Depends(get_current_user_id)):
    logger.info("session_start_requested", company=payload.company, role=payload.role, user_id=user_id)

    db = SessionLocal()
    try:
        session_record = InterviewSession(
            user_id=user_id,
            company_target=payload.company,
            role=payload.role,
            difficulty_level=min(10, max(1, int((payload.elo - 800) / 100)))
        )
        db.add(session_record)
        db.commit()
        db.refresh(session_record)
        new_session_id = session_record.id
    finally:
        db.close()

    replay_system.start_recording(
        session_id=new_session_id,
        user_name=payload.user_name,
        company=payload.company,
        role=payload.role
    )
    question = difficulty_engine.select_question(
        elo=payload.elo,
        company=payload.company,
        role=payload.role
    )
    difficulty = min(10, max(1, int((payload.elo - 800) / 100)))
    replay_system.log_event(new_session_id, "question_asked", {"text": question})

    return {
        "session_id": new_session_id,
        "question": question,
        "difficulty": difficulty,
        "company_profile": company_engine.get_profile(payload.company)
    }

def process_answer_scoring(job_id: int, payload: SubmitAnswerRequest):
    """
    Runs in the background. Does all the heavy work — Claude scoring,
    gap detection, peer comparison, ELO update — without blocking
    the original HTTP request.
    """
    db = SessionLocal()
    try:
        has_profanity = contains_profanity(payload.answer)
        clean_answer = sanitize_for_storage(payload.answer) if has_profanity else payload.answer

        scores = scorer.score(question=payload.question, answer=clean_answer)
        if has_profanity:
            scores["overall_summary"] = (
                "Your answer contained inappropriate language and could not be evaluated. "
                "Please provide a professional response to receive accurate feedback. " + scores.get("overall_summary", "")
            )

        technical_score = scores["score_technical"]
        overall = round((
            scores["score_technical"] + scores["score_communication"] +
            scores["score_problem_solving"] + scores["score_cultural_fit"] +
            scores["score_confidence"]
        ) / 5, 1)

        gaps = gap_engine.extract_gaps(
            question=payload.question, answer=clean_answer,
            technical_score=technical_score, company=payload.company
        )
        peer = peer_engine.get_percentile(your_score=overall, difficulty=payload.difficulty)
        new_elo = difficulty_engine.update_elo(
            current_elo=payload.elo, question_difficulty=payload.difficulty, score=overall
        )

        replay_system.log_event(payload.session_id, "answer_submitted", {"text": clean_answer})
        replay_system.log_event(payload.session_id, "scores_calculated", scores)
        replay_system.log_event(payload.session_id, "gaps_identified", gaps)

        session_record = db.query(InterviewSession).filter(InterviewSession.id == payload.session_id).first()
        if not session_record:
            session_record = InterviewSession(
                id=payload.session_id, difficulty_level=payload.difficulty,
                company_target=payload.company or "unknown", role="unknown"
            )
            db.add(session_record)
            db.commit()

        answer_record = Answer(
            session_id=payload.session_id, question_text=payload.question, answer_text=clean_answer,
            score_technical=scores["score_technical"], score_communication=scores["score_communication"],
            score_problem_solving=scores["score_problem_solving"], score_cultural_fit=scores["score_cultural_fit"],
            score_confidence=scores["score_confidence"], gaps_identified=gaps
        )
        db.add(answer_record)
        db.commit()
        db.refresh(answer_record)

        next_question = difficulty_engine.select_question(elo=new_elo, company="Google", role="Software Engineer")
        replay_system.log_event(payload.session_id, "question_asked", {"text": next_question})

        result = {
            "scores": scores, "overall_score": overall, "gaps": gaps,
            "peer_comparison": peer, "new_elo": new_elo,
            "next_question": next_question, "answer_id": answer_record.id
        }

        job = db.query(ScoringJob).filter(ScoringJob.id == job_id).first()
        job.status = "done"
        job.result = result
        db.commit()
        logger.info("scoring_job_completed", job_id=job_id, session_id=payload.session_id)

    except Exception as e:
        logger.error("scoring_job_failed", job_id=job_id, error=str(e))
        job = db.query(ScoringJob).filter(ScoringJob.id == job_id).first()
        if job:
            job.status = "failed"
            db.commit()
    finally:
        db.close()


@app.post("/answer/submit")
@limiter.limit("20/minute")
def submit_answer(payload: SubmitAnswerRequest, background_tasks: BackgroundTasks, request: Request, user_id: int = Depends(get_current_user_id)):
    logger.info("answer_submitted", session_id=payload.session_id, difficulty=payload.difficulty, user_id=user_id)

    db = SessionLocal()
    try:
        job = ScoringJob(session_id=payload.session_id, status="processing")
        db.add(job)
        db.commit()
        db.refresh(job)
        job_id = job.id
    finally:
        db.close()

    background_tasks.add_task(process_answer_scoring, job_id, payload)

    return {"job_id": job_id, "status": "processing"}


@app.get("/answer/status/{job_id}")
def get_scoring_status(job_id: int):
    db = SessionLocal()
    try:
        job = db.query(ScoringJob).filter(ScoringJob.id == job_id).first()
        if not job:
            return {"status": "not_found"}
        if job.status == "done":
            return {"status": "done", **job.result}
        return {"status": job.status}
    finally:
        db.close()

@app.post("/coach/analyze")
def analyze_text(request: CoachTextRequest):
    coach = ConfidenceCoach()
    feedback = coach.analyze_text(request.text)
    replay_system.log_event(request.session_id, "coaching_feedback", {
        "suggestion": feedback.suggestion,
        "wpm": feedback.words_per_minute,
        "confidence": feedback.confidence_score,
        "fillers": feedback.fillers_found
    })
    return {
        "confidence_score": feedback.confidence_score,
        "words_per_minute": feedback.words_per_minute,
        "fillers_found": feedback.fillers_found,
        "suggestion": feedback.suggestion
    }

@app.get("/replay/{session_id}")
def get_replay(session_id: int):
    return replay_system.get_replay(session_id)

@app.get("/replay/{session_id}/list")
def list_replays():
    return {"replays": replay_system.list_replays()}
class FeedbackRatingRequest(BaseModel):
    answer_id: int
    helpful: bool

@app.post("/feedback/rate")
def rate_feedback(payload: FeedbackRatingRequest):
    db = SessionLocal()
    try:
        answer = db.query(Answer).filter(Answer.id == payload.answer_id).first()
        if answer:
            answer.feedback_helpful = 1 if payload.helpful else 0
            db.commit()
            logger.info("feedback_rated", answer_id=payload.answer_id, helpful=payload.helpful)
        return {"status": "ok"}
    finally:
        db.close()

@app.get("/study-plan/{topic_name}")
def get_study_plan(topic_name: str, company: str = None):
    """
    Returns the full prerequisite chain for a topic, with company
    relevance weighting if a company is specified.
    """
    path = gap_engine.get_full_study_path(topic_name)

    db = SessionLocal()
    try:
        steps = []
        for step_name in path:
            topic = db.query(Topic).filter(Topic.name == step_name).first()
            if not topic:
                continue
            weight = gap_engine._get_company_weight(db, topic.id, company)
            steps.append({
                "name": step_name,
                "category": topic.category,
                "difficulty": topic.difficulty_level,
                "description": topic.description,
                "company_relevance": weight
            })
        return {"topic": topic_name, "company": company, "steps": steps}
    finally:
        db.close()
# --- WebSocket: Real-Time Confidence Coaching ---
# This replaces the manual "Analyze Confidence" button.
# The browser sends each typed/spoken chunk as it happens,
# and we push back live WPM, filler word count, and suggestions
# WITHOUT a new HTTP request each time.

import json

import whisper
import tempfile
import os as os_module

# Load Whisper once at startup, not per-connection — loading takes ~15s
# and we don't want every new WebSocket connection to pay that cost.
print("Loading Whisper model for live transcription...")
whisper_model = whisper.load_model("small")
print("Whisper model ready")

@app.websocket("/ws/coaching/{session_id}")
async def coaching_websocket(websocket: WebSocket, session_id: int):
    await websocket.accept()
    coach = ConfidenceCoach()
    print(f"WebSocket connected for session {session_id}")

    try:
        while True:
            message = await websocket.receive()
            print(f"DEBUG: Received message keys: {list(message.keys())}, type: {message.get('type')}")

            # Audio path: browser sends raw audio bytes (webm/wav chunk)
            if "bytes" in message and message["bytes"]:
                audio_bytes = message["bytes"]

                debug_path = os_module.path.join(os_module.getcwd(), "debug_last_chunk.webm")
                with open(debug_path, "wb") as f:
                    f.write(audio_bytes)
                print(f"DEBUG: Saved audio chunk, size = {len(audio_bytes)} bytes, to {debug_path}")

                with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
                    f.write(audio_bytes)
                    temp_path = f.name

                try:
                    result = whisper_model.transcribe(temp_path, fp16=False)
                    transcribed_text = result["text"].strip()
                    print(f"DEBUG: Whisper transcribed: '{transcribed_text}'")
                finally:
                    os_module.remove(temp_path)

                if transcribed_text:
                    feedback = coach.analyze_text(transcribed_text)
                    await websocket.send_json({
                        "type": "transcription",
                        "text": transcribed_text,
                        "confidence_score": feedback.confidence_score,
                        "words_per_minute": feedback.words_per_minute,
                        "fillers_found": feedback.fillers_found,
                        "suggestion": feedback.suggestion
                    })

            # Text path: typed answer
            elif "text" in message and message["text"]:
                data = json.loads(message["text"])
                msg_type = data.get("type")

                if msg_type == "text_chunk":
                    text = data.get("text", "")
                    if text.strip():
                        feedback = coach.analyze_text(text)
                        intervention = None
                        if data.get("pause_detected") and feedback.confidence_score < 5:
                            intervention = "Take a breath. Start with: 'The approach I'd take is...'"

                        await websocket.send_json({
                            "type": "coaching_update",
                            "confidence_score": feedback.confidence_score,
                            "words_per_minute": feedback.words_per_minute,
                            "fillers_found": feedback.fillers_found,
                            "suggestion": feedback.suggestion,
                            "intervention": intervention
                        })

                elif msg_type == "reset":
                    coach = ConfidenceCoach()
                    await websocket.send_json({"type": "reset_ack"})

                elif msg_type == "ping":
                    await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass