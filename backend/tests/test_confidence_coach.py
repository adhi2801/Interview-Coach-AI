# backend/tests/test_confidence_coach.py
#
# Pure unit tests: no network, no database. A fake clock makes the
# time-based numbers (pace, answer length) exact.

import pytest

from engines.confidence_coach import ConfidenceCoach, find_fillers


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now

    def advance(self, seconds):
        self.now += seconds


@pytest.fixture
def clock():
    return FakeClock()


@pytest.fixture
def coach(clock):
    return ConfidenceCoach(clock=clock)


SOLID = ("I would put a token bucket per user in Redis, refill it on a fixed "
         "interval, and reject requests once the bucket is empty to protect the API.")


# ---------- filler detection ----------

def test_ordinary_uses_of_marker_words_are_not_fillers():
    text = ("So the cache sits in front of the database, and structures like a trie "
            "help. The right index matters. What kind of lock? I actually measured it.")
    assert find_fillers(text) == {}


def test_real_fillers_are_counted():
    text = "Um, so, I'd, like, use a queue, you know, and uh, it's kind of fast, right?"
    assert find_fillers(text) == {
        "um": 1, "uh": 1, "like": 1, "you know": 1, "so": 1, "right": 1, "kind of": 1,
    }


def test_stretched_disfluencies_are_matched():
    assert find_fillers("Ummm, uhh, hmm, erm") == {"um": 1, "uh": 1, "hmm": 1, "erm": 1}
    assert find_fillers("uhm") == {"um": 1}


# ---------- typed path: the frontend re-sends the whole textarea ----------

def test_resending_the_same_snapshot_does_not_double_count_fillers(coach, clock):
    snapshot = "Um, I'd use a hash map, um, keyed by user id, um, with a TTL on each entry."
    first = coach.analyze_typed(snapshot)
    clock.advance(1)
    second = coach.analyze_typed(snapshot)
    assert first.filler_count == second.filler_count == 3


def test_typing_speed_is_measured_from_the_start_of_this_answer(coach, clock):
    coach.analyze_typed("I would")
    clock.advance(60)
    fb = coach.analyze_typed(" ".join(["word"] * 40))
    assert fb.words_per_minute == 40.0
    assert fb.pace_source == "typing"


def test_slow_typing_is_not_penalised_as_slow_speech(coach, clock):
    coach.analyze_typed("I")
    clock.advance(120)
    fb = coach.analyze_typed(SOLID)  # ~13 wpm: normal for typing, very slow for speech
    assert fb.confidence_score == 10.0


def test_reset_starts_the_clock_for_the_next_answer(coach, clock):
    coach.analyze_typed(SOLID)
    clock.advance(600)  # ten minutes on question one
    coach.reset()
    coach.analyze_typed("Next")
    clock.advance(30)
    fb = coach.analyze_typed(" ".join(["word"] * 50))
    assert fb.words_per_minute == 100.0  # 50 words / 0.5 min, not / 10.5 min


# ---------- spoken path: each recording is new speech ----------

def test_speaking_pace_uses_audio_duration(coach, clock):
    clock.advance(500)  # wall-clock time since connect must be irrelevant
    fb = coach.analyze_spoken(" ".join(["word"] * 70), audio_seconds=30)
    assert fb.words_per_minute == 140.0
    assert fb.pace_source == "speech"


def test_spoken_recordings_accumulate(coach):
    coach.analyze_spoken("Um, I'd shard by user id " + " ".join(["x"] * 24), audio_seconds=15)
    fb = coach.analyze_spoken("and uh replicate each shard " + " ".join(["y"] * 25), audio_seconds=15)
    assert fb.word_count == 60
    assert fb.words_per_minute == 120.0
    assert fb.filler_breakdown == {"um": 1, "uh": 1}


def test_fast_speech_is_flagged(coach):
    fb = coach.analyze_spoken(SOLID + " " + SOLID + " " + SOLID, audio_seconds=15)
    assert fb.words_per_minute > 170
    assert "Slow down" in fb.suggestion
    assert fb.confidence_score == 8.0


# ---------- scoring ----------

def test_filler_penalty_scales_with_density_not_raw_count(coach):
    long_answer = " ".join([SOLID] * 12) + " Um, uh, um."
    short_answer = "Um, uh, um, I'd cache it in Redis with a short TTL for every single user."
    long_fb = ConfidenceCoach().analyze_typed(long_answer)
    short_fb = coach.analyze_typed(short_answer)
    assert long_fb.filler_count == short_fb.filler_count == 3
    assert long_fb.confidence_score > short_fb.confidence_score


def test_very_short_or_non_prose_answers_score_low(coach):
    assert coach.analyze_typed("idk").confidence_score <= 2.0
    assert ConfidenceCoach().analyze_typed("1234 5678 9012 3456 7890 1234 5678 " * 3).confidence_score <= 4.0


def test_clean_answer_scores_full_marks(coach):
    fb = coach.analyze_typed(SOLID)
    assert fb.confidence_score == 10.0
    assert fb.fillers_found == []
