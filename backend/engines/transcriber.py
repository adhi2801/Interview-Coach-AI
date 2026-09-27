# backend/engines/transcriber.py
#
# Speech-to-text for the live coaching socket, on faster-whisper (the same
# Whisper weights, run through CTranslate2 with int8 quantisation). Versus
# the previous openai-whisper setup this is ~4x faster on CPU and uses far
# less RAM — and it supports true parallel transcription, so one global lock
# no longer queues every user's audio behind everyone else's.
#
# Concurrency is bounded, not unbounded: WHISPER_WORKERS model workers, and
# a semaphore of the same size, so a burst of recordings waits briefly
# instead of oversubscribing the CPU and OOMing a small instance.

import io
import os
import threading
from dataclasses import dataclass

import structlog

logger = structlog.get_logger()

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
WHISPER_WORKERS = max(1, int(os.getenv("WHISPER_WORKERS", "2")))
WHISPER_CPU_THREADS = max(1, int(os.getenv("WHISPER_CPU_THREADS", "2")))

# Whisper tends to "clean up" disfluencies, silently dropping the very
# ums and uhs the coach exists to catch. A disfluent prompt nudges it to
# transcribe speech as spoken (a documented Whisper prompting technique).
DISFLUENT_PROMPT = "Umm, so, like, let me think... uh, okay. I mean, you know, it's, hmm, basically this."


@dataclass
class Transcript:
    text: str
    audio_seconds: float


class Transcriber:
    def __init__(self):
        self._model = None
        self._load_lock = threading.Lock()
        self._slots = threading.BoundedSemaphore(WHISPER_WORKERS)

    def _get_model(self):
        # Loaded lazily, once: most requests never touch audio, and the
        # model download/initialisation shouldn't delay app startup.
        if self._model is None:
            with self._load_lock:
                if self._model is None:
                    from faster_whisper import WhisperModel
                    logger.info("whisper_model_loading", model=WHISPER_MODEL, workers=WHISPER_WORKERS)
                    self._model = WhisperModel(
                        WHISPER_MODEL, device="cpu", compute_type="int8",
                        cpu_threads=WHISPER_CPU_THREADS, num_workers=WHISPER_WORKERS,
                    )
                    logger.info("whisper_model_ready")
        return self._model

    def warm_up(self) -> None:
        self._get_model()

    def transcribe(self, audio_bytes: bytes) -> Transcript:
        """Blocking: call via run_in_threadpool, never on the event loop."""
        with self._slots:
            segments, info = self._get_model().transcribe(
                io.BytesIO(audio_bytes),
                language="en",
                beam_size=1,
                vad_filter=True,
                condition_on_previous_text=False,
                initial_prompt=DISFLUENT_PROMPT,
            )
            # segments is a generator: decoding happens while iterating, so
            # this must stay inside the semaphore.
            text = "".join(segment.text for segment in segments).strip()
        return Transcript(text=text, audio_seconds=float(info.duration or 0.0))
