# backend/rag/vector_store.py

# This is the actual RAG implementation.
# Step 1: Convert every question's text into a 384-number vector (embedding)
# Step 2: Store those vectors in ChromaDB on disk
# Step 3: When we need a question, convert our SEARCH QUERY into a vector too
# Step 4: Find the closest matching vectors — that's semantic search

import chromadb
from sentence_transformers import SentenceTransformer
import os

class QuestionVectorStore:
    def __init__(self):
        # PersistentClient saves to disk so we don't re-embed every restart
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_db")
        self.client = chromadb.PersistentClient(path=db_path)
        self.collection = self.client.get_or_create_collection(
            name="interview_questions",
            metadata={"hnsw:space": "cosine"}
        )
        # This model converts text into 384-dimensional vectors
        # It downloads once (~80MB) then runs locally, no API calls
        print("Loading embedding model...")
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
        print("Embedding model loaded")

    def seed_database(self, questions: list):
        """
        Run once to populate ChromaDB with our question bank.
        Safe to call multiple times — it just overwrites existing IDs.
        """
        existing_count = self.collection.count()
        if existing_count >= len(questions):
            print(f"Database already seeded with {existing_count} questions. Skipping.")
            return

        texts = [q["text"] for q in questions]
        print(f"Generating embeddings for {len(texts)} questions...")
        embeddings = self.embedder.encode(texts).tolist()

        self.collection.upsert(
            ids=[q["id"] for q in questions],
            embeddings=embeddings,
            documents=texts,
            metadatas=[{
                "difficulty": q["difficulty"],
                "topics": ",".join(q["topics"]),
                "companies": ",".join(q.get("companies", []))
            } for q in questions]
        )
        print(f"Seeded {len(questions)} questions into ChromaDB")

    def search(self, query: str, difficulty_min: int, difficulty_max: int, company: str = None, n_results: int = 5) -> list:
        """
        Semantic search: find questions whose MEANING matches the query,
        filtered by difficulty range and optionally by company.
        """
        query_embedding = self.embedder.encode([query]).tolist()

        where_filter = {
            "$and": [
                {"difficulty": {"$gte": difficulty_min}},
                {"difficulty": {"$lte": difficulty_max}}
            ]
        }

        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=n_results,
            where=where_filter
        )

        questions = []
        if results["documents"] and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                meta = results["metadatas"][0][i]
                companies = meta["companies"].split(",") if meta["companies"] else []
                # Soft-filter by company preference — boost matches, don't exclude
                questions.append({
                    "text": doc,
                    "difficulty": meta["difficulty"],
                    "topics": meta["topics"].split(","),
                    "companies": companies,
                    "similarity": round(1 - results["distances"][0][i], 3),
                    "company_match": company in companies if company else False
                })

        # Sort so company matches come first
        questions.sort(key=lambda q: (not q["company_match"], -q["similarity"]))
        return questions

    def count(self) -> int:
        return self.collection.count()