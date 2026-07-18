# backend/engines/replay_system.py
# REPLACES the local-disk version. Same class name, same 5 public methods,
# same return shapes — every existing caller in main.py keeps working
# unchanged. Only the storage backend changed: Postgres instead of
# ./replays/session_*.json, which does not survive a Railway restart/redeploy.

from datetime import datetime
from database import SessionLocal
from models import ReplayManifest


class ReplaySystem:
    def __init__(self):
        pass  # no directory to create anymore — nothing to set up at construction time

    def start_recording(self, session_id: int, user_name: str, company: str, role: str) -> dict:
        db = SessionLocal()
        try:
            existing = db.query(ReplayManifest).filter(ReplayManifest.session_id == session_id).first()
            if existing:
                # Same session started twice (e.g. a retry) — reset rather than duplicate-key error.
                existing.user_name = user_name
                existing.company = company
                existing.role = role
                existing.started_at = datetime.utcnow()
                existing.ended_at = None
                existing.events = []
            else:
                db.add(ReplayManifest(
                    session_id=session_id,
                    user_name=user_name,
                    company=company,
                    role=role,
                    started_at=datetime.utcnow(),
                    ended_at=None,
                    events=[],
                ))
            db.commit()
            return {"status": "recording started", "session_id": session_id}
        finally:
            db.close()

    def log_event(self, session_id: int, event_type: str, data: dict) -> dict:
        db = SessionLocal()
        try:
            manifest = db.query(ReplayManifest).filter(ReplayManifest.session_id == session_id).first()
            if not manifest:
                return {"error": "session not found"}

            # Reassign (not .append()) so SQLAlchemy detects the JSON column changed —
            # in-place mutation of a JSON column's Python list is invisible to the ORM otherwise.
            events = list(manifest.events or [])
            events.append({
                "type": event_type,
                "timestamp": datetime.utcnow().isoformat(),
                "data": data,
            })
            manifest.events = events
            db.commit()
            return {"status": "event logged"}
        finally:
            db.close()

    def end_recording(self, session_id: int) -> dict:
        db = SessionLocal()
        try:
            manifest = db.query(ReplayManifest).filter(ReplayManifest.session_id == session_id).first()
            if not manifest:
                return {"error": "session not found"}

            manifest.ended_at = datetime.utcnow()
            db.commit()
            return {"status": "recording ended"}
        finally:
            db.close()

    def get_replay(self, session_id: int) -> dict:
        db = SessionLocal()
        try:
            manifest = db.query(ReplayManifest).filter(ReplayManifest.session_id == session_id).first()
            if not manifest:
                return {"error": "replay not found"}

            questions = []
            current_q = None

            for event in (manifest.events or []):
                if event["type"] == "question_asked":
                    if current_q:
                        questions.append(current_q)
                    # Same backward-compat handling as the old file-based version:
                    # older events used {"text": "..."}, newer ones use the structured
                    # {"question": "...", "category": "...", ...} shape.
                    q_data = event["data"]
                    question_text = q_data.get("question") or q_data.get("text") or ""
                    current_q = {
                        "question": question_text,
                        "category": q_data.get("category"),
                        "sub_category": q_data.get("sub_category"),
                        "asked_at": event["timestamp"],
                        "scores": None,
                        "answer": None,
                        "gaps": [],
                        "coaching_moments": [],
                    }
                elif event["type"] == "answer_submitted" and current_q:
                    current_q["answer"] = event["data"]["text"]
                elif event["type"] == "scores_calculated" and current_q:
                    current_q["scores"] = event["data"]
                elif event["type"] == "gaps_identified" and current_q:
                    current_q["gaps"] = event["data"]
                elif event["type"] == "coaching_feedback" and current_q:
                    current_q["coaching_moments"].append(event["data"])

            if current_q:
                questions.append(current_q)

            return {
                "session_id": manifest.session_id,
                "user_name": manifest.user_name,
                "company": manifest.company,
                "role": manifest.role,
                "started_at": manifest.started_at.isoformat() if manifest.started_at else None,
                "ended_at": manifest.ended_at.isoformat() if manifest.ended_at else None,
                "total_questions": len(questions),
                "questions": questions,
            }
        finally:
            db.close()

    def list_replays(self) -> list:
        db = SessionLocal()
        try:
            manifests = db.query(ReplayManifest).all()
            replays = []
            for m in manifests:
                question_count = len([e for e in (m.events or []) if e["type"] == "question_asked"])
                replays.append({
                    "session_id": m.session_id,
                    "company": m.company,
                    "role": m.role,
                    "started_at": m.started_at.isoformat() if m.started_at else None,
                    "total_questions": question_count,
                })
            return replays
        finally:
            db.close()