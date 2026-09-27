# backend/api/routes/auth.py
# Signup, login, password change, and signing out everywhere.

import structlog
from fastapi import APIRouter, Depends, Request

from api.deps import limiter, require_user_id
from api.errors import APIError
from api.schemas import ChangePasswordRequest, LoginRequest, SignupRequest
from auth import create_access_token, hash_password, validate_password_strength, verify_password
from database import SessionLocal
from models import User

logger = structlog.get_logger()
router = APIRouter(tags=["auth"])

# Checked when the email is unknown, so a missing account costs the same
# bcrypt time as a wrong password — response timing no longer reveals which
# emails are registered.
_DUMMY_HASH = hash_password("timing-equaliser-not-a-real-password")


def _issue_token(user: User) -> str:
    # tv (token version) is compared on every request; see api.deps.
    return create_access_token({"user_id": user.id, "email": user.email, "tv": user.token_version or 0})


def _auth_response(user: User) -> dict:
    return {
        "access_token": _issue_token(user),
        "user": {"id": user.id, "email": user.email, "name": user.name, "elo_rating": user.elo_rating},
    }


@router.post("/auth/signup")
@limiter.limit("5/minute")
def signup(payload: SignupRequest, request: Request):
    # Normalize email casing so "User@Example.com" and "user@example.com"
    # are always treated as the same account, both here and at login.
    email = payload.email.strip().lower()

    password_error = validate_password_strength(payload.password)
    if password_error:
        raise APIError(400, password_error)

    name = payload.name.strip()
    if not name:
        raise APIError(400, "Name cannot be empty")

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise APIError(409, "An account with this email already exists")

        user = User(
            email=email,
            name=name,
            hashed_password=hash_password(payload.password),
            elo_rating=1200.0,
            token_version=0,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("user_signed_up", user_id=user.id, email=user.email)
        return _auth_response(user)
    finally:
        db.close()


@router.post("/auth/login")
@limiter.limit("5/minute")
def login(payload: LoginRequest, request: Request):
    email = payload.email.strip().lower()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        password_ok = verify_password(payload.password, user.hashed_password if user else _DUMMY_HASH)
        if not user or not password_ok:
            raise APIError(401, "Invalid email or password")

        logger.info("user_logged_in", user_id=user.id)
        return _auth_response(user)
    finally:
        db.close()


@router.post("/auth/change-password")
@limiter.limit("5/minute")
def change_password(payload: ChangePasswordRequest, request: Request, user_id: int = Depends(require_user_id)):
    """Changes the password and signs out every other device (all earlier
    tokens are revoked); returns a fresh token for this one."""
    password_error = validate_password_strength(payload.new_password)
    if password_error:
        raise APIError(400, password_error)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).with_for_update().first()
        if not user:
            raise APIError(401, "Account not found. Please log in again.")
        if not verify_password(payload.current_password, user.hashed_password):
            raise APIError(400, "Current password is incorrect")
        if verify_password(payload.new_password, user.hashed_password):
            raise APIError(400, "New password must be different from the current one")

        user.hashed_password = hash_password(payload.new_password)
        user.token_version = (user.token_version or 0) + 1
        db.commit()
        db.refresh(user)
        logger.info("password_changed", user_id=user_id)
        return _auth_response(user)
    finally:
        db.close()


@router.post("/auth/logout-all")
def logout_everywhere(user_id: int = Depends(require_user_id)):
    """Revokes every token for this account, including the caller's."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).with_for_update().first()
        if user:
            user.token_version = (user.token_version or 0) + 1
            db.commit()
        logger.info("signed_out_everywhere", user_id=user_id)
        return {"status": "ok"}
    finally:
        db.close()
