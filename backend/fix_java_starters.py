"""
Renames the Java starter class from `Solution` to `Main` for coding problems
already stored in the database.

Why: Judge0 (language 62) compiles Java as Main.java, so a starter that
declares `public class Solution` fails to compile before the candidate has
written a line ("class Solution is public, should be declared in a file
named Solution.java"). The original 15 verified problems were seeded that
way; verified_problems.json itself is fixed, but seeding skips existing
slugs, so rows that are already in the database need this one-off update.

Safe to run more than once: rows already using Main are left alone.

HOW TO USE (from backend/):
    python fix_java_starters.py           # dry run: lists what would change
    python fix_java_starters.py --apply   # writes the change
"""

import re
import sys

from sqlalchemy.orm.attributes import flag_modified

from database import SessionLocal
from models import CodingProblem

CLASS_RE = re.compile(r"\bclass\s+Solution\b")
NAME_RE = re.compile(r"\bSolution\b")


def patched(java):
    if not java or not CLASS_RE.search(java):
        return None
    return NAME_RE.sub("Main", java)


def main(apply=False):
    db = SessionLocal()
    changed = []
    try:
        for p in db.query(CodingProblem).order_by(CodingProblem.id).all():
            starter = dict(p.starter_code or {})
            new_java = patched(starter.get("java"))
            if new_java is None:
                continue
            changed.append(p.slug)
            if apply:
                starter["java"] = new_java
                p.starter_code = starter
                flag_modified(p, "starter_code")
        if apply and changed:
            db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    verb = "Updated" if apply else "Would update"
    print(f"{verb} {len(changed)} Java starter(s):")
    for slug in changed:
        print(f"  - {slug}")
    if changed and not apply:
        print("\nDry run only. Re-run with --apply to write the change.")


if __name__ == "__main__":
    main(apply="--apply" in sys.argv[1:])
