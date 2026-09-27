"""
Transcribes one audio file through the same pipeline the live coaching
socket uses (faster-whisper -> ConfidenceCoach) and prints the result.

HOW TO USE (from backend/, venv active; downloads the model on first run):
    python -m scripts.smoke.transcriber path/to/recording.webm
    WHISPER_MODEL=tiny python -m scripts.smoke.transcriber clip.wav   # faster, less accurate
"""

import sys
import time

from engines.confidence_coach import ConfidenceCoach
from engines.transcriber import Transcriber

with open(sys.argv[1], "rb") as f:
    audio = f.read()

start = time.time()
transcript = Transcriber().transcribe(audio)
print(f"Transcribed {transcript.audio_seconds:.1f}s of audio in {time.time() - start:.1f}s")
print(f"Text: {transcript.text!r}")

feedback = ConfidenceCoach().analyze_spoken(transcript.text, transcript.audio_seconds)
print(f"Pace: {feedback.words_per_minute} wpm | fillers: {feedback.fillers_found} | "
      f"confidence: {feedback.confidence_score}/10")
print(f"Suggestion: {feedback.suggestion}")
