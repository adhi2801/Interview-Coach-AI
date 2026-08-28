"""
Tests for AdaptiveDifficultyEngine's category-classification helpers.
update_elo is already covered in test_elo.py — not duplicated here.
"""
import pytest
from engines.adaptive_difficulty import AdaptiveDifficultyEngine, VALID_CATEGORIES


@pytest.fixture
def engine():
    """Instance without running __init__ (no API client / vector store needed)."""
    return AdaptiveDifficultyEngine.__new__(AdaptiveDifficultyEngine)


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