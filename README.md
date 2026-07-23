# \# InterviewCoach AI

# 

# An AI-powered mock interview platform that adapts in real time to your skill level, simulates company-specific interview styles, and coaches your delivery as you speak.

# 

# \*\*Live demo:\*\* https://interview-coach-ai-three.vercel.app

# \*\*Backend API:\*\* https://interview-coach-ai-production.up.railway.app

# \*\*Repo:\*\* https://github.com/adhi2801/Interview-Coach-AI

# 

# \---

# 

# \## What this is

# 

# Most interview prep tools generate generic questions and give generic feedback. InterviewCoach AI is built around seven interconnected engines that together model what a real interviewer actually does: adapt difficulty based on performance, simulate company-specific evaluation criteria, identify knowledge gaps and the prerequisites needed to close them, and coach delivery live as you answer.

# 

# It also includes a full coding-interview track — a Monaco-based editor with sandboxed code execution, adaptive problem selection, and Socratic AI hints that nudge without ever writing the answer for you.

# 

# \## The seven engines

# 

# | Engine | What it does |

# |---|---|

# | \*\*Adaptive Difficulty (ELO)\*\* | Tracks a chess-style ELO rating per user. Every answer updates the rating, and the next question is selected to match — using `expected = 1 / (1 + 10^((Q-U)/400))` against a retrieved question bank. |

# | \*\*5-Dimension Scoring\*\* | Every answer is graded by Claude across Technical, Communication, Problem Solving, Cultural Fit, and Confidence — with structured per-dimension feedback, not a single score. |

# | \*\*Company DNA\*\* | Encodes the interview style, values, red flags, and green flags of 7+ companies (Google, Amazon, Meta, Microsoft, Apple, Netflix, startups), and dynamically generates — then caches — profiles for companies not in the database. |

# | \*\*Knowledge Gap Graph\*\* | A relational graph of 93 CS topics and 96 prerequisite relationships stored in PostgreSQL. When you miss a question, the system recursively walks the graph to generate the exact study order needed to close that gap, weighted by relevance to your target company. |

# | \*\*Confidence Coach\*\* | Analyzes filler words, words-per-minute, and tone live over a WebSocket connection as you type or speak — no manual "analyze" button. |

# | \*\*Peer Comparison\*\* | Computes your percentile against real persisted scores from other users at the same difficulty band, not synthetic data — and is honest when there isn't enough data yet rather than faking a number. |

# | \*\*Replay System\*\* | Every question, answer, score, and coaching moment is logged as a timestamped event in Postgres, reconstructible into a full session replay with tabs for the original prompt, your solution, and the full diagnostic breakdown. |

# 

# \## Coding interview track

# 

# A second, independent practice track for algorithmic coding interviews:

# 

# \- Monaco editor with Python, JavaScript, Java, and C++ support

# \- Code executes in a real sandbox (Piston) against both visible sample cases and hidden grading cases

# \- Submissions are graded on correctness (test pass rate) \*and\* quality — Claude reviews complexity, cleanliness, and naming, blended into one score

# \- A Socratic hint engine that will point out inefficiencies or ask leading questions, but is explicitly instructed never to write code for the candidate

# \- Problem selection adapts to ELO the same way the interview track does, and skips problems you've already fully solved

# 

# \## Architecture

# 

# ```

# Browser (React)

# &#x20;     │

# &#x20;     ├── REST (FastAPI) ── PostgreSQL

# &#x20;     │        │                 ├── users, sessions, answers, topics

# &#x20;     │        │                 ├── question\_embeddings (RAG store)

# &#x20;     │        │                 ├── coding\_problems, submissions

# &#x20;     │        │                 └── replay\_manifests

# &#x20;     │        │

# &#x20;     │        └── Redis (Upstash) — company-profile cache, daily token-budget rate limiting

# &#x20;     │

# &#x20;     └── WebSocket ── Whisper (voice transcription) + live coaching engine

# ```

# 

# \- \*\*Backend:\*\* FastAPI, SQLAlchemy, Alembic, PostgreSQL, Redis, Whisper, Claude API, Piston (sandboxed code execution)

# \- \*\*Frontend:\*\* React, Tailwind, Framer Motion, Recharts, Monaco Editor, WebSocket client

