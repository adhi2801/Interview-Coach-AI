import os
import json
import redis
import statistics
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Answer, InterviewSession
from dotenv import load_dotenv

load_dotenv()

try:
    redis_client = redis.from_url(os.getenv("REDIS_URL"), decode_responses=True, socket_connect_timeout=2)
    redis_client.ping()
except Exception:
    redis_client = None

CACHE_TTL_SECONDS = 300  # 5 minutes


class PeerComparisonEngine:
    def get_difficulty_band(self, difficulty: int) -> str:
        if difficulty <= 3:
            return "easy"
        elif difficulty <= 6:
            return "medium"
        return "hard"

    def get_percentile(self, your_score: float, difficulty: int) -> dict:
        band = self.get_difficulty_band(difficulty)
        your_score = max(0.0, min(10.0, your_score))  # safety clamp

        overall_scores = self._get_band_scores(band)

        if len(overall_scores) < 5:
            return {
                "your_score": round(your_score, 1),
                "percentile": None,
                "average_score": None,
                "std_dev": None,
                "total_attempts": len(overall_scores),
                "context": "Not enough data yet for this difficulty — be one of the first!",
                "tier": "insufficient_data",
                "difficulty_band": band
            }

        mean = statistics.mean(overall_scores)
        std = statistics.stdev(overall_scores) if len(overall_scores) > 1 else 0.0
        below_you = sum(1 for s in overall_scores if s < your_score)
        percentile = round((below_you / len(overall_scores)) * 100)

        if percentile >= 90:
            context, tier = "Outstanding — top 10% of all candidates", "excellent"
        elif percentile >= 75:
            context, tier = "Strong performance — top 25%", "strong"
        elif percentile >= 50:
            context, tier = "Above average — keep practicing", "good"
        elif percentile >= 25:
            context, tier = "Below average — focused practice needed", "weak"
        else:
            context, tier = "This topic needs serious study", "critical"

        return {
            "your_score": round(your_score, 1),
            "percentile": percentile,
            "average_score": round(mean, 1),
            "std_dev": round(std, 1),
            "total_attempts": len(overall_scores),
            "context": context,
            "tier": tier,
            "difficulty_band": band
        }

    def _get_band_scores(self, band: str) -> list:
        cache_key = f"peer_comparison_scores:{band}"
        if redis_client:
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)

        min_diff, max_diff = self._band_range(band)
        db = SessionLocal()
        try:
            rows = db.query(Answer).join(InterviewSession).filter(
                InterviewSession.difficulty_level >= min_diff,
                InterviewSession.difficulty_level <= max_diff
            ).all()

            overall_scores = []
            for row in rows:
                if all([
                    row.score_technical is not None, row.score_communication is not None,
                    row.score_problem_solving is not None, row.score_cultural_fit is not None,
                    row.score_confidence is not None
                ]):
                    avg = (row.score_technical + row.score_communication + row.score_problem_solving
                           + row.score_cultural_fit + row.score_confidence) / 5
                    overall_scores.append(avg)
        finally:
            db.close()

        if redis_client:
            redis_client.setex(cache_key, CACHE_TTL_SECONDS, json.dumps(overall_scores))

        return overall_scores

    def _band_range(self, band: str) -> tuple:
        if band == "easy":
            return (1, 3)
        elif band == "medium":
            return (4, 6)
        return (7, 10)