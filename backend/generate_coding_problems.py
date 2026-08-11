"""
Generates new Coding Room problems using Claude, then VERIFIES each one is
actually correct by running the generated Python solution against its own
test-case inputs in a real subprocess — not just trusting the AI.

v2 changes from the original version, and why:

1. Claude no longer states "expected_output" for test cases. It only writes
   the solution code and a set of stdin *inputs*. We then run the solution
   against each input ourselves and capture the real stdout as the ground
   truth expected output. This makes the old "MISMATCH" rejection category
   structurally impossible — a mismatch could only ever happen because
   Claude was asked to hand-compute what its own code would output without
   running it, which is exactly the kind of arithmetic/formatting slip an
   LLM is prone to. Removing that step removes the failure mode.

2. Generation uses Claude's structured tool-use output instead of asking it
   to hand-write JSON with source code embedded as a string. Code contains
   quotes, backslashes, and newlines that are easy to mis-escape inside a
   JSON string; tool-use returns an already-parsed dict, no manual
   json.loads()/fence-stripping needed.

3. max_tokens raised from 3000 to 6000. The two problems that failed to
   parse last time (Serialize/Deserialize Binary Tree, Trie) both need a
   full solution plus 4 language stubs plus multiple test inputs in one
   response — very plausibly they were hitting the token cap and getting
   cut off mid-JSON, which looks like a "parsing error" but is really
   truncation.

4. Progress is saved after every single problem, not just at the very end,
   so a crash or network blip partway through a batch doesn't lose
   everything already generated.

5. One retry with backoff on transient API failures.

HOW TO USE:
1. Copy this file into your backend/ folder (same folder as main.py)
2. Make sure your .env has ANTHROPIC_API_KEY set
3. pip install anthropic --break-system-packages   (if not already installed)
4. python generate_coding_problems.py
5. Check the output:
   - verified_problems.json  -> problems that ran cleanly, safe to review
   - rejected_problems.json  -> problems that crashed/timed out or failed
     to generate at all (kept for your curiosity, do not seed these)
6. Read through verified_problems.json yourself before seeding it. This
   script verifies that the code RUNS and produces SOME consistent output —
   it does not verify the code is logically correct for the stated problem.
   A solution with a subtle bug that runs without crashing (e.g. an
   off-by-one that doesn't error, just returns a slightly wrong answer)
   will still pass this pipeline. That's exactly why the human read-through
   step still exists — this script narrows down what you need to check by
   eye, it doesn't replace checking it.

WHAT THIS DOES NOT DO:
- It does not touch your live database. It only writes local JSON files.
- It only runs/verifies the PYTHON solution. The JS/C++/Java starter stubs
  are generated but not executed (would need those toolchains installed)
  — spot check those by eye.
"""

import os
import json
import subprocess
import tempfile
import time
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"), timeout=90.0)

# Define what to generate: (title_hint, difficulty 1-10, category/topic, companies)
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

Your python_solution MUST be a complete, correct, self-contained Python script that reads
input via input(), solves the problem, and prints the result — it will actually be executed.

Do NOT compute or state expected outputs yourself. Only provide test case INPUTS — the
actual expected output for each one will be captured by running your solution, not by you
predicting it. Provide at least 5 distinct test case inputs: the base/typical case, an
edge case (empty or minimal input), a case with duplicate/repeated values if relevant to
this problem, and one larger case that would reveal a performance problem if your solution
were inefficient. For each one, include a short "purpose" phrase so a human reviewer can
quickly see what each test is checking without re-reading the input itself.

For the "larger case" specifically: keep it at a size you can construct correctly by hand
(a few hundred elements is enough to distinguish an efficient solution from an inefficient
one — you do not need 10,000+ elements to prove a performance point). It is far more
important that this input exactly matches the input_format you already specified — same
number of lines, same delimiters, same order — than that it be extremely large. A big input
that is malformed relative to your own stated format will make your solution crash on a
parsing error, not demonstrate anything about performance.

