# backend/tests/test_api.py
#
# HTTP-level tests for main.py: auth, ownership, validation, and the
# scoring/ELO pipeline. Runs against a throwaway in-memory SQLite database
# with every external service (Claude, Judge0, Redis, Whisper) stubbed, so
# it is fast, free, and never touches the real Postgres/Redis from .env.

import sys
import types
from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Whisper pulls in torch and is only used by the audio WebSocket path —
# stub it so importing main stays cheap. Real module wins if already loaded.
sys.modules.setdefault("whisper", types.ModuleType("whisper"))

import main  # noqa: E402
from code_executor import TestCaseResult as ExecResult  # noqa: E402  (aliased so pytest does not try to collect it)
from fastapi.testclient import TestClient  # noqa: E402
from models import Base, User, InterviewSession, ScoringJob, Answer, ReplayManifest, CodingProblem, CodingTestCase, CodingSubmission  # noqa: E402
import engines.replay_system as replay_module  # noqa: E402
import engines.peer_comparison as peer_module  # noqa: E402

FAKE_SCORES = {
    "score_technical": 8.0, "score_communication": 8.0, "score_problem_solving": 8.0,
    "score_cultural_fit": 8.0, "score_confidence": 8.0, "overall_summary": "Solid.",
}
FAKE_QUESTION = {"question": "Design a rate limiter.", "category": "System Design"}


@pytest.fixture
def db_factory(monkeypatch):
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    for module in (main, replay_module, peer_module):
        monkeypatch.setattr(module, "SessionLocal", factory)
    monkeypatch.setattr(main, "redis_client", None)
    monkeypatch.setattr(peer_module, "redis_client", None)
    monkeypatch.setattr(main.limiter, "enabled", False)

    # Every paid / networked dependency is stubbed.
    monkeypatch.setattr(main.scorer, "score", lambda question, answer: dict(FAKE_SCORES))
    monkeypatch.setattr(main.gap_engine, "extract_gaps", lambda **kw: ([], False))
    monkeypatch.setattr(main.gap_engine, "identify_topics_addressed", lambda **kw: (["caching"], False))
    monkeypatch.setattr(main.difficulty_engine, "select_question", lambda **kw: dict(FAKE_QUESTION))
    monkeypatch.setattr(main.difficulty_engine, "select_followup_question", lambda **kw: dict(FAKE_QUESTION))

    yield factory
    engine.dispose()


@pytest.fixture
def client(db_factory):
    return TestClient(main.app)


def signup(client, email="ada@example.com", name="Ada"):
    res = client.post("/auth/signup", json={"email": email, "password": "correct-horse", "name": name})
    assert res.status_code == 200, res.text
    body = res.json()
    return {"Authorization": f"Bearer {body['access_token']}"}, body["user"]["id"]


def start_session(client, headers):
    res = client.post("/session/start", headers=headers, json={
        "user_name": "Ada", "company": "google", "role": "Software Engineer", "persona": "standard",
    })
    assert res.status_code == 200, res.text
    return res.json()


def answer_payload(session, **overrides):
    payload = {
        "session_id": session["session_id"], "question": session["question"],
        "answer": "Use a token bucket per user stored in Redis.", "difficulty": session["difficulty"],
        "elo": 1200, "company": "google",
    }
    payload.update(overrides)
    return payload


def user_elo(db_factory, user_id):
    db = db_factory()
    try:
        return db.query(User).filter(User.id == user_id).first().elo_rating
    finally:
        db.close()


# ---------- auth ----------

def test_signup_login_and_error_status_codes(client):
    signup(client)

    dup = client.post("/auth/signup", json={"email": "ADA@example.com", "password": "correct-horse", "name": "Ada"})
    assert dup.status_code == 409
    assert "already exists" in dup.json()["error"]

    weak = client.post("/auth/signup", json={"email": "bob@example.com", "password": "short", "name": "Bob"})
    assert weak.status_code == 400

    bad_email = client.post("/auth/signup", json={"email": "not-an-email", "password": "correct-horse", "name": "Bob"})
    assert bad_email.status_code == 422
    assert "error" in bad_email.json()

    wrong = client.post("/auth/login", json={"email": "ada@example.com", "password": "wrong-password"})
    assert wrong.status_code == 401
    assert wrong.json() == {"error": "Invalid email or password"}

    ok = client.post("/auth/login", json={"email": "Ada@Example.com", "password": "correct-horse"})
    assert ok.status_code == 200
    assert ok.json()["access_token"]


