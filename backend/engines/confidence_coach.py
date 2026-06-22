import os
import re
import time
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass
class CoachingFeedback:
    hesitations: int
    fillers_found: list
    words_per_minute: float
    confidence_score: float
    suggestion: str
    word_count: int

FILLER_WORDS = [
    "um", "uh", "like", "you know", "basically", "literally",
    "right", "so", "actually", "honestly", "kind of", "sort of"
]

class ConfidenceCoach:
    def __init__(self):
        self.session_start = time.time()
        self.total_words = 0
        self.filler_counts = {}
        self.chunk_count = 0

    def analyze_text(self, text: str) -> CoachingFeedback:
        self.chunk_count += 1
        text_lower = text.lower()
        words = text.split()
        word_count = len(words)
        self.total_words += word_count

        # Count filler words
        fillers_found = []
        for filler in FILLER_WORDS:
            pattern = r'\b' + re.escape(filler) + r'\b'
            count = len(re.findall(pattern, text_lower))
            if count > 0:
                fillers_found.append(f"{filler} (x{count})")
                self.filler_counts[filler] = self.filler_counts.get(filler, 0) + count

        # Calculate words per minute
        elapsed_minutes = (time.time() - self.session_start) / 60
        wpm = self.total_words / max(elapsed_minutes, 0.01)

        # Generate suggestion
        suggestion = self._generate_suggestion(wpm, fillers_found, elapsed_minutes)

        # Calculate confidence score
        confidence = 10.0
        confidence -= len(fillers_found) * 0.8
        if wpm > 170:
            confidence -= 2.0
        elif wpm < 80:
            confidence -= 1.5
        if elapsed_minutes > 3:
            confidence -= 1.0
        confidence = max(0.0, min(10.0, confidence))

        return CoachingFeedback(
            hesitations=len(fillers_found),
            fillers_found=fillers_found,
            words_per_minute=round(wpm, 1),
            confidence_score=round(confidence, 1),
            suggestion=suggestion,
            word_count=word_count
        )

    def _generate_suggestion(self, wpm: float, fillers: list, elapsed: float) -> str:
        if wpm > 170:
            return "Slow down — you are speaking too fast. Target 130-150 WPM."
        elif wpm < 80 and elapsed > 0.5:
            return "Pick up your pace slightly — you sound uncertain."
        elif len(fillers) >= 3:
            return f"Watch the filler words: {', '.join([f.split(' ')[0] for f in fillers[:3]])}"
        elif elapsed > 2.5:
            return "You have been speaking for 2.5 minutes — start wrapping up."
        elif elapsed > 1.5:
            return "Good length — start moving toward your conclusion."
        return "Good pace and clarity — keep going."

    def get_session_summary(self) -> dict:
        return {
            "total_words": self.total_words,
            "total_fillers": sum(self.filler_counts.values()),
            "filler_breakdown": self.filler_counts,
            "chunks_analyzed": self.chunk_count
        }