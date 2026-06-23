# InterviewCoach AI

An AI-powered mock interview platform that adapts in real time to your skill level, simulates company-specific interview styles, and coaches your delivery as you speak.

**Live demo:** https://interview-coach-ai-production.up.railway.app
**Repo:** https://github.com/adhi2801/Interview-Coach-AI

---

## What this is

Most interview prep tools generate generic questions and give generic feedback. InterviewCoach AI is built around seven interconnected engines that together model what a real interviewer actually does: adapt difficulty based on performance, simulate company-specific evaluation criteria, identify knowledge gaps and the prerequisites needed to close them, and coach delivery live as you answer.

## The seven engines

| Engine | What it does |
|---|---|
| **Adaptive Difficulty (ELO)** | Tracks a chess-style ELO rating per user. Every answer updates the rating, and the next question is selected to match — using `expected = 1 / (1 + 10^((Q-U)/400))` against a real RAG-retrieved question bank. |
| **5-Dimension Scoring** | Every answer is graded by Claude across Technical, Communication, Problem Solving, Cultural Fit, and Confidence — with structured per-dimension feedback, not a single score. |
| **Company DNA** | Encodes the interview style, values, red flags, and green flags of 7+ companies (Google, Amazon, Meta, Microsoft, Apple, Netflix, startups), and dynamically generates profiles for companies not in the database. |
| **Knowledge Gap Graph** | A relational graph of 93 CS topics and 96 prerequisite relationships stored in PostgreSQL. When you miss a question, the system recursively walks the graph to generate the exact study order needed to close that gap. |
| **Confidence Coach** | Analyzes filler words, words-per-minute, and tone live over a WebSocket connection as you type or speak — no manual "analyze" button. |
| **Peer Comparison** | Computes your percentile against real persisted scores from other users at the same difficulty band, not synthetic data. |
| **Replay System** | Every question, answer, score, and coaching moment is logged as a timestamped event, reconstructible into a full session replay. |

## Architecture
Browser (React)

│

├── REST (FastAPI) ── PostgreSQL (users, sessions, answers, topics)

│                  └── ChromaDB (RAG: semantic question retrieval)

│

└── WebSocket ── Whisper (voice transcription) + live coaching engine

- **Backend:** FastAPI, SQLAlchemy, PostgreSQL, ChromaDB, Whisper, Claude API
- **Frontend:** React, Recharts, WebSocket client
- **Auth:** JWT (python-jose) + bcrypt password hashing
- **Infra:** Docker, Railway, slowapi (rate limiting), structlog (structured JSON logging)

## RAG pipeline

Sixty curated interview questions are embedded with `sentence-transformers/all-MiniLM-L6-v2` and stored in ChromaDB. When a question is needed, the user's difficulty band and target company are converted into a query vector; the closest matching question is retrieved via cosine similarity, then rephrased by Claude into that company's authentic interviewing voice — combining real retrieval with generation, rather than pure prompting.

## Running locally

```bash
git clone https://github.com/adhi2801/Interview-Coach-AI.git
cd Interview-Coach-AI
docker-compose up
```

Backend: `http://localhost:8000` · Frontend: `http://localhost:3000` · API docs: `http://localhost:8000/docs`

Requires an `ANTHROPIC_API_KEY` set in `backend/.env`.

## Known limitations and roadmap

This is an actively developed portfolio project. Documented here deliberately, rather than glossed over:

- **Voice transcription accuracy**: Whisper runs on CPU with chunked audio; accuracy is lower than a cloud STT service tuned for real-time streaming. Next step: migrate to streaming Whisper or a dedicated STT API.
- **No Row-Level Security yet**: user_id scoping exists at the application layer; PostgreSQL RLS policies are the next hardening step for true multi-tenant isolation.
- **No automated test suite yet**: prioritized pytest coverage for the WebSocket and RAG paths next.
- **WebRTC vs WebSockets**: current real-time audio uses WebSockets; for sub-second voice latency at scale, WebRTC is the correct next architecture.
- **No Redis caching layer yet**: company profile generation re-calls Claude on every cache miss; Redis with TTL invalidation is planned.
- **LLM observability**: currently logged via structlog; a dedicated tool (Helicone/LangSmith) would give token-level cost and drift tracking.

## Author

Built by Adhiswauran V — B.Tech CS/AI, 5th year. Also built [Real-Time Fraud Detection Engine](https://github.com/adhi2801/fraud-detection-engine) (Go, Kafka, XGBoost, AUC 0.98).