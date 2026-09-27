# backend/api/errors.py
# Every failure leaves the API as {"error": "<human-readable message>"} with
# a real HTTP status code — the one body shape the frontend reads.

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException


class APIError(Exception):
    """
    Raised by route handlers for any expected failure. Rendered by the
    handler below as {"error": message} with a real HTTP status code —
    the same body shape the frontend has always read, but no longer
    disguised as a 200 OK, so clients, logs, and monitoring can tell a
    failure from a success.
    """
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, exc: APIError):
        return JSONResponse(status_code=exc.status_code, content={"error": exc.message})

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        return JSONResponse(
            status_code=429,
            content={"error": "Too many requests. Please slow down and try again in a minute."},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        # Turn pydantic's nested error list into one readable sentence, keeping
        # the {"error": ...} shape every other failure uses.
        first = exc.errors()[0] if exc.errors() else {}
        field = ".".join(str(p) for p in first.get("loc", []) if p != "body")
        message = first.get("msg", "Invalid request")
        return JSONResponse(
            status_code=422,
            content={"error": f"{field}: {message}" if field else message},
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})
