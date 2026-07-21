# backend/tests/test_knowledge_graph_gaps.py
#
# Tests extract_gaps() — the one method left untested in test_knowledge_graph.py,
# per that file's own comment: "extract_gaps() is NOT tested here because it
# calls the Anthropic API — that needs mocking."
#
# Strategy: mock self.client.messages.create() so no real API call happens.
# Everything else (topic lookup, prerequisite chain, urgency scoring) runs
# against a real in-memory SQLite DB, same pattern as test_knowledge_graph.py,
# so these tests are fast, free, and deterministic.

import pytest
from unittest.mock import MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Topic, TopicPrerequisite, CompanyTopicWeight
from engines.knowledge_graph import KnowledgeGapGraph


@pytest.fixture
def test_db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    TestSessionLocal = sessionmaker(bind=engine)
    session = TestSessionLocal()

    # Same known chain as test_knowledge_graph.py, plus a company weight
    # entry so _get_company_weight has something real to find.
    t_complexity = Topic(name="complexity_analysis", category="algorithms", difficulty_level=2)
    t_recursion = Topic(name="recursion", category="algorithms", difficulty_level=3)
    t_dp = Topic(name="dynamic_programming", category="algorithms", difficulty_level=6)
    session.add_all([t_complexity, t_recursion, t_dp])
    session.commit()

    session.add(TopicPrerequisite(topic_id=t_recursion.id, prerequisite_id=t_complexity.id))
    session.add(TopicPrerequisite(topic_id=t_dp.id, prerequisite_id=t_recursion.id))
    session.add(CompanyTopicWeight(company="google", topic_id=t_dp.id, weight=1.6))
    session.commit()

    yield session, TestSessionLocal
    session.close()


def _mock_claude_response(text: str) -> MagicMock:
    """Builds a fake Anthropic response shaped like response.content[0].text,
    matching exactly what extract_gaps() reads."""
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=text)]
    return mock_response


def test_extract_gaps_returns_empty_for_high_score(test_db_session, monkeypatch):
    """technical_score >= 7.0 should short-circuit before ever calling Claude —
    this is the cheapest, most important case to lock down, since a regression
    here means burning API calls on answers that don't need gap analysis."""
    _, TestSessionLocal = test_db_session
    monkeypatch.setattr("engines.knowledge_graph.SessionLocal", TestSessionLocal)

    graph = KnowledgeGapGraph()
    graph.client = MagicMock()  # if this gets called, the test below would catch it

    gaps = graph.extract_gaps(
        question="Explain dynamic programming.",
        answer="A thorough, correct answer.",
        technical_score=8.5,
    )

    assert gaps == []
    graph.client.messages.create.assert_not_called()


def test_extract_gaps_happy_path_builds_full_study_plan(test_db_session, monkeypatch):
    """Low score -> Claude identifies a real gap -> the gap gets enriched with
    its prerequisite chain, urgency, and company relevance from the DB."""
    _, TestSessionLocal = test_db_session
    monkeypatch.setattr("engines.knowledge_graph.SessionLocal", TestSessionLocal)

    graph = KnowledgeGapGraph()
    graph.client = MagicMock()
    graph.client.messages.create.return_value = _mock_claude_response(
        '["dynamic_programming"]'
    )

    gaps = graph.extract_gaps(
        question="Explain dynamic programming.",
        answer="I'm not sure, maybe just recursion?",
        technical_score=3.0,
        company="google",
    )

    assert len(gaps) == 1
    gap = gaps[0]
    assert gap["gap"] == "dynamic_programming"
    assert gap["prerequisites_to_study_first"] == ["recursion"]
    assert gap["category"] == "algorithms"
    assert gap["company_relevance"] == 1.6
    # severity = (10 - 3.0) * 1.6 = 11.2 -> falls in the "high" band (>= 9, < 14)
    assert gap["urgency"] == "high"


def test_extract_gaps_handles_malformed_json_gracefully(test_db_session, monkeypatch):
    """If Claude ever returns non-JSON garbage (rare, but real — model output
    isn't guaranteed), extract_gaps must not crash the whole scoring pipeline.
    It should degrade to an empty gap list rather than raising."""
    _, TestSessionLocal = test_db_session
    monkeypatch.setattr("engines.knowledge_graph.SessionLocal", TestSessionLocal)

    graph = KnowledgeGapGraph()
    graph.client = MagicMock()
    graph.client.messages.create.return_value = _mock_claude_response(
        "Sorry, I can't determine that."  # not valid JSON
    )

    gaps = graph.extract_gaps(
        question="Explain dynamic programming.",
        answer="???",
        technical_score=2.0,
    )

    assert gaps == []


def test_extract_gaps_strips_markdown_fences(test_db_session, monkeypatch):
    """Claude sometimes wraps JSON in ```json fences despite instructions not
    to — extract_gaps must strip that defensively, same pattern used
    elsewhere in this codebase (adaptive_difficulty.py, coding_engine.py)."""
    _, TestSessionLocal = test_db_session
    monkeypatch.setattr("engines.knowledge_graph.SessionLocal", TestSessionLocal)

    graph = KnowledgeGapGraph()
    graph.client = MagicMock()
    graph.client.messages.create.return_value = _mock_claude_response(
        '```json\n["dynamic_programming"]\n```'
    )

    gaps = graph.extract_gaps(
        question="Explain dynamic programming.",
        answer="Not confident here.",
        technical_score=4.0,
    )

    assert len(gaps) == 1
    assert gaps[0]["gap"] == "dynamic_programming"


def test_extract_gaps_ignores_topics_claude_invents(test_db_session, monkeypatch):
    """If Claude names a topic that doesn't exist in the DB (hallucinated or
    outside the allowed list it was given), that topic must be silently
    skipped rather than crashing on a missing Topic row."""
    _, TestSessionLocal = test_db_session
    monkeypatch.setattr("engines.knowledge_graph.SessionLocal", TestSessionLocal)

    graph = KnowledgeGapGraph()
    graph.client = MagicMock()
    graph.client.messages.create.return_value = _mock_claude_response(
        '["topic_that_does_not_exist", "dynamic_programming"]'
    )

    gaps = graph.extract_gaps(
        question="Explain dynamic programming.",
        answer="Weak answer.",
        technical_score=3.0,
    )

    # Only the real topic should make it into the result
    assert len(gaps) == 1
    assert gaps[0]["gap"] == "dynamic_programming"


def test_extract_gaps_without_company_defaults_to_neutral_weight(test_db_session, monkeypatch):
    """No company specified -> _get_company_weight should default to 1.0,
    not crash or silently use a stale/wrong weight."""
    _, TestSessionLocal = test_db_session
    monkeypatch.setattr("engines.knowledge_graph.SessionLocal", TestSessionLocal)

    graph = KnowledgeGapGraph()
    graph.client = MagicMock()
    graph.client.messages.create.return_value = _mock_claude_response(
        '["dynamic_programming"]'
    )

    gaps = graph.extract_gaps(
        question="Explain dynamic programming.",
        answer="Weak answer.",
        technical_score=3.0,
        # no company passed
    )

    assert gaps[0]["company_relevance"] == 1.0
    # severity = (10 - 3.0) * 1.0 = 7.0 -> "medium" band (>= 5, < 9)
    assert gaps[0]["urgency"] == "medium"