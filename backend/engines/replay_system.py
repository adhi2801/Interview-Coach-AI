import os
import json
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

REPLAY_DIR = Path("./replays")

class ReplaySystem:
    def __init__(self):
        REPLAY_DIR.mkdir(exist_ok=True)

    def start_recording(self, session_id: int, user_name: str, company: str, role: str) -> dict:
        manifest = {
            "session_id": session_id,
            "user_name": user_name,
            "company": company,
            "role": role,
            "started_at": datetime.utcnow().isoformat(),
            "ended_at": None,
            "events": []
        }
        path = REPLAY_DIR / f"session_{session_id}.json"
        path.write_text(json.dumps(manifest, indent=2))
        return {"status": "recording started", "session_id": session_id}

    def log_event(self, session_id: int, event_type: str, data: dict):
        path = REPLAY_DIR / f"session_{session_id}.json"
        if not path.exists():
            return {"error": "session not found"}

        manifest = json.loads(path.read_text())
        manifest["events"].append({
            "type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        })
        path.write_text(json.dumps(manifest, indent=2))
        return {"status": "event logged"}

    def end_recording(self, session_id: int) -> dict:
        path = REPLAY_DIR / f"session_{session_id}.json"
        if not path.exists():
            return {"error": "session not found"}

        manifest = json.loads(path.read_text())
        manifest["ended_at"] = datetime.utcnow().isoformat()
        path.write_text(json.dumps(manifest, indent=2))
        return {"status": "recording ended"}

    def get_replay(self, session_id: int) -> dict:
        path = REPLAY_DIR / f"session_{session_id}.json"
        if not path.exists():
            return {"error": "replay not found"}

        manifest = json.loads(path.read_text())

        questions = []
        current_q = None

        for event in manifest["events"]:
            if event["type"] == "question_asked":
                if current_q:
                    questions.append(current_q)
                current_q = {
                    "question": event["data"]["text"],
                    "asked_at": event["timestamp"],
                    "scores": None,
                    "answer": None,
                    "gaps": [],
                    "coaching_moments": []
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
            "session_id": session_id,
            "user_name": manifest["user_name"],
            "company": manifest["company"],
            "role": manifest["role"],
            "started_at": manifest["started_at"],
            "ended_at": manifest["ended_at"],
            "total_questions": len(questions),
            "questions": questions
        }

    def list_replays(self) -> list:
        replays = []
        for path in REPLAY_DIR.glob("session_*.json"):
            manifest = json.loads(path.read_text())
            replays.append({
                "session_id": manifest["session_id"],
                "company": manifest["company"],
                "role": manifest["role"],
                "started_at": manifest["started_at"],
                "total_questions": len([e for e in manifest["events"] if e["type"] == "question_asked"])
            })
        return replays