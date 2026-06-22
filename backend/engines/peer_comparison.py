import os
import statistics
from dotenv import load_dotenv

load_dotenv()

class PeerComparisonEngine:
    def __init__(self):
        # In production this comes from PostgreSQL
        # For now we use sample data to simulate real comparisons
        self.sample_scores = {
            "easy": [4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 6.2, 5.8, 7.2, 6.8, 5.2, 7.8],
            "medium": [3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 5.2, 4.8, 6.2, 5.8, 4.2, 6.8, 5.5],
            "hard": [2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 3.8, 4.2, 5.2, 3.2, 4.8, 5.8, 3.5]
        }

    def get_difficulty_band(self, difficulty: int) -> str:
        if difficulty <= 3:
            return "easy"
        elif difficulty <= 6:
            return "medium"
        return "hard"

    def get_percentile(self, your_score: float, difficulty: int) -> dict:
        band = self.get_difficulty_band(difficulty)
        scores = self.sample_scores[band]

        mean = statistics.mean(scores)
        std = statistics.stdev(scores)

        below_you = sum(1 for s in scores if s < your_score)
        percentile = round((below_you / len(scores)) * 100)

        if percentile >= 90:
            context = "Outstanding — top 10% of all candidates"
            tier = "excellent"
        elif percentile >= 75:
            context = "Strong performance — top 25%"
            tier = "strong"
        elif percentile >= 50:
            context = "Above average — keep practicing"
            tier = "good"
        elif percentile >= 25:
            context = "Below average — focused practice needed"
            tier = "weak"
        else:
            context = "This topic needs serious study"
            tier = "critical"

        return {
            "your_score": round(your_score, 1),
            "percentile": percentile,
            "average_score": round(mean, 1),
            "std_dev": round(std, 1),
            "total_attempts": len(scores),
            "context": context,
            "tier": tier,
            "difficulty_band": band
        }

    def add_score(self, score: float, difficulty: int):
        band = self.get_difficulty_band(difficulty)
        self.sample_scores[band].append(score)