"""
Generates new Coding Room problems using Claude, then VERIFIES each one is
actually correct by running the generated Python solution against the
generated test cases in a real subprocess — not just trusting the AI.

Only problems that pass verification get written to the output file.
Anything that fails gets logged separately so you can see what was rejected
and why (this is normal — some generations will have subtly wrong test
cases, that's exactly what this script exists to catch).

HOW TO USE:
1. Copy this file into your backend/ folder (same folder as main.py)
2. Make sure your .env has ANTHROPIC_API_KEY set (it already should, since
   main.py uses it)
3. Run: pip install anthropic --break-system-packages   (if not already installed)
4. Run: python generate_coding_problems.py
5. Wait — it calls Claude once per problem, then verifies each one locally.
   This can take a few minutes for a full batch.
6. Check the output:
   - verified_problems.json  -> problems that passed verification, safe to review
   - rejected_problems.json  -> problems that FAILED verification (for your curiosity, do not seed these)
7. Read through verified_problems.json yourself before seeding it — this
   script checks CORRECTNESS of test cases, not whether the problem is a
   good/interesting/well-written question. That last judgment call is still yours.

WHAT THIS DOES NOT DO:
- It does not touch your live database. It only writes local JSON files.
- It only verifies the PYTHON solution runs correctly against test cases.
  The JS/C++/Java versions are generated but not executed/verified (would
  need those toolchains installed) — spot check those by eye.
"""

import os
import json
import subprocess
import tempfile
import time
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"), timeout=60.0)

# Define what to generate: (title_hint, difficulty 1-10, category/topic, companies)
# Feel free to edit this list to add/remove/change what gets generated.
TARGETS = [
    ("Binary Tree Level Order Traversal", 4, "Trees & Graphs", ["google", "meta"]),
    ("Longest Increasing Subsequence", 6, "Dynamic Programming", ["amazon", "google"]),
    ("Course Schedule (Topological Sort)", 6, "Graphs", ["google", "meta"]),
    ("Word Ladder", 7, "Graphs & BFS", ["amazon", "google"]),
    ("Trapping Rain Water", 7, "Arrays & Two Pointers", ["amazon", "google"]),
    ("Design a Rate Limiter (Token Bucket)", 5, "Design & Simulation", ["google", "amazon"]),
    ("Number of Islands", 3, "Graphs & DFS", ["amazon", "meta"]),
    ("Group Anagrams", 3, "Hash Tables", ["amazon", "meta"]),
    ("Kth Largest Element in an Array", 4, "Heaps", ["amazon", "google"]),
    ("Minimum Window Substring", 8, "Sliding Window", ["google", "meta"]),
    ("Serialize and Deserialize Binary Tree", 8, "Trees & Design", ["google", "meta"]),
    ("Median of Two Sorted Arrays", 8, "Binary Search", ["google", "amazon"]),
    ("Implement Trie (Prefix Tree)", 5, "Trees & Strings", ["google", "amazon"]),
    ("Longest Palindromic Substring", 5, "Dynamic Programming", ["amazon", "meta"]),
    ("Coin Change (Minimum Coins)", 5, "Dynamic Programming", ["amazon", "google"]),
]

GENERATION_PROMPT = """Generate a coding interview problem for a "{title_hint}" style problem
at difficulty {difficulty}/10 (1=easy/beginner, 10=very hard/staff-level), on the topic of {category}.

Write it in the exact same style as LeetCode-style interview problems, but wrapped in a
realistic engineering scenario (not just an abstract algorithm statement).

Return ONLY valid JSON, no markdown, no preamble, exactly this shape:
{{
  "slug": "<kebab-case-slug>",
  "title": "<Problem Title>",
  "difficulty": {difficulty},
  "category": "{category}",
  "description": "<2-4 sentence realistic engineering scenario framing the problem, then a precise technical problem statement>",
  "constraints": ["<constraint 1>", "<constraint 2>", "<constraint 3>"],
  "input_format": "<how input is given>",
  "output_format": "<how output should be given>",
  "python_solution": "<COMPLETE, CORRECT, working Python function that reads from stdin via input(), solves the problem, and prints the result. Must be fully self-contained and runnable as a script.>",
  "starter_code_python": "<a starter stub version of the same function signature with 'pass' or similar, WITHOUT the solution, for the candidate to fill in>",
  "starter_code_javascript": "<equivalent starter stub in JavaScript>",
  "starter_code_cpp": "<equivalent starter stub in C++>",
  "starter_code_java": "<equivalent starter stub in Java>",
  "test_cases": [
    {{"input": "<stdin input as a string, exactly as the python_solution expects it>", "expected_output": "<exact expected stdout output as a string>"}}
  ]
}}

Include at least 5 test cases covering the base case, an edge case (empty/minimal input), and a larger case.
The python_solution MUST be complete and correct — this will be executed and checked against your own test cases.
"""


