"""
Quick test script: generates 3 sample interview questions at different
difficulty levels (Beginner, Medium, Advanced) for the SAME role/company,
so you can read them side by side and see if they actually get harder.

HOW TO USE:
1. Copy this file into your backend/ folder (same folder as main.py)
2. Open a terminal, activate your venv, cd into backend/
3. Run: python test_difficulty_levels.py
4. Read the 3 questions it prints out

This does NOT touch your live website or your database in any writing way.
It just calls the same question-generator your app already uses.
"""

from engines.adaptive_difficulty import AdaptiveDifficultyEngine

engine = AdaptiveDifficultyEngine()

# These 3 ELO numbers translate to difficulty 2, 5, and 9 out of 10
# (using the same formula your app uses: difficulty = (elo - 800) / 100)
TEST_CASES = [
    {"label": "BEGINNER (difficulty ~2)", "elo": 1000},
    {"label": "MEDIUM (difficulty ~5)", "elo": 1300},
    {"label": "ADVANCED (difficulty ~9)", "elo": 1700},
]

ROLE = "Frontend Engineer — L4"
COMPANY = "google"

for case in TEST_CASES:
    print("\n" + "=" * 80)
    print(f"{case['label']}  —  ELO {case['elo']}  —  Role: {ROLE}  —  Company: {COMPANY}")
    print("=" * 80)

    result = engine.select_question(
        elo=case["elo"],
        company=COMPANY,
        role=ROLE,
        persona="standard"
    )

    print(f"\nCategory: {result.get('category')}")
    print(f"Sub-category: {result.get('sub_category')}")
    print(f"Difficulty score: {result.get('difficulty')}/10")
    print(f"\nQuestion:\n{result.get('question')}")

print("\n" + "=" * 80)
print("DONE. Compare the 3 questions above — the ADVANCED one should feel")
print("noticeably broader in scope, more ambiguous, and higher-stakes than")
print("the BEGINNER one. If they all feel about the same, that's the bug.")
print("=" * 80)