# \- \*\*Auth:\*\* JWT (python-jose) + bcrypt password hashing

# \- \*\*Infra:\*\* Railway (backend + Postgres + Redis), Vercel (frontend)

# \- \*\*Reliability:\*\* slowapi (per-IP rate limiting), Redis-backed daily token budget (per-user, protects the Anthropic API budget from runaway usage), Sentry (error tracking), structlog (structured JSON logging)

# 

# \## RAG pipeline

# 

# Sixty curated interview questions are embedded with `sentence-transformers/all-MiniLM-L6-v2` and stored as JSON rows in PostgreSQL, alongside each question's difficulty, topics, and company tags. When a question is needed, the user's difficulty band and target company are converted into a query vector; the closest matching question is retrieved via cosine similarity computed in Python, then rephrased by Claude into that company's authentic interviewing voice — combining real retrieval with generation, rather than pure prompting.

# 

# > This was originally built on ChromaDB with local-disk persistence. It was migrated to a Postgres-backed store because Railway's filesystem is ephemeral — anything ChromaDB wrote to disk was wiped on every redeploy, silently emptying the question bank. At this scale (dozens to low hundreds of questions), plain cosine similarity in Postgres is simpler and just as fast, with none of that failure mode.

# 

# \## Running locally

# 

# ```bash

# git clone https://github.com/adhi2801/Interview-Coach-AI.git

# cd Interview-Coach-AI

# 

# \# Backend

# cd backend

# python -m venv venv

# venv\\Scripts\\activate        # Windows

# pip install -r requirements.txt --break-system-packages

# alembic upgrade head

# python seed\_topics.py

# python seed\_coding\_problems.py

# python seed\_db.py

# uvicorn main:app --reload

# 

# \# Frontend (separate terminal)

# cd frontend

# npm install

# npm start

# ```

# 

# Backend: `http://localhost:8000` · Frontend: `http://localhost:3000` · API docs: `http://localhost:8000/docs`

# 

# Requires a `backend/.env` file with `DATABASE\_URL`, `ANTHROPIC\_API\_KEY`, `JWT\_SECRET\_KEY`, and `REDIS\_URL` at minimum. See `backend/.env` keys referenced in `database.py`, `auth.py`, and `main.py` for the full list.

# 

# \## Testing

# 

# ```bash

# cd backend

# pytest

# ```

# 

# Current coverage: ELO update math (`test\_elo.py`), the knowledge-graph prerequisite walk (`test\_knowledge\_graph.py`), and gap extraction (`test\_knowledge\_graph\_gaps.py`, fully mocked — no real API calls). Coverage is still partial; the scoring, coding-execution, and replay engines don't have dedicated tests yet.

# 

# \## Known limitations and roadmap

# 

# This is an actively developed portfolio project. Documented here deliberately, rather than glossed over:

# 

# \- \*\*Voice transcription accuracy\*\*: Whisper runs on CPU with chunked audio; accuracy is lower than a cloud STT service tuned for real-time streaming. Next step: migrate to streaming Whisper or a dedicated STT API.

# \- \*\*No Row-Level Security yet\*\*: `user\_id` scoping and ownership checks exist at the application layer on every endpoint; PostgreSQL RLS policies are the next hardening step for true multi-tenant isolation.

# \- \*\*Partial automated test coverage\*\*: core scoring math and the knowledge graph are tested; the Claude-calling engines, coding execution, and WebSocket coaching path are not yet.

# \- \*\*WebRTC vs WebSockets\*\*: current real-time audio uses WebSockets; for sub-second voice latency at scale, WebRTC is the correct next architecture.

# \- \*\*Mobile layout\*\*: functional but not fully polished on small screens — actively being improved.

# \- \*\*LLM observability\*\*: currently logged via structlog; a dedicated tool (Helicone/LangSmith) would give token-level cost and drift tracking.

# \- \*\*Account editing\*\*: Settings currently displays profile info but doesn't yet support editing name, email, or password post-signup.

# 

# \## Author

# 

# Built by Adhiswauran V — B.Tech CS/AI, 5th year. Also built \[Real-Time Fraud Detection Engine](https://github.com/adhi2801/fraud-detection-engine) (Go, Kafka, XGBoost, AUC 0.98).

