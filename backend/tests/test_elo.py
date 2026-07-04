# backend/tests/test_elo.py
#
# Pure unit tests for AdaptiveDifficultyEngine.update_elo().
# No DB, no Anthropic API — this instantiates the engine directly.
#
# NOTE: AdaptiveDifficultyEngine.__init__ creates an anthropic.Anthropic
# client and a QuestionVectorStore. Neither is called by update_elo(), but
# __init__ still runs. If ANTHROPIC_API_KEY isn't set in your test env,
# client creation will still succeed (it doesn't validate the key at
# construction time) — but if QuestionVectorStore() tries to connect to
# ChromaDB on init and that fails in CI, isolate update_elo() into a
# standalone function instead. For now this assumes engine construction
# succeeds in your test environment the same way it does when the app boots.

import pytest
from engines.adaptive_difficulty import AdaptiveDifficultyEngine


@pytest.fixture
def engine():
    return AdaptiveDifficultyEngine()


def test_perfect_score_on_hard_question_increases_elo(engine):
    # Difficulty 9 question -> question_elo = 800 + 900 = 1700
    # User at 1200 is heavily underdog (expected win% low), scores a perfect 10
    # -> should gain a large amount of ELO
    new_elo = engine.update_elo(current_elo=1200, question_difficulty=9, score=10.0)
    assert new_elo > 1200
    # K=32 means a max single-question swing is bounded — sanity check it's not absurd
    assert new_elo - 1200 <= 32


def test_bad_score_on_easy_question_decreases_elo(engine):
    # Difficulty 1 question -> question_elo = 900. User at 1600 is heavily favored.
    # Scoring 2/10 (a bad answer) should cost ELO.
    new_elo = engine.update_elo(current_elo=1600, question_difficulty=1, score=2.0)
    assert new_elo < 1600


def test_expected_performance_barely_moves_elo(engine):
    # question_elo = 800 + 500 = 1300, user at 1300 -> expected == actual when
    # score matches the "expected" 50% win rate (score=5.0 -> actual=0.5)
    new_elo = engine.update_elo(current_elo=1300, question_difficulty=5, score=5.0)
    assert abs(new_elo - 1300) < 0.5  # should be ~0 change, allow float rounding


def test_elo_never_returns_negative_for_realistic_inputs(engine):
    new_elo = engine.update_elo(current_elo=800, question_difficulty=10, score=0.0)
    assert new_elo > 0  # ELO systems don't go negative in practice; sanity floor


def test_score_of_zero_on_hardest_question_is_worst_case_but_bounded(engine):
    new_elo = engine.update_elo(current_elo=1200, question_difficulty=10, score=0.0)
    # Should decrease, but K=32 caps the single-question damage
    assert new_elo < 1200
    assert 1200 - new_elo <= 32


@pytest.mark.parametrize("difficulty", [1, 5, 10])
def test_update_elo_is_deterministic(engine, difficulty):
    # Same inputs must always produce the same output — this is pure math,
    # no randomness or API calls should be involved.
    result_1 = engine.update_elo(current_elo=1200, question_difficulty=difficulty, score=7.0)
    result_2 = engine.update_elo(current_elo=1200, question_difficulty=difficulty, score=7.0)
    assert result_1 == result_2