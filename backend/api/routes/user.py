# backend/api/routes/user.py
# The signed-in user's dashboard data, profile, preferences, and account deletion.

from datetime import datetime
from typing import Optional

import structlog
from fastapi import APIRouter, Depends

from api.deps import require_user_id
from api.errors import APIError
from api.schemas import UpdatePreferenceRequest, UpdateProfileRequest
from database import SessionLocal
from engines.adaptive_difficulty import ROLE_ELO_BANDS
from models import (
    Answer, CodingProblem, CodingSubmission, InterviewSession, ReplayManifest, ScoringJob, Topic,
    User,
)

logger = structlog.get_logger()
router = APIRouter(tags=["user"])


@router.get("/user/sessions")
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


@router.get("/user/activity")
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


@router.get("/user/skill-radar")
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


@router.get("/user/gap-queue")
def get_gap_queue(company: Optional[str] = None, user_id: int = Depends(require_user_id)):
    """
    Real gap queue — aggregates Answer.gaps_identified (already persisted
    by process_answer_scoring via services.gap_engine.extract_gaps on every
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

        for answer, _session in rows:
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


@router.get("/user/skill-matrix")
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


@router.delete("/user/me")
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
        raise APIError(500, "Deletion failed. Please try again or contact support.") from e
    finally:
        db.close()


# Only these three keys can ever be written — prevents an arbitrary
# key/value pair being stuffed into User.preferences from the request body.
VALID_PREFERENCE_KEYS = {"sound_effects", "live_coaching_telemetry", "high_contrast_editor"}


@router.get("/user/profile-summary")
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


@router.patch("/user/profile")
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


@router.patch("/user/preferences")
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