def call_claude_for_problem(title_hint, difficulty, category):
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        system="You are an expert technical interviewer and competitive programmer. You write precise, correct, well-tested coding problems. You never make mistakes in expected outputs.",
        messages=[{"role": "user", "content": GENERATION_PROMPT.format(
            title_hint=title_hint, difficulty=difficulty, category=category
        )}]
    )
    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


def verify_python_solution(problem):
    """
    Actually runs the generated python_solution against each generated
    test case in a real subprocess. Returns (passed: bool, details: list)
    """
    solution_code = problem.get("python_solution", "")
    test_cases = problem.get("test_cases", [])

    if not solution_code or not test_cases:
        return False, ["Missing solution code or test cases"]

    results = []
    all_passed = True

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(solution_code)
        script_path = f.name

    try:
        for i, tc in enumerate(test_cases):
            try:
                proc = subprocess.run(
                    ["python", script_path],
                    input=tc["input"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                actual = proc.stdout.strip()
                expected = str(tc["expected_output"]).strip()

                if proc.returncode != 0:
                    results.append(f"Test {i+1}: CRASHED — {proc.stderr.strip()[:200]}")
                    all_passed = False
                elif actual != expected:
                    results.append(f"Test {i+1}: MISMATCH — expected '{expected}', got '{actual}'")
                    all_passed = False
                else:
                    results.append(f"Test {i+1}: PASS")
            except subprocess.TimeoutExpired:
                results.append(f"Test {i+1}: TIMEOUT (infinite loop or too slow)")
                all_passed = False
    finally:
        os.unlink(script_path)

    return all_passed, results


def main():
    verified = []
    rejected = []

    for idx, (title_hint, difficulty, category, companies) in enumerate(TARGETS):
        print(f"\n[{idx+1}/{len(TARGETS)}] Generating: {title_hint} (difficulty {difficulty})...")

        try:
            problem = call_claude_for_problem(title_hint, difficulty, category)
            problem["companies"] = companies
        except Exception as e:
            print(f"  FAILED to generate: {e}")
            rejected.append({"title_hint": title_hint, "error": f"Generation failed: {e}"})
            continue

        print(f"  Generated '{problem.get('title')}'. Verifying against its own test cases...")
        passed, details = verify_python_solution(problem)

        if passed:
            print(f"  ✅ VERIFIED — all {len(details)} test cases passed.")
            verified.append(problem)
        else:
            print(f"  ❌ REJECTED — some test cases failed:")
            for d in details:
                if "PASS" not in d:
                    print(f"      {d}")
            problem["_rejection_details"] = details
            rejected.append(problem)

        time.sleep(1)  # be polite to the API

    with open("verified_problems.json", "w") as f:
        json.dump(verified, f, indent=2)
    with open("rejected_problems.json", "w") as f:
        json.dump(rejected, f, indent=2)

    print("\n" + "=" * 70)
    print(f"DONE. {len(verified)} problems VERIFIED and written to verified_problems.json")
    print(f"      {len(rejected)} problems REJECTED — see rejected_problems.json")
    print("=" * 70)
    print("\nNext step: read through verified_problems.json yourself before")
    print("seeding it into your database. This confirms correctness, not quality.")


if __name__ == "__main__":
    main()