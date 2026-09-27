# backend/timeutil.py
# datetime.utcnow() is deprecated (Python 3.12+). Every DateTime column in
# models.py is timezone-naive and stores UTC, so this returns exactly what
# utcnow() did — a naive UTC datetime — without the deprecation, and without
# mixing aware and naive values in comparisons (which raises TypeError).

from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)
