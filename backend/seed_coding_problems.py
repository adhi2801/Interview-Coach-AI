# backend/seed_coding_problems.py
# Run once to populate the coding_problems / coding_test_cases tables.
# Same philosophy as seed_questions.py: real, hand-picked problems with
# real test cases, not LLM-generated on the fly — a candidate should be
# graded against the same fixed bar every time they hit a given problem.
#
# STDIN/STDOUT CONTRACT: every starter template reads input via input()/stdin
# and prints the result via print(). This is what lets Piston (a raw process
# executor, no test framework) grade arbitrary code — the contract is just
# "read this, print that," which works identically across every language.

from database import SessionLocal
from models import CodingProblem, CodingTestCase

PROBLEMS = [
    {
        "slug": "two_sum",
        "title": "Two Sum",
        "description": (
            "Given a list of integers and a target value, return the indices of the "
            "two numbers that add up to the target. Assume exactly one solution exists, "
            "and you may not use the same element twice.\n\n"
            "Input format: first line is space-separated integers, second line is the target.\n"
            "Output format: the two indices, space-separated, in the order found."
        ),
        "difficulty": 2,
        "topics": ["arrays", "hash_maps"],
        "companies": ["google", "amazon", "microsoft"],
        "starter_code": {
            "python": (
                "nums = list(map(int, input().split()))\n"
                "target = int(input())\n\n"
                "def two_sum(nums, target):\n"
                "    # your code here\n"
                "    pass\n\n"
                "result = two_sum(nums, target)\n"
                "print(*result)\n"
            )
        },
        "test_cases": [
            {"input": "2 7 11 15\n9", "expected_output": "0 1", "is_hidden": 0},
            {"input": "3 2 4\n6", "expected_output": "1 2", "is_hidden": 0},
            {"input": "3 3\n6", "expected_output": "0 1", "is_hidden": 1},
            {"input": "1 5 9 13 20\n33", "expected_output": "2 4", "is_hidden": 1},
        ],
    },
    {
        "slug": "valid_parentheses",
        "title": "Valid Parentheses",
        "description": (
            "Given a string containing just the characters (){}[], determine if the "
            "input is valid — every open bracket must be closed by the same type, in "
            "the correct order.\n\n"
            "Input format: a single line, the string.\n"
            "Output format: 'true' or 'false' (lowercase)."
        ),
        "difficulty": 3,
        "topics": ["strings", "stacks"],
        "companies": ["amazon", "meta", "microsoft"],
        "starter_code": {
            "python": (
                "s = input().strip()\n\n"
                "def is_valid(s):\n"
                "    # your code here\n"
                "    pass\n\n"
                "print(str(is_valid(s)).lower())\n"
            )
        },
        "test_cases": [
            {"input": "()", "expected_output": "true", "is_hidden": 0},
            {"input": "()[]{}", "expected_output": "true", "is_hidden": 0},
            {"input": "(]", "expected_output": "false", "is_hidden": 1},
            {"input": "([)]", "expected_output": "false", "is_hidden": 1},
            {"input": "{[]}", "expected_output": "true", "is_hidden": 1},
        ],
    },
    {
        "slug": "merge_intervals",
        "title": "Merge Intervals",
        "description": (
            "Given a list of intervals, merge all overlapping intervals and return the result, "
            "sorted by start.\n\n"
            "Input format: one interval per constraint, given as a single line: pairs of "
            "start,end separated by spaces, e.g. '1,3 2,6 8,10 15,18'.\n"
            "Output format: merged intervals in the same 'start,end' format, space-separated."
        ),
        "difficulty": 5,
        "topics": ["arrays", "sorting"],
        "companies": ["google", "meta", "microsoft"],
        "starter_code": {
            "python": (
                "raw = input().split()\n"
                "intervals = [list(map(int, pair.split(','))) for pair in raw]\n\n"
                "def merge(intervals):\n"
                "    # your code here\n"
                "    pass\n\n"
                "result = merge(intervals)\n"
                "print(' '.join(f'{a},{b}' for a, b in result))\n"
            )
        },
        "test_cases": [
            {"input": "1,3 2,6 8,10 15,18", "expected_output": "1,6 8,10 15,18", "is_hidden": 0},
            {"input": "1,4 4,5", "expected_output": "1,5", "is_hidden": 0},
            {"input": "1,4 0,4", "expected_output": "0,4", "is_hidden": 1},
            {"input": "1,4 2,3", "expected_output": "1,4", "is_hidden": 1},
        ],
    },
    {
        "slug": "lru_cache",
        "title": "LRU Cache",
        "description": (
            "Implement an LRU (Least Recently Used) cache with a fixed capacity. It should "
            "support get(key) and put(key, value) in O(1) time. When capacity is exceeded, "
            "evict the least recently used item.\n\n"
            "Input format: first line is capacity, remaining lines are commands: "
            "'PUT k v' or 'GET k'.\n"
            "Output format: one line per GET, the value or -1 if not found."
        ),
        "difficulty": 6,
        "topics": ["caching", "hash_maps", "linked_lists"],
        "companies": ["google", "amazon", "meta"],
        "starter_code": {
            "python": (
                "import sys\n"
                "lines = sys.stdin.read().splitlines()\n"
                "capacity = int(lines[0])\n"
                "commands = lines[1:]\n\n"
                "class LRUCache:\n"
                "    def __init__(self, capacity):\n"
                "        # your code here\n"
                "        pass\n"
                "    def get(self, key):\n"
                "        pass\n"
                "    def put(self, key, value):\n"
                "        pass\n\n"
                "cache = LRUCache(capacity)\n"
                "output = []\n"
                "for cmd in commands:\n"
                "    parts = cmd.split()\n"
                "    if parts[0] == 'PUT':\n"
                "        cache.put(int(parts[1]), int(parts[2]))\n"
                "    elif parts[0] == 'GET':\n"
                "        output.append(str(cache.get(int(parts[1]))))\n"
                "print('\\n'.join(output))\n"
            )
        },
        "test_cases": [
            {"input": "2\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nGET 3", "expected_output": "1\n-1\n3", "is_hidden": 0},
            {"input": "1\nPUT 1 1\nPUT 2 2\nGET 1\nGET 2", "expected_output": "-1\n2", "is_hidden": 1},
        ],
    },
    {
        "slug": "longest_substring_no_repeat",
        "title": "Longest Substring Without Repeating Characters",
        "description": (
            "Given a string, find the length of the longest substring without repeating characters.\n\n"
            "Input format: a single line, the string.\n"
            "Output format: a single integer, the length."
        ),
        "difficulty": 5,
        "topics": ["strings", "sliding_window"],
        "companies": ["google", "meta", "amazon"],
        "starter_code": {
            "python": (
                "s = input().strip()\n\n"
                "def length_of_longest_substring(s):\n"
                "    # your code here\n"
                "    pass\n\n"
                "print(length_of_longest_substring(s))\n"
            )
        },
        "test_cases": [
            {"input": "abcabcbb", "expected_output": "3", "is_hidden": 0},
            {"input": "bbbbb", "expected_output": "1", "is_hidden": 0},
            {"input": "pwwkew", "expected_output": "3", "is_hidden": 1},
            {"input": "", "expected_output": "0", "is_hidden": 1},
        ],
    },
]


def seed_coding_problems():
    db = SessionLocal()
    print("Seeding coding problem bank...")
    problem_count = 0
    test_case_count = 0

    try:
        for entry in PROBLEMS:
            existing = db.query(CodingProblem).filter(CodingProblem.slug == entry["slug"]).first()
            if existing:
                print(f"  skip (already exists): {entry['slug']}")
                continue

            problem = CodingProblem(
                slug=entry["slug"],
                title=entry["title"],
                description=entry["description"],
                starter_code=entry["starter_code"],
                difficulty=entry["difficulty"],
                topics=entry["topics"],
                companies=entry["companies"],
            )
            db.add(problem)
            db.flush()  # get problem.id before inserting test cases

            for tc in entry["test_cases"]:
                db.add(CodingTestCase(
                    problem_id=problem.id,
                    input_data=tc["input"],
                    expected_output=tc["expected_output"],
                    is_hidden=tc["is_hidden"],
                ))
                test_case_count += 1

            problem_count += 1
            print(f"  added: {entry['slug']} ({len(entry['test_cases'])} test cases)")

        db.commit()
        print(f"\nSeeded {problem_count} problems, {test_case_count} test cases")
    finally:
        db.close()


if __name__ == "__main__":
    seed_coding_problems()