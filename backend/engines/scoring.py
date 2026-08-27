import os
import json
import re
import time
import structlog
import anthropic
from dotenv import load_dotenv

load_dotenv()

logger = structlog.get_logger()


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
                raw = self._strip_markdown_fence(raw)

                scores = json.loads(raw)
                return self._validate_scores(scores)
            except Exception as e:
                last_err = e
                logger.warning(
                    "scoring_attempt_failed",
                    attempt=attempt + 1,
                    error=str(e),
                    error_type=type(e).__name__,
                )
                if attempt == 0:
                    time.sleep(1.5)

        logger.error("scoring_all_attempts_failed", error=str(last_err))
        raise last_err

    def _strip_markdown_fence(self, raw: str) -> str:
        match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL)
        return match.group(1).strip() if match else raw

    def _validate_scores(self, scores: dict) -> dict:
        required = ["score_technical", "score_communication", "score_problem_solving",
                    "score_cultural_fit", "score_confidence"]
        for key in required:
            value = scores.get(key)
            if isinstance(value, str):
                try:
                    value = float(value)
                except ValueError:
                    value = None
            if not isinstance(value, (int, float)):
                raise ValueError(f"Missing or non-numeric {key} in scoring response: {scores.get(key)!r}")
            scores[key] = max(0.0, min(10.0, float(value)))

        for text_key in ["technical_feedback", "communication_feedback", "problem_solving_feedback", "overall_summary"]:
            if not isinstance(scores.get(text_key), str):
                scores[text_key] = ""

        return scores