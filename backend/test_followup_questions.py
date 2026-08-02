"""
Tests select_followup_question specifically — the "hardened follow-up"
path that fires when a candidate scores well on the first question.
This is DIFFERENT from select_question (the first-question path), and
had its own separate bug (CONSTRAINT_PROMPTS being role-blind).

Simulates: candidate answers a first question well (score 8/10), so the
engine generates a harder follow-up. We check whether that follow-up
actually stays relevant to the role, or drifts into generic algorithms/
systems territory regardless of role — which is exactly the bug found.

HOW TO USE: same as before — put this in backend/, run:
    python test_followup_questions.py
"""

from engines.adaptive_difficulty import AdaptiveDifficultyEngine

engine = AdaptiveDifficultyEngine()

# Simulated "previous question + strong answer" pairs, one per role,
# so each follow-up is generated in a realistic context.
TEST_CASES = [
    {
        "role": "ML Engineer",
        "company": "google",
        "elo": 1500,
        "previous_question": "You are two weeks before a product launch and your model accuracy on the held-out test set has plateaued 4 percentage points below the threshold the product team committed to.",
        "previous_answer": "I would first do a rigorous error analysis segmented by data slice to find where the model underperforms, check for label noise or distribution shift versus training data, and quantify the actual business cost of the gap versus the cost of delay. I'd propose a human-in-the-loop escalation for low-confidence predictions as a stopgap, with a clear plan to close the gap post-launch.",
        "previous_category": "communication",
    },
    {
        "role": "Frontend Engineer",
        "company": "google",
        "elo": 1500,
        "previous_question": "You shipped a checkout redesign and are seeing a spike in cart abandonment tied to a promo code field bug on certain devices.",
        "previous_answer": "I'd first pull error logs and session recordings to isolate which devices and browsers are affected, then check whether it's a CSS layout issue, a JS validation bug, or an API timing issue with the promo code service. I'd hotfix the highest-impact case first and roll out behind a feature flag to limit blast radius.",
        "previous_category": "system_design",
    },
    {
        "role": "Backend Engineer",
        "company": "amazon",
        "elo": 1500,
        "previous_question": "Design a backend service for a ride-matching system handling 50,000 concurrent riders.",
        "previous_answer": "I'd use a geospatial index like a quadtree or geohash-based sharding to efficiently query nearby drivers, an event-driven architecture to handle real-time location updates, and a matching service that balances driver proximity against wait-time fairness.",
        "previous_category": "system_design",
    },
    {
        "role": "Systems Architect",
        "company": "amazon",
        "elo": 1500,
        "previous_question": "Architect a lightweight request-routing component for two workflows: FIFO replenishment alerts and LIFO undo operations.",
        "previous_answer": "I'd implement this as two separate underlying structures behind a shared interface — a queue for the FIFO alerts and a stack for the LIFO undos — rather than forcing one data structure to do both jobs badly.",
        "previous_category": "data_structures",
    },
]

for case in TEST_CASES:
    print("\n" + "=" * 80)
    print(f"FOLLOW-UP for Role: {case['role']}  —  Company: {case['company']}")
    print("=" * 80)
    print(f"(Previous question was about: {case['previous_question'][:80]}...)")

    result = engine.select_followup_question(
        previous_question=case["previous_question"],
        previous_answer=case["previous_answer"],
        elo=case["elo"],
        company=case["company"],
        role=case["role"],
        previous_category=case["previous_category"],
        persona="hostile"
    )

    print(f"\nCategory: {result.get('category')}")
    print(f"Sub-category: {result.get('sub_category')}")
    print(f"\nFollow-up question:\n{result.get('question')}")

print("\n" + "=" * 80)
print("CHECK: does each follow-up push harder on something a REAL person in")
print("that specific role would actually be pressed on? Or does it drift into")
print("generic 'time/space complexity' or 'distributed systems at scale'")
print("regardless of role? That drift is exactly the bug we're checking for.")
print("=" * 80)