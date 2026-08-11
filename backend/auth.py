# backend/auth.py
# Handles password hashing and JWT token creation/verification.
# Uses bcrypt directly instead of passlib, since passlib's bcrypt
# backend has a known compatibility bug with newer bcrypt versions.

import os
import bcrypt
from datetime import datetime, timedelta
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
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None