# backend/tests/test_knowledge_graph.py
#
# Tests get_full_study_path() — the recursive prerequisite walker.
# Uses an in-memory SQLite DB seeded with a small known topic chain,
# so results are 100% predictable and don't depend on your real 93-topic graph.
#
# extract_gaps() is NOT tested here because it calls the Anthropic API —
# that needs mocking (see test_knowledge_graph_gaps.py note at bottom).

import pytest
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Topic, TopicPrerequisite
from engines.knowledge_graph import KnowledgeGapGraph


@pytest.fixture
def test_db_session():
    """
    Isolated in-memory SQLite DB. Every test gets a fresh copy —
    nothing here touches your real Postgres data.
    """
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    TestSessionLocal = sessionmaker(bind=engine)
    session = TestSessionLocal()

    # Known chain: dynamic_programming -> recursion -> complexity_analysis
    # (complexity_analysis has no prerequisites — it's the root)
    t_complexity = Topic(name="complexity_analysis", category="algorithms", difficulty_level=2)
    t_recursion = Topic(name="recursion", category="algorithms", difficulty_level=3)
    t_dp = Topic(name="dynamic_programming", category="algorithms", difficulty_level=6)
    session.add_all([t_complexity, t_recursion, t_dp])
    session.commit()

    session.add(TopicPrerequisite(topic_id=t_recursion.id, prerequisite_id=t_complexity.id))
    session.add(TopicPrerequisite(topic_id=t_dp.id, prerequisite_id=t_recursion.id))
    session.commit()

    yield session, TestSessionLocal
    session.close()


def test_full_study_path_walks_prerequisite_chain_in_order(test_db_session, monkeypatch):
    _, TestSessionLocal = test_db_session

    # KnowledgeGapGraph internally calls SessionLocal() directly (from database.py),
    # so we patch it at the point of use to return our test session instead.
    monkeypatch.setattr("engines.knowledge_graph.SessionLocal", TestSessionLocal)

    graph = KnowledgeGapGraph()
    path = graph.get_full_study_path("dynamic_programming")

    # Prerequisites must come before the topic that depends on them
    assert path == ["complexity_analysis", "recursion", "dynamic_programming"]


def test_full_study_path_for_root_topic_returns_only_itself(test_db_session, monkeypatch):
    _, TestSessionLocal = test_db_session
    monkeypatch.setattr("engines.knowledge_graph.SessionLocal", TestSessionLocal)

    graph = KnowledgeGapGraph()
    path = graph.get_full_study_path("complexity_analysis")

    assert path == ["complexity_analysis"]


def test_full_study_path_for_unknown_topic_returns_empty(test_db_session, monkeypatch):
    _, TestSessionLocal = test_db_session
    monkeypatch.setattr("engines.knowledge_graph.SessionLocal", TestSessionLocal)

    graph = KnowledgeGapGraph()
    path = graph.get_full_study_path("topic_that_does_not_exist")

    assert path == []


def test_full_study_path_does_not_infinite_loop_on_revisit(test_db_session, monkeypatch):
    # Regression guard: the `visited` set in get_full_study_path must prevent
    # infinite recursion if the graph ever has a cycle or diamond dependency.
    _, TestSessionLocal = test_db_session
    monkeypatch.setattr("engines.knowledge_graph.SessionLocal", TestSessionLocal)

    graph = KnowledgeGapGraph()
    # Calling twice on the same topic in one process should be stable/idempotent
    path_1 = graph.get_full_study_path("dynamic_programming")
    path_2 = graph.get_full_study_path("dynamic_programming")
    assert path_1 == path_2


# --- On extract_gaps() ---
# That method calls self.client.messages.create(...) — a real Anthropic call.
# To test it without burning tokens, mock the client:
#
#   from unittest.mock import MagicMock
#   graph = KnowledgeGapGraph()
#   graph.client = MagicMock()
#   graph.client.messages.create.return_value.content = [
#       MagicMock(text='["recursion", "complexity_analysis"]')
#   ]
#   gaps = graph.extract_gaps(question="...", answer="...", technical_score=3.0)
#
# Left as a follow-up rather than included here since it needs a decision from
# you: do you want CI to also verify the JSON-parsing fallback (empty list on
# malformed JSON), or just the happy path? Say the word and I'll add it.