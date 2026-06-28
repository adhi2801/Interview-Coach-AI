# backend/content_filter.py
# Uses better-profanity, a maintained library with a comprehensive
# word list, instead of a hand-maintained list that can never be complete.

from better_profanity import profanity

profanity.load_censor_words()


def contains_profanity(text: str) -> bool:
    return profanity.contains_profanity(text)


def sanitize_for_storage(text: str) -> str:
    return profanity.censor(text)