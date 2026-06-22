import os
import anthropic
from dotenv import load_dotenv
from rag.vector_store import QuestionVectorStore

load_dotenv()

class AdaptiveDifficultyEngine:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.vector_store = QuestionVectorStore()

    def select_question(self, elo: float, company: str, role: str) -> str:
        difficulty = min(10, max(1, int((elo - 800) / 100)))

        # Search our real curated question bank using RAG
        search_query = f"{role} interview question for {company}"
        candidates = self.vector_store.search(
            query=search_query,
            difficulty_min=max(1, difficulty - 1),
            difficulty_max=min(10, difficulty + 1),
            company=company,
            n_results=5
        )

        if candidates:
            # Take the best match (already sorted by company match + similarity)
            base_question = candidates[0]["text"]

            # Ask Claude to rephrase it in the company's specific interviewing style
            response = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=300,
                system=f"""You are a {company} interviewer conducting a {role} interview.
                Rephrase the given question in {company}'s authentic interview style and tone.
                Keep the core technical challenge identical. Return only the question as plain text.
                No markdown, no asterisks, no bullet points.""",
                messages=[{
                    "role": "user",
                    "content": f"Rephrase this question: {base_question}"
                }]
            )
            return response.content[0].text

        # Fallback: if no questions found in our bank, generate fresh
        response = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            system=f"""You are a {company} interviewer conducting a {role} interview.
            Generate exactly ONE interview question suitable for difficulty level {difficulty} out of 10.
            Return only the question as plain text, no markdown, no formatting.""",
            messages=[{
                "role": "user",
                "content": f"Generate a difficulty {difficulty}/10 interview question for a {role} candidate targeting {company}."
            }]
        )
        return response.content[0].text

    def update_elo(self, current_elo: float, question_difficulty: int, score: float) -> float:
        K = 32
        question_elo = 800 + (question_difficulty * 100)
        expected = 1 / (1 + 10 ** ((question_elo - current_elo) / 400))
        actual = score / 10
        new_elo = current_elo + K * (actual - expected)
        return round(new_elo, 1)