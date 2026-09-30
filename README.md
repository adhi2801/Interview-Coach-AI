# InterviewCoach AI

[![CI](https://github.com/adhi2801/Interview-Coach-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/adhi2801/Interview-Coach-AI/actions/workflows/ci.yml)

> An AI-powered mock interview platform that adapts to a user's skill level, simulates company-specific interview styles, and provides real-time coaching during technical and coding interviews.

### Live Demo
- Frontend: https://interview-coach-ai-three.vercel.app
- Backend API: https://interview-coach-ai-production.up.railway.app
- API Docs (Swagger): https://interview-coach-ai-production.up.railway.app/docs
- Repository: https://github.com/adhi2801/Interview-Coach-AI

---

## Demo

*(Walkthrough — real-time WPM/filler-word telemetry, Socratic vs. Hostile interviewer mutation, and the Judge0 sandboxed code execution pipeline)*

[Watch the demo](https://www.loom.com/share/c3711b231d614d26995cf5b2a0ba922f)

| Overview | Interview |
|---|---|
| ![Overview: rating over time, what to work on next, scores by dimension](docs/screenshots/overview.jpg) | ![Interview room: the question, the answer, live coaching](docs/screenshots/interview.jpg) |
| **Debrief** | **Coding room** |
| ![Debrief: the score, how it scored on five dimensions, what to study](docs/screenshots/debrief.jpg) | ![Coding room: problem, editor, review of a submission](docs/screenshots/coding.jpg) |
| **Interview setup** | **Knowledge graph** |
| ![Interview setup: company, role and level, interviewer, and a brief of the company's loop](docs/screenshots/setup.jpg) | ![Knowledge graph: 93 topics by prerequisite depth, gaps first](docs/screenshots/knowledge-graph.jpg) |

---

## System Architecture

```mermaid
flowchart TB
    User[Browser — React + Motion]
    API[FastAPI REST API]
    WS[WebSocket Coaching Engine]
    DB[(PostgreSQL<br/>data + RAG question store)]
    Cache[(Redis Cache)]
    Claude[Claude API<br/>question generation + scoring]
    Whisper[Whisper<br/>speech transcription]
    Judge0[Judge0 Sandbox<br/>code execution]

    User -->|HTTPS| API
    User -->|WS| WS
    API --> DB
    API --> Cache
    API --> Claude
    WS --> Whisper
    WS --> Claude
    API --> Judge0

    style User fill:#1a1a2e,stroke:#6366f1,color:#fff
    style API fill:#0f3460,stroke:#6366f1,color:#fff
    style Claude fill:#16213e,stroke:#f59e0b,color:#fff
```

---

## Features

### Adaptive Interview Engine
- ELO-based difficulty adjustment.
- Company-specific interview simulation.
- Knowledge gap detection with prerequisite recommendations.
- Real-time confidence and communication coaching.
- Peer percentile comparison.
- Session replay and diagnostics.

### Coding Interview Engine
- Monaco Editor.
- Python, JavaScript, Java and C++ support.
- Sandboxed code execution using Judge0.
- Adaptive coding problem selection.
- AI-powered Socratic hints.
- Hidden and visible test case evaluation.

---

## Core Engines

| Engine | Description |
|-------|-------|
| Adaptive Difficulty | Dynamically adjusts question difficulty using an ELO rating system. |
| Company DNA | Simulates interviewing styles of top tech companies. |
| Knowledge Graph | Identifies prerequisite topics and recommends study paths. |
| Confidence Coach | Tracks communication metrics in real time. |
| 5-Dimension Scoring | Evaluates technical and behavioral performance. |
| Peer Comparison | Benchmarks performance against other users. |
| Replay System | Reconstructs complete interview sessions. |

---

## Tech Stack

### Frontend
- React
- Tailwind CSS
- Motion (formerly Framer Motion)
- Monaco Editor
- Recharts
- WebSockets

### Backend
- FastAPI
- PostgreSQL
- Redis
- SQLAlchemy
- Alembic
- faster-whisper (Whisper on CTranslate2, int8)
- Claude API (structured outputs)
- Judge0

### Infrastructure
- Railway
- Vercel
- JWT + bcrypt authentication; the web app's login is an HttpOnly cookie, same-origin through a Vercel Function proxy at /api
- SlowAPI
- Structlog
- Sentry

---

## API Documentation

Every endpoint is documented via FastAPI's auto-generated OpenAPI schema — no separate docs to maintain, always in sync with the actual code:

- **Interactive Swagger UI:** https://interview-coach-ai-production.up.railway.app/docs
- **Raw OpenAPI JSON:** https://interview-coach-ai-production.up.railway.app/openapi.json

---

## Project Structure

```
backend/
  main.py            app assembly: middleware, error handlers, routers
  api/routes/        one router per area: auth, interview, coding, coaching, replay, user, catalogue
  api/services.py    shared engine/client singletons
  engines/           adaptive difficulty, scoring, company DNA, knowledge graph,
                     confidence coach, transcriber, peer comparison, replay
  alembic/           database migrations
  scripts/           seeding and problem-pack tooling; scripts/smoke/ = manual checks against paid APIs
  data/              verified coding problem packs
  tests/             pytest suite (hermetic: no network, no real database)
frontend/            React + Vite SPA
```

---

## Integrity and Security

A candidate's answer decides their rating and feeds everyone else's percentiles, so grading is treated as an attack surface:

- **Prompt-injection hardening.** Answers are fenced in delimiters they cannot close, the grader returns a JSON-schema-enforced result, and any answer that tries to instruct the grader is scored zero by the server.
- **Server-side truth.** Answers are graded against the question the server actually asked, and ELO uses the server's difficulty and rating, never values the client sends.
- **Ownership checks** on every session, job, replay and submission route; the same 404 whether a record is missing or someone else's.
- **WebSocket tickets.** The live-coaching socket takes a one-minute ticket bound to one session, so the login token never appears in a URL or access log.
- Rate limits per IP plus a per-user daily token budget in front of every paid API call; generating a profile for an unknown company needs an account.
- Every response carries an `X-Request-ID` that is bound to every log line for that request, and a server error shows the user a short reference to it.
- Security headers on the API and the frontend; CORS limited to this project's own deployments; the built frontend ships a Content Security Policy (scripts only from its own origin and jsDelivr), checked by a browser test on every page.
- **Accounts.** bcrypt with timing-equalised logins; login tokens last a day and renew while the app is open; "sign out everywhere" and password changes revoke every token. Password reset emails a signed, single-use, 30-minute link (its token travels in the URL fragment), and neither the reply nor its timing reveals whether an email is registered.
- Rate limits are keyed on the address the hosting proxy saw, not the caller-writable left end of `X-Forwarded-For`.

## Accessibility

Every route (auth and password reset, overview, setup, mic check, interview room and debrief, coding room, knowledge graph, sessions, settings) is audited with axe-core against WCAG 2 A/AA in CI and has no violations; every page is also checked at phone width for sideways scrolling. Animated text keeps a real, screen-reader-visible copy; icon-only controls are labelled; dialogs are `alertdialog`s that close on Escape.

---

## RAG Pipeline

- Interview questions are embedded and tagged by difficulty, topic, and company, then stored in PostgreSQL.
- Questions are retrieved using cosine similarity.
- Retrieved prompts are dynamically rewritten into company-specific interviewing styles.
- Uses Retrieval-Augmented Generation instead of static prompting.

---

## Running Locally

```bash
git clone https://github.com/adhi2801/Interview-Coach-AI.git
```

### Everything at once (Docker)
```bash
ANTHROPIC_API_KEY=sk-ant-... docker compose up --build   # Postgres, Redis, API, frontend
```
Then seed once (next section's `python -m scripts...` commands, prefixed with `docker compose exec backend`).

### Backend
```bash
cd backend
python -m venv venv
pip install -r requirements-dev.txt
# .env: DATABASE_URL, JWT_SECRET_KEY, ANTHROPIC_API_KEY
#       optional: REDIS_URL, JUDGE0_API_KEY, SENTRY_DSN, CLAUDE_MODEL, WHISPER_MODEL
#       password reset email: FRONTEND_URL (where reset links point), MAIL_FROM,
#       SMTP_HOST, SMTP_PORT (587), SMTP_USERNAME, SMTP_PASSWORD — any SMTP
#       provider works. Without SMTP, local runs print the reset link to the log.
#       PROXY_SECRET: same value as on Vercel, so rate limits see each caller's
#       own address through the /api proxy.
alembic upgrade head
python -m scripts.seed_topics
python -m scripts.seed_coding_problems
python -m scripts.seed_verified_problems                               # the original 15 verified problems
python -m scripts.seed_verified_problems verified_problems_pack2.json  # 38 more (problem pack 2)
python -m scripts.seed_verified_problems verified_problems_pack3.json  # 30 more (problem pack 3)
# or all packs at once (the container does this on every start; existing problems are skipped):
python -m scripts.seed_verified_problems all
python -m scripts.seed_db
uvicorn main:app --reload
```

Problem packs 2 and 3 are built by `python -m scripts.build_problem_pack pack2|pack3` from `problem_bank/`:
every reference solution is run as a real stdin/stdout program and checked
against an independent brute-force solution on every test case before the
problem is written out. Seeding is idempotent (existing slugs are skipped).

### Frontend
```bash
cd frontend
npm install
npm run dev    # http://localhost:3000; /api is forwarded to the backend on :8000
```

The app calls its API at `/api` on its own origin, so the login can be an
HttpOnly cookie. On Vercel, `api/backend.js` forwards `/api/*` to the backend;
set `BACKEND_URL` (the Railway URL), `PROXY_SECRET` (same as the backend's) and
`REACT_APP_WS_URL` (the backend's `wss://` URL, for live coaching). Leave
`REACT_APP_API_URL` unset; pointing it at the backend directly makes the app
fall back to a bearer token kept in localStorage.

---

## Testing

```bash
cd backend && ruff check . && pytest               # 107 tests, ~25s, no network or real database needed
cd frontend && npm run lint && npm test             # ESLint + 41 Vitest unit tests
cd frontend && npm run build && npm run test:e2e    # 48 Playwright browser tests (axe, CSP and phone-width checks), API mocked
```

The mocked API is held to the real one: `contracts/api-responses.json` lists the fields of the core responses, and both the backend tests and a frontend unit test check against it.

CI runs all of the above on every push and pull request (Dependabot keeps dependencies current), and also applies every Alembic migration to a fresh Postgres and fails if `models.py` has drifted from them.

Backend coverage includes the Judge0 client against a fake Judge0 (verdicts, polling, failure reasons), peer percentiles, company profiles, request tracing, auth and ownership on every user-data route, the atomic scoring/ELO pipeline, grading-integrity and prompt-injection defences, the live-coaching socket and its tickets, filler/pace detection in the confidence coach, ELO math, category classification, and knowledge-graph traversal and gap extraction.

---

## Future Improvements
- Streaming voice transcription.
- PostgreSQL Row-Level Security.
- WebRTC-based audio support.
- LLM observability tooling.

---

## Author

**Adhiswauran V**
- B.Tech Computer Science (AI)
- Portfolio Project

Also built:
- Real-Time Fraud Detection Engine (Go, Kafka, XGBoost, AUC 0.98)
