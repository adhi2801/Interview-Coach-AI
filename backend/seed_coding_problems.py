# backend/seed_coding_problems.py
# Run once to populate the coding_problems / coding_test_cases tables.
#
# LANGUAGE SUPPORT: each problem now has starter_code for python, javascript,
# java, and cpp — matching what code_executor.py's LANGUAGE_VERSIONS already
# supports on the Piston side. All four follow the exact same contract:
# read from stdin, print to stdout, so the same test cases grade every
# language identically without any language-specific test logic.
#
# If you re-run this after problems already exist, the "skip" branch means
# starter_code won't be updated for existing rows — delete the row first
# (or add an UPDATE path) if you need to refresh starter code on an existing DB.

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
            ),
            "javascript": (
                "const lines = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n');\n"
                "const nums = lines[0].trim().split(' ').map(Number);\n"
                "const target = parseInt(lines[1].trim());\n\n"
                "function twoSum(nums, target) {\n"
                "  // your code here\n"
                "}\n\n"
                "const result = twoSum(nums, target);\n"
                "console.log(result.join(' '));\n"
            ),
            "java": (
                "import java.util.*;\n\n"
                "public class Main {\n"
                "    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        String[] parts = sc.nextLine().trim().split(\" \");\n"
                "        int[] nums = new int[parts.length];\n"
                "        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n"
                "        int target = Integer.parseInt(sc.nextLine().trim());\n\n"
                "        int[] result = twoSum(nums, target);\n"
                "        System.out.println(result[0] + \" \" + result[1]);\n"
                "    }\n\n"
                "    static int[] twoSum(int[] nums, int target) {\n"
                "        // your code here\n"
                "        return new int[]{-1, -1};\n"
                "    }\n"
                "}\n"
            ),
            "cpp": (
                "#include <bits/stdc++.h>\n"
                "using namespace std;\n\n"
                "vector<int> twoSum(vector<int>& nums, int target) {\n"
                "    // your code here\n"
                "    return {-1, -1};\n"
                "}\n\n"
                "int main() {\n"
                "    string line;\n"
                "    getline(cin, line);\n"
                "    stringstream ss(line);\n"
                "    vector<int> nums;\n"
                "    int x;\n"
                "    while (ss >> x) nums.push_back(x);\n"
                "    int target;\n"
                "    cin >> target;\n\n"
                "    vector<int> result = twoSum(nums, target);\n"
                "    cout << result[0] << \" \" << result[1] << endl;\n"
                "    return 0;\n"
                "}\n"
            ),
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
            ),
            "javascript": (
                "const s = require('fs').readFileSync('/dev/stdin', 'utf8').trim();\n\n"
                "function isValid(s) {\n"
                "  // your code here\n"
                "}\n\n"
                "console.log(isValid(s));\n"
            ),
            "java": (
                "import java.util.*;\n\n"
                "public class Main {\n"
                "    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        String s = sc.nextLine().trim();\n"
                "        System.out.println(isValid(s));\n"
                "    }\n\n"
                "    static boolean isValid(String s) {\n"
                "        // your code here\n"
                "        return false;\n"
                "    }\n"
                "}\n"
            ),
            "cpp": (
                "#include <bits/stdc++.h>\n"
                "using namespace std;\n\n"
                "bool isValid(string s) {\n"
                "    // your code here\n"
                "    return false;\n"
                "}\n\n"
                "int main() {\n"
                "    string s;\n"
                "    getline(cin, s);\n"
                "    cout << (isValid(s) ? \"true\" : \"false\") << endl;\n"
                "    return 0;\n"
                "}\n"
            ),
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
            ),
            "javascript": (
                "const raw = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split(' ');\n"
                "const intervals = raw.map(pair => pair.split(',').map(Number));\n\n"
                "function merge(intervals) {\n"
                "  // your code here\n"
                "}\n\n"
                "const result = merge(intervals);\n"
                "console.log(result.map(([a, b]) => `${a},${b}`).join(' '));\n"
            ),
            "java": (
                "import java.util.*;\n\n"
                "public class Main {\n"
                "    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        String[] raw = sc.nextLine().trim().split(\" \");\n"
                "        int[][] intervals = new int[raw.length][2];\n"
                "        for (int i = 0; i < raw.length; i++) {\n"
                "            String[] pair = raw[i].split(\",\");\n"
                "            intervals[i][0] = Integer.parseInt(pair[0]);\n"
                "            intervals[i][1] = Integer.parseInt(pair[1]);\n"
                "        }\n\n"
                "        int[][] result = merge(intervals);\n"
                "        StringBuilder sb = new StringBuilder();\n"
                "        for (int[] r : result) sb.append(r[0]).append(\",\").append(r[1]).append(\" \");\n"
                "        System.out.println(sb.toString().trim());\n"
                "    }\n\n"
                "    static int[][] merge(int[][] intervals) {\n"
                "        // your code here\n"
                "        return intervals;\n"
                "    }\n"
                "}\n"
            ),
            "cpp": (
                "#include <bits/stdc++.h>\n"
                "using namespace std;\n\n"
                "vector<pair<int,int>> merge(vector<pair<int,int>>& intervals) {\n"
                "    // your code here\n"
                "    return intervals;\n"
                "}\n\n"
                "int main() {\n"
                "    string line;\n"
                "    getline(cin, line);\n"
                "    stringstream ss(line);\n"
                "    string token;\n"
                "    vector<pair<int,int>> intervals;\n"
                "    while (ss >> token) {\n"
                "        int comma = token.find(',');\n"
                "        intervals.push_back({stoi(token.substr(0, comma)), stoi(token.substr(comma + 1))});\n"
                "    }\n\n"
                "    vector<pair<int,int>> result = merge(intervals);\n"
                "    for (size_t i = 0; i < result.size(); i++) {\n"
                "        cout << result[i].first << \",\" << result[i].second;\n"
                "        if (i + 1 < result.size()) cout << \" \";\n"
                "    }\n"
                "    cout << endl;\n"
                "    return 0;\n"
                "}\n"
            ),
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
            ),
            "javascript": (
                "const lines = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n').filter(l => l.length);\n"
                "const capacity = parseInt(lines[0]);\n"
                "const commands = lines.slice(1);\n\n"
                "class LRUCache {\n"
                "  constructor(capacity) {\n"
                "    // your code here\n"
                "  }\n"
                "  get(key) {}\n"
                "  put(key, value) {}\n"
                "}\n\n"
                "const cache = new LRUCache(capacity);\n"
                "const output = [];\n"
                "for (const cmd of commands) {\n"
                "  const parts = cmd.split(' ');\n"
                "  if (parts[0] === 'PUT') cache.put(parseInt(parts[1]), parseInt(parts[2]));\n"
                "  else if (parts[0] === 'GET') output.push(String(cache.get(parseInt(parts[1]))));\n"
                "}\n"
                "console.log(output.join('\\n'));\n"
            ),
            "java": (
                "import java.util.*;\n\n"
                "public class Main {\n"
                "    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        int capacity = Integer.parseInt(sc.nextLine().trim());\n"
                "        LRUCache cache = new LRUCache(capacity);\n"
                "        StringBuilder sb = new StringBuilder();\n"
                "        while (sc.hasNextLine()) {\n"
                "            String line = sc.nextLine().trim();\n"
                "            if (line.isEmpty()) continue;\n"
                "            String[] parts = line.split(\" \");\n"
                "            if (parts[0].equals(\"PUT\")) cache.put(Integer.parseInt(parts[1]), Integer.parseInt(parts[2]));\n"
                "            else if (parts[0].equals(\"GET\")) sb.append(cache.get(Integer.parseInt(parts[1]))).append(\"\\n\");\n"
                "        }\n"
                "        System.out.print(sb.toString().trim());\n"
                "    }\n"
                "}\n\n"
                "class LRUCache {\n"
                "    LRUCache(int capacity) {\n"
                "        // your code here\n"
                "    }\n"
                "    int get(int key) { return -1; }\n"
                "    void put(int key, int value) {}\n"
                "}\n"
            ),
            "cpp": (
                "#include <bits/stdc++.h>\n"
                "using namespace std;\n\n"
                "class LRUCache {\n"
                "public:\n"
                "    LRUCache(int capacity) {\n"
                "        // your code here\n"
                "    }\n"
                "    int get(int key) { return -1; }\n"
                "    void put(int key, int value) {}\n"
                "};\n\n"
                "int main() {\n"
                "    int capacity;\n"
                "    cin >> capacity;\n"
                "    cin.ignore();\n"
                "    LRUCache cache(capacity);\n"
                "    string line;\n"
                "    while (getline(cin, line)) {\n"
                "        if (line.empty()) continue;\n"
                "        stringstream ss(line);\n"
                "        string cmd; ss >> cmd;\n"
                "        if (cmd == \"PUT\") {\n"
                "            int k, v; ss >> k >> v;\n"
                "            cache.put(k, v);\n"
                "        } else if (cmd == \"GET\") {\n"
                "            int k; ss >> k;\n"
                "            cout << cache.get(k) << endl;\n"
                "        }\n"
                "    }\n"
                "    return 0;\n"
                "}\n"
            ),
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
            ),
            "javascript": (
                "const s = require('fs').readFileSync('/dev/stdin', 'utf8').trim();\n\n"
                "function lengthOfLongestSubstring(s) {\n"
                "  // your code here\n"
                "}\n\n"
                "console.log(lengthOfLongestSubstring(s));\n"
            ),
            "java": (
                "import java.util.*;\n\n"
                "public class Main {\n"
                "    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        String s = sc.hasNextLine() ? sc.nextLine().trim() : \"\";\n"
                "        System.out.println(lengthOfLongestSubstring(s));\n"
                "    }\n\n"
                "    static int lengthOfLongestSubstring(String s) {\n"
                "        // your code here\n"
                "        return 0;\n"
                "    }\n"
                "}\n"
            ),
            "cpp": (
                "#include <bits/stdc++.h>\n"
                "using namespace std;\n\n"
                "int lengthOfLongestSubstring(string s) {\n"
                "    // your code here\n"
                "    return 0;\n"
                "}\n\n"
                "int main() {\n"
                "    string s;\n"
                "    getline(cin, s);\n"
                "    cout << lengthOfLongestSubstring(s) << endl;\n"
                "    return 0;\n"
                "}\n"
            ),
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
                # Refresh starter_code on existing rows too — this is the one
                # field that changed in this pass (added javascript/java/cpp
                # templates), and skipping it entirely would leave old
                # deployments stuck on python-only forever.
                existing.starter_code = entry["starter_code"]
                db.commit()
                print(f"  updated starter_code: {entry['slug']}")
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
        print(f"\nSeeded {problem_count} new problems, {test_case_count} test cases, "
              f"refreshed starter_code on {len(PROBLEMS) - problem_count} existing problems")
    finally:
        db.close()


if __name__ == "__main__":
    seed_coding_problems()