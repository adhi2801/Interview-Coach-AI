# backend/api/routes/auth.py
# Signup and login.


import structlog
from fastapi import APIRouter, Request

from api.deps import limiter
from api.errors import APIError
from api.schemas import LoginRequest, SignupRequest
from auth import create_access_token, hash_password, validate_password_strength, verify_password
from database import SessionLocal
from models import User

logger = structlog.get_logger()
router = APIRouter(tags=["auth"])

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
            elo_rating=1200.0
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token({"user_id": user.id, "email": user.email})
        logger.info("user_signed_up", user_id=user.id, email=user.email)

        return {
            "access_token": token,
            "user": {"id": user.id, "email": user.email, "name": user.name, "elo_rating": user.elo_rating}
        }
    finally:
        db.close()


@router.post("/auth/login")
@limiter.limit("5/minute")
def login(payload: LoginRequest, request: Request):
    email = payload.email.strip().lower()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user or not verify_password(payload.password, user.hashed_password):
            raise APIError(401, "Invalid email or password")

        token = create_access_token({"user_id": user.id, "email": user.email})
        logger.info("user_logged_in", user_id=user.id)

        return {
            "access_token": token,
            "user": {"id": user.id, "email": user.email, "name": user.name, "elo_rating": user.elo_rating}
        }
    finally:
        db.close()
