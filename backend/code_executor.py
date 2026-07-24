# backend/code_executor.py
#
# Executes candidate-submitted code using Judge0 (via RapidAPI), a sandboxed
# code execution engine. Piston's public API (emkc.org) stopped granting
# access to portfolio/non-commercial projects as of Feb 2026 — this replaces
# it with Judge0 CE, keeping the exact same public interface (run_code,
# run_test_cases) so no other file needs to change.

import os
import time
import httpx
import base64
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

JUDGE0_URL = "https://judge0-ce.p.rapidapi.com/submissions"
JUDGE0_API_KEY = os.getenv("JUDGE0_API_KEY")

# Judge0's numeric language IDs for the languages this app supports.
LANGUAGE_IDS = {
    "python": 71,      # Python 3.8.1
    "javascript": 63,  # Node.js 12.14.0
    "java": 62,        # Java (OpenJDK 13.0.1)
    "cpp": 54,         # C++ (GCC 9.2.0)
    "c": 50,           # C (GCC 9.2.0)
    "go": 60,          # Go 1.13.5
}

EXECUTION_TIMEOUT_SECONDS = 10


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
        self.client = httpx.Client(timeout=EXECUTION_TIMEOUT_SECONDS + 15)

    def run_code(self, code: str, language: str, stdin: str = "") -> ExecutionResult:
        """
        Runs code once against a single stdin input. Used for the 'Run' button —
        candidate self-checking against a sample case, no grading, nothing persisted.
        """
        if language not in LANGUAGE_IDS:
            raise ValueError(f"Unsupported language: {language}. Supported: {list(LANGUAGE_IDS.keys())}")

        headers = {
            "content-type": "application/json",
            "X-RapidAPI-Key": JUDGE0_API_KEY,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        }

        payload = {
            "source_code": base64.b64encode(code.encode()).decode(),
            "language_id": LANGUAGE_IDS[language],
            "stdin": base64.b64encode(stdin.encode()).decode(),
            "cpu_time_limit": EXECUTION_TIMEOUT_SECONDS,
        }

        try:
            # Submit the code — base64_encoded=true keeps output safe from
            # weird characters, wait=false means we poll for the result.
            create_res = self.client.post(
                f"{JUDGE0_URL}?base64_encoded=true&wait=false",
                json=payload,
                headers=headers,
            )
            create_res.raise_for_status()
            token = create_res.json()["token"]

            # Poll for the result — Judge0 processes async, usually finishes in <2s.
            for _ in range(20):
                time.sleep(0.5)
                result_res = self.client.get(
                    f"{JUDGE0_URL}/{token}?base64_encoded=true&fields=stdout,stderr,status,compile_output",
                    headers=headers,
                )
                result_res.raise_for_status()
                data = result_res.json()
                status_id = data.get("status", {}).get("id")

                # status_id 1 = In Queue, 2 = Processing — keep polling.
                if status_id not in (1, 2):
                    break
            else:
                return ExecutionResult(stdout="", stderr="Execution timed out.", exit_code=-1, timed_out=True)

            def decode(field):
                val = data.get(field)
                return base64.b64decode(val).decode(errors="replace") if val else ""

            stdout = decode("stdout")
            stderr = decode("stderr") or decode("compile_output")
            status_desc = data.get("status", {}).get("description", "")
            exit_code = 0 if status_desc == "Accepted" else -1

            return ExecutionResult(stdout=stdout, stderr=stderr, exit_code=exit_code)

        except httpx.TimeoutException:
            return ExecutionResult(stdout="", stderr="Execution timed out.", exit_code=-1, timed_out=True)
        except httpx.HTTPError as e:
            return ExecutionResult(stdout="", stderr=f"Sandbox error: {e}", exit_code=-1)

    def run_test_cases(self, code: str, language: str, test_cases: list) -> list[TestCaseResult]:
        """
        test_cases: list of {"input": str, "expected_output": str}
        Runs the SAME code once per test case. Comparison is trailing-whitespace-
        insensitive, since a trailing newline difference isn't a real logic bug.
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