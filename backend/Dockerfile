# backend/Dockerfile

FROM python:3.12-slim

# ffmpeg is required for Whisper to decode audio
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway provides the PORT environment variable dynamically.
# --proxy-headers + --forwarded-allow-ips: Railway terminates TLS at a proxy,
# so without these every request appears to come from the proxy's IP — and
# the per-IP rate limiter would lump ALL users into one shared bucket.
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
