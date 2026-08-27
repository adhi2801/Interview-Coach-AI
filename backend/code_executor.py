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

LANGUAGE_IDS = {
    "python": 71,
    "javascript": 63,
    "java": 62,
    "cpp": 54,
    "c": 50,
    "go": 60,
}

EXECUTION_TIMEOUT_SECONDS = 10
MAX_RETRIES = 2


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
        self.headers = {
            "content-type": "application/json",
            "X-RapidAPI-Key": JUDGE0_API_KEY,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        }

    def _decode(self, data: dict, field: str) -> str:
        val = data.get(field)
        return base64.b64decode(val).decode(errors="replace") if val else ""

    def run_code(self, code: str, language: str, stdin: str = "") -> ExecutionResult:
        """
        Runs code once against a single stdin input. Used for the 'Run' button —
        candidate self-checking against a sample case, no grading, nothing persisted.
        Retries once on a transient network failure before giving up — the same
        resilience pattern every Claude-calling engine in this codebase already has.
        """
        if language not in LANGUAGE_IDS:
            raise ValueError(f"Unsupported language: {language}. Supported: {list(LANGUAGE_IDS.keys())}")

        payload = {
            "source_code": base64.b64encode(code.encode()).decode(),
            "language_id": LANGUAGE_IDS[language],
            "stdin": base64.b64encode(stdin.encode()).decode(),
            "cpu_time_limit": EXECUTION_TIMEOUT_SECONDS,
        }

        last_err = None
        for attempt in range(MAX_RETRIES):
            try:
                create_res = self.client.post(
                    f"{JUDGE0_URL}?base64_encoded=true&wait=false",
                    json=payload,
                    headers=self.headers,
                )
                create_res.raise_for_status()
                token = create_res.json()["token"]

                for _ in range(20):
                    time.sleep(0.5)
                    result_res = self.client.get(
                        f"{JUDGE0_URL}/{token}?base64_encoded=true&fields=stdout,stderr,status,compile_output",
                        headers=self.headers,
                    )
                    result_res.raise_for_status()
                    data = result_res.json()
                    status_id = data.get("status", {}).get("id")
                    if status_id not in (1, 2):
                        break
                else:
                    return ExecutionResult(stdout="", stderr="Execution timed out.", exit_code=-1, timed_out=True)

                stdout = self._decode(data, "stdout")
                stderr = self._decode(data, "stderr") or self._decode(data, "compile_output")
                status_desc = data.get("status", {}).get("description", "")
                exit_code = 0 if status_desc == "Accepted" else -1

                return ExecutionResult(stdout=stdout, stderr=stderr, exit_code=exit_code)

            except httpx.TimeoutException:
                return ExecutionResult(stdout="", stderr="Execution timed out.", exit_code=-1, timed_out=True)
            except (httpx.HTTPError, KeyError) as e:
                last_err = e
                if attempt < MAX_RETRIES - 1:
                    time.sleep(1.0)
                    continue
                return ExecutionResult(stdout="", stderr=f"Sandbox error: {e}", exit_code=-1)

        return ExecutionResult(stdout="", stderr=f"Sandbox error: {last_err}", exit_code=-1)

    def run_test_cases(self, code: str, language: str, test_cases: list) -> list[TestCaseResult]:
        """
        test_cases: list of {"input": str, "expected_output": str}

        Uses Judge0's real batch endpoint — ONE submission call and ONE polling
        loop for ALL test cases, instead of the previous N separate full
        create+poll cycles (N real paid API calls for N test cases). Falls back
        to the original one-at-a-time approach if the batch call itself fails
        outright, so a single problem never fails entirely just because the
        batch endpoint had a bad moment — still correct, just slower that once.
        """
        if language not in LANGUAGE_IDS:
            raise ValueError(f"Unsupported language: {language}. Supported: {list(LANGUAGE_IDS.keys())}")
        if not test_cases:
            return []

        try:
            submissions = [
                {
                    "source_code": base64.b64encode(code.encode()).decode(),
                    "language_id": LANGUAGE_IDS[language],
                    "stdin": base64.b64encode(case["input"].encode()).decode(),
                    "cpu_time_limit": EXECUTION_TIMEOUT_SECONDS,
                }
                for case in test_cases
            ]

            create_res = self.client.post(
                f"{JUDGE0_URL}/batch?base64_encoded=true",
                json={"submissions": submissions},
                headers=self.headers,
            )
            create_res.raise_for_status()
            tokens = [item["token"] for item in create_res.json()]
            tokens_param = ",".join(tokens)

            data_by_token = {}
            for _ in range(20):
                time.sleep(0.5)
                poll_res = self.client.get(
                    f"{JUDGE0_URL}/batch?tokens={tokens_param}&base64_encoded=true&fields=token,stdout,stderr,status,compile_output",
                    headers=self.headers,
                )
                poll_res.raise_for_status()
                batch_data = poll_res.json().get("submissions", [])
                data_by_token = {item["token"]: item for item in batch_data}

                still_running = any(
                    data_by_token.get(t, {}).get("status", {}).get("id") in (1, 2)
                    for t in tokens
                )
                if not still_running:
                    break
            else:
                # Timed out waiting for the batch — every case in this batch
                # is honestly reported as timed out, not silently marked failed
                # with no explanation.
                return [
                    TestCaseResult(
                        passed=False, input=case["input"],
                        expected=(case.get("expected_output") or "").strip(),
                        actual="", stderr="Execution timed out.", timed_out=True,
                    )
                    for case in test_cases
                ]

            results = []
            for case, token in zip(test_cases, tokens):
                item = data_by_token.get(token, {})
                stdout = self._decode(item, "stdout")
                stderr = self._decode(item, "stderr") or self._decode(item, "compile_output")
                status_desc = item.get("status", {}).get("description", "")
                exit_code = 0 if status_desc == "Accepted" else -1

                actual = stdout.strip()
                expected = (case.get("expected_output") or "").strip()
                results.append(TestCaseResult(
                    passed=(actual == expected and exit_code == 0),
                    input=case["input"], expected=expected, actual=actual,
                    stderr=stderr, timed_out=False,
                ))
            return results

        except (httpx.HTTPError, KeyError) as e:
            # Batch endpoint itself failed — fall back to the original
            # one-at-a-time approach rather than failing the whole submission.
            # Slower and costs more real calls, but still correct.
            results = []
            for case in test_cases:
                exec_result = self.run_code(code, language, stdin=case["input"])
                actual = exec_result.stdout.strip()
                expected = (case.get("expected_output") or "").strip()
                results.append(TestCaseResult(
                    passed=(actual == expected and not exec_result.timed_out and exec_result.exit_code == 0),
                    input=case["input"], expected=expected, actual=actual,
                    stderr=exec_result.stderr, timed_out=exec_result.timed_out,
                ))
            return results

    def close(self):
        self.client.close()
