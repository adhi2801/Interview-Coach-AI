import os
import json
import anthropic
from dotenv import load_dotenv

load_dotenv()

class MultiDimensionalScorer:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"), timeout=30.0)
    
    def score(self, question: str, answer: str) -> dict:
        last_err = None
        for attempt in range(2):
            try:
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
                
                raw = response.content[0].text.strip()
                if raw.startswith("```"):
                    raw = raw.split("```")[1]
                    if raw.startswith("json"):
                        raw = raw[4:]
                
                scores = json.loads(raw.strip())
                return self._validate_scores(scores)
            except Exception as e:
                last_err = e
        raise last_err

    def _validate_scores(self, scores: dict) -> dict:
        required = ["score_technical", "score_communication", "score_problem_solving",
                    "score_cultural_fit", "score_confidence"]
        for key in required:
            value = scores.get(key)
            if not isinstance(value, (int, float)):
                raise ValueError(f"Missing or non-numeric {key} in scoring response: {value!r}")
            scores[key] = max(0.0, min(10.0, float(value)))  # clamp into valid range
        return scores