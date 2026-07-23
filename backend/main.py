from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db, create_tables, SessionLocal
from models import InterviewSession, Answer, Topic, ScoringJob, CodingProblem, CodingTestCase, CodingSubmission, ReplayManifest
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
from engines.replay_system import ReplaySystem
from coding_engine import CodingEngine
from code_executor import CodeExecutor
from auth import hash_password, verify_password, create_access_token, decode_access_token
from content_filter import contains_profanity, sanitize_for_storage
from models import User
from datetime import datetime
import redis
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

app = FastAPI(title="InterviewCoach AI", version="1.0.0")
coding_engine = CodingEngine()
code_executor = CodeExecutor()

# Rate limiter: protects the Anthropic API budget by capping how many
# requests a single IP can make per time window.
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

try:
    redis_client = redis.from_url(os.getenv("REDIS_URL"), decode_responses=True, socket_connect_timeout=2)
    redis_client.ping()
except Exception:
    redis_client = None  # same fail-open pattern as company_dna.py — don't crash the app if Redis is down

DAILY_TOKEN_BUDGET = 20000 # tune this — rough starting point for a free-tier user

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

# Request models
class StartSessionRequest(BaseModel):
    user_name: str
    company: str
    role: str
    elo: float = 1200.0
    persona: str = "standard"

class SubmitAnswerRequest(BaseModel):
    session_id: int
    question: str
    answer: str
    difficulty: int
    elo: float
    company: str = None
    failed_topic: str = None
    category: str = None
    persona: str = "standard"

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

class RunCodeRequest(BaseModel):
    problem_id: int
    code: str
    language: str = "python"

