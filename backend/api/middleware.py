# backend/api/middleware.py
# Pure ASGI middleware (not BaseHTTPMiddleware), so it adds no per-request
# task overhead and passes WebSockets through untouched.

import re
import time
import uuid

import structlog

logger = structlog.get_logger()

_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")

SECURITY_HEADERS = [
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"no-referrer"),
]
HSTS = (b"strict-transport-security", b"max-age=31536000; includeSubDomains")


class RequestContextMiddleware:
    """
    - Gives every request an id (reusing a well-formed incoming
      X-Request-ID), binds it to every log line written while handling the
      request, and returns it in the response — so a user's "it broke" can
      be traced to the exact server logs.
    - Logs one request_completed line with status and duration.
    - Adds security headers to every HTTP response (HSTS only over HTTPS,
      which behind Railway's proxy shows up as X-Forwarded-Proto).
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        incoming = headers.get(b"x-request-id", b"").decode("latin-1")
        request_id = incoming if _SAFE_REQUEST_ID.match(incoming) else uuid.uuid4().hex
        https = scope.get("scheme") == "https" or headers.get(b"x-forwarded-proto") == b"https"
        scope.setdefault("state", {})["request_id"] = request_id

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        started = time.perf_counter()
        finished = None
        status = 500

        async def send_with_headers(message):
            nonlocal status, finished
            if message["type"] == "http.response.body" and not message.get("more_body"):
                # Background tasks (e.g. answer scoring) run after this,
                # still inside the call; they are not response time.
                finished = time.perf_counter()
            if message["type"] == "http.response.start":
                status = message["status"]
                extra = [(b"x-request-id", request_id.encode()), *SECURITY_HEADERS]
                if https:
                    extra.append(HSTS)
                message["headers"] = list(message.get("headers", [])) + extra
            await send(message)

        try:
            await self.app(scope, receive, send_with_headers)
        finally:
            logger.info(
                "request_completed",
                method=scope["method"], path=scope["path"], status=status,
                duration_ms=round(((finished or time.perf_counter()) - started) * 1000, 1),
            )
            structlog.contextvars.clear_contextvars()
