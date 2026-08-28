import os
import json
import re
import time
import structlog
import anthropic
from dotenv import load_dotenv

load_dotenv()

logger = structlog.get_logger()

SOCRATIC_SYSTEM_PROMPT = """You are a senior pair programmer conducting a live coding interview.

STRICT RULES:
- You may point out inefficiencies (e.g. "that nested loop is O(N^2)")
- You may ask leading questions about edge cases
- You must NEVER write code for the candidate, not even a single line
- You must NEVER give the exact algorithm/data structure name unless the
  candidate is completely stuck after 2+ hints
- Keep responses to 1-2 sentences — this is a live nudge, not a lecture

Return ONLY valid JSON: {"hint": "<your response>", "severity": "gentle" | "direct"}"""


class CodingEngine:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"), timeout=30.0)

    def _strip_markdown_fence(self, raw: str) -> str:
        match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL)
        return match.group(1).strip() if match else raw

    def _call_claude_json(self, required_keys=None, **create_kwargs) -> dict:
        """
        Same retry pattern as scoring.py's score(), now with the same
        contract-enforcement scoring.py already has: if Claude's response
        is missing a key this call site actually needs, that's treated as
        a failed attempt (triggers the same retry-then-raise path as a
        malformed JSON response), not silently returned as a dict with a
        hole in it. required_keys is deliberately per-call, not global —
        get_hint and grade_submission need different fields present.
        """
        last_err = None
        for attempt in range(2):
            try:
                response = self.client.messages.create(**create_kwargs)
                raw = response.content[0].text.strip()
                raw = self._strip_markdown_fence(raw)
                result = json.loads(raw)

                if required_keys:
                    missing = [k for k in required_keys if result.get(k) is None]
                    if missing:
                        raise ValueError(f"Claude response missing required key(s): {missing}")

                return result
            except Exception as e:
                last_err = e
                logger.warning(
                    "coding_engine_claude_call_failed",
                    attempt=attempt + 1,
                    error=str(e),
                    error_type=type(e).__name__,
                )
                if attempt == 0:
                    time.sleep(1.5)
        logger.error("coding_engine_claude_call_all_attempts_failed", error=str(last_err))
        raise last_err

    def get_hint(self, problem: str, current_code: str, language: str) -> dict:
        return self._call_claude_json(
            required_keys=["hint"],
            model="claude-sonnet-4-6",
            max_tokens=200,
            system=SOCRATIC_SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": f"Problem: {problem}\n\nCandidate's current code ({language}):\n{current_code}\n\nGive one Socratic hint."
            }]
        )

    def grade_submission(self, problem: str, code: str, test_results: list) -> dict:
        passed_count = sum(1 for t in test_results if t["passed"])

        quality = self._call_claude_json(
            required_keys=["complexity_estimate", "cleanliness_score", "naming_score", "feedback"],
            model="claude-sonnet-4-6",
            max_tokens=500,
            system="""You are grading a coding interview submission. Test results are already
            computed objectively — do not re-judge correctness. Grade QUALITY only.
            Return ONLY valid JSON:
            {"complexity_estimate": "<e.g. O(n log n)>", "cleanliness_score": <0-10>,
             "naming_score": <0-10>, "feedback": "<2 sentences>"}""",
            messages=[{
                "role": "user",
                "content": f"Problem: {problem}\n\nCode:\n{code}\n\nTest results: {passed_count}/{len(test_results)} passed"
            }]
        )

        for key in ["cleanliness_score", "naming_score"]:
            value = quality.get(key)
            if isinstance(value, str):
                try:
                    value = float(value)
                except ValueError:
                    value = None
            if isinstance(value, (int, float)):
                quality[key] = max(0.0, min(10.0, float(value)))
            else:
                quality[key] = None

        return {
            "tests_passed": passed_count,
            "tests_total": len(test_results),
            "test_results": test_results,
            **quality
        }