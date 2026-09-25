from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Request, BackgroundTasks
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import text
from typing import Literal, Optional
from database import SessionLocal
from models import InterviewSession, Answer, Topic, TopicPrerequisite, ScoringJob, CodingProblem, CodingTestCase, CodingSubmission, ReplayManifest
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from engines.adaptive_difficulty import AdaptiveDifficultyEngine, ROLE_ELO_BANDS
from engines.scoring import MultiDimensionalScorer
from engines.company_dna import CompanyDNAEngine
from engines.knowledge_graph import KnowledgeGapGraph
from engines.confidence_coach import ConfidenceCoach
from engines.peer_comparison import PeerComparisonEngine
from engines.replay_system import ReplaySystem
from coding_engine import CodingEngine
from code_executor import CodeExecutor
from auth import hash_password, verify_password, create_access_token, decode_access_token, validate_password_strength
from content_filter import contains_profanity, sanitize_for_storage
from models import User
from datetime import datetime, timedelta
import redis
import uuid
import json as json_module
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)


class APIError(Exception):
    """
    Raised by route handlers for any expected failure. Rendered by the
    handler below as {"error": message} with a real HTTP status code —
    the same body shape the frontend has always read, but no longer
    disguised as a 200 OK, so clients, logs, and monitoring can tell a
    failure from a success.
    """
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int | None:
    """
    Optional auth. No token -> None (anonymous use is allowed on routes
    that depend on this directly). A token that IS sent but is expired or
    invalid -> 401, rather than silently treating the caller as anonymous:
    previously an expired token made every personalized route quietly
    return empty data, so the UI looked logged-in but showed nothing.
    """
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload or not payload.get("user_id"):
        raise APIError(401, "Your session has expired. Please log in again.")
    return payload["user_id"]


def require_user_id(user_id: int | None = Depends(get_current_user_id)) -> int:
    """Required auth — use on every route that reads or writes user data."""
    if not user_id:
        raise APIError(401, "Authentication required")
    return user_id

import os
import structlog
import logging
import sentry_sdk

load_dotenv()

if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=0.1)
# top of main.py, after load_dotenv()

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("application_started", note="schema managed by Alembic migrations")
    yield
    code_executor.close()


app = FastAPI(title="InterviewCoach AI", version="1.1.0", lifespan=lifespan)
coding_engine = CodingEngine()
code_executor = CodeExecutor()

# Rate limiter: protects the Anthropic API budget by capping how many
# requests a single IP can make per time window. Keyed on the real client
# IP — uvicorn runs with --proxy-headers (see Dockerfile) so this is the
# X-Forwarded-For address, not Railway's load balancer shared by everyone.
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter


@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.message})


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"error": "Too many requests. Please slow down and try again in a minute."},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # Turn pydantic's nested error list into one readable sentence, keeping
    # the {"error": ...} shape every other failure uses.
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in first.get("loc", []) if p != "body")
    message = first.get("msg", "Invalid request")
    return JSONResponse(
        status_code=422,
        content={"error": f"{field}: {message}" if field else message},
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})

try:
    redis_client = redis.from_url(os.getenv("REDIS_URL"), decode_responses=True, socket_connect_timeout=2)
    redis_client.ping()
except Exception:
    redis_client = None  # same fail-open pattern as company_dna.py — don't crash the app if Redis is down

DAILY_TOKEN_BUDGET = 20000  # tune this — rough starting point for a free-tier user

def estimate_tokens(text: str) -> int:
    # Rough approximation: ~4 characters per token for English text.
    # Not exact, but doesn't need to be — this is a budget GUARD, not billing.
    return len(text) // 4

def check_and_charge_token_budget(user_id: int, estimated_tokens: int) -> bool:
    """Returns True if the user is under budget and the charge was applied,
    False if they're over budget and should be rejected."""
    if not redis_client or not user_id:
        return True  # fail open — same philosophy as the caching layer

    key = f"token_budget:{user_id}:{datetime.utcnow().strftime('%Y-%m-%d')}"
    current = redis_client.get(key)
    current = int(current) if current else 0

    if current + estimated_tokens > DAILY_TOKEN_BUDGET:
        return False

    pipe = redis_client.pipeline()
    pipe.incrby(key, estimated_tokens)
    pipe.expire(key, 60 * 60 * 26)  # slightly over 24h so it always outlives "today" in any timezone
    pipe.execute()
    return True

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_origin_regex=r"https://.*\.up\.railway\.app|https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Most responses here are JSON dashboards/replays that compress 5-10x.
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Request models
#
# Every free-text field has a hard max_length. Each of these strings is
# forwarded to Claude or Judge0 (both billed per call/token), so without a
# cap a single request could carry megabytes of input. The limits are far
# above anything a real answer or solution needs.
SupportedLanguage = Literal["python", "javascript", "java", "cpp", "c", "go"]

class StartSessionRequest(BaseModel):
    user_name: str = Field(max_length=100)
    company: str = Field(min_length=1, max_length=50)
    role: str = Field(min_length=1, max_length=100)
    elo: float = 1200.0
    persona: str = Field(default="standard", max_length=30)
    preview_id: Optional[str] = Field(default=None, max_length=64)

class SubmitAnswerRequest(BaseModel):
    session_id: int
    question: str = Field(min_length=1, max_length=5000)
    answer: str = Field(min_length=1, max_length=20000)
    difficulty: int = Field(ge=1, le=10)
    elo: float
    company: Optional[str] = Field(default=None, max_length=50)
    role: str = Field(default="Software Engineer", max_length=100)
    failed_topic: Optional[str] = Field(default=None, max_length=200)
    category: Optional[str] = Field(default=None, max_length=100)
    persona: str = Field(default="standard", max_length=30)

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)
    name: str = Field(min_length=1, max_length=100)

class LoginRequest(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)

class RunCodeRequest(BaseModel):
    problem_id: int
    code: str = Field(min_length=1, max_length=50000)
    language: SupportedLanguage = "python"

class SubmitCodeRequest(BaseModel):
    problem_id: int
    code: str = Field(min_length=1, max_length=50000)
    language: SupportedLanguage = "python"
    session_id: Optional[int] = None

# Engine instances
difficulty_engine = AdaptiveDifficultyEngine()
scorer = MultiDimensionalScorer()
company_engine = CompanyDNAEngine()
gap_engine = KnowledgeGapGraph()
peer_engine = PeerComparisonEngine()
replay_system = ReplaySystem()

@app.get("/companies/{company}/profile")
def get_company_profile(company: str):
    return company_engine.get_profile(company)


@app.get("/roles/elo-bands")
def get_elo_bands():
    return ROLE_ELO_BANDS


@app.get("/health")
def health_check():
    """
    Real readiness check: pings Postgres (required) and Redis (optional,
    every Redis use in this app fails open). Returns 503 if the database is
    unreachable, so Railway's healthcheck and the dashboard status dot
    report an outage instead of a cheerful "ok" from a process that can't
    serve a single real request.
    """
    db_ok = True
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_ok = False
        logger.error("health_check_db_failed", error=str(e))
    finally:
        db.close()

    redis_ok = False
    if redis_client:
        try:
            redis_ok = bool(redis_client.ping())
        except Exception:
            redis_ok = False

    body = {
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "unreachable",
        "cache": "ok" if redis_ok else "unavailable",
    }
    return JSONResponse(status_code=200 if db_ok else 503, content=body)