Call the submit_coding_problem tool with the complete problem."""

PROBLEM_TOOL = {
    "name": "submit_coding_problem",
    "description": "Submit a fully-specified coding interview problem, including a working solution and test case inputs (no expected outputs — those are computed separately by executing the solution).",
    "input_schema": {
        "type": "object",
        "properties": {
            "slug": {"type": "string", "description": "kebab-case unique identifier, e.g. 'binary-tree-level-order-traversal'"},
            "title": {"type": "string"},
            "difficulty": {"type": "integer", "minimum": 1, "maximum": 10},
            "category": {"type": "string"},
            "description": {"type": "string", "description": "2-4 sentence realistic engineering scenario framing the problem, then a precise technical problem statement"},
            "constraints": {"type": "array", "items": {"type": "string"}},
            "input_format": {"type": "string"},
            "output_format": {"type": "string"},
            "python_solution": {
                "type": "string",
                "description": "Complete, correct, working Python script. Reads input via input(), solves the problem, prints the result. Must run standalone with no missing imports."
            },
            "starter_code_python": {"type": "string", "description": "Starter stub with the same function signature, no solution logic — 'pass' or similar, for the candidate to fill in."},
            "starter_code_javascript": {"type": "string"},
            "starter_code_cpp": {"type": "string"},
            "starter_code_java": {"type": "string"},
            "test_cases_planned": {
                "type": "array",
                "description": "At least 5 distinct test case inputs. Do NOT include expected outputs.",
                "items": {
                    "type": "object",
                    "properties": {
                        "input": {"type": "string", "description": "Exact stdin input as python_solution expects it."},
                        "purpose": {"type": "string", "description": "Short phrase, e.g. 'empty input', 'single element', 'large input for performance'."}
                    },
                    "required": ["input", "purpose"]
                }
            }
        },
        "required": [
            "slug", "title", "difficulty", "category", "description", "constraints",
            "input_format", "output_format", "python_solution",
            "starter_code_python", "starter_code_javascript", "starter_code_cpp", "starter_code_java",
            "test_cases_planned"
        ]
    }
}


def call_claude_for_problem(title_hint, difficulty, category, max_retries=3):
    last_err = None
    for attempt in range(max_retries + 1):
        try:
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=6000,
                system="You are an expert technical interviewer and competitive programmer. You write precise, well-tested coding problems with fully correct, runnable solutions. You never leave a solution incomplete or a function unimplemented. You always provide at least 5 distinct test case inputs — never zero, never fewer than 3.",
                tools=[PROBLEM_TOOL],
                tool_choice={"type": "tool", "name": "submit_coding_problem"},
                messages=[{"role": "user", "content": GENERATION_PROMPT.format(
                    title_hint=title_hint, difficulty=difficulty, category=category
                )}]
            )
            tool_block = next((b for b in response.content if b.type == "tool_use"), None)
            if tool_block is None:
                raise ValueError("Claude's response had no tool_use block — check the raw response.")
            result = dict(tool_block.input)

            # Tool-use schemas are a strong hint to the model, not a hard
            # guarantee — Claude occasionally returns an empty or too-short
            # test_cases_planned list despite the schema saying it's
            # required. Treat that as a failed attempt and retry the whole
            # generation rather than passing an unusable problem forward.
            planned_count = len(result.get("test_cases_planned", []))
            if planned_count < 3:
                raise ValueError(f"Only {planned_count} test case(s) returned — retrying generation")

            # A length check alone isn't enough — len() works on strings too,
            # so a malformed response where test_cases_planned came back as a
            # string (not a list) could sail past a bare length check and
            # then crash later when the code tries to iterate it expecting
            # dicts. Validate the actual shape, not just a count.
            planned = result.get("test_cases_planned")
            if not isinstance(planned, list):
                raise ValueError(f"test_cases_planned was not a list (got {type(planned).__name__}) — retrying generation")
            well_formed = [tc for tc in planned if isinstance(tc, dict) and isinstance(tc.get("input"), str)]
            if len(well_formed) < 3:
                raise ValueError(f"Only {len(well_formed)} well-formed test case(s) out of {len(planned)} — retrying generation")

            return result
        except Exception as e:
            last_err = e
            if attempt < max_retries:
                print(f"    Attempt {attempt + 1} failed ({e}); retrying...")
                time.sleep(3)
    raise last_err


def run_against_input(script_path, stdin_input, timeout=5):
    """Runs the solution once against one input. Returns (ok, output_or_None, error_or_None)."""
    try:
        proc = subprocess.run(
            ["python", script_path],
            input=stdin_input,
            capture_output=True,
            # Explicit UTF-8, not text=True. text=True lets subprocess fall
            # back to the OS's locale-preferred encoding, which on Windows
            # is frequently cp1252 — a legacy codepage that can't represent
            # most non-ASCII characters. If Claude's test input contains
            # anything outside plain ASCII (accented letters, Cyrillic,
            # emoji, etc.), writing it to stdin under cp1252 throws
            # UnicodeEncodeError and previously crashed the whole script.
            # UTF-8 can represent essentially anything, so this is the fix
            # regardless of what platform this runs on.
            encoding="utf-8",
            errors="replace",
            timeout=timeout
        )
    except subprocess.TimeoutExpired:
        return False, None, "TIMEOUT (infinite loop or too slow)"
    except Exception as e:
        # Defense in depth: any other unexpected subprocess-level failure
        # (permissions, OS quirks, anything not anticipated above) becomes
        # a clean rejection for this one test case instead of an uncaught
        # exception that kills every problem still left in the batch.
        return False, None, f"UNEXPECTED ERROR running subprocess — {type(e).__name__}: {e}"

    if proc.returncode != 0:
        return False, None, f"CRASHED — {(proc.stderr or '').strip()[:2000]}"

    return True, (proc.stdout or "").strip(), None


def build_and_verify_test_cases(problem):
    """
    Runs python_solution against every planned input and captures the real
    output as the ground-truth expected_output. Returns
    (all_passed: bool, test_cases: list, details: list[str]).
    """
    solution_code = problem.get("python_solution", "")
    planned = problem.get("test_cases_planned", [])

    if not solution_code:
        return False, [], ["Missing python_solution"]

    # Same shape-defense as in call_claude_for_problem, kept here too since
    # this function may end up called on data that skipped that check (e.g.
    # if this module is imported and reused elsewhere later). A malformed
    # test_cases_planned (wrong type, or a list of non-dict items) is
    # filtered out here rather than assumed away.
    if not isinstance(planned, list):
        return False, [], [f"test_cases_planned was not a list (got {type(planned).__name__}) — malformed response"]

    well_formed = [tc for tc in planned if isinstance(tc, dict) and isinstance(tc.get("input"), str)]
    if len(well_formed) < 3:
        return False, [], [f"Only {len(well_formed)} well-formed test case(s) out of {len(planned)} planned — need at least 3"]

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as f:
        # Same root cause as the earlier stdin encoding bug: writing this
        # file without an explicit encoding falls back to the OS locale
        # (cp1252 on Windows), which happily writes characters like an
        # em dash as a single non-UTF-8 byte. Python then fails to even
        # parse the file when running it, since it assumes UTF-8 source
        # encoding by default (PEP 263). Claude's generated code and
        # comments use em dashes and other non-ASCII punctuation
        # constantly, so this was likely to keep recurring across many
        # future problems until fixed here explicitly.
        f.write(solution_code)
        script_path = f.name

    test_cases = []
    details = []
    all_passed = True

    try:
        for i, tc in enumerate(well_formed):
            inp = tc.get("input", "")
            purpose = tc.get("purpose", "")
            ok, output, err = run_against_input(script_path, inp)
            if not ok:
                details.append(f"Test {i + 1} ({purpose}): {err}")
                all_passed = False
            else:
                details.append(f"Test {i + 1} ({purpose}): OK — captured output as ground truth")
                test_cases.append({"input": inp, "expected_output": output, "purpose": purpose})
    finally:
        os.unlink(script_path)

    return all_passed, test_cases, details


def main():
    verified = []
    rejected = []

    def flush():
        with open("verified_problems.json", "w") as f:
            json.dump(verified, f, indent=2)
        with open("rejected_problems.json", "w") as f:
            json.dump(rejected, f, indent=2)

    for idx, (title_hint, difficulty, category, companies) in enumerate(TARGETS):
        print(f"\n[{idx + 1}/{len(TARGETS)}] Generating: {title_hint} (difficulty {difficulty})...")

        try:
            problem = call_claude_for_problem(title_hint, difficulty, category)
            problem["companies"] = companies
        except Exception as e:
            print(f"  FAILED to generate: {e}")
            rejected.append({"title_hint": title_hint, "error": f"Generation failed: {e}"})
            flush()
            continue

        planned_count = len(problem.get("test_cases_planned", []))
        print(f"  Generated '{problem.get('title')}'. Running solution against {planned_count} planned test case(s)...")

        try:
            passed, test_cases, details = build_and_verify_test_cases(problem)
        except Exception as e:
            # Belt-and-suspenders: three unexpected failure shapes have
            # already turned up in real runs (empty test list, a string
            # where a list was expected, a Windows-only encoding crash).
            # Rather than assume we've now seen every way Claude's output
            # can be malformed, anything still unanticipated becomes a
            # logged rejection for this one problem instead of killing the
            # rest of the batch.
            print(f"  REJECTED — unexpected error during verification: {e}")
            problem["_rejection_details"] = [f"Unexpected error: {type(e).__name__}: {e}"]
            rejected.append(problem)
            flush()
            time.sleep(1)
            continue

        if passed:
            problem["test_cases"] = test_cases
            problem.pop("test_cases_planned", None)
            print(f"  VERIFIED — all {len(test_cases)} test cases ran cleanly; outputs captured as ground truth.")
            verified.append(problem)
        else:
            print(f"  REJECTED:")
            for d in details:
                if "OK" not in d:
                    print(f"      {d}")
            problem["_rejection_details"] = details
            rejected.append(problem)

        flush()  # save progress after every problem, not just at the end
        time.sleep(1)  # be polite to the API

    print("\n" + "=" * 70)
    print(f"DONE. {len(verified)} problems VERIFIED and written to verified_problems.json")
    print(f"      {len(rejected)} problems REJECTED — see rejected_problems.json")
    print("=" * 70)
    print("\nNext step: read through verified_problems.json yourself before")
    print("seeding it into your database. This confirms the code runs cleanly")
    print("and is internally consistent, not that it's logically correct or")
    print("well-written — that judgment call is still yours.")


if __name__ == "__main__":
    main()