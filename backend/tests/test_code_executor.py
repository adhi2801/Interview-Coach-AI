# backend/tests/test_code_executor.py
#
# The Judge0 client against a fake Judge0 (httpx.MockTransport): output
# comparison, polling, failure reasons, and the batch -> single fallback.
# A wrong verdict here passes wrong code or fails right code — and moves ELO.

import base64
import json

import httpx
import pytest

import code_executor
from code_executor import CodeExecutor, outputs_match


def b64(text: str) -> str:
    return base64.b64encode(text.encode()).decode()


def done(stdout="", status_id=3, description="Accepted", stderr=None, compile_output=None):
    return {
        "stdout": b64(stdout) if stdout else None,
        "stderr": b64(stderr) if stderr else None,
        "compile_output": b64(compile_output) if compile_output else None,
        "status": {"id": status_id, "description": description},
    }


QUEUED = {"stdout": None, "stderr": None, "compile_output": None, "status": {"id": 1, "description": "In Queue"}}


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch):
    monkeypatch.setattr(code_executor.time, "sleep", lambda s: None)


def executor_with(handler):
    ex = CodeExecutor()
    ex.client = httpx.Client(transport=httpx.MockTransport(handler))
    return ex


def batch_judge(results_per_poll):
    """A fake batch endpoint: each GET returns the next list of per-case results."""
    polls = iter(results_per_poll)
    calls = {"post": 0, "get": 0}

    def handler(request: httpx.Request):
        if request.method == "POST":
            calls["post"] += 1
            n = len(json.loads(request.content)["submissions"])
            return httpx.Response(201, json=[{"token": f"t{i}"} for i in range(n)])
        calls["get"] += 1
        results = next(polls)
        return httpx.Response(200, json={"submissions": [
            {"token": f"t{i}", **r} for i, r in enumerate(results)
        ]})
    return handler, calls


CASES = [{"input": "1 2", "expected_output": "3"}, {"input": "2 2", "expected_output": "4"}]


# ---------- output comparison ----------

@pytest.mark.parametrize("actual,expected,match", [
    ("1 2 3 \n", "1 2 3", True),          # trailing space from print(*xs, end=" ")
    ("a\r\nb\r\n", "a\nb", True),         # Windows line endings
    ("x\n\n\n", "x", True),               # trailing blank lines
    ("1  2", "1 2", False),               # internal spacing still matters
    ("1\n\n2", "1\n2", False),            # blank lines in the middle still matter
    ("", "", True),
    ("3", "4", False),
])
def test_outputs_match_like_an_online_judge(actual, expected, match):
    assert outputs_match(actual, expected) is match


# ---------- batch path ----------

def test_batch_waits_for_queued_cases_instead_of_failing_them():
    handler, calls = batch_judge([
        [QUEUED, QUEUED],
        [done("3"), QUEUED],
        [done("3"), done("4 \n")],
    ])
    results = executor_with(handler).run_test_cases("print(a+b)", "python", CASES)
    assert [r.passed for r in results] == [True, True]
    assert calls == {"post": 1, "get": 3}


def test_batch_reports_why_a_case_failed():
    handler, _ = batch_judge([[
        done(status_id=5, description="Time Limit Exceeded"),
        done(status_id=11, description="Runtime Error (NZEC)", stderr="IndexError: list index out of range"),
    ]])
    tle, crash = executor_with(handler).run_test_cases("while True: pass", "python", CASES)

    assert not tle.passed and tle.timed_out and tle.stderr == "Time Limit Exceeded"
    assert not crash.passed and "IndexError" in crash.stderr


def test_compile_errors_are_shown():
    handler, _ = batch_judge([[
        done(status_id=6, description="Compilation Error", compile_output="Main.java:1: error: ';' expected"),
    ]])
    (result,) = executor_with(handler).run_test_cases("class Main {", "java", CASES[:1])
    assert not result.passed and "';' expected" in result.stderr


def test_batch_that_never_finishes_is_reported_as_timed_out(monkeypatch):
    monkeypatch.setattr(code_executor, "POLL_BUDGET_SECONDS", 3)
    handler, _ = batch_judge([[QUEUED, QUEUED]] * 50)
    results = executor_with(handler).run_test_cases("x", "python", CASES)
    assert all(r.timed_out and not r.passed for r in results)


def test_batch_failure_falls_back_to_one_submission_per_case():
    seen = []

    def handler(request: httpx.Request):
        if request.url.path.endswith("/batch"):
            return httpx.Response(503)
        if request.method == "POST":
            stdin = base64.b64decode(json.loads(request.content)["stdin"]).decode()
            seen.append(stdin)
            return httpx.Response(201, json={"token": stdin})
        stdin = request.url.path.rsplit("/", 1)[-1]
        return httpx.Response(200, json=done(str(sum(map(int, stdin.split())))))

    results = executor_with(handler).run_test_cases("print(a+b)", "python", CASES)
    assert [r.passed for r in results] == [True, True]
    assert seen == ["1 2", "2 2"]


def test_unsupported_language_is_rejected_before_any_call():
    def handler(request):
        raise AssertionError("no request expected")
    with pytest.raises(ValueError):
        executor_with(handler).run_test_cases("x", "brainfuck", CASES)