class SubmitCodeRequest(BaseModel):
    problem_id: int
    code: str
    language: str = "python"
    session_id: int = None

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
    question_data = difficulty_engine.select_question(
        elo=payload.elo,
        company=payload.company,
        role=payload.role,
        persona=payload.persona
    )
    difficulty = min(10, max(1, int((payload.elo - 800) / 100)))
    replay_system.log_event(new_session_id, "question_asked", question_data)

    return {
        "session_id": new_session_id,
        "question": question_data["question"],
        "persona": payload.persona,
        "scenario": question_data.get("scenario", ""),
        "constraints": question_data.get("constraints", []),
        "ask": question_data.get("ask", ""),
        "category": question_data["category"],
        "sub_category": question_data.get("sub_category", ""),
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
        
        # 1. Compute new ELO
        new_elo = difficulty_engine.update_elo(
            current_elo=payload.elo, question_difficulty=payload.difficulty, score=overall
        )

        replay_system.log_event(payload.session_id, "answer_submitted", {"text": clean_answer})
        replay_system.log_event(payload.session_id, "scores_calculated", scores)
        replay_system.log_event(payload.session_id, "gaps_identified", gaps)

        # 2. Fetch/Create session record
        session_record = db.query(InterviewSession).filter(InterviewSession.id == payload.session_id).first()
        if not session_record:
            session_record = InterviewSession(
                id=payload.session_id, difficulty_level=payload.difficulty,
                company_target=payload.company or "unknown", role="unknown"
            )
            db.add(session_record)
            db.commit()

        # 3. Persist the updated ELO to the user record
        # Without this, every session starts back at 1200 regardless of prior performance.
        if session_record and session_record.user_id:
            user = db.query(User).filter(User.id == session_record.user_id).first()
            if user:
                user.elo_rating = new_elo
                db.commit()

        # Snapshot ELO on the session itself too — this is what makes the
        # Rating History chart show REAL per-session values instead of
        # always plotting whatever the user's current live ELO happens to be.
        if session_record:
            session_record.elo_after = new_elo
            db.commit()

        # 4. Save the Answer row
        answer_record = Answer(
            session_id=payload.session_id, question_text=payload.question, answer_text=clean_answer,
            score_technical=scores["score_technical"], score_communication=scores["score_communication"],
            score_problem_solving=scores["score_problem_solving"], score_cultural_fit=scores["score_cultural_fit"],
            score_confidence=scores["score_confidence"], gaps_identified=gaps
        )
        db.add(answer_record)
        db.commit()
        db.refresh(answer_record)

        failed_topic = None
        if overall < 5 and gaps:
            failed_topic = gaps[0].get("gap")

        if overall >= 7 and payload.question:
            next_question_data = difficulty_engine.select_followup_question(
                previous_question=payload.question,
                previous_answer=clean_answer,
                elo=new_elo,
                company=payload.company or "google",
                role="Software Engineer",
                previous_category=payload.category if hasattr(payload, "category") else None,
                persona=payload.persona
            )
        else:
            next_question_data = difficulty_engine.select_question(
                elo=new_elo,
                company=payload.company or "google",
                role="Software Engineer",
                failed_topic=failed_topic,
                persona=payload.persona
            )
        replay_system.log_event(payload.session_id, "question_asked", next_question_data)

        result = {
            "scores": scores, "overall_score": overall, "gaps": gaps,
            "peer_comparison": peer, "new_elo": new_elo,
            "next_question": next_question_data["question"],
            "next_scenario": next_question_data.get("scenario", ""),
            "next_constraints": next_question_data.get("constraints", []),
            "next_ask": next_question_data.get("ask", ""),
            "next_category": next_question_data["category"],
            "next_sub_category": next_question_data.get("sub_category", ""),
            "answer_id": answer_record.id
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
    # Token budget check — separate from the request-count limiter above.
    # This catches the case where someone stays under 20 requests/minute
    # but pastes something huge into every single one.
    estimated = estimate_tokens(payload.answer) + estimate_tokens(payload.question)
    if user_id and not check_and_charge_token_budget(user_id, estimated):
        return {"error": "Daily usage limit reached. Please try again tomorrow."}

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
def get_scoring_status(job_id: int, user_id: int = Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        job = db.query(ScoringJob).filter(ScoringJob.id == job_id).first()
        if not job:
            return {"status": "not_found"}

        session_record = db.query(InterviewSession).filter(
            InterviewSession.id == job.session_id
        ).first()
        if not user_id or not session_record or session_record.user_id != user_id:
            return {"status": "not_found"}  # don't reveal it exists either

        if job.status == "done":
            return {"status": "done", **job.result}
        return {"status": job.status}
    finally:
        db.close()


class HintRequest(BaseModel):
    problem: str
    current_code: str
    language: str = "python"

@app.post("/coding/hint")
@limiter.limit("15/minute")
def get_coding_hint(payload: HintRequest, request: Request, user_id: int = Depends(get_current_user_id)):
    return coding_engine.get_hint(payload.problem, payload.current_code, payload.language)

@app.get("/replay/{session_id}")
def get_replay(session_id: int, user_id: int = Depends(get_current_user_id)):
    if not user_id:
        return {"error": "Authentication required"}

    db = SessionLocal()
    try:
        session_record = db.query(InterviewSession).filter(
            InterviewSession.id == session_id,
            InterviewSession.user_id == user_id
        ).first()
        if not session_record:
            return {"error": "Replay not found"}
    finally:
        db.close()

    return replay_system.get_replay(session_id)

@app.get("/replay/{session_id}/list")
def list_replays(user_id: int = Depends(get_current_user_id)):
    if not user_id:
        return {"replays": []}

    db = SessionLocal()
    try:
        own_session_ids = {
            s.id for s in db.query(InterviewSession).filter(
                InterviewSession.user_id == user_id
            ).all()
        }
    finally:
        db.close()

    all_replays = replay_system.list_replays()
    return {"replays": [r for r in all_replays if r["session_id"] in own_session_ids]}
class FeedbackRatingRequest(BaseModel):
    answer_id: int
    helpful: bool

@app.post("/feedback/rate")
def rate_feedback(payload: FeedbackRatingRequest, user_id: int = Depends(get_current_user_id)):
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

@app.get("/user/sessions")
def get_user_sessions(user_id: int = Depends(get_current_user_id)):
    if not user_id:
        return {"sessions": []}
    db = SessionLocal()
    try:
        sessions = db.query(InterviewSession).filter(
            InterviewSession.user_id == user_id
        ).order_by(InterviewSession.started_at.desc()).limit(20).all()

        result = []
        for session in sessions:
            answer_count = db.query(Answer).filter(Answer.session_id == session.id).count()
            result.append({
                "id": session.id,
                "company_target": session.company_target,
                "role": session.role,
                "started_at": session.started_at.isoformat() if session.started_at else None,
                "question_count": answer_count,
                "elo_after": session.elo_after,
            })
        return {"sessions": result}
    finally:
        db.close()

@app.delete("/user/me")
def delete_my_account(user_id: int = Depends(get_current_user_id)):
    if not user_id:
        return {"error": "Authentication required"}

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
        return {"error": "Deletion failed. Please try again or contact support."}
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
            return {"error": "Problem not found"}

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
            "sample_test_cases": [
                {"input": tc.input_data, "expected_output": tc.expected_output} for tc in visible_cases
            ],
        }
    finally:
        db.close()


@app.post("/coding/run")
@limiter.limit("20/minute")
def run_code(request: Request, payload: RunCodeRequest, user_id: int = Depends(get_current_user_id)):
    """
    'Run' button — executes against VISIBLE sample cases only. Self-check for the
    candidate, mirrors what a real IDE's 'run against examples' does. Nothing persisted.
    """
    db = SessionLocal()
    try:
        problem = db.query(CodingProblem).filter(CodingProblem.id == payload.problem_id).first()
        if not problem:
            return {"error": "Problem not found"}

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
def submit_code(request: Request, payload: SubmitCodeRequest, user_id: int = Depends(get_current_user_id)):
    """
    'Submit' button — executes against ALL test cases (visible + hidden), grades
    quality with Claude via coding_engine.grade_submission(), and persists the result.
    """
    if not user_id:
        return {"error": "You must be logged in to submit"}

    db = SessionLocal()
    try:
        problem = db.query(CodingProblem).filter(CodingProblem.id == payload.problem_id).first()
        if not problem:
            return {"error": "Problem not found"}

        all_cases = db.query(CodingTestCase).filter(CodingTestCase.problem_id == problem.id).all()
        test_cases = [{"input": tc.input_data, "expected_output": tc.expected_output} for tc in all_cases]

        exec_results = code_executor.run_test_cases(payload.code, payload.language, test_cases)
        test_results_for_grading = [
            {"passed": r.passed, "input": r.input, "expected": r.expected, "actual": r.actual}
            for r in exec_results
        ]

        grading = coding_engine.grade_submission(problem.description, payload.code, test_results_for_grading)

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

        user = db.query(User).filter(User.id == user_id).first()
        new_elo = None
        if user:
            new_elo = difficulty_engine.update_elo(
                current_elo=user.elo_rating, question_difficulty=problem.difficulty, score=coding_score
            )
            user.elo_rating = new_elo

        submission = CodingSubmission(
            user_id=user_id,
            session_id=payload.session_id,
            problem_id=problem.id,
            code=payload.code,
            language=payload.language,
            tests_passed=grading["tests_passed"],
            tests_total=grading["tests_total"],
            complexity_estimate=grading.get("complexity_estimate"),
            cleanliness_score=grading.get("cleanliness_score"),
            naming_score=grading.get("naming_score"),
            feedback=grading.get("feedback"),
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)

        logger.info("coding_submission_graded", user_id=user_id, problem_id=problem.id,
                    tests_passed=grading["tests_passed"], tests_total=grading["tests_total"], new_elo=new_elo)

        return {
            "submission_id": submission.id,
            "tests_passed": grading["tests_passed"],
            "tests_total": grading["tests_total"],
            "complexity_estimate": grading.get("complexity_estimate"),
            "cleanliness_score": grading.get("cleanliness_score"),
            "naming_score": grading.get("naming_score"),
            "feedback": grading.get("feedback"),
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
            return {"error": "No coding problems available"}

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
def get_coding_submissions(user_id: int = Depends(get_current_user_id)):
    """Returns the authenticated user's past coding submissions, most recent first."""
    if not user_id:
        return {"submissions": []}
    db = SessionLocal()
    try:
        submissions = db.query(CodingSubmission).filter(
            CodingSubmission.user_id == user_id
        ).order_by(CodingSubmission.submitted_at.desc()).limit(20).all()

        result = []
        for s in submissions:
            problem = db.query(CodingProblem).filter(CodingProblem.id == s.problem_id).first()
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

import whisper
import tempfile
import os as os_module

# Load Whisper once at startup, not per-connection — loading takes ~15s
# and we don't want every new WebSocket connection to pay that cost.
whisper_model = None

def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        print("Loading Whisper model for live transcription...")
        whisper_model = whisper.load_model("small")
        print("Whisper model ready")
    return whisper_model

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

    db = SessionLocal()
    try:
        session_record = db.query(InterviewSession).filter(
            InterviewSession.id == session_id,
            InterviewSession.user_id == user_id
        ).first()
    finally:
        db.close()

    if not session_record:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    coach = ConfidenceCoach()
    print(f"WebSocket connected for session {session_id}")

    try:
        while True:
            message = await websocket.receive()

            # Audio path: browser sends raw audio bytes (webm/wav chunk)
            if "bytes" in message and message["bytes"]:
                audio_bytes = message["bytes"]

                with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
                    f.write(audio_bytes)
                    temp_path = f.name

                try:
                    result = get_whisper_model().transcribe(temp_path, fp16=False)
                    transcribed_text = result["text"].strip()
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