# backend/api/routes/coding.py
# The coding track: problems, running and submitting code, hints.

import random

import structlog
from fastapi import APIRouter, Depends, Request

from api import services
from api.deps import get_current_user_id, limiter, require_user_id
from api.errors import APIError
from api.schemas import HintRequest, RunCodeRequest, SubmitCodeRequest
from database import SessionLocal
from models import CodingProblem, CodingSubmission, CodingTestCase, InterviewSession, User

logger = structlog.get_logger()
router = APIRouter(tags=["coding"])

@router.post("/coding/hint")
@limiter.limit("15/minute")
def get_coding_hint(payload: HintRequest, request: Request, user_id: int = Depends(require_user_id)):
    return services.coding_engine.get_hint(payload.problem, payload.current_code, payload.language)


@router.get("/coding/problems")
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


@router.get("/coding/problems/{slug}")
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


@router.post("/coding/run")
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
    results = services.code_executor.run_test_cases(payload.code, payload.language, test_cases)

    return {
        "results": [
            {"passed": r.passed, "input": r.input, "expected": r.expected, "actual": r.actual, "stderr": r.stderr}
            for r in results
        ],
        "passed_count": sum(1 for r in results if r.passed),
        "total": len(results),
    }


@router.post("/coding/submit")
@limiter.limit("10/minute")
def submit_code(request: Request, payload: SubmitCodeRequest, user_id: int = Depends(require_user_id)):
    """
    'Submit' button — executes against ALL test cases (visible + hidden), grades
    quality with Claude via services.coding_engine.grade_submission(), and persists the result.

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

    exec_results = services.code_executor.run_test_cases(payload.code, payload.language, test_cases)
    test_results_for_grading = [
        {"passed": r.passed, "input": r.input, "expected": r.expected, "actual": r.actual}
        for r in exec_results
    ]

    try:
        grading = services.coding_engine.grade_submission(problem_description, payload.code, test_results_for_grading)
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
    # uses (services.difficulty_engine.update_elo), so Track A and Track B share
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
        new_elo = services.difficulty_engine.update_elo(
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


@router.get("/coding/next")
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

@router.get("/coding/submissions")
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
