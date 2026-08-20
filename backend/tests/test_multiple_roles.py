"""
Broader version of test_difficulty_levels.py — tests MULTIPLE roles at
low and high difficulty, not just Frontend Engineer, so we can confirm
role-specificity and difficulty scaling hold up across the board.

HOW TO USE: same as before — put this in backend/, run:
    python test_multiple_roles.py
"""

from engines.adaptive_difficulty import AdaptiveDifficultyEngine

engine = AdaptiveDifficultyEngine()

# (role, company, elo) — elo 1000 ≈ difficulty 2, elo 1700 ≈ difficulty 9
TEST_CASES = [
    ("Backend Engineer — L4", "google", 1000),
    ("Backend Engineer — L4", "google", 1700),
    ("ML Engineer", "google", 1000),
    ("ML Engineer", "google", 1700),
    ("Systems Architect", "amazon", 1000),
    ("Systems Architect", "amazon", 1700),
]

for role, company, elo in TEST_CASES:
    difficulty_est = min(10, max(1, int((elo - 800) / 100)))
    print("\n" + "=" * 80)
    print(f"Role: {role}  —  Company: {company}  —  ELO {elo} (difficulty ~{difficulty_est})")
    print("=" * 80)

    result = engine.select_question(
        elo=elo,
        company=company,
        role=role,
        persona="standard"
    )

    print(f"Category: {result.get('category')}")
    print(f"Sub-category: {result.get('sub_category')}")
    print(f"Difficulty score: {result.get('difficulty')}/10")
    print(f"\nQuestion:\n{result.get('question')}")

print("\n" + "=" * 80)
print("Check: does each role's question actually sound like something that")
print("role would face (not generic distributed-systems for everyone)?")
print("Does the ELO 1700 version of each role feel harder/broader than the")
print("ELO 1000 version of the SAME role?")
print("=" * 80)