def test_protected_routes_reject_missing_and_invalid_tokens(client):
    assert client.get("/user/sessions").status_code == 401
    res = client.get("/user/sessions", headers={"Authorization": "Bearer garbage"})
    assert res.status_code == 401
    assert "expired" in res.json()["error"]


def test_optional_auth_route_still_serves_anonymous_callers(client):
    res = client.get("/topics/status")
    assert res.status_code == 200
    assert res.json() == {"topics": []}


def test_health_reports_database_status(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["database"] == "ok"


# ---------- interview scoring pipeline ----------

def test_submit_answer_scores_and_persists_atomically(client, db_factory):
    headers, user_id = signup(client)
    session = start_session(client, headers)

    res = client.post("/answer/submit", headers=headers, json=answer_payload(session))
    assert res.status_code == 200, res.text
    job_id = res.json()["job_id"]

    # TestClient runs background tasks before returning, so the job is done.
    status = client.get(f"/answer/status/{job_id}", headers=headers).json()
    assert status["status"] == "done"
    assert status["overall_score"] == 8.0
    assert status["next_question"] == FAKE_QUESTION["question"]
    assert status["new_elo"] > 1200
    assert user_elo(db_factory, user_id) == status["new_elo"]

    db = db_factory()
    try:
        answer = db.query(Answer).one()
        assert answer.id == status["answer_id"]
        assert answer.topics_covered == ["caching"]
        assert db.query(InterviewSession).one().elo_after == status["new_elo"]
    finally:
        db.close()


def test_client_supplied_elo_and_difficulty_are_ignored(client, db_factory):
    headers, user_id = signup(client)
    session = start_session(client, headers)

    client.post("/answer/submit", headers=headers, json=answer_payload(session, elo=3000, difficulty=10))
    honest = user_elo(db_factory, user_id)

    headers2, user2 = signup(client, email="grace@example.com", name="Grace")
    session2 = start_session(client, headers2)
    client.post("/answer/submit", headers=headers2, json=answer_payload(session2))
    assert user_elo(db_factory, user2) == honest


def test_cannot_submit_answer_to_another_users_session(client, db_factory):
    victim_headers, victim_id = signup(client)
    victim_session = start_session(client, victim_headers)

    attacker_headers, _ = signup(client, email="mallory@example.com", name="Mallory")
    res = client.post("/answer/submit", headers=attacker_headers, json=answer_payload(victim_session))

    assert res.status_code == 404
    assert user_elo(db_factory, victim_id) == 1200.0
    db = db_factory()
    try:
        assert db.query(ScoringJob).count() == 0
    finally:
        db.close()


def test_cannot_read_another_users_scoring_job(client):
    headers, _ = signup(client)
    session = start_session(client, headers)
    job_id = client.post("/answer/submit", headers=headers, json=answer_payload(session)).json()["job_id"]

    other_headers, _ = signup(client, email="eve@example.com", name="Eve")
    res = client.get(f"/answer/status/{job_id}", headers=other_headers)
    assert res.status_code == 404


def test_oversized_answer_is_rejected_before_any_paid_call(client, monkeypatch):
    headers, _ = signup(client)
    session = start_session(client, headers)

    def fail(**kw):
        raise AssertionError("scorer must not be called")
    monkeypatch.setattr(main.scorer, "score", fail)

    res = client.post("/answer/submit", headers=headers, json=answer_payload(session, answer="x" * 20001))
    assert res.status_code == 422
    assert "answer" in res.json()["error"]


def test_ended_session_rejects_new_answers(client):
    headers, _ = signup(client)
    session = start_session(client, headers)
    assert client.post(f"/replay/{session['session_id']}/end", headers=headers).status_code == 200

    res = client.post("/answer/submit", headers=headers, json=answer_payload(session))
    assert res.status_code == 409


def test_scoring_failure_marks_job_failed_and_leaves_elo_untouched(client, db_factory, monkeypatch):
    headers, user_id = signup(client)
    session = start_session(client, headers)

    def boom(question, answer):
        raise RuntimeError("Claude is down")
    monkeypatch.setattr(main.scorer, "score", boom)

    job_id = client.post("/answer/submit", headers=headers, json=answer_payload(session)).json()["job_id"]
    status = client.get(f"/answer/status/{job_id}", headers=headers).json()

    assert status["status"] == "failed"
    assert status["error"] == "Scoring failed"
    assert user_elo(db_factory, user_id) == 1200.0


def test_stuck_scoring_job_times_out(client, db_factory):
    headers, _ = signup(client)
    session = start_session(client, headers)

    db = db_factory()
    try:
        job = ScoringJob(session_id=session["session_id"], status="processing",
                         created_at=datetime.utcnow() - timedelta(minutes=10))
        db.add(job)
        db.commit()
        job_id = job.id
    finally:
        db.close()

    status = client.get(f"/answer/status/{job_id}", headers=headers).json()
    assert status == {"status": "failed", "error": "Scoring timed out"}


def test_ending_session_also_closes_the_replay(client, db_factory):
    headers, _ = signup(client)
    session = start_session(client, headers)
    client.post(f"/replay/{session['session_id']}/end", headers=headers)

    db = db_factory()
    try:
        assert db.query(ReplayManifest).one().ended_at is not None
    finally:
        db.close()

    replays = client.get("/replays", headers=headers).json()["replays"]
    assert [r["session_id"] for r in replays] == [session["session_id"]]

    other_headers, _ = signup(client, email="eve@example.com", name="Eve")
    assert client.get("/replays", headers=other_headers).json()["replays"] == []


# ---------- coding track ----------

@pytest.fixture
def problem(db_factory):
    db = db_factory()
    try:
        p = CodingProblem(slug="two_sum", title="Two Sum", description="Find two numbers.", difficulty=4)
        db.add(p)
        db.flush()
        db.add(CodingTestCase(problem_id=p.id, input_data="1 2", expected_output="3", is_hidden=0))
        db.add(CodingTestCase(problem_id=p.id, input_data="5 5", expected_output="10", is_hidden=1))
        db.commit()
        return p.id
    finally:
        db.close()


def fake_run(code, language, test_cases):
    return [ExecResult(passed=True, input=c["input"], expected=c["expected_output"], actual=c["expected_output"])
            for c in test_cases]


def test_coding_submit_survives_quality_grader_outage(client, db_factory, problem, monkeypatch):
    headers, user_id = signup(client)
    monkeypatch.setattr(main.code_executor, "run_test_cases", fake_run)

    def boom(*a, **kw):
        raise RuntimeError("Claude is down")
    monkeypatch.setattr(main.coding_engine, "grade_submission", boom)

    res = client.post("/coding/submit", headers=headers,
                      json={"problem_id": problem, "code": "print(3)", "language": "python"})
    assert res.status_code == 200, res.text
    body = res.json()
    assert (body["tests_passed"], body["tests_total"]) == (2, 2)
    assert body["quality_review_unavailable"] is True
    assert user_elo(db_factory, user_id) == body["new_elo"]


def test_coding_submit_rejects_foreign_session_and_unknown_language(client, problem, monkeypatch):
    monkeypatch.setattr(main.code_executor, "run_test_cases", fake_run)
    owner_headers, _ = signup(client)
    session = start_session(client, owner_headers)
    other_headers, _ = signup(client, email="eve@example.com", name="Eve")

    res = client.post("/coding/submit", headers=other_headers, json={
        "problem_id": problem, "code": "print(3)", "language": "python", "session_id": session["session_id"],
    })
    assert res.status_code == 404

    res = client.post("/coding/run", headers=other_headers,
                      json={"problem_id": problem, "code": "print(3)", "language": "brainfuck"})
    assert res.status_code == 422


def test_hidden_test_cases_never_leave_the_server(client, problem):
    body = client.get("/coding/problems/two_sum").json()
    assert body["sample_test_cases"] == [{"input": "1 2", "expected_output": "3"}]


def test_account_deletion_removes_user_data(client, db_factory):
    headers, user_id = signup(client)
    start_session(client, headers)

    assert client.delete("/user/me", headers=headers).status_code == 200
    db = db_factory()
    try:
        assert db.query(User).count() == 0
        assert db.query(InterviewSession).count() == 0
        assert db.query(CodingSubmission).count() == 0
    finally:
        db.close()
