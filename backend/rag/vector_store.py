# backend/rag/vector_store.py
# Postgres-backed replacement for the old local-disk ChromaDB store.
# Railway's filesystem is ephemeral, so anything ChromaDB wrote to disk
# was wiped on every redeploy. This stores embeddings as JSON rows in
# Postgres instead, and does cosine similarity in plain Python — fine
# at this scale (dozens to low hundreds of questions).

import threading

import numpy as np
from sqlalchemy.orm import Session
from database import SessionLocal
from models import QuestionEmbedding


class QuestionVectorStore:
    def __init__(self):
        # Loaded on first use, not at import: loading torch + the model
        # added seconds to every cold start and every test run, even for
        # requests that never search questions.
        self._embedder = None
        self._load_lock = threading.Lock()

    @property
    def embedder(self):
        if self._embedder is None:
            with self._load_lock:
                if self._embedder is None:
                    from sentence_transformers import SentenceTransformer
                    print("Loading embedding model...")
                    self._embedder = SentenceTransformer("all-MiniLM-L6-v2")
                    print("Embedding model loaded")
        return self._embedder

    def warm_up(self) -> None:
        """Loads the model now. Called from a background thread at startup."""
        self.embedder.encode(["warm-up"])

    def seed_database(self, questions: list):
        db: Session = SessionLocal()
        try:
            existing_count = db.query(QuestionEmbedding).count()
            if existing_count >= len(questions):
                print(f"Database already seeded with {existing_count} questions. Skipping.")
                return

            texts = [q["text"] for q in questions]
            print(f"Generating embeddings for {len(texts)} questions...")
            embeddings = self.embedder.encode(texts).tolist()

            for q, emb in zip(questions, embeddings, strict=False):
                existing = db.query(QuestionEmbedding).filter_by(id=q["id"]).first()
                if existing:
                    existing.text = q["text"]
                    existing.difficulty = q["difficulty"]
                    existing.topics = q["topics"]
                    existing.companies = q.get("companies", [])
                    existing.embedding = emb
                else:
                    db.add(QuestionEmbedding(
                        id=q["id"],
                        text=q["text"],
                        difficulty=q["difficulty"],
                        topics=q["topics"],
                        companies=q.get("companies", []),
                        embedding=emb
                    ))
            db.commit()
            print(f"Seeded {len(questions)} questions into Postgres")
        finally:
            db.close()

    def search(self, query: str, difficulty_min: int, difficulty_max: int, company: str = None, n_results: int = 5) -> list:
        db: Session = SessionLocal()
        try:
            query_embedding = np.array(self.embedder.encode([query])[0])

            rows = db.query(QuestionEmbedding).filter(
                QuestionEmbedding.difficulty >= difficulty_min,
                QuestionEmbedding.difficulty <= difficulty_max
            ).all()

            def cosine_sim(a, b):
                a, b = np.array(a), np.array(b)
                return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

            questions = []
            for row in rows:
                sim = cosine_sim(query_embedding, row.embedding)
                companies = row.companies or []
                questions.append({
                    "text": row.text,
                    "difficulty": row.difficulty,
                    "topics": row.topics or [],
                    "companies": companies,
                    "similarity": round(sim, 3),
                    "company_match": company in companies if company else False
                })

            questions.sort(key=lambda q: (not q["company_match"], -q["similarity"]))
            return questions[:n_results]
        finally:
            db.close()

    def count(self) -> int:
        db: Session = SessionLocal()
        try:
            return db.query(QuestionEmbedding).count()
        finally:
            db.close()