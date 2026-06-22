# backend/seed_db.py
# Run this once to populate ChromaDB with our 60-question bank.

from rag.vector_store import QuestionVectorStore
from seed_questions import QUESTION_BANK

print("Initializing vector store...")
store = QuestionVectorStore()

print(f"Question bank has {len(QUESTION_BANK)} questions")
store.seed_database(QUESTION_BANK)

print(f"Total questions now in ChromaDB: {store.count()}")

# Quick test search
print("\n=== Testing semantic search ===")
results = store.search(
    query="distributed system caching question",
    difficulty_min=6,
    difficulty_max=9,
    company="google"
)
for r in results[:3]:
    print(f"\n[{r['difficulty']}/10] similarity={r['similarity']} company_match={r['company_match']}")
    print(r["text"])