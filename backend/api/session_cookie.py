# backend/api/session_cookie.py
# How the web app holds its login. The browser build reaches the API through
# its own origin (/api, proxied to this service), so the login token can live
# in an HttpOnly cookie that page script, injected or not, can never read.
# Callers that don't ask for a cookie (scripts, tests, an older frontend build
# that still talks to this service directly) keep getting a bearer token.

import os
import re

from fastapi import Request, Response

from auth import ACCESS_TOKEN_EXPIRE_MINUTES

COOKIE_NAME = "ic_session"
# The web app sends this on every request once it runs in cookie mode.
MODE_HEADER = "x-session-mode"

# Origins allowed to call the API: CORS for direct calls, and the check on
# cookie-authenticated writes below. Only this project's own deployments
# (production and preview URLs all start with the project name), not every
# site on vercel.app or railway.app, which anyone can deploy to. Extra exact
# origins come from CORS_ALLOW_ORIGINS; local dev on :3000 is always allowed.
ALLOWED_ORIGINS = ["http://localhost:3000"] + [
    o.strip() for o in os.getenv("CORS_ALLOW_ORIGINS", "").split(",") if o.strip()
]
ALLOWED_ORIGIN_REGEX = r"https://interview-coach-ai[a-z0-9-]*\.(vercel\.app|up\.railway\.app)"

_LOCAL_HOSTS = {"localhost", "127.0.0.1", "testserver"}
_UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def is_allowed_origin(origin: str | None) -> bool:
    return bool(origin) and (origin in ALLOWED_ORIGINS or re.fullmatch(ALLOWED_ORIGIN_REGEX, origin) is not None)


def wants_cookie(request: Request) -> bool:
    return request.headers.get(MODE_HEADER, "").lower() == "cookie"


def is_forged_write(request: Request) -> bool:
    """A cookie-authenticated write whose Origin isn't the app's own.

    SameSite=Lax already keeps the cookie off cross-site POSTs; this is the
    second lock, and it also covers sibling subdomains Lax treats as
    same-site. Browsers send Origin on every non-GET fetch."""
    return request.method in _UNSAFE_METHODS and not is_allowed_origin(request.headers.get("origin"))


def _secure(request: Request) -> bool:
    # Plain http only for local development; everywhere else (Railway sees
    # https through its proxy) the cookie never travels unencrypted.
    return not (request.url.scheme == "http" and request.url.hostname in _LOCAL_HOSTS)


def set_session_cookie(response: Response, request: Request, token: str) -> None:
    response.set_cookie(
        COOKIE_NAME, token, max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60, path="/",
        httponly=True, secure=_secure(request), samesite="lax",
    )


def clear_session_cookie(response: Response, request: Request) -> None:
    response.delete_cookie(COOKIE_NAME, path="/", httponly=True, secure=_secure(request), samesite="lax")
