# backend/tests/conftest.py
#
# Makes the suite hermetic: runs before any test module imports app code,
# so these values win over backend/.env (load_dotenv never overrides a
# variable that is already set). Nothing under test can reach the real
# Postgres, Redis, Sentry, or a paid API — on a laptop or in CI.

import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "test-only-secret-key-that-is-long-enough-for-hs256"
os.environ["ANTHROPIC_API_KEY"] = "test-key-never-sent"
os.environ["REDIS_URL"] = ""
os.environ["SENTRY_DSN"] = ""
os.environ["JUDGE0_API_KEY"] = ""
