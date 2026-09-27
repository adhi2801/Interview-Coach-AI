# backend/api/deps.py
# Request-scoped dependencies shared by every router: auth and rate limiting.

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from slowapi import Limiter
from slowapi.util import get_remote_address

from api.errors import APIError
from auth import decode_access_token

security = HTTPBearer(auto_error=False)

# Rate limiter: protects the Anthropic API budget by capping how many
# requests a single IP can make per time window. Keyed on the real client
# IP — uvicorn runs with --proxy-headers (see Dockerfile) so this is the
# X-Forwarded-For address, not Railway's load balancer shared by everyone.
limiter = Limiter(key_func=get_remote_address)


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int | None:
    """
    Optional auth. No token -> None (anonymous use is allowed on routes
    that depend on this directly). A token that IS sent but is expired or
    invalid -> 401, rather than silently treating the caller as anonymous:
    previously an expired token made every personalized route quietly
    return empty data, so the UI looked logged-in but showed nothing.
    """
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload or not payload.get("user_id"):
        raise APIError(401, "Your session has expired. Please log in again.")
    return payload["user_id"]


def require_user_id(user_id: int | None = Depends(get_current_user_id)) -> int:
    """Required auth — use on every route that reads or writes user data."""
    if not user_id:
        raise APIError(401, "Authentication required")
    return user_id
