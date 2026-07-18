import os
import json
import anthropic
from dotenv import load_dotenv

load_dotenv()

class MultiDimensionalScorer:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"), timeout=30.0)
    
    def score(self, question: str, answer: str) -> dict:
        response = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            system="""You are an expert technical interviewer. Score the answer across 5 dimensions.
            Return ONLY valid JSON with exactly this structure, no extra text:
            {
              "score_technical": <0-10 float>,
              "score_communication": <0-10 float>,
              "score_problem_solving": <0-10 float>,
              "score_cultural_fit": <0-10 float>,
              "score_confidence": <0-10 float>,
              "technical_feedback": "<one sentence>",
              "communication_feedback": "<one sentence>",
              "problem_solving_feedback": "<one sentence>",
              "overall_summary": "<two sentences max>"
            }""",
            messages=[{
                "role": "user",
                "content": f"Question: {question}\n\nAnswer: {answer}"
            }]
        )
        
        raw = response.content[0].text
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        
        scores = json.loads(clean.strip())
        return scores