@app.get("/")
def root():
    return {"message": "Welcome to InterviewCoach AI"}

@app.get("/companies")
def list_companies():
    return {"companies": company_engine.list_companies()}

@app.get("/topics")
def list_topics():
    db = SessionLocal()
    try:
        topics = db.query(Topic).order_by(Topic.category, Topic.name).all()
        return {
            "topics": [
                {"name": t.name, "category": t.category, "difficulty": t.difficulty_level}
                for t in topics
            ]
        }
    finally:
        db.close()


@app.get("/topics/status")
def get_topics_status(user_id: int = Depends(get_current_user_id)):
    """
    Real per-topic status, assembled from data that already exists but was
    never combined into one payload:
      - "gap":         topic name appears in this user's Answer.gaps_identified
      - "passed":      topic appears in Answer.topics_covered but was never
                        flagged as a gap
      - "locked":      topic has a prerequisite (TopicPrerequisite) that this
                        user has not touched yet
      - "unattempted": everything else — honest default, not fabricated

    If the caller isn't logged in, every topic is "unattempted" since there's
    no user history to derive status from.
    """
    db = SessionLocal()
    try:
        all_topics = db.query(Topic).order_by(Topic.category, Topic.name).all()
        base = [{"name": t.name, "category": t.category, "difficulty": t.difficulty_level} for t in all_topics]

        if not user_id:
            return {"topics": [{**t, "status": "unattempted"} for t in base]}

        answers = db.query(Answer).join(
            InterviewSession, Answer.session_id == InterviewSession.id
        ).filter(InterviewSession.user_id == user_id).all()

        touched = set()
        gapped = set()
        gap_urgency = {}  # topic name -> highest urgency seen ("critical" > "high" > "medium" > "low")
        urgency_rank = {"critical": 3, "high": 2, "medium": 1, "low": 0}
        for a in answers:
            for t in (a.topics_covered or []):
                if isinstance(t, str):
                    touched.add(t)
            for g in (a.gaps_identified or []):
                if not isinstance(g, dict):
                    continue  # malformed entry — skip rather than crash the whole route
                name = g.get("gap")
                if not name:
                    continue
                gapped.add(name)
                u = g.get("urgency", "low")
                if urgency_rank.get(u, 0) > urgency_rank.get(gap_urgency.get(name, "low"), 0):
                    gap_urgency[name] = u

        topic_by_id = {t.id: t.name for t in all_topics}
        prereqs = db.query(TopicPrerequisite).all()
        locked = set()
        prereq_map = {}  # topic name -> list of real prerequisite names
        for p in prereqs:
            topic_name = topic_by_id.get(p.topic_id)
            prereq_name = topic_by_id.get(p.prerequisite_id)
            if not topic_name or not prereq_name:
                continue
            prereq_map.setdefault(topic_name, []).append(prereq_name)
            if prereq_name not in touched:
                locked.add(topic_name)

        result = []
        for t in base:
            name = t["name"]
            if name in gapped:
                status = "gap"
            elif name in locked:
                status = "locked"
            elif name in touched:
                status = "passed"
            else:
                status = "unattempted"
            entry = {**t, "status": status, "prerequisites": prereq_map.get(name, [])}
            if status == "gap":
                entry["urgency"] = gap_urgency.get(name, "low")
            result.append(entry)

        return {"topics": result}
    finally:
        db.close()

