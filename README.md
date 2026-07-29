# InterviewCoach AI

> An AI-powered mock interview platform that adapts to a user's skill level, simulates company-specific interview styles, and provides real-time coaching during technical and coding interviews.

### Live Demo
- Frontend: https://interview-coach-ai-three.vercel.app
- Backend API: https://interview-coach-ai-production.up.railway.app
- Repository: https://github.com/adhi2801/Interview-Coach-AI

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
- Framer Motion
- Monaco Editor
- Recharts
- WebSockets

### Backend
- FastAPI
- PostgreSQL
- Redis
- SQLAlchemy
- Alembic
- Whisper
- Claude API
- Judge0

### Infrastructure
- Railway
- Vercel
- JWT + bcrypt Authentication
- SlowAPI
- Structlog
- Sentry

---

## System Architecture

```text
Browser (React)
        |
        +---- FastAPI REST API
        |
        +---- PostgreSQL (data + RAG question store)
        |
        +---- Redis Cache
        |
        +---- Claude API
        |
        +---- Whisper
        |
        +---- Judge0 Sandbox
        |
        +---- WebSocket Coaching Engine
```

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

### Backend
```bash
cd backend
python -m venv venv
pip install -r requirements.txt
alembic upgrade head
python seed_topics.py
python seed_coding_problems.py
python seed_db.py
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm start
```

---

## Testing

```bash
pytest
```

Current coverage includes:
- ELO rating calculations.
- Knowledge graph traversal.
- Knowledge gap extraction.

---

## Future Improvements

- Streaming voice transcription.
- PostgreSQL Row-Level Security.
- Expanded automated test coverage.
- WebRTC-based audio support.
- Improved mobile experience.
- LLM observability tooling.
- Editable user profiles.

---

## Author

Adhiswauran V
- B.Tech Computer Science (AI)
- Portfolio Project

Also built:
- Real-Time Fraud Detection Engine (Go, Kafka, XGBoost, AUC 0.98)
