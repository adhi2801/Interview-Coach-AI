"""
Tests for the pure-logic parts of AdaptiveDifficultyEngine.

These methods don't call Claude or the database, so they're tested directly
with no mocking required. The engine's __init__ does create a real
anthropic.Anthropic client and QuestionVectorStore, which normally needs
ANTHROPIC_API_KEY set — for these pure-function tests we bypass __init__
entirely with __new__ so no API key or DB connection is needed to run them.
"""
import pytest
from engines.adaptive_difficulty import AdaptiveDifficultyEngine, VALID_CATEGORIES


@pytest.fixture
def engine():
    """Instance without running __init__ (no API client / vector store needed)."""
    return AdaptiveDifficultyEngine.__new__(AdaptiveDifficultyEngine)


class TestUpdateElo:
    """update_elo implements a standard Elo rating update:
    new = current + K * (actual_score - expected_score)
    where expected_score comes from the logistic Elo curve.
    """

    def test_perfect_score_against_easier_question_gains_little(self, engine):
        # candidate elo 1400 answers a difficulty-2 (elo ~1000) question perfectly.
        # They were already expected to win, so the gain should be small.
        new_elo = engine.update_elo(current_elo=1400, question_difficulty=2, score=10)
        assert new_elo > 1400
        assert new_elo - 1400 < 5  # near-zero gain, expected win confirmed

    def test_perfect_score_against_harder_question_gains_a_lot(self, engine):
        # candidate elo 1000 answers a difficulty-8 (elo ~1600) question perfectly.
        # A big upset — should gain close to the full K-factor.
        new_elo = engine.update_elo(current_elo=1000, question_difficulty=8, score=10)
        assert new_elo > 1000
        assert new_elo - 1000 > 25  # most of K=32 should apply

    def test_zero_score_against_easier_question_loses_a_lot(self, engine):
        # candidate elo 1400 completely fails a difficulty-2 (elo ~1000) question.
        # They were expected to win comfortably — should lose close to full K.
        new_elo = engine.update_elo(current_elo=1400, question_difficulty=2, score=0)
        assert new_elo < 1400
        assert 1400 - new_elo > 25

    def test_zero_score_against_harder_question_loses_little(self, engine):
        # candidate elo 1000 fails a difficulty-8 (elo ~1600) question.
        # They were expected to lose anyway — should barely move.
        new_elo = engine.update_elo(current_elo=1000, question_difficulty=8, score=0)
        assert new_elo < 1000
        assert 1000 - new_elo < 5

    def test_evenly_matched_question_average_score_is_roughly_stable(self, engine):
        # question elo == candidate elo means expected score is exactly 0.5.
        # A score of 5/10 (actual=0.5) should produce almost no change.
        new_elo = engine.update_elo(current_elo=1200, question_difficulty=4, score=5)
        assert abs(new_elo - 1200) < 1

    def test_result_is_rounded_to_one_decimal(self, engine):
        new_elo = engine.update_elo(current_elo=1150, question_difficulty=5, score=7)
        assert new_elo == round(new_elo, 1)

    def test_elo_can_exceed_starting_band_with_repeated_wins(self, engine):
        # sanity check there's no artificial ceiling in the formula itself
        elo = 1200
        for _ in range(5):
            elo = engine.update_elo(current_elo=elo, question_difficulty=9, score=10)
        assert elo > 1200


class TestClassifyTopicName:
    """_classify_topic_name does simple substring matching against
    VALID_CATEGORIES, falling back to 'system_design'."""

    def test_matches_known_category_substring(self, engine):
        assert engine._classify_topic_name("distributed_systems_basics") == "distributed_systems"

    def test_matches_category_regardless_of_position(self, engine):
        assert engine._classify_topic_name("intro_to_security_fundamentals") == "security"

    def test_falls_back_to_system_design_when_no_match(self, engine):
        assert engine._classify_topic_name("completely_unrelated_topic_xyz") == "system_design"

    def test_is_case_insensitive(self, engine):
        assert engine._classify_topic_name("OOP_Principles") == "oop"


class TestPickPrimaryCategory:
    """_pick_primary_category returns the first valid category found in a
    list, or the first element as a last resort, or 'system_design' if
    the list is empty."""

    def test_returns_first_valid_category_in_list(self, engine):
        result = engine._pick_primary_category(["not_a_category", "algorithms", "oop"])
        assert result == "algorithms"

    def test_returns_first_element_when_none_are_valid_categories(self, engine):
        result = engine._pick_primary_category(["some_custom_tag", "another_tag"])
        assert result == "some_custom_tag"

    def test_returns_system_design_for_empty_list(self, engine):
        assert engine._pick_primary_category([]) == "system_design"

    def test_all_valid_categories_are_recognized(self, engine):
        for category in VALID_CATEGORIES:
            result = engine._pick_primary_category([category])
            assert result == category