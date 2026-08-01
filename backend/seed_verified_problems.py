"""
Reads verified_problems.json (produced by generate_coding_problems.py) and
inserts each problem into your real database — into the CodingProblem and
CodingTestCase tables.

HOW TO USE:
1. Make sure verified_problems.json is in this same folder (backend/)
2. Run: python seed_verified_problems.py
3. It will print each problem as it's inserted, and skip any that already
   exist (matched by slug) so it's safe to run more than once.

This uses your existing database.py / models.py — same DB connection your
app already uses. It writes real rows to your real Postgres database.
"""

import json
from database import SessionLocal
from models import CodingProblem, CodingTestCase


def main():
    with open("verified_problems.json", "r") as f:
        problems = json.load(f)

    if not problems:
        print("No problems found in verified_problems.json — nothing to seed.")
        return

    db = SessionLocal()
    inserted_count = 0
    skipped_count = 0

    try:
        for p in problems:
            slug = p.get("slug")
            if not slug:
                print(f"Skipping '{p.get('title', 'untitled')}' — missing slug.")
                continue

            existing = db.query(CodingProblem).filter(CodingProblem.slug == slug).first()
            if existing:
                print(f"SKIPPED (already exists): {slug}")
                skipped_count += 1
                continue

            # Build the starter_code JSON blob using the 4 language stubs
            starter_code = {
                "python": p.get("starter_code_python", ""),
                "javascript": p.get("starter_code_javascript", ""),
                "cpp": p.get("starter_code_cpp", ""),
                "java": p.get("starter_code_java", ""),
            }

            # Fold constraints + input/output format into the description,
            # since CodingProblem only has one description Text field.
            constraints_text = "\n".join(f"- {c}" for c in p.get("constraints", []))
            full_description = (
                f"{p.get('description', '')}\n\n"
                f"Input format: {p.get('input_format', '')}\n"
                f"Output format: {p.get('output_format', '')}\n\n"
                f"Constraints:\n{constraints_text}"
            )

            problem_row = CodingProblem(
                slug=slug,
                title=p.get("title", "Untitled Problem"),
                description=full_description,
                starter_code=starter_code,
                difficulty=p.get("difficulty", 5),
                topics=[p.get("category", "general")],
                companies=p.get("companies", []),
            )
            db.add(problem_row)
            db.flush()  # get problem_row.id without committing yet

            test_cases = p.get("test_cases", [])
            for i, tc in enumerate(test_cases):
                # First 2 test cases visible (used by "Run"), rest hidden (used by "Submit")
                is_hidden = 0 if i < 2 else 1
                tc_row = CodingTestCase(
                    problem_id=problem_row.id,
                    input_data=tc.get("input", ""),
                    expected_output=tc.get("expected_output", ""),
                    is_hidden=is_hidden,
                )
                db.add(tc_row)

            db.commit()
            print(f"INSERTED: {slug}  ({p.get('title')})  —  {len(test_cases)} test cases")
            inserted_count += 1

    except Exception as e:
        db.rollback()
        print(f"ERROR during seeding, rolled back: {e}")
        raise
    finally:
        db.close()

    print("\n" + "=" * 60)
    print(f"DONE. Inserted {inserted_count} new problems, skipped {skipped_count} duplicates.")
    print("=" * 60)


if __name__ == "__main__":
    main()