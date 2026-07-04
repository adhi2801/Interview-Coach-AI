import os
import json
import anthropic
from dotenv import load_dotenv

load_dotenv()

# Track B is a SEPARATE evaluation engine from Track A on purpose — a
# behavioral/system-design interviewer and a pair-programmer are different
# jobs with different failure modes. Don't merge these prompts later.
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
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    def get_hint(self, problem: str, current_code: str, language: str) -> dict:
        response = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            system=SOCRATIC_SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": f"Problem: {problem}\n\nCandidate's current code ({language}):\n{current_code}\n\nGive one Socratic hint."
            }]
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())

    def grade_submission(self, problem: str, code: str, test_results: list) -> dict:
        """
        test_results: list of {"passed": bool, "input": ..., "expected": ..., "actual": ...}
        from the execution sandbox (Piston), not from Claude — Claude grades
        QUALITY on top of objective pass/fail, it doesn't decide correctness.
        """
        passed_count = sum(1 for t in test_results if t["passed"])

        response = self.client.messages.create(
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
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        quality = json.loads(raw.strip())

        return {
            "tests_passed": passed_count,
            "tests_total": len(test_results),
            "test_results": test_results,
            **quality
        }