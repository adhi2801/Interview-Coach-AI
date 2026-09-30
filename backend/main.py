# backend/main.py
# Application assembly only: logging, error reporting, middleware, error
# handlers, and the routers. Route handlers live in api/routes/, shared
# singletons in api/services.py.

import logging
import os
import threading
from contextlib import asynccontextmanager

import sentry_sdk
import structlog
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

load_dotenv()

if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=0.1)

# Structured logging: every log line is a parseable JSON object with
# consistent fields, instead of plain print() strings.
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,  # request_id from RequestContextMiddleware
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer()
    ]
)
logger = structlog.get_logger()
logging.basicConfig(level=logging.INFO)

from api import services  # noqa: E402  (engines log on import; configure logging first)
from api.deps import limiter  # noqa: E402
from api.errors import register_error_handlers  # noqa: E402
from api.middleware import RequestContextMiddleware  # noqa: E402
from api.session_cookie import ALLOWED_ORIGIN_REGEX, ALLOWED_ORIGINS  # noqa: E402
from api.routes import auth, coaching, coding, interview, meta, replay, user  # noqa: E402


def _warm_in_background(name: str, load) -> None:
    def run():
        try:
            load()
            logger.info("model_warmed", model=name)
        except Exception as e:  # a failed warm-up just means a slower first request
            logger.warning("model_warm_up_failed", model=name, error=str(e))
    threading.Thread(target=run, name=f"warm-{name}", daemon=True).start()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("application_started", note="schema managed by Alembic migrations")
    # Warm the models in the background: startup (and Railway's health
    # check) isn't blocked, and the first interview doesn't pay the load
    # time inside its request. Whisper is opt-in since it holds ~0.5 GB of
    # RAM that audio-free deployments never need.
    _warm_in_background("embeddings", services.difficulty_engine.vector_store.warm_up)
    if os.getenv("WHISPER_PRELOAD", "").lower() in ("1", "true", "yes"):
        _warm_in_background("whisper", services.transcriber.warm_up)
    yield
    services.code_executor.close()


app = FastAPI(title="InterviewCoach AI", version="1.2.0", lifespan=lifespan)
app.state.limiter = limiter
register_error_handlers(app)

# Direct cross-origin calls carry a bearer header; the session cookie is only
# ever sent same-origin, through the web app's /api proxy, so credentialed
# CORS is not needed at all. See api/session_cookie.py for the origin list.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Most responses here are JSON dashboards/replays that compress 5-10x.
app.add_middleware(GZipMiddleware, minimum_size=1024)
# Added last = outermost: the request id is bound before anything else runs.
app.add_middleware(RequestContextMiddleware)

for module in (meta, auth, interview, replay, user, coding, coaching):
    app.include_router(module.router)
