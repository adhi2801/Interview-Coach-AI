# backend/code_executor.py
#
# Executes candidate-submitted code safely using Piston (https://github.com/engineer-man/piston),
# a free, open-source sandboxed code execution engine. We use the public instance to start —
# self-host later if you outgrow the ~5 req/sec rate limit on the free API.
#
# This is the missing piece between the editor (which already works) and grading
# (coding_engine.grade_submission, which already works) — right now nothing sits
# between them. This file is that missing middle step.

import httpx
from dataclasses import dataclass, field

PISTON_URL = "https://emkc.org/api/v2/piston/execute"

# Piston needs an exact runtime version per language. These are stable, known-good
# versions as of Piston's current runtime list. If a language stops working, the
# most likely cause is Piston deprecating that version — check GET /api/v2/piston/runtimes.
LANGUAGE_VERSIONS = {
    "python": "3.10.0",
    "javascript": "18.15.0",
    "java": "15.0.2",
    "cpp": "10.2.0",
    "c": "10.2.0",
    "go": "1.16.2",
}

# Piston needs a filename with the right extension per language to know how to compile/run it.
LANGUAGE_FILENAMES = {
    "python": "main.py",
    "javascript": "main.js",
    "java": "Main.java",
    "cpp": "main.cpp",
    "c": "main.c",
    "go": "main.go",
}

EXECUTION_TIMEOUT_SECONDS = 10  # per test case — prevents an infinite loop from hanging a request forever


@dataclass
class TestCaseResult:
    passed: bool
    input: str
    expected: str
    actual: str
    stderr: str = ""
    timed_out: bool = False


@dataclass
class ExecutionResult:
    stdout: str
    stderr: str
    exit_code: int
    timed_out: bool = False


class CodeExecutor:
    def __init__(self):
        self.client = httpx.Client(timeout=EXECUTION_TIMEOUT_SECONDS + 5)

    def run_code(self, code: str, language: str, stdin: str = "") -> ExecutionResult:
        """
        Runs code once against a single stdin input. Used for the 'Run' button —
        candidate self-checking against a sample case, no grading, nothing persisted.
        """
        if language not in LANGUAGE_VERSIONS:
            raise ValueError(f"Unsupported language: {language}. Supported: {list(LANGUAGE_VERSIONS.keys())}")

        payload = {
            "language": language,
            "version": LANGUAGE_VERSIONS[language],
            "files": [{"name": LANGUAGE_FILENAMES[language], "content": code}],
            "stdin": stdin,
            "run_timeout": EXECUTION_TIMEOUT_SECONDS * 1000,
        }

        try:
            response = self.client.post(PISTON_URL, json=payload)
            response.raise_for_status()
            data = response.json()
        except httpx.TimeoutException:
            return ExecutionResult(stdout="", stderr="Execution timed out.", exit_code=-1, timed_out=True)
        except httpx.HTTPError as e:
            return ExecutionResult(stdout="", stderr=f"Sandbox error: {e}", exit_code=-1)

        run = data.get("run", {})
        return ExecutionResult(
            stdout=run.get("stdout", ""),
            stderr=run.get("stderr", ""),
            exit_code=run.get("code", -1),
        )

    def run_test_cases(self, code: str, language: str, test_cases: list) -> list[TestCaseResult]:
        """
        test_cases: list of {"input": str, "expected_output": str}
        Runs the SAME code once per test case (Piston has no concept of "one program,
        many inputs" — each call is a fresh sandboxed process). Comparison is done
        with trailing-whitespace-insensitive matching, since a trailing newline
        difference is not a real logic bug and shouldn't fail a candidate.
        """
        results = []
        for case in test_cases:
            exec_result = self.run_code(code, language, stdin=case["input"])
            actual = exec_result.stdout.strip()
            expected = case["expected_output"].strip()

            results.append(TestCaseResult(
                passed=(actual == expected and not exec_result.timed_out and exec_result.exit_code == 0),
                input=case["input"],
                expected=expected,
                actual=actual,
                stderr=exec_result.stderr,
                timed_out=exec_result.timed_out,
            ))
        return results

    def close(self):
        self.client.close()