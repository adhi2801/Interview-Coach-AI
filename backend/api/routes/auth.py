# backend/api/routes/auth.py
# Signup, login, token renewal, password change and reset, and signing out
# everywhere.

import os

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, Request

import mailer
from api.deps import limiter, require_user_id
from api.errors import APIError
from api.schemas import ChangePasswordRequest, ForgotPasswordRequest, LoginRequest, ResetPasswordRequest, SignupRequest
from auth import (
    RESET_TOKEN_TTL_MINUTES, create_access_token, create_reset_token, hash_password, read_reset_token,
    reset_token_matches, validate_password_strength, verify_password,
)
from database import db_session
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

    with db_session() as db:
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


@router.post("/auth/login")
@limiter.limit("5/minute")
def login(payload: LoginRequest, request: Request):
    email = payload.email.strip().lower()

    with db_session() as db:
        user = db.query(User).filter(User.email == email).first()
        password_ok = verify_password(payload.password, user.hashed_password if user else _DUMMY_HASH)
        if not user or not password_ok:
            raise APIError(401, "Invalid email or password")

        logger.info("user_logged_in", user_id=user.id)
        return _auth_response(user)


@router.post("/auth/refresh")
@limiter.limit("30/minute")
def refresh_token(request: Request, user_id: int = Depends(require_user_id)):
    """A fresh day-long token for a still-valid one. The app calls this
    while in use, so short-lived tokens don't log active users out.
    Revoked tokens (sign out everywhere, password change) can't renew."""
    with db_session() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise APIError(401, "Account not found. Please log in again.")
        return _auth_response(user)


FORGOT_PASSWORD_REPLY = {
    "status": "ok",
    "message": "If an account uses that email, a reset link is on its way. It works for 30 minutes.",
}


def _send_reset_email(email: str, link: str) -> None:
    body = (
        "Someone asked to reset the password for your InterviewCoach account.\n\n"
        f"Choose a new password here (the link works once, for {RESET_TOKEN_TTL_MINUTES} minutes):\n{link}\n\n"
        "If this wasn't you, ignore this email; your password hasn't changed."
    )
    sent = mailer.send_email(email, "Reset your InterviewCoach password", body)
    # Local development without SMTP: print the link so the flow can be
    # tried. Never logged anywhere else — the link is a credential.
    if not sent and link.startswith(("http://localhost", "http://127.0.0.1")):
        logger.warning("password_reset_link_for_local_dev", link=link)


@router.post("/auth/forgot-password")
@limiter.limit("3/minute")
def forgot_password(payload: ForgotPasswordRequest, request: Request, background: BackgroundTasks):
    """Emails a reset link. Replies the same way whether or not the email
    has an account, and sends after replying, so neither the answer nor
    its timing reveals who is registered."""
    email = payload.email.strip().lower()
    with db_session() as db:
        user = db.query(User).filter(User.email == email).first()
        if user:
            token = create_reset_token(user.id, user.hashed_password)
            base = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
            background.add_task(_send_reset_email, user.email, f"{base}/reset-password#token={token}")
            logger.info("password_reset_requested", user_id=user.id)
        return FORGOT_PASSWORD_REPLY


@router.post("/auth/reset-password")
@limiter.limit("5/minute")
def reset_password(payload: ResetPasswordRequest, request: Request):
    """Sets a new password from a reset link, signs out every device and
    logs this one in."""
    claims = read_reset_token(payload.token)
    if not claims:
        raise APIError(400, "This reset link has expired or isn't valid. Ask for a new one.")
    password_error = validate_password_strength(payload.new_password)
    if password_error:
        raise APIError(400, password_error)

    with db_session() as db:
        user = db.query(User).filter(User.id == claims["user_id"]).with_for_update().first()
        if not user or not reset_token_matches(claims, user.hashed_password):
            raise APIError(400, "This reset link has already been used or has expired. Ask for a new one.")
        user.hashed_password = hash_password(payload.new_password)
        user.token_version = (user.token_version or 0) + 1
        db.commit()
        db.refresh(user)
        logger.info("password_reset", user_id=user.id)
        return _auth_response(user)


@router.post("/auth/change-password")
@limiter.limit("5/minute")
def change_password(payload: ChangePasswordRequest, request: Request, user_id: int = Depends(require_user_id)):
    """Changes the password and signs out every other device (all earlier
    tokens are revoked); returns a fresh token for this one."""
    password_error = validate_password_strength(payload.new_password)
    if password_error:
        raise APIError(400, password_error)

    with db_session() as db:
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


@router.post("/auth/logout-all")
def logout_everywhere(user_id: int = Depends(require_user_id)):
    """Revokes every token for this account, including the caller's."""
    with db_session() as db:
        user = db.query(User).filter(User.id == user_id).with_for_update().first()
        if user:
            user.token_version = (user.token_version or 0) + 1
            db.commit()
        logger.info("signed_out_everywhere", user_id=user_id)
        return {"status": "ok"}
