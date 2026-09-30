# backend/tests/test_api.py
#
# HTTP-level tests for the API: auth, ownership, validation, and the
# scoring/ELO pipeline. Runs against a throwaway in-memory SQLite database
# with every external service (Claude, Judge0, Redis, Whisper) stubbed
# (see conftest.py), so
# it is fast, free, and never touches the real Postgres/Redis from .env.

import json as json_module
from datetime import timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

import database
import main
from api import services
from auth import create_ws_ticket
from code_executor import TestCaseResult as ExecResult  # aliased so pytest does not try to collect it
from models import (
    Answer, Base, CodingProblem, CodingSubmission, CodingTestCase, InterviewSession, ReplayManifest,
    ScoringJob, User,
)
from timeutil import utcnow

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
    # Every module shares the one SessionLocal factory object, so rebinding
    # it reaches the routers, replay system, and peer engine at once.
    database.SessionLocal.configure(bind=engine)
    monkeypatch.setattr(services, "redis_client", None)
    monkeypatch.setattr(main.limiter, "enabled", False)

    # Every paid / networked dependency is stubbed.
    monkeypatch.setattr(services.scorer, "score", lambda question, answer: dict(FAKE_SCORES))
    monkeypatch.setattr(services.gap_engine, "extract_gaps", lambda **kw: ([], False))
    monkeypatch.setattr(services.gap_engine, "identify_topics_addressed", lambda **kw: (["caching"], False))
    monkeypatch.setattr(services.difficulty_engine, "select_question", lambda **kw: dict(FAKE_QUESTION))
    monkeypatch.setattr(services.difficulty_engine, "select_followup_question", lambda **kw: dict(FAKE_QUESTION))

    yield database.SessionLocal
    database.SessionLocal.configure(bind=database.engine)
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
    monkeypatch.setattr(services.scorer, "score", fail)

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
    monkeypatch.setattr(services.scorer, "score", boom)

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
                         created_at=utcnow() - timedelta(minutes=10))
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
    monkeypatch.setattr(services.code_executor, "run_test_cases", fake_run)

    def boom(*a, **kw):
        raise RuntimeError("Claude is down")
    monkeypatch.setattr(services.coding_engine, "grade_submission", boom)

    res = client.post("/coding/submit", headers=headers,
                      json={"problem_id": problem, "code": "print(3)", "language": "python"})
    assert res.status_code == 200, res.text
    body = res.json()
    assert (body["tests_passed"], body["tests_total"]) == (2, 2)
    assert body["quality_review_unavailable"] is True
    assert body["previous_elo"] == 1200
    assert user_elo(db_factory, user_id) == body["new_elo"]


def test_coding_submit_rejects_foreign_session_and_unknown_language(client, problem, monkeypatch):
    monkeypatch.setattr(services.code_executor, "run_test_cases", fake_run)
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


# ---------- grading integrity ----------

def test_answer_is_graded_against_the_question_the_server_asked(client, monkeypatch):
    headers, _ = signup(client)
    session = start_session(client, headers)

    graded = []
    def record(question, answer):
        graded.append(question)
        return dict(FAKE_SCORES)
    monkeypatch.setattr(services.scorer, "score", record)

    swapped = answer_payload(session, question="What is 2 + 2?")
    assert client.post("/answer/submit", headers=headers, json=swapped).status_code == 200
    assert graded == [FAKE_QUESTION["question"]]


# ---------- live coaching socket ----------

