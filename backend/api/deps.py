# backend/api/deps.py
# Request-scoped dependencies shared by every router: auth and rate limiting.

import hmac
import os

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from slowapi import Limiter
from slowapi.util import get_remote_address

from api.errors import APIError
from api.session_cookie import COOKIE_NAME, is_forged_write
from auth import decode_access_token
from database import db_session
from models import User

security = HTTPBearer(auto_error=False)
PROXY_SECRET = os.getenv("PROXY_SECRET", "")

def client_ip(request: Request) -> str:
    """The caller's address as our hosting proxy saw it.

    uvicorn runs with --proxy-headers --forwarded-allow-ips='*' (see the
    Dockerfile), which makes request.client the LEFTMOST X-Forwarded-For
    entry — a value the caller can write themselves, so keying the rate
    limit on it let anyone reset their limit per request. The proxy sets
    X-Real-IP, and appends the address it saw as the RIGHTMOST
    X-Forwarded-For entry; neither can be forged from outside.
    """
    # The web app's /api proxy (frontend/api/backend.js) connects from the
    # host's shared addresses, so it passes on the caller's address along
    # with a secret only it knows. Without the secret the header is ignored.
    proxied_for = request.headers.get("x-client-ip", "").strip()
    if proxied_for and PROXY_SECRET and hmac.compare_digest(
        request.headers.get("x-proxy-secret", "").encode(), PROXY_SECRET.encode()
    ):
        return proxied_for
    real_ip = request.headers.get("x-real-ip", "").strip()
    if real_ip:
        return real_ip
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded.strip():
        return forwarded.split(",")[-1].strip()
    return get_remote_address(request)


# Rate limiter: protects the Anthropic API budget (and logins from
# guessing) by capping how many requests one address can make per window.
limiter = Limiter(key_func=client_ip)


def get_current_user_id(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)) -> int | None:
    """
    Optional auth, from a bearer header or else the web app's session
    cookie. No credential -> None (anonymous use is allowed on routes that
    depend on this directly). A credential that IS sent but is expired or
    invalid -> 401, rather than silently treating the caller as anonymous:
    previously an expired token made every personalized route quietly
    return empty data, so the UI looked logged-in but showed nothing.
    """
    from_cookie = not credentials
    token = request.cookies.get(COOKIE_NAME) if from_cookie else credentials.credentials
    if not token:
        return None
    if from_cookie and is_forged_write(request):
        raise APIError(403, "This request didn't come from the InterviewCoach app.")
    expired = APIError(401, "Your session has expired. Please log in again.", clear_session=from_cookie)
    payload = decode_access_token(token)
    if not payload or not payload.get("user_id"):
        raise expired

    # Revocation: the token's version must match the account's current one
    # (bumped by "sign out everywhere" and password changes). Tokens issued
    # before versions existed carry none and count as 0. A deleted account
    # also fails here instead of reaching the route.
    with db_session() as db:
        current = db.query(User.token_version).filter(User.id == payload["user_id"]).scalar()
    if current is None or payload.get("tv", 0) != current:
        raise expired
    return payload["user_id"]


def require_user_id(user_id: int | None = Depends(get_current_user_id)) -> int:
    """Required auth — use on every route that reads or writes user data."""
    if not user_id:
        raise APIError(401, "Authentication required")
    return user_id
