# backend/auth.py
# Handles password hashing and JWT token creation/verification.
# Uses bcrypt directly instead of passlib, since passlib's bcrypt
# backend has a known compatibility bug with newer bcrypt versions.

import os
import bcrypt
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

# Fail loudly if this isn't set, rather than silently signing real tokens
# with a fallback secret that's sitting in plain text in a public GitHub
# repo. A missing env var should be a startup crash, not a security hole.
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY environment variable is not set. Refusing to start "
        "with an insecure default — set a real secret in your .env / "
        "deployment environment before running the app."
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

MIN_PASSWORD_LENGTH = 8


def hash_password(password: str) -> str:
    # bcrypt has a hard 72-byte limit on input, so truncate defensively
    password_bytes = password.encode("utf-8")[:72]
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode("utf-8")[:72]
    return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))


def validate_password_strength(password: str) -> str | None:
    """
    Returns an error message string if the password is too weak to accept,
    or None if it's fine. Call this at signup/password-change routes
    BEFORE calling hash_password — hash_password itself will happily hash
    an empty string, so this check has to live at the call site, not
    inside hashing.
    """
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        return f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    return None


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    # A WebSocket ticket is signed with the same key but must never work
    # as a bearer token for the HTTP API.
    if payload.get("scope", "access") != "access":
        return None
    return payload


# Browsers can't send an Authorization header on a WebSocket, so the token
# has to travel in the URL — where proxies and access logs record it. The
# socket therefore takes a ticket, not the 7-day login token: valid for one
# minute, for one session, and useless anywhere else.
WS_TICKET_TTL_SECONDS = 60


def create_ws_ticket(user_id: int, session_id: int) -> str:
    return jwt.encode({
        "user_id": user_id,
        "session_id": session_id,
        "scope": "ws",
        "exp": datetime.now(timezone.utc) + timedelta(seconds=WS_TICKET_TTL_SECONDS),
    }, SECRET_KEY, algorithm=ALGORITHM)


def decode_ws_ticket(ticket: str, session_id: int) -> int | None:
    """Returns the ticket's user_id if it is a valid, unexpired WebSocket
    ticket for exactly this session; otherwise None."""
    try:
        payload = jwt.decode(ticket, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    if payload.get("scope") != "ws" or payload.get("session_id") != session_id:
        return None
    return payload.get("user_id")