def ticket_for(client, headers, session_id):
    res = client.post(f"/ws/coaching/{session_id}/ticket", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["ticket"]


def test_coaching_socket_accepts_a_ticket_and_coaches_typed_answers(client):
    headers, _ = signup(client)
    session = start_session(client, headers)
    ticket = ticket_for(client, headers, session["session_id"])

    with client.websocket_connect(f"/ws/coaching/{session['session_id']}?ticket={ticket}") as ws:
        ws.send_json({"type": "ping"})
        assert ws.receive_json() == {"type": "pong"}

        ws.send_json({"type": "text_chunk", "text": "Um, like, I'd use a token bucket per user in Redis."})
        update = ws.receive_json()
        assert update["type"] == "coaching_update"
        assert update["filler_count"] == 2
        assert update["pace_source"] == "typing"

        ws.send_json({"type": "reset"})
        assert ws.receive_json() == {"type": "reset_ack"}


def test_coaching_socket_rejects_login_tokens_and_foreign_tickets(client):
    from starlette.websockets import WebSocketDisconnect

    headers, user_id = signup(client)
    session = start_session(client, headers)
    login_token = headers["Authorization"].split()[1]

    # The long-lived login token is no longer accepted in the URL.
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/ws/coaching/{session['session_id']}?ticket={login_token}") as ws:
            ws.receive_json()

    # A ticket is bound to one session.
    other_session = start_session(client, headers)
    ticket = ticket_for(client, headers, other_session["session_id"])
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/ws/coaching/{session['session_id']}?ticket={ticket}") as ws:
            ws.receive_json()

    # Someone else's session can't be ticketed at all.
    eve_headers, _ = signup(client, email="eve@example.com", name="Eve")
    res = client.post(f"/ws/coaching/{session['session_id']}/ticket", headers=eve_headers)
    assert res.status_code == 404


def test_socket_ticket_is_not_a_bearer_token(client):
    headers, user_id = signup(client)
    session = start_session(client, headers)
    ticket = create_ws_ticket(user_id, session["session_id"])
    res = client.get("/user/sessions", headers={"Authorization": f"Bearer {ticket}"})
    assert res.status_code == 401


def test_replay_keeps_coaching_moments_that_changed_the_advice_only(client, db_factory):
    headers, _ = signup(client)
    session = start_session(client, headers)
    ticket = ticket_for(client, headers, session["session_id"])
    answer = "I'd use a token bucket per user in Redis with a short expiry on each key."

    with client.websocket_connect(f"/ws/coaching/{session['session_id']}?ticket={ticket}") as ws:
        for text in (answer, answer + " It refills", answer + " It refills each second."):
            ws.send_json({"type": "text_chunk", "text": text})
            ws.receive_json()

    replay = client.get(f"/replay/{session['session_id']}", headers=headers).json()
    assert len(replay["questions"][0]["coaching_moments"]) == 1


@pytest.mark.parametrize("origin,allowed", [
    ("https://interview-coach-ai-three.vercel.app", True),
    ("https://interview-coach-ai-git-feature-adhi.vercel.app", True),
    ("http://localhost:3000", True),
    ("https://evil-site.vercel.app", False),
    ("https://interview-coach-ai.vercel.app.evil.com", False),
])
def test_cors_allows_only_this_projects_origins(client, origin, allowed):
    res = client.options("/companies", headers={
        "Origin": origin, "Access-Control-Request-Method": "GET",
    })
    assert (res.headers.get("access-control-allow-origin") == origin) is allowed


def test_unknown_company_profiles_need_an_account(client, monkeypatch):
    generated = []
    monkeypatch.setattr(services.company_engine, "_generate_dynamic_profile",
                        lambda name: (generated.append(name) or {}, False))

    assert client.get("/companies/google/profile").json()["name"] == "Google"   # built-in: public
    res = client.get("/companies/made-up-co/profile")
    assert res.status_code == 401 and generated == []                          # no paid call

    headers, _ = signup(client)
    assert client.get("/companies/made-up-co/profile", headers=headers).status_code == 200
    assert generated == ["made-up-co"]
    assert client.get("/companies/" + "x" * 51 + "/profile", headers=headers).status_code == 422


# ---------- request context ----------

def test_every_response_carries_a_request_id_and_security_headers(client):
    res = client.get("/health")
    assert len(res.headers["x-request-id"]) == 32
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert "strict-transport-security" not in res.headers  # plain http in tests

    traced = client.get("/health", headers={"X-Request-ID": "trace-abc.123",
                                            "X-Forwarded-Proto": "https"})
    assert traced.headers["x-request-id"] == "trace-abc.123"
    assert "max-age" in traced.headers["strict-transport-security"]

    forged = client.get("/health", headers={"X-Request-ID": "bad id\nwith newline"})
    assert forged.headers["x-request-id"] != "bad id\nwith newline"


def test_unexpected_errors_return_json_with_the_request_id(db_factory, monkeypatch):
    def boom():
        raise RuntimeError("database exploded")
    monkeypatch.setattr(services.company_engine, "list_companies", boom)

    res = TestClient(main.app, raise_server_exceptions=False).get("/companies")
    assert res.status_code == 500
    body = res.json()
    assert body["error"].startswith("Something went wrong")
    assert "exploded" not in body["error"]
    assert len(body["request_id"]) == 32


def test_retrying_an_earlier_node_grades_that_nodes_question(client, monkeypatch):
    headers, _ = signup(client)
    session = start_session(client, headers)
    first_question = session["question"]
    monkeypatch.setattr(services.difficulty_engine, "select_question",
                        lambda **kw: {"question": "A different follow-up.", "category": "General"})
    monkeypatch.setattr(services.scorer, "score", lambda question, answer: {**FAKE_SCORES, "overall_summary": "low"}
                        | {k: 3.0 for k in FAKE_SCORES if k.startswith("score_")})
    client.post("/answer/submit", headers=headers, json=answer_payload(session))  # server now asks the follow-up

    graded = []
    monkeypatch.setattr(services.scorer, "score", lambda question, answer: graded.append(question) or dict(FAKE_SCORES))
    client.post("/answer/submit", headers=headers, json=answer_payload(session, question=first_question))
    assert graded == [first_question]


# ---------- token revocation ----------

def test_sign_out_everywhere_revokes_every_token(client):
    headers, _ = signup(client)
    second_device = {"Authorization": "Bearer " + client.post(
        "/auth/login", json={"email": "ada@example.com", "password": "correct-horse"}).json()["access_token"]}
    assert client.get("/user/sessions", headers=second_device).status_code == 200

    assert client.post("/auth/logout-all", headers=headers).json() == {"status": "ok"}
    assert client.get("/user/sessions", headers=headers).status_code == 401
    assert client.get("/user/sessions", headers=second_device).status_code == 401

    fresh = client.post("/auth/login", json={"email": "ada@example.com", "password": "correct-horse"})
    assert client.get("/user/sessions", headers={"Authorization": "Bearer " + fresh.json()["access_token"]}).status_code == 200


def test_change_password_signs_out_other_devices(client):
    headers, _ = signup(client)
    body = {"current_password": "correct-horse", "new_password": "new-battery-staple"}

    wrong = client.post("/auth/change-password", headers=headers, json={**body, "current_password": "nope"})
    assert wrong.status_code == 400 and "incorrect" in wrong.json()["error"]
    same = client.post("/auth/change-password", headers=headers, json={**body, "new_password": "correct-horse"})
    assert same.status_code == 400
    weak = client.post("/auth/change-password", headers=headers, json={**body, "new_password": "short"})
    assert weak.status_code == 400

    res = client.post("/auth/change-password", headers=headers, json=body)
    assert res.status_code == 200
    assert client.get("/user/sessions", headers=headers).status_code == 401          # old token revoked
    new_headers = {"Authorization": "Bearer " + res.json()["access_token"]}
    assert client.get("/user/sessions", headers=new_headers).status_code == 200      # this device stays in

    assert client.post("/auth/login", json={"email": "ada@example.com", "password": "correct-horse"}).status_code == 401
    assert client.post("/auth/login", json={"email": "ada@example.com", "password": "new-battery-staple"}).status_code == 200


def test_tokens_issued_before_versioning_still_work(client, db_factory):
    from auth import create_access_token
    _, user_id = signup(client)
    legacy = create_access_token({"user_id": user_id, "email": "ada@example.com"})  # no "tv" claim
    assert client.get("/user/sessions", headers={"Authorization": f"Bearer {legacy}"}).status_code == 200


def test_deleted_accounts_tokens_stop_working(client):
    headers, _ = signup(client)
    assert client.delete("/user/me", headers=headers).status_code == 200
    assert client.get("/user/sessions", headers=headers).status_code == 401


def test_password_reset_works_once_and_signs_out_everywhere(client, monkeypatch):
    import mailer
    sent = []
    monkeypatch.setattr(mailer, "send_email", lambda to, subject, body: sent.append((to, body)) or True)
    old_headers, _ = signup(client)

    # Unknown and known emails get the same reply; only the known one is mailed.
    unknown = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
    known = client.post("/auth/forgot-password", json={"email": "ADA@example.com"})
    assert unknown.status_code == known.status_code == 200
    assert unknown.json() == known.json()
    assert [to for to, _ in sent] == ["ada@example.com"]
    token = sent[0][1].split("#token=")[1].split()[0]

    reset = client.post("/auth/reset-password", json={"token": token, "new_password": "a-new-password"})
    assert reset.status_code == 200, reset.text
    assert client.get("/user/sessions", headers=old_headers).status_code == 401      # old sessions revoked
    new_headers = {"Authorization": f"Bearer {reset.json()['access_token']}"}
    assert client.get("/user/sessions", headers=new_headers).status_code == 200

    again = client.post("/auth/reset-password", json={"token": token, "new_password": "yet-another-one"})
    assert again.status_code == 400                                                   # single use
    assert client.post("/auth/login", json={"email": "ada@example.com", "password": "a-new-password"}).status_code == 200


def test_password_reset_rejects_bad_tokens_and_weak_passwords(client, monkeypatch):
    import mailer
    sent = []
    monkeypatch.setattr(mailer, "send_email", lambda to, subject, body: sent.append(body) or True)
    signup(client)
    assert client.post("/auth/reset-password", json={"token": "not-a-token", "new_password": "long-enough-1"}).status_code == 400
    client.post("/auth/forgot-password", json={"email": "ada@example.com"})
    token = sent[0].split("#token=")[1].split()[0]
    assert client.post("/auth/reset-password", json={"token": token, "new_password": "short"}).status_code == 400
    # A login token is not a reset token.
    login_token = client.post("/auth/login", json={"email": "ada@example.com", "password": "correct-horse"}).json()["access_token"]
    assert client.post("/auth/reset-password", json={"token": login_token, "new_password": "long-enough-1"}).status_code == 400


def test_refresh_renews_a_valid_token_but_not_a_revoked_one(client):
    headers, _ = signup(client)
    fresh = client.post("/auth/refresh", headers=headers)
    assert fresh.status_code == 200 and fresh.json()["access_token"]
    client.post("/auth/logout-all", headers=headers)
    assert client.post("/auth/refresh", headers=headers).status_code == 401


def test_rate_limit_key_ignores_a_forged_forwarded_for():
    from starlette.requests import Request as StarletteRequest
    from api.deps import client_ip

    def request(headers):
        return StarletteRequest({"type": "http", "client": ("10.0.0.1", 1), "headers": [(k.encode(), v.encode()) for k, v in headers.items()]})

    # The caller forges the left side; the proxy's own entry is on the right.
    assert client_ip(request({"x-forwarded-for": "1.2.3.4, 203.0.113.9"})) == "203.0.113.9"
    assert client_ip(request({"x-forwarded-for": "5.6.7.8, 203.0.113.9"})) == "203.0.113.9"
    assert client_ip(request({"x-real-ip": "203.0.113.9", "x-forwarded-for": "1.2.3.4"})) == "203.0.113.9"
    assert client_ip(request({})) == "10.0.0.1"


# ---------- contract with the frontend's mock API ----------
# contracts/api-responses.json lists the fields each response carries; the
# frontend's browser-test mocks are checked against the same file
# (frontend/src/lib/apiContract.test.js), so neither side can drift.

CONTRACT = json_module.loads((Path(__file__).resolve().parents[2] / "contracts" / "api-responses.json").read_text())


def assert_contract(name, body):
    assert sorted(body) == sorted(CONTRACT[name]), f"{name}: {sorted(body)} != {sorted(CONTRACT[name])}"


def test_auth_and_session_responses_match_the_contract(client, monkeypatch):
    res = client.post("/auth/signup", json={"email": "ada@example.com", "password": "correct-horse", "name": "Ada"})
    assert_contract("auth", res.json())
    assert_contract("auth.user", res.json()["user"])
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}
    assert_contract("auth", client.post("/auth/refresh", headers=headers).json())
    assert_contract("forgot_password", client.post("/auth/forgot-password", json={"email": "ada@example.com"}).json())
    assert_contract("session_start", start_session(client, headers))


def test_coding_responses_match_the_contract(client, problem, monkeypatch):
    headers, _ = signup(client)
    monkeypatch.setattr(services.code_executor, "run_test_cases", fake_run)
    monkeypatch.setattr(services.coding_engine, "grade_submission", lambda *a, **kw: {
        "tests_passed": 2, "tests_total": 2, "complexity_estimate": "O(1)",
        "cleanliness_score": 8, "naming_score": 9, "feedback": "Clean.",
    })
    run = client.post("/coding/run", headers=headers, json={"problem_id": problem, "code": "print(3)", "language": "python"}).json()
    assert_contract("coding_run", run)
    for result in run["results"]:
        assert_contract("coding_run.result", result)
    submit = client.post("/coding/submit", headers=headers, json={"problem_id": problem, "code": "print(3)", "language": "python"}).json()
    assert_contract("coding_submit", submit)