@app.post("/auth/signup")
@limiter.limit("5/minute")
def signup(payload: SignupRequest, request: Request):
    # Normalize email casing so "User@Example.com" and "user@example.com"
    # are always treated as the same account, both here and at login.
    email = payload.email.strip().lower()

    password_error = validate_password_strength(payload.password)
    if password_error:
        raise APIError(400, password_error)

    name = payload.name.strip()
    if not name:
        raise APIError(400, "Name cannot be empty")

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise APIError(409, "An account with this email already exists")

        user = User(
            email=email,
            name=name,
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
@limiter.limit("5/minute")
def login(payload: LoginRequest, request: Request):
    email = payload.email.strip().lower()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user or not verify_password(payload.password, user.hashed_password):
            raise APIError(401, "Invalid email or password")

        token = create_access_token({"user_id": user.id, "email": user.email})
        logger.info("user_logged_in", user_id=user.id)

        return {
            "access_token": token,
            "user": {"id": user.id, "email": user.email, "name": user.name, "elo_rating": user.elo_rating}
        }
    finally:
        db.close()

@app.post("/session/preview")
@limiter.limit("15/minute")
def preview_session(payload: StartSessionRequest, request: Request, user_id: int = Depends(require_user_id)):
    """
    User-initiated only — the frontend calls this from a 'Preview Opening
    Line' button, never automatically on every dropdown change, since this
    is a real paid/non-deterministic Claude call under the hood.
    Caches the result under a short-lived token so /session/start can
    reuse the EXACT SAME question instead of generating a different one
    if the user goes on to actually launch.
    """
    real_elo = payload.elo
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            real_elo = user.elo_rating
    finally:
        db.close()

    question_data = difficulty_engine.select_question(
        elo=real_elo, company=payload.company, role=payload.role, persona=payload.persona
    )
    preview_id = str(uuid.uuid4())
    if redis_client:
        # Keyed by user too, so one user can't redeem another user's
        # preview_id (and the question/company it was generated for).
        redis_client.setex(f"preview:{user_id}:{preview_id}", 600, json_module.dumps(question_data))
    return {"preview_id": preview_id, **question_data}


@app.post("/session/start")
@limiter.limit("10/minute")
def start_session(payload: StartSessionRequest, request: Request, user_id: int = Depends(require_user_id)):
    logger.info("session_start_requested", company=payload.company, role=payload.role, user_id=user_id)

    real_elo = payload.elo
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Token outlived its account (e.g. account deleted in another tab).
            raise APIError(401, "Account not found. Please log in again.")
        real_elo = user.elo_rating

        session_record = InterviewSession(
            user_id=user_id,
            company_target=payload.company,
            role=payload.role,
            persona=payload.persona,
            difficulty_level=min(10, max(1, int((real_elo - 800) / 100)))
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
    cached_preview = None
    if payload.preview_id and redis_client:
        preview_key = f"preview:{user_id}:{payload.preview_id}"
        cached_preview = redis_client.get(preview_key)
        if cached_preview:
            redis_client.delete(preview_key)  # single use

    if cached_preview:
        question_data = json_module.loads(cached_preview)
    else:
        question_data = difficulty_engine.select_question(
            elo=real_elo,
            company=payload.company,
            role=payload.role,
            persona=payload.persona
        )
    difficulty = min(10, max(1, int((real_elo - 800) / 100)))
    replay_system.log_event(new_session_id, "question_asked", question_data)

    return {
        "session_id": new_session_id,
        "question": question_data["question"],
        "persona": payload.persona,
        "scenario": question_data.get("scenario", ""),
        "constraints": question_data.get("constraints", []),
        "ask": question_data.get("ask", ""),
        "category": question_data.get("category", "General"),
        "sub_category": question_data.get("sub_category", ""),
        "difficulty": difficulty,
        "company_profile": company_engine.get_profile(payload.company)
    }

SCORING_JOB_TIMEOUT = timedelta(minutes=3)


def _mark_job_failed(job_id: int, reason: str):
    db = SessionLocal()
    try:
        job = db.query(ScoringJob).filter(ScoringJob.id == job_id).first()
        if job and job.status == "processing":
            job.status = "failed"
            job.result = {"error": reason}
            db.commit()
    finally:
        db.close()


def process_answer_scoring(job_id: int, payload: SubmitAnswerRequest, user_id: int):
    """
    Runs in the background. Does all the heavy work — Claude scoring,
    gap detection, peer comparison, ELO update — without blocking
    the original HTTP request.

    Two phases, on purpose:
      1. Every slow external call (scoring, gap analysis, topic tagging,
         next-question selection) runs first, with NO database transaction
         open — these take many seconds and must not hold row locks.
      2. Every write (user ELO, session snapshot, the Answer row, the job
         result) then happens in ONE transaction. Previously these were
         five separate commits, so a crash midway could leave a user's ELO
         changed with no Answer saved and the job marked failed — and a
         retry would then apply the ELO change a second time.

    The user's ELO is re-read under SELECT ... FOR UPDATE in phase 2, so a
    coding submission that finishes while this answer is being scored is
    built upon instead of silently overwritten with a stale value.
    """
    db = SessionLocal()
    try:
        # Ownership was already verified in /answer/submit; re-checked here
        # only because the session could be deleted in the meantime.
        session_record = db.query(InterviewSession).filter(
            InterviewSession.id == payload.session_id,
            InterviewSession.user_id == user_id,
        ).first()
        user = db.query(User).filter(User.id == user_id).first()
        if not session_record or not user:
            _mark_job_failed(job_id, "Session no longer exists")
            return
        # Server-side values only. payload.elo / payload.difficulty are
        # client-supplied and must never feed the ELO formula or peer stats.
        start_elo = user.elo_rating
        real_difficulty = session_record.difficulty_level or payload.difficulty
        default_company = session_record.company_target or "google"
        db.rollback()  # release the read snapshot before the slow phase

        # ---- Phase 1: slow external calls, no transaction held ----
        has_profanity = contains_profanity(payload.answer)
        clean_answer = sanitize_for_storage(payload.answer) if has_profanity else payload.answer

        scores = scorer.score(question=payload.question, answer=clean_answer)
        if has_profanity:
            scores["overall_summary"] = (
                "Your answer contained inappropriate language and could not be evaluated. "
                "Please provide a professional response to receive accurate feedback. " + scores.get("overall_summary", "")
            )

        overall = round((
            scores["score_technical"] + scores["score_communication"] +
            scores["score_problem_solving"] + scores["score_cultural_fit"] +
            scores["score_confidence"]
        ) / 5, 1)

        gaps, gap_analysis_failed = gap_engine.extract_gaps(
            question=payload.question, answer=clean_answer,
            technical_score=scores["score_technical"], company=payload.company
        )
        topics_addressed, _topics_analysis_failed = gap_engine.identify_topics_addressed(
            question=payload.question, answer=clean_answer
        )
        peer = peer_engine.get_percentile(your_score=overall, difficulty=real_difficulty)

        # Used only to pick the next question's difficulty; the persisted
        # value is recomputed below from the locked, current ELO.
        provisional_elo = difficulty_engine.update_elo(
            current_elo=start_elo, question_difficulty=real_difficulty, score=overall
        )
        company = payload.company or default_company
        if overall >= 7:
            next_question_data = difficulty_engine.select_followup_question(
                previous_question=payload.question,
                previous_answer=clean_answer,
                elo=provisional_elo,
                company=company,
                role=payload.role,
                previous_category=payload.category,
                persona=payload.persona
            )
        else:
            failed_topic = gaps[0].get("gap") if (overall < 5 and gaps) else None
            next_question_data = difficulty_engine.select_question(
                elo=provisional_elo,
                company=company,
                role=payload.role,
                failed_topic=failed_topic,
                persona=payload.persona
            )

        # ---- Phase 2: every write in one transaction ----
        user = db.query(User).filter(User.id == user_id).with_for_update().first()
        session_record = db.query(InterviewSession).filter(InterviewSession.id == payload.session_id).first()
        job = db.query(ScoringJob).filter(ScoringJob.id == job_id).first()
        if not user or not session_record or not job:
            db.rollback()
            _mark_job_failed(job_id, "Session no longer exists")
            return

        new_elo = difficulty_engine.update_elo(
            current_elo=user.elo_rating, question_difficulty=real_difficulty, score=overall
        )
        user.elo_rating = new_elo
        # Per-session snapshot powers the Rating History chart.
        session_record.elo_after = new_elo

        answer_record = Answer(
            session_id=payload.session_id, question_text=payload.question, answer_text=clean_answer,
            score_technical=scores["score_technical"], score_communication=scores["score_communication"],
            score_problem_solving=scores["score_problem_solving"], score_cultural_fit=scores["score_cultural_fit"],
            score_confidence=scores["score_confidence"], gaps_identified=gaps,
            topics_covered=topics_addressed
        )
        db.add(answer_record)
        db.flush()  # assigns answer_record.id without committing

        job.status = "done"
        job.result = {
            "scores": scores, "overall_score": overall, "gaps": gaps,
            "peer_comparison": peer, "new_elo": new_elo,
            "gap_analysis_unavailable": gap_analysis_failed,
            "next_question": next_question_data["question"],
            "next_scenario": next_question_data.get("scenario", ""),
            "next_constraints": next_question_data.get("constraints", []),
            "next_ask": next_question_data.get("ask", ""),
            "next_category": next_question_data.get("category", "General"),
            "next_sub_category": next_question_data.get("sub_category", ""),
            "answer_id": answer_record.id
        }
        db.commit()
        logger.info("scoring_job_completed", job_id=job_id, session_id=payload.session_id,
                    elo_before=start_elo, elo_after=new_elo)

        # Replay logging after the commit: the replay is a derived view, and
        # a failure writing it must not roll back the user's real result.
        try:
            replay_system.log_event(payload.session_id, "answer_submitted", {"text": clean_answer})
            replay_system.log_event(payload.session_id, "scores_calculated", scores)
            replay_system.log_event(payload.session_id, "gaps_identified", gaps)
            replay_system.log_event(payload.session_id, "question_asked", next_question_data)
        except Exception as e:
            logger.error("replay_logging_failed", session_id=payload.session_id, error=str(e))

    except Exception as e:
        db.rollback()
        logger.error("scoring_job_failed", job_id=job_id, error=str(e), error_type=type(e).__name__)
        _mark_job_failed(job_id, "Scoring failed")
    finally:
        db.close()


@app.post("/answer/submit")
@limiter.limit("20/minute")
def submit_answer(payload: SubmitAnswerRequest, background_tasks: BackgroundTasks, request: Request, user_id: int = Depends(require_user_id)):
    db = SessionLocal()
    try:
        # Ownership check. Without it, any logged-in user could submit an
        # answer against someone else's session_id — and the scoring job
        # would then rewrite THAT user's ELO.
        session_record = db.query(InterviewSession).filter(
            InterviewSession.id == payload.session_id,
            InterviewSession.user_id == user_id,
        ).first()
        if not session_record:
            raise APIError(404, "Session not found")
        if session_record.ended_at:
            raise APIError(409, "This session has already ended")

        # Token budget check — separate from the request-count limiter above.
        # This catches the case where someone stays under 20 requests/minute
        # but pastes something huge into every single one.
        estimated = estimate_tokens(payload.answer) + estimate_tokens(payload.question)
        if not check_and_charge_token_budget(user_id, estimated):
            raise APIError(429, "Daily usage limit reached. Please try again tomorrow.")

        job = ScoringJob(session_id=payload.session_id, status="processing")
        db.add(job)
        db.commit()
        db.refresh(job)
        job_id = job.id
    finally:
        db.close()

    logger.info("answer_submitted", session_id=payload.session_id, job_id=job_id, user_id=user_id)
    background_tasks.add_task(process_answer_scoring, job_id, payload, user_id)
    return {"job_id": job_id, "status": "processing"}


@app.get("/answer/status/{job_id}")
def get_scoring_status(job_id: int, user_id: int = Depends(require_user_id)):
    db = SessionLocal()
    try:
        row = db.query(ScoringJob, InterviewSession).join(
            InterviewSession, ScoringJob.session_id == InterviewSession.id
        ).filter(ScoringJob.id == job_id, InterviewSession.user_id == user_id).first()
        if not row:
            raise APIError(404, "Scoring job not found")  # same response whether it exists or isn't yours
        job, _ = row

        if job.status == "done":
            return {"status": "done", **job.result}

        # A background task dies with its worker process (deploy, restart,
        # OOM), leaving the job "processing" forever and the candidate
        # polling a spinner that never resolves. Time it out.
        if job.status == "processing" and job.created_at and datetime.utcnow() - job.created_at > SCORING_JOB_TIMEOUT:
            job.status = "failed"
            job.result = {"error": "Scoring timed out"}
            db.commit()
            logger.warning("scoring_job_timed_out", job_id=job_id)

        response = {"status": job.status}
        if job.status == "failed":
            response["error"] = (job.result or {}).get("error", "Scoring failed")
        return response
    finally:
        db.close()


class HintRequest(BaseModel):
    problem: str = Field(min_length=1, max_length=10000)
    current_code: str = Field(max_length=50000)
    language: SupportedLanguage = "python"

@app.post("/coding/hint")
@limiter.limit("15/minute")
def get_coding_hint(payload: HintRequest, request: Request, user_id: int = Depends(require_user_id)):
    return coding_engine.get_hint(payload.problem, payload.current_code, payload.language)

@app.get("/replay/{session_id}")
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

    return replay_system.get_replay(session_id)

@app.get("/replays")
@app.get("/replay/{session_id}/list")  # legacy path, kept for old clients
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
    return {"replays": replay_system.list_replays(session_ids=own_session_ids)}


@app.post("/replay/{session_id}/end")
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
            session_record.ended_at = datetime.utcnow()
            db.commit()
            # The replay manifest has its own ended_at, which nothing ever
            # set — so every replay reported the session as still running.
            replay_system.end_recording(session_id)

        return {"status": "ended", "ended_at": session_record.ended_at.isoformat()}
    finally:
        db.close()

class FeedbackRatingRequest(BaseModel):
    answer_id: int
    helpful: bool

@app.post("/feedback/rate")
def rate_feedback(payload: FeedbackRatingRequest, user_id: int = Depends(require_user_id)):
    db = SessionLocal()
    try:
        answer = db.query(Answer).filter(Answer.id == payload.answer_id).first()
        if not answer:
            return {"status": "ok"}  # silent no-op, don't reveal existence

        session_record = db.query(InterviewSession).filter(
            InterviewSession.id == answer.session_id
        ).first()
        if not user_id or not session_record or session_record.user_id != user_id:
            return {"status": "ok"}  # silent no-op — not your answer to rate

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
        # Batched: one query for every topic in the path instead of one
        # query PER step (same fix as /user/sessions, /coding/submissions).
        topics_by_name = {}
        if path:
            all_topics = db.query(Topic).filter(Topic.name.in_(path)).all()
            topics_by_name = {t.name: t for t in all_topics}

        steps = []
        for step_name in path:
            topic = topics_by_name.get(step_name)
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

@app.get("/user/sessions")
def get_user_sessions(user_id: int = Depends(require_user_id)):
    db = SessionLocal()
    try:
        sessions = db.query(InterviewSession).filter(
            InterviewSession.user_id == user_id
        ).order_by(InterviewSession.started_at.desc()).limit(20).all()

        # Batched: one query for every session's answers instead of one
        # query PER session (same fix as /user/activity).
        session_ids = [s.id for s in sessions]
        answers_by_session = {}
        if session_ids:
            all_answers = db.query(Answer).filter(Answer.session_id.in_(session_ids)).all()
            for a in all_answers:
                answers_by_session.setdefault(a.session_id, []).append(a)

        result = []
        for session in sessions:
            answers = answers_by_session.get(session.id, [])
            answer_count = len(answers)

            # Average overall score across all answers in this session, out of 100
            avg_score = None
            if answers:
                overalls = []
                for a in answers:
                    scores = [
                        a.score_technical, a.score_communication,
                        a.score_problem_solving, a.score_cultural_fit,
                        a.score_confidence
                    ]
                    scores = [s for s in scores if s is not None]
                    if scores:
                        overalls.append(sum(scores) / len(scores))
                if overalls:
                    avg_score = round((sum(overalls) / len(overalls)) * 10)  # scale 0-10 to 0-100

            result.append({
                "id": session.id,
                "company_target": session.company_target,
                "role": session.role,
                "persona": session.persona,
                "started_at": session.started_at.isoformat() if session.started_at else None,
                "question_count": answer_count,
                "elo_after": session.elo_after,
                "score": avg_score,
            })
        return {"sessions": result}
    finally:
        db.close()

 # Paste these two endpoints into backend/main.py, directly after
# the existing @app.get("/user/sessions") endpoint.


@app.get("/user/activity")
def get_user_activity(user_id: int = Depends(require_user_id)):
    """
    Real unified activity feed across BOTH tracks — interview sessions and
    coding submissions write to the same User.elo_rating, so a per-track
    history alone is misleading (it ignores ELO changes that happened on
    the OTHER track in between). This merges both, sorted chronologically,
    and computes each entry's delta against whatever genuinely happened
    right before it, regardless of which track it was.

    Coding submissions made before elo_after existed on that table are
    honestly excluded from delta math (their real prior value is lost to
    history) — shown with delta=None, never a fabricated number.

    Previously this looped over each session/submission and fired one
    Answer/CodingProblem query PER ITEM — up to ~40 sequential DB round
    trips for 20 sessions + 20 submissions. Now batched into 2 queries
    total (Answer.session_id.in_(...), CodingProblem.id.in_(...)) and
    grouped in Python, same result, a fraction of the round trips.
    """
    db = SessionLocal()
    try:
        sessions = db.query(InterviewSession).filter(
            InterviewSession.user_id == user_id
        ).order_by(InterviewSession.started_at.desc()).limit(20).all()

        submissions = db.query(CodingSubmission).filter(
            CodingSubmission.user_id == user_id
        ).order_by(CodingSubmission.submitted_at.desc()).limit(20).all()

        # Batch 1: every Answer for every session in this page, in one query,
        # then group by session_id in Python — replaces 20 separate queries.
        session_ids = [s.id for s in sessions]
        answers_by_session = {}
        if session_ids:
            all_answers = db.query(Answer).filter(Answer.session_id.in_(session_ids)).all()
            for a in all_answers:
                answers_by_session.setdefault(a.session_id, []).append(a)

        # Batch 2: every CodingProblem referenced by this page's submissions,
        # in one query — replaces up to 20 separate queries.
        problem_ids = [sub.problem_id for sub in submissions if sub.problem_id is not None]
        problems_by_id = {}
        if problem_ids:
            all_problems = db.query(CodingProblem).filter(CodingProblem.id.in_(problem_ids)).all()
            problems_by_id = {p.id: p for p in all_problems}

        events = []
        for s in sessions:
            answers = answers_by_session.get(s.id, [])
            avg_score = None
            if answers:
                overalls = []
                for a in answers:
                    scores = [a.score_technical, a.score_communication, a.score_problem_solving, a.score_cultural_fit, a.score_confidence]
                    scores = [x for x in scores if x is not None]
                    if scores:
                        overalls.append(sum(scores) / len(scores))
                if overalls:
                    avg_score = round((sum(overalls) / len(overalls)) * 10)

            events.append({
                "track": "interview",
                "id": s.id,
                "timestamp": s.started_at,
                "elo_after": s.elo_after,
                "company_target": s.company_target,
                "role": s.role,
                "persona": s.persona,
                "score": avg_score,
                "question_count": len(answers),
            })

        for sub in submissions:
            problem = problems_by_id.get(sub.problem_id)
            events.append({
                "track": "coding",
                "id": sub.id,
                "timestamp": sub.submitted_at,
                "elo_after": sub.elo_after,
                "problem_title": problem.title if problem else "Unknown problem",
                "problem_slug": problem.slug if problem else None,
                "tests_passed": sub.tests_passed,
                "tests_total": sub.tests_total,
                "language": sub.language,
            })

        events.sort(key=lambda e: e["timestamp"] or datetime.min)

        prev_elo = None
        for e in events:
            e["elo_before"] = prev_elo
            if e["elo_after"] is not None and prev_elo is not None:
                e["elo_delta"] = round(e["elo_after"] - prev_elo)
            else:
                e["elo_delta"] = None
            if e["elo_after"] is not None:
                prev_elo = e["elo_after"]
            e["timestamp"] = e["timestamp"].isoformat() if e["timestamp"] else None

        events.sort(key=lambda e: e["timestamp"] or "", reverse=True)
        return {"activity": events[:20]}
    finally:
        db.close()

@app.get("/user/skill-radar")
def get_skill_radar(session_id: Optional[int] = None, company: Optional[str] = None, user_id: int = Depends(require_user_id)):
    """
    Real 5-dimension average score radar, computed from actual persisted
    Answer rows — the same five scores every debrief and replay screen
    already uses (score_technical, score_communication, score_problem_solving,
    score_cultural_fit, score_confidence). No fabricated per-category data.

    - session_id: scope to one session's answers (powers "hover a session
      row to preview its real radar" instead of the old fake per-company one)
    - company: scope to all sessions targeting one company
    - neither: all-time average across every answer the user has given
    """
    db = SessionLocal()
    try:
        query = db.query(Answer).join(InterviewSession, Answer.session_id == InterviewSession.id).filter(
            InterviewSession.user_id == user_id
        )
        if session_id is not None:
            query = query.filter(Answer.session_id == session_id)
        if company:
            query = query.filter(InterviewSession.company_target == company.lower())

        answers = query.all()
        if not answers:
            return {"radar": None, "sample_size": 0}

        fields = ["score_technical", "score_communication", "score_problem_solving", "score_cultural_fit", "score_confidence"]
        labels = {
            "score_technical": "Technical", "score_communication": "Communication",
            "score_problem_solving": "Problem Solving", "score_cultural_fit": "Culture Fit",
            "score_confidence": "Confidence",
        }

        radar = []
        for f in fields:
            values = [getattr(a, f) for a in answers if getattr(a, f) is not None]
            avg = round((sum(values) / len(values)) * 10, 1) if values else 0  # scale 0-10 -> 0-100
            radar.append({"dim": labels[f], "value": avg})

        return {"radar": radar, "sample_size": len(answers)}
    finally:
        db.close()


@app.get("/user/gap-queue")
def get_gap_queue(company: Optional[str] = None, user_id: int = Depends(require_user_id)):
    """
    Real gap queue — aggregates Answer.gaps_identified (already persisted
    by process_answer_scoring via gap_engine.extract_gaps on every
    low-scoring answer) across the user's sessions, optionally filtered
    to one company. Ranked by urgency then frequency. Replaces the old
    hardcoded per-company COMPANY_TELEMETRY gap lists.
    """
    db = SessionLocal()
    try:
        query = db.query(Answer, InterviewSession).join(
            InterviewSession, Answer.session_id == InterviewSession.id
        ).filter(InterviewSession.user_id == user_id)

        if company:
            query = query.filter(InterviewSession.company_target == company.lower())

        rows = query.all()

        urgency_rank = {"critical": 3, "high": 2, "medium": 1, "low": 0}
        tally = {}

        for answer, session in rows:
            for g in (answer.gaps_identified or []):
                name = g.get("gap")
                if not name:
                    continue
                entry = tally.setdefault(name, {"count": 0, "urgency": "low", "prereqs": [], "category": g.get("category")})
                entry["count"] += 1
                if urgency_rank.get(g.get("urgency", "low"), 0) > urgency_rank.get(entry["urgency"], 0):
                    entry["urgency"] = g.get("urgency", "low")
                if g.get("prerequisites_to_study_first"):
                    entry["prereqs"] = g["prerequisites_to_study_first"]

        ranked = sorted(
            tally.items(),
            key=lambda kv: (urgency_rank.get(kv[1]["urgency"], 0), kv[1]["count"]),
            reverse=True
        )

        queue = [
            {
                "gap": name, "occurrences": data["count"], "urgency": data["urgency"],
                "prerequisites_to_study_first": data["prereqs"], "category": data["category"],
            }
            for name, data in ranked
        ]

        return {"critical_gap": queue[0] if queue else None, "queue": queue[:6]}
    finally:
        db.close()


@app.get("/user/skill-matrix")
def get_skill_matrix(user_id: int = Depends(require_user_id)):
    """
    Real knowledge-graph coverage: for each Topic.category, how many
    distinct topics has this user's Answer.topics_covered actually
    touched, out of how many topics exist in that category total.
    Requires topics_covered to be populated by identify_topics_addressed
    during scoring.
    """
    db = SessionLocal()
    try:
        answers = db.query(Answer).join(InterviewSession, Answer.session_id == InterviewSession.id).filter(
            InterviewSession.user_id == user_id
        ).all()

        touched_topic_names = set()
        for a in answers:
            for t in (a.topics_covered or []):
                touched_topic_names.add(t)

        all_topics = db.query(Topic).all()
        by_category = {}
        for t in all_topics:
            cat = t.category or "Other"
            by_category.setdefault(cat, {"total": 0, "touched": 0})
            by_category[cat]["total"] += 1
            if t.name in touched_topic_names:
                by_category[cat]["touched"] += 1

        categories = [
            {"category": cat, "touched": data["touched"], "total": data["total"]}
            for cat, data in sorted(by_category.items())
        ]
        real_touched = touched_topic_names & {t.name for t in all_topics}
        return {"categories": categories, "total_touched": len(real_touched), "total_topics": len(all_topics)}
    finally:
        db.close()

@app.delete("/user/me")
def delete_my_account(user_id: int = Depends(require_user_id)):
    db = SessionLocal()
    try:
        session_ids = [
            s.id for s in db.query(InterviewSession).filter(
                InterviewSession.user_id == user_id
            ).all()
        ]

        if session_ids:
            db.query(Answer).filter(Answer.session_id.in_(session_ids)).delete(synchronize_session=False)
            db.query(ReplayManifest).filter(ReplayManifest.session_id.in_(session_ids)).delete(synchronize_session=False)
            db.query(ScoringJob).filter(ScoringJob.session_id.in_(session_ids)).delete(synchronize_session=False)

        db.query(CodingSubmission).filter(CodingSubmission.user_id == user_id).delete(synchronize_session=False)
        db.query(InterviewSession).filter(InterviewSession.user_id == user_id).delete(synchronize_session=False)

        user = db.query(User).filter(User.id == user_id).first()
        if user:
            db.delete(user)

        db.commit()
        logger.info("user_account_deleted", user_id=user_id, sessions_deleted=len(session_ids))
        return {"status": "deleted"}
    except Exception as e:
        db.rollback()
        logger.error("account_deletion_failed", user_id=user_id, error=str(e))
        raise APIError(500, "Deletion failed. Please try again or contact support.")
    finally:
        db.close()


class UpdateProfileRequest(BaseModel):
    name: str

class UpdatePreferenceRequest(BaseModel):
    key: str
    value: bool

# Only these three keys can ever be written — prevents an arbitrary
# key/value pair being stuffed into User.preferences from the request body.
VALID_PREFERENCE_KEYS = {"sound_effects", "live_coaching_telemetry", "high_contrast_editor"}


@app.get("/user/profile-summary")
def get_profile_summary(user_id: int = Depends(require_user_id)):
    """
    Single real source of truth for the Settings page: identity, ELO,
    real session/score aggregates (same math as /user/sessions), stored
    preferences, and a role-scoped ELO bracket.

    Bracket is intentionally NOT a standalone fabricated tier — ROLE_ELO_BANDS
    is keyed by role, there's no role-agnostic tier system anywhere in this
    codebase. So bracket is derived from the candidate's most recent
    session's role, and is honestly null if they have no sessions yet or
    their most recent role isn't one of the tracked bands.
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise APIError(404, "User not found")

        sessions = db.query(InterviewSession).filter(
            InterviewSession.user_id == user_id
        ).order_by(InterviewSession.started_at.desc()).all()
        total_sessions = len(sessions)

        answers = db.query(Answer).join(
            InterviewSession, Answer.session_id == InterviewSession.id
        ).filter(InterviewSession.user_id == user_id).all()

        avg_score = None
        if answers:
            overalls = []
            for a in answers:
                scores = [
                    a.score_technical, a.score_communication,
                    a.score_problem_solving, a.score_cultural_fit,
                    a.score_confidence
                ]
                scores = [s for s in scores if s is not None]
                if scores:
                    overalls.append(sum(scores) / len(scores))
            if overalls:
                avg_score = round((sum(overalls) / len(overalls)) * 10, 1)

        bracket = None
        if sessions:
            most_recent_role = sessions[0].role
            band = ROLE_ELO_BANDS.get(most_recent_role)
            if band:
                bracket = {
                    "role": most_recent_role,
                    "label": band["label"],
                    "low": band["low"],
                    "high": band["high"],
                }

        return {
            "name": user.name,
            "email": user.email,
            "elo_rating": user.elo_rating,
            "total_sessions": total_sessions,
            "avg_score": avg_score,
            "preferences": user.preferences or {},
            "bracket": bracket,
        }
    finally:
        db.close()


@app.patch("/user/profile")
def update_profile(payload: UpdateProfileRequest, user_id: int = Depends(require_user_id)):

    name = payload.name.strip()
    if not name:
        raise APIError(400, "Name cannot be empty")
    if len(name) > 100:
        raise APIError(400, "Name is too long")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise APIError(404, "User not found")
        user.name = name
        db.commit()
        return {"status": "ok", "name": user.name}
    finally:
        db.close()


@app.patch("/user/preferences")
def update_preference(payload: UpdatePreferenceRequest, user_id: int = Depends(require_user_id)):
    if payload.key not in VALID_PREFERENCE_KEYS:
        raise APIError(400, f"Unknown preference key: {payload.key}")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise APIError(404, "User not found")
        prefs = dict(user.preferences or {})
        prefs[payload.key] = payload.value
        user.preferences = prefs
        db.commit()
        return {"status": "ok", "preferences": user.preferences}
    finally:
        db.close()

# --- Coding Track (Track B) ---

@app.get("/coding/problems")
def list_coding_problems():
    """List problems without exposing test cases — just enough to build a picker UI."""
    db = SessionLocal()
    try:
        problems = db.query(CodingProblem).all()
        return {
            "problems": [
                {
                    "id": p.id,
                    "slug": p.slug,
                    "title": p.title,
                    "difficulty": p.difficulty,
                    "topics": p.topics,
                    "companies": p.companies,
                }
                for p in problems
            ]
        }
    finally:
        db.close()


@app.get("/coding/problems/{slug}")
def get_coding_problem(slug: str):
    """Full problem detail — starter code + VISIBLE test cases only. Hidden cases never leave the server."""
    db = SessionLocal()
    try:
        problem = db.query(CodingProblem).filter(CodingProblem.slug == slug).first()
        if not problem:
            raise APIError(404, "Problem not found")

        visible_cases = db.query(CodingTestCase).filter(
            CodingTestCase.problem_id == problem.id,
            CodingTestCase.is_hidden == 0
        ).all()

        return {
            "id": problem.id,
            "slug": problem.slug,
            "title": problem.title,
            "description": problem.description,
            "starter_code": problem.starter_code,
            "difficulty": problem.difficulty,
            "topics": problem.topics,
            "input_format": problem.input_format,
            "output_format": problem.output_format,
            "constraints": problem.constraints,
            "time_complexity_target": problem.time_complexity_target,
            "space_complexity_target": problem.space_complexity_target,
            "sample_test_cases": [
                {"input": tc.input_data, "expected_output": tc.expected_output} for tc in visible_cases
            ],
        }
    finally:
        db.close()


@app.post("/coding/run")
@limiter.limit("20/minute")
def run_code(request: Request, payload: RunCodeRequest, user_id: int = Depends(require_user_id)):
    """
    'Run' button — executes against VISIBLE sample cases only. Self-check for the
    candidate, mirrors what a real IDE's 'run against examples' does. Nothing persisted.
    """
    # Auth required (require_user_id): every Judge0 call here costs real
    # money against the RapidAPI quota, so it must be tied to an account.
    db = SessionLocal()
    try:
        problem = db.query(CodingProblem).filter(CodingProblem.id == payload.problem_id).first()
        if not problem:
            raise APIError(404, "Problem not found")

        visible_cases = db.query(CodingTestCase).filter(
            CodingTestCase.problem_id == problem.id,
            CodingTestCase.is_hidden == 0
        ).all()
    finally:
        db.close()

    test_cases = [{"input": tc.input_data, "expected_output": tc.expected_output} for tc in visible_cases]
    results = code_executor.run_test_cases(payload.code, payload.language, test_cases)

    return {
        "results": [
            {"passed": r.passed, "input": r.input, "expected": r.expected, "actual": r.actual, "stderr": r.stderr}
            for r in results
        ],
        "passed_count": sum(1 for r in results if r.passed),
        "total": len(results),
    }


@app.post("/coding/submit")
@limiter.limit("10/minute")
def submit_code(request: Request, payload: SubmitCodeRequest, user_id: int = Depends(require_user_id)):
    """
    'Submit' button — executes against ALL test cases (visible + hidden), grades
    quality with Claude via coding_engine.grade_submission(), and persists the result.

    The DB connection is NOT held open across the Judge0 run and the Claude
    grading call (10-30s combined). Previously it was, so a handful of
    concurrent submissions could exhaust SQLAlchemy's connection pool and
    stall every other request in the app.
    """
    db = SessionLocal()
    try:
        problem = db.query(CodingProblem).filter(CodingProblem.id == payload.problem_id).first()
        if not problem:
            raise APIError(404, "Problem not found")
        if payload.session_id is not None:
            owns_session = db.query(InterviewSession.id).filter(
                InterviewSession.id == payload.session_id,
                InterviewSession.user_id == user_id,
            ).first()
            if not owns_session:
                raise APIError(404, "Session not found")

        all_cases = db.query(CodingTestCase).filter(CodingTestCase.problem_id == problem.id).all()
        test_cases = [{"input": tc.input_data, "expected_output": tc.expected_output} for tc in all_cases]
        problem_id, problem_difficulty, problem_description = problem.id, problem.difficulty, problem.description
    finally:
        db.close()

    exec_results = code_executor.run_test_cases(payload.code, payload.language, test_cases)
    test_results_for_grading = [
        {"passed": r.passed, "input": r.input, "expected": r.expected, "actual": r.actual}
        for r in exec_results
    ]

    try:
        grading = coding_engine.grade_submission(problem_description, payload.code, test_results_for_grading)
    except Exception as e:
        # Tests already ran and are objective — a Claude outage must not
        # throw away the candidate's real result. Record it without the
        # quality review instead.
        logger.error("coding_quality_grading_failed", user_id=user_id, problem_id=problem_id, error=str(e))
        passed = sum(1 for t in test_results_for_grading if t["passed"])
        grading = {
            "tests_passed": passed, "tests_total": len(test_results_for_grading),
            "complexity_estimate": None, "cleanliness_score": None, "naming_score": None,
            "feedback": None,
        }

    # ELO update — reuses the exact same formula the interview track
    # uses (difficulty_engine.update_elo), so Track A and Track B share
    # one consistent skill rating instead of two disconnected numbers.
    # Score is primarily test-pass-rate (correctness matters most in a
    # real interview), blended with a smaller weight toward Claude's
    # code-quality scores when they're available.
    pass_ratio_score = (grading["tests_passed"] / max(grading["tests_total"], 1)) * 10
    quality_scores = [s for s in [grading.get("cleanliness_score"), grading.get("naming_score")] if s is not None]
    if quality_scores:
        quality_avg = sum(quality_scores) / len(quality_scores)
        coding_score = 0.8 * pass_ratio_score + 0.2 * quality_avg
    else:
        coding_score = pass_ratio_score

    db = SessionLocal()
    try:
        # Locked read so a concurrently-finishing interview answer can't
        # overwrite this update with a stale ELO (or vice versa).
        user = db.query(User).filter(User.id == user_id).with_for_update().first()
        if not user:
            raise APIError(401, "Account not found. Please log in again.")
        new_elo = difficulty_engine.update_elo(
            current_elo=user.elo_rating, question_difficulty=problem_difficulty, score=coding_score
        )
        user.elo_rating = new_elo

        submission = CodingSubmission(
            user_id=user_id,
            session_id=payload.session_id,
            problem_id=problem_id,
            code=payload.code,
            language=payload.language,
            tests_passed=grading["tests_passed"],
            tests_total=grading["tests_total"],
            complexity_estimate=grading.get("complexity_estimate"),
            cleanliness_score=grading.get("cleanliness_score"),
            naming_score=grading.get("naming_score"),
            feedback=grading.get("feedback"),
            elo_after=new_elo,
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)

        logger.info("coding_submission_graded", user_id=user_id, problem_id=problem_id,
                    tests_passed=grading["tests_passed"], tests_total=grading["tests_total"], new_elo=new_elo)

        return {
            "submission_id": submission.id,
            "tests_passed": grading["tests_passed"],
            "tests_total": grading["tests_total"],
            "complexity_estimate": grading.get("complexity_estimate"),
            "cleanliness_score": grading.get("cleanliness_score"),
            "naming_score": grading.get("naming_score"),
            "feedback": grading.get("feedback"),
            "quality_review_unavailable": grading.get("feedback") is None,
            "new_elo": new_elo,
            # hidden test case inputs/expected outputs intentionally never returned here
        }
    finally:
        db.close()


@app.get("/coding/next")
def get_next_coding_problem(user_id: int = Depends(get_current_user_id)):
    """
    Picks the next coding problem for the authenticated user based on their
    current ELO — same difficulty-band logic the interview track uses
    (elo-800)/100 — and skips problems they've already fully passed, so
    the coding track finally adapts instead of always serving 'two_sum'.
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first() if user_id else None
        elo = user.elo_rating if user else 1200.0
        difficulty = min(10, max(1, int((elo - 800) / 100)))

        # Problems this user has already fully solved (all hidden+visible tests passing)
        solved_ids = {
            s.problem_id for s in db.query(CodingSubmission).filter(
                CodingSubmission.user_id == user_id,
                CodingSubmission.tests_passed == CodingSubmission.tests_total,
            ).all()
        } if user_id else set()

        candidates = db.query(CodingProblem).filter(
            CodingProblem.difficulty >= max(1, difficulty - 1),
            CodingProblem.difficulty <= min(10, difficulty + 1),
        ).all()
        unsolved = [p for p in candidates if p.id not in solved_ids]
        pool = unsolved if unsolved else candidates  # if everything nearby is solved, allow repeats rather than dead-ending

        if not pool:
            # No problems exist in range at all — widen to the full bank as a last resort
            pool = db.query(CodingProblem).all()

        if not pool:
            raise APIError(503, "No coding problems available")

        import random
        chosen = random.choice(pool)

        return {
            "id": chosen.id,
            "slug": chosen.slug,
            "title": chosen.title,
            "difficulty": chosen.difficulty,
            "your_current_difficulty_target": difficulty,
        }
    finally:
        db.close()

@app.get("/coding/submissions")
def get_coding_submissions(user_id: int = Depends(require_user_id)):
    """Returns the authenticated user's past coding submissions, most recent first."""
    db = SessionLocal()
    try:
        submissions = db.query(CodingSubmission).filter(
            CodingSubmission.user_id == user_id
        ).order_by(CodingSubmission.submitted_at.desc()).limit(20).all()

        # Batched: one query for every submission's problem instead of one
        # query PER submission (same fix as /user/sessions, /user/activity).
        problem_ids = [s.problem_id for s in submissions if s.problem_id]
        problems_by_id = {}
        if problem_ids:
            all_problems = db.query(CodingProblem).filter(CodingProblem.id.in_(problem_ids)).all()
            problems_by_id = {p.id: p for p in all_problems}

        result = []
        for s in submissions:
            problem = problems_by_id.get(s.problem_id)
            result.append({
                "id": s.id,
                "problem_title": problem.title if problem else "Unknown problem",
                "problem_slug": problem.slug if problem else None,
                "tests_passed": s.tests_passed,
                "tests_total": s.tests_total,
                "language": s.language,
                "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            })
        return {"submissions": result}
    finally:
        db.close()


# --- WebSocket: Real-Time Confidence Coaching ---
# This replaces the manual "Analyze Confidence" button.
# The browser sends each typed/spoken chunk as it happens,
# and we push back live WPM, filler word count, and suggestions
# WITHOUT a new HTTP request each time.

import json
import threading

import whisper
import tempfile
import os as os_module

# Whisper is loaded lazily, once, and shared. The lock serializes both the
# first load (two sockets connecting together would otherwise load the
# model twice) and transcription itself (each run pins a CPU core and a
# chunk of RAM; unbounded parallel runs are how a small instance OOMs).
whisper_model = None
_whisper_lock = threading.Lock()

MAX_AUDIO_CHUNK_BYTES = 5 * 1024 * 1024   # ~5 minutes of opus audio
MAX_TEXT_CHUNK_CHARS = 20000              # same cap as a submitted answer


def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        logger.info("whisper_model_loading")
        whisper_model = whisper.load_model("small")
        logger.info("whisper_model_ready")
    return whisper_model


def transcribe_audio(audio_bytes: bytes) -> str:
    """Blocking: must be called via run_in_threadpool, never on the event loop."""
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
        f.write(audio_bytes)
        temp_path = f.name
    try:
        with _whisper_lock:
            result = get_whisper_model().transcribe(temp_path, fp16=False)
        return result["text"].strip()
    finally:
        os_module.remove(temp_path)


def _verify_ws_session(session_id: int, user_id: int) -> bool:
    db = SessionLocal()
    try:
        return db.query(InterviewSession.id).filter(
            InterviewSession.id == session_id,
            InterviewSession.user_id == user_id
        ).first() is not None
    finally:
        db.close()


@app.websocket("/ws/coaching/{session_id}")
async def coaching_websocket(websocket: WebSocket, session_id: int, token: str = None):
    # Native WebSocket clients can't send custom Authorization headers, so the
    # frontend passes the JWT as a query param instead: ws://.../ws/coaching/28?token=xxx
    user_id = None
    if token:
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("user_id")

    if not user_id:
        await websocket.close(code=1008)  # 1008 = policy violation
        return

    # Every blocking call below (DB, Whisper, replay writes) goes through
    # run_in_threadpool. This handler runs ON the event loop — previously a
    # single Whisper transcription (several seconds of CPU) froze the whole
    # server: every other user's HTTP request and socket stalled until it
    # finished.
    if not await run_in_threadpool(_verify_ws_session, session_id, user_id):
        await websocket.close(code=1008)
        return

    await websocket.accept()
    coach = ConfidenceCoach()
    logger.info("websocket_connected", session_id=session_id, user_id=user_id)

    try:
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                raise WebSocketDisconnect(message.get("code", 1000))

            # Audio path: browser sends raw audio bytes (webm/wav chunk)
            if message.get("bytes"):
                audio_bytes = message["bytes"]
                if len(audio_bytes) > MAX_AUDIO_CHUNK_BYTES:
                    await websocket.send_json({"type": "error", "message": "Audio chunk too large"})
                    continue

                transcribed_text = await run_in_threadpool(transcribe_audio, audio_bytes)

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
                    # Persist to the replay — without this, coaching_moments
                    # stays permanently empty in every replay even though
                    # real feedback happened live during the session.
                    await run_in_threadpool(replay_system.log_event, session_id, "coaching_feedback", {
                        "source": "audio",
                        "text": transcribed_text,
                        "confidence_score": feedback.confidence_score,
                        "words_per_minute": feedback.words_per_minute,
                        "fillers_found": feedback.fillers_found,
                        "suggestion": feedback.suggestion,
                    })

            # Text path: typed answer
            elif message.get("text"):
                try:
                    data = json.loads(message["text"])
                except json.JSONDecodeError:
                    await websocket.send_json({"type": "error", "message": "Malformed message"})
                    continue
                msg_type = data.get("type")

                if msg_type == "text_chunk":
                    text_chunk = str(data.get("text", ""))[:MAX_TEXT_CHUNK_CHARS]
                    if text_chunk.strip():
                        feedback = coach.analyze_text(text_chunk)
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
                        # Same persistence fix as the audio path above.
                        await run_in_threadpool(replay_system.log_event, session_id, "coaching_feedback", {
                            "source": "text",
                            "text": text_chunk,
                            "confidence_score": feedback.confidence_score,
                            "words_per_minute": feedback.words_per_minute,
                            "fillers_found": feedback.fillers_found,
                            "suggestion": feedback.suggestion,
                            "intervention": intervention,
                        })

                elif msg_type == "reset":
                    coach = ConfidenceCoach()
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
