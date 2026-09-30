# backend/Dockerfile

FROM python:3.12-slim

# No system ffmpeg needed: faster-whisper decodes audio through PyAV, whose
# wheel bundles its own ffmpeg libraries.

WORKDIR /app

# CPU-only torch first (sentence-transformers needs it). The default PyPI
# wheel on Linux pulls several GB of CUDA libraries this CPU-only service
# never uses; installing it from the CPU index first means the requirements
# install below finds torch already satisfied.
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.12.0

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Run as an unprivileged user. Its home directory holds the Hugging Face
# model cache (embeddings + Whisper), downloaded on first use.
RUN useradd --create-home --uid 10001 app
COPY --chown=app:app . .
USER app

# Migrations run before the server starts, so the schema always matches the
# code being deployed (they are additive and idempotent; a failure stops the
# boot instead of serving against the wrong schema).
# Railway provides the PORT environment variable dynamically.
# --proxy-headers + --forwarded-allow-ips: Railway terminates TLS at a proxy,
# so without these every request appears to come from the proxy's IP — and
# the per-IP rate limiter would lump ALL users into one shared bucket.
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && python -m scripts.seed_verified_problems all && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
