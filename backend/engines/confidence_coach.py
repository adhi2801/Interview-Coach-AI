# backend/engines/confidence_coach.py
#
# Live delivery feedback for ONE answer at a time. Two input paths, with
# different semantics, so they are two methods rather than one:
#
#   analyze_typed(snapshot)   the frontend re-sends the WHOLE textarea after
#                             every typing pause, so each call replaces the
#                             previous one. Fillers are counted on the
#                             snapshot itself — re-sending the same text must
#                             never count the same "um" twice.
#
#   analyze_spoken(transcript, audio_seconds)
#                             each recording is new, distinct speech, so
#                             words, fillers and audio time accumulate. Pace
#                             is words / seconds of actual audio — a real
#                             speaking rate, not words / time-since-connect.
#
# reset() starts the next answer. Previously one coach lived for the whole
# socket, so WPM on question 3 divided that answer's words by the minutes
# since question 1 began.

import re
import time
from dataclasses import dataclass, field


@dataclass
class CoachingFeedback:
    hesitations: int
    fillers_found: list
    words_per_minute: float | None
    confidence_score: float
    suggestion: str
    word_count: int
    filler_count: int = 0
    pace_source: str = "typing"  # "typing" (composition speed) or "speech" (speaking pace)
    filler_breakdown: dict = field(default_factory=dict)


# Words that are never content in an interview answer.
_ALWAYS_FILLER = [
    ("um", re.compile(r"\bu+h*m+\b")),
    ("uh", re.compile(r"\bu+h+\b")),
    ("erm", re.compile(r"\be+r+m*\b")),
    ("hmm", re.compile(r"\bh+m+\b")),
]

# Discourse markers that are also ordinary words ("structures like a trie",
# "so the cache misses", "the right index"). Only counted when set off the
# way a filler is: followed by a comma, or as a tag question for "right".
_MARKER_FILLER = [
    ("like", re.compile(r"\blike,")),
    ("you know", re.compile(r"\byou know(?=\s*[,.!?]|\s*$)")),
    ("i mean", re.compile(r"\bi mean,")),
    ("basically", re.compile(r"\bbasically,")),
    ("actually", re.compile(r"\bactually,")),
    ("honestly", re.compile(r"\bhonestly,")),
    ("literally", re.compile(r"\bliterally,")),
    ("so", re.compile(r"(?:^|[.!?,]\s*)so,")),
    ("right", re.compile(r",\s*right\?")),
]

# Hedges: "kind of" / "sort of" are fillers unless they name a kind
# ("what kind of index", "a different sort of lock").
_HEDGE = re.compile(r"(?:\b(\w+)\s+)?\b(kind|sort) of\b")
_HEDGE_NOT_AFTER = {
    "what", "which", "this", "that", "these", "those", "the", "a", "an", "any",
    "some", "each", "every", "one", "same", "different", "another", "no", "other",
}

# Normal conversational pace is roughly 110-160 words per minute.
FAST_WPM = 170
SLOW_WPM = 80
LONG_ANSWER_SECONDS = 180


def find_fillers(text: str) -> dict:
    """Returns {filler: count} for one piece of text."""
    lower = text.lower()
    counts = {}
    for label, pattern in _ALWAYS_FILLER + _MARKER_FILLER:
        n = len(pattern.findall(lower))
        if n:
            counts[label] = n
    for match in _HEDGE.finditer(lower):
        if (match.group(1) or "") not in _HEDGE_NOT_AFTER:
            label = f"{match.group(2)} of"
            counts[label] = counts.get(label, 0) + 1
    return counts


def _count_words(text: str) -> int:
    return len(text.split())


