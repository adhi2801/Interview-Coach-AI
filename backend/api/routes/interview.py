# backend/api/routes/interview.py
# The interview track: starting sessions, submitting answers, the background
# scoring pipeline, and rating feedback.

import json as json_module
import uuid
from datetime import timedelta

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, Request

from api import services
from api.deps import limiter, require_user_id
from api.errors import APIError
from api.schemas import FeedbackRatingRequest, StartSessionRequest, SubmitAnswerRequest
from content_filter import contains_profanity, sanitize_for_storage
from database import SessionLocal
from models import Answer, InterviewSession, ScoringJob, User
from timeutil import utcnow

logger = structlog.get_logger()
router = APIRouter(tags=["interview"])

@router.post("/session/preview")
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

    question_data = services.difficulty_engine.select_question(
        elo=real_elo, company=payload.company, role=payload.role, persona=payload.persona
    )
    preview_id = str(uuid.uuid4())
    if services.redis_client:
        # Keyed by user too, so one user can't redeem another user's
        # preview_id (and the question/company it was generated for).
        services.redis_client.setex(f"preview:{user_id}:{preview_id}", 600, json_module.dumps(question_data))
    return {"preview_id": preview_id, **question_data}


@router.post("/session/start")
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

    services.replay_system.start_recording(
        session_id=new_session_id,
        user_name=payload.user_name,
        company=payload.company,
        role=payload.role
    )
    cached_preview = None
    if payload.preview_id and services.redis_client:
        preview_key = f"preview:{user_id}:{payload.preview_id}"
        cached_preview = services.redis_client.get(preview_key)
        if cached_preview:
            services.redis_client.delete(preview_key)  # single use

    if cached_preview:
        question_data = json_module.loads(cached_preview)
    else:
        question_data = services.difficulty_engine.select_question(
            elo=real_elo,
            company=payload.company,
            role=payload.role,
            persona=payload.persona
        )
    difficulty = min(10, max(1, int((real_elo - 800) / 100)))
    services.replay_system.log_event(new_session_id, "question_asked", question_data)

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
        "company_profile": services.company_engine.get_profile(payload.company)
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

        # Grade against the question the server actually asked, never the
        # client's copy (which could be swapped for an easier one). The
        # client text is only a fallback if the replay failed to record it.
        question = services.replay_system.last_question(payload.session_id) or payload.question

        # ---- Phase 1: slow external calls, no transaction held ----
        has_profanity = contains_profanity(payload.answer)
        clean_answer = sanitize_for_storage(payload.answer) if has_profanity else payload.answer

        scores = services.scorer.score(question=question, answer=clean_answer)
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

        gaps, gap_analysis_failed = services.gap_engine.extract_gaps(
            question=question, answer=clean_answer,
            technical_score=scores["score_technical"], company=payload.company
        )
        topics_addressed, _topics_analysis_failed = services.gap_engine.identify_topics_addressed(
            question=question, answer=clean_answer
        )
        peer = services.peer_engine.get_percentile(your_score=overall, difficulty=real_difficulty)

        # Used only to pick the next question's difficulty; the persisted
        # value is recomputed below from the locked, current ELO.
        provisional_elo = services.difficulty_engine.update_elo(
            current_elo=start_elo, question_difficulty=real_difficulty, score=overall
        )
        company = payload.company or default_company
        if overall >= 7:
            next_question_data = services.difficulty_engine.select_followup_question(
                previous_question=question,
                previous_answer=clean_answer,
                elo=provisional_elo,
                company=company,
                role=payload.role,
                previous_category=payload.category,
                persona=payload.persona
            )
        else:
            failed_topic = gaps[0].get("gap") if (overall < 5 and gaps) else None
            next_question_data = services.difficulty_engine.select_question(
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

        new_elo = services.difficulty_engine.update_elo(
            current_elo=user.elo_rating, question_difficulty=real_difficulty, score=overall
        )
        user.elo_rating = new_elo
        # Per-session snapshot powers the Rating History chart.
        session_record.elo_after = new_elo

        answer_record = Answer(
            session_id=payload.session_id, question_text=question, answer_text=clean_answer,
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
            services.replay_system.log_event(payload.session_id, "answer_submitted", {"text": clean_answer})
            services.replay_system.log_event(payload.session_id, "scores_calculated", scores)
            services.replay_system.log_event(payload.session_id, "gaps_identified", gaps)
            services.replay_system.log_event(payload.session_id, "question_asked", next_question_data)
        except Exception as e:
            logger.error("replay_logging_failed", session_id=payload.session_id, error=str(e))

    except Exception as e:
        db.rollback()
        logger.error("scoring_job_failed", job_id=job_id, error=str(e), error_type=type(e).__name__)
        _mark_job_failed(job_id, "Scoring failed")
    finally:
        db.close()


@router.post("/answer/submit")
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
        estimated = services.estimate_tokens(payload.answer) + services.estimate_tokens(payload.question)
        if not services.check_and_charge_token_budget(user_id, estimated):
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


@router.get("/answer/status/{job_id}")
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
        if job.status == "processing" and job.created_at and utcnow() - job.created_at > SCORING_JOB_TIMEOUT:
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



@router.post("/feedback/rate")
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
