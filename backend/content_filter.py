# backend/content_filter.py
# Basic profanity detection for answer text. This is intentionally
# conservative — it flags only clear cases, since false positives
# would block legitimate technical answers (e.g. "branch" containing
# substrings is a classic false-positive trap, so we match whole words only).

import re

BLOCKED_WORDS = [
    "fuck", "shit", "asshole", "bitch", "bastard", "cunt", "dick",
    "wtf", "stfu", "fuckyou", "piss off", "bitch ass nigga",
]


def contains_profanity(text: str) -> bool:
    lowered = text.lower()
    for word in BLOCKED_WORDS:
        pattern = r'\b' + re.escape(word) + r'\b'
        if re.search(pattern, lowered):
            return True
    return False


def sanitize_for_storage(text: str) -> str:
    """Replaces profanity with asterisks for safe storage/display, rather than rejecting outright."""
    lowered = text
    for word in BLOCKED_WORDS:
        pattern = re.compile(r'\b' + re.escape(word) + r'\b', re.IGNORECASE)
        lowered = pattern.sub("*" * len(word), lowered)
    return lowered