class ConfidenceCoach:
    def __init__(self, clock=time.monotonic):
        self._clock = clock
        self.reset()

    def reset(self):
        """Start a new answer."""
        self.answer_started_at = None
        self.chunk_count = 0
        self.typed_snapshot = ""
        self.spoken_words = 0
        self.spoken_seconds = 0.0
        self.spoken_fillers = {}

    # ---- input paths ----

    def analyze_typed(self, snapshot: str) -> CoachingFeedback:
        now = self._clock()
        if self.answer_started_at is None:
            self.answer_started_at = now
        self.chunk_count += 1
        self.typed_snapshot = snapshot

        word_count = _count_words(snapshot)
        fillers = find_fillers(snapshot)
        elapsed_seconds = now - self.answer_started_at
        # Composition speed, shown for reference only. Typing is naturally
        # far slower than speech, so it is never judged against speech norms.
        wpm = round(word_count / (elapsed_seconds / 60), 1) if elapsed_seconds >= 10 else None

        return self._feedback(
            text=snapshot, word_count=word_count, fillers=fillers, wpm=wpm,
            pace_source="typing", answer_seconds=elapsed_seconds,
        )

    def analyze_spoken(self, transcript: str, audio_seconds: float) -> CoachingFeedback:
        if self.answer_started_at is None:
            self.answer_started_at = self._clock()
        self.chunk_count += 1

        self.spoken_words += _count_words(transcript)
        self.spoken_seconds += max(0.0, audio_seconds)
        for label, n in find_fillers(transcript).items():
            self.spoken_fillers[label] = self.spoken_fillers.get(label, 0) + n

        wpm = None
        if self.spoken_seconds >= 3:
            wpm = round(self.spoken_words / (self.spoken_seconds / 60), 1)

        return self._feedback(
            text=transcript, word_count=self.spoken_words, fillers=dict(self.spoken_fillers),
            wpm=wpm, pace_source="speech", answer_seconds=self.spoken_seconds,
        )

    # ---- scoring ----

    def _feedback(self, text, word_count, fillers, wpm, pace_source, answer_seconds) -> CoachingFeedback:
        filler_count = sum(fillers.values())
        confidence = 10.0
        confidence -= self._filler_penalty(filler_count, word_count)
        if pace_source == "speech" and wpm is not None:
            if wpm > FAST_WPM:
                confidence -= 2.0
            elif wpm < SLOW_WPM:
                confidence -= 1.5
            if answer_seconds > LONG_ANSWER_SECONDS:
                confidence -= 1.0
        confidence -= self._content_quality_penalty(text, word_count)
        confidence = max(0.0, min(10.0, confidence))

        ranked = sorted(fillers.items(), key=lambda kv: kv[1], reverse=True)
        return CoachingFeedback(
            hesitations=filler_count,
            fillers_found=[f"{label} (x{n})" for label, n in ranked],
            words_per_minute=wpm,
            confidence_score=round(confidence, 1),
            suggestion=self._suggestion(wpm, pace_source, ranked, answer_seconds),
            word_count=word_count,
            filler_count=filler_count,
            pace_source=pace_source,
            filler_breakdown=dict(ranked),
        )

    @staticmethod
    def _filler_penalty(filler_count: int, word_count: int) -> float:
        # By density, not raw count: 4 fillers in a 400-word answer is
        # natural speech; 4 in a 20-word answer is not. The 50-word floor
        # keeps one "um" in a short first clip from tanking the score.
        if not filler_count:
            return 0.0
        per_hundred = filler_count / max(word_count, 50) * 100
        return min(5.0, per_hundred * 0.6)

    @staticmethod
    def _content_quality_penalty(text: str, word_count: int) -> float:
        if word_count < 5:
            return 8.0
        if word_count < 15:
            return 4.0
        cleaned = text.strip()
        alpha_chars = sum(c.isalpha() or c.isspace() for c in cleaned)
        if alpha_chars / max(len(cleaned), 1) < 0.7:
            return 6.0
        return 0.0

    @staticmethod
    def _suggestion(wpm, pace_source, ranked_fillers, answer_seconds) -> str:
        if pace_source == "speech" and wpm is not None:
            if wpm > FAST_WPM:
                return "Slow down — you are speaking too fast. Target 130-150 WPM."
            if wpm < SLOW_WPM:
                return "Pick up your pace slightly — you sound uncertain."
        if sum(n for _, n in ranked_fillers) >= 3:
            return f"Watch the filler words: {', '.join(label for label, _ in ranked_fillers[:3])}"
        if answer_seconds > 150:
            return "You have been going for 2.5 minutes — start wrapping up."
        if answer_seconds > 90:
            return "Good length — start moving toward your conclusion."
        return "Good pace and clarity — keep going."

    def get_session_summary(self) -> dict:
        fillers = self.spoken_fillers if self.spoken_words else find_fillers(self.typed_snapshot)
        return {
            "total_words": self.spoken_words or _count_words(self.typed_snapshot),
            "total_fillers": sum(fillers.values()),
            "filler_breakdown": fillers,
            "chunks_analyzed": self.chunk_count,
        }
