"""
Builds verified_problems_pack2.json from problem_bank/pack2.py.

For every problem:
  1. generate test inputs (fixed examples first, then seeded random ones)
  2. run the reference solution as a real stdin/stdout program
  3. run the independent brute force on the same input
  4. keep the problem only if both agree on every case

The first two test cases become the visible samples (seed script rule).

Usage: python build_problem_pack.py
"""

import json
import random
import subprocess
import sys

from problem_bank.pack2 import P

MAX_TESTS = 12

# Complexity targets of the reference solutions (shown in the coding room).
TARGETS = {
    "payment-reconciliation-pair": ("O(n)", "O(n)"),
    "config-bracket-validator": ("O(n)", "O(n)"),
    "merge-maintenance-windows": ("O(n log n)", "O(n)"),
    "next-warmer-reading": ("O(n)", "O(n)"),
    "best-revenue-streak": ("O(n)", "O(1)"),
    "longest-unique-session": ("O(n)", "O(k) for k distinct events"),
    "shard-load-product-except-self": ("O(n)", "O(n)"),
    "rotated-release-index": ("O(q log n)", "O(1)"),
    "minimum-meeting-rooms": ("O(n log n)", "O(n)"),
    "top-k-frequent-errors": ("O(n + d log d)", "O(d)"),
    "alert-propagation-time": ("O((n + m) log n)", "O(n + m)"),
    "datacenter-link-components": ("O(m α(n))", "O(n)"),
    "build-pipeline-stages": ("O(n + m)", "O(n + m)"),
    "config-key-ladder": ("O(N · L · 26)", "O(N · L)"),
    "lru-cache-simulator": ("O(1) per operation", "O(capacity)"),
    "rolling-hit-counter": ("O(1) amortised", "O(hits in window)"),
    "typo-edit-distance": ("O(n · m)", "O(m)"),
    "longest-rising-latency-trend": ("O(n log n)", "O(n)"),
    "coin-change-ways": ("O(n · amount)", "O(amount)"),
    "feature-budget-knapsack": ("O(n · W)", "O(W)"),
    "warehouse-robot-paths": ("O(r · c)", "O(c)"),
    "ring-maintenance-scheduling": ("O(n)", "O(1)"),
    "decode-sms-codes": ("O(n)", "O(1)"),
    "hashtag-word-break": ("O(n · L)", "O(n)"),
    "balanced-template-generator": ("O(4^n / √n)", "O(n) + output"),
    "non-attacking-queens-count": ("O(n!)", "O(n)"),
    "largest-capacity-rectangle": ("O(n)", "O(n)"),
    "sliding-window-peak-load": ("O(n)", "O(k)"),
    "subarrays-hitting-budget": ("O(n)", "O(n)"),
    "stale-cache-spread": ("O(r · c)", "O(r · c)"),
    "org-chart-common-manager": ("O((n + q) log n)", "O(n log n)"),
    "corrupted-packet-id": ("O(n)", "O(1)"),
    "hop-to-last-region": ("O(n)", "O(1)"),
    "job-scheduler-cooldown": ("O(n)", "O(1) (26 job types)"),
    "budget-formula-calculator": ("O(n)", "O(n)"),
    "cheapest-route-limited-layovers": ("O(k · m)", "O(n)"),
    "fiber-backbone-mst": ("O(m log m)", "O(n)"),
    "max-signal-path-tree": ("O(n)", "O(n)"),
}


def run(code, stdin):
    r = subprocess.run([sys.executable, "-c", code], input=stdin, capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip().splitlines()[-1] if r.stderr.strip() else f"exit {r.returncode}")
    return r.stdout.strip()


def comment(text, mark):
    return "\n".join(f"{mark} {line}".rstrip() for line in text.splitlines())


def starters(p):
    fmt_py = comment(f"Input: {p['input_format']}\nOutput: {p['output_format']}", "#")
    fmt_c = comment(f"Input: {p['input_format']}\nOutput: {p['output_format']}", "//")
    return {
        "starter_code_python": (
            "import sys\n\n"
            f"{fmt_py}\n\n"
            "def main():\n"
            "    data = sys.stdin.read().split()\n"
            "    # TODO: parse `data`, solve, and print the answer\n\n\n"
            "main()\n"
        ),
        "starter_code_javascript": (
            "const data = require('fs').readFileSync('/dev/stdin', 'utf8').split(/\\s+/).filter(Boolean);\n"
            "let pos = 0;\n"
            "const next = () => data[pos++];\n\n"
            f"{fmt_c}\n\n"
            "// TODO: parse with next(), solve, and console.log the answer\n"
        ),
        "starter_code_cpp": (
            "#include <bits/stdc++.h>\n"
            "using namespace std;\n\n"
            f"{fmt_c}\n\n"
            "int main() {\n"
            "    ios::sync_with_stdio(false);\n"
            "    cin.tie(nullptr);\n"
            "    // TODO: read input with cin >> ..., solve, and print the answer\n"
            "    return 0;\n"
            "}\n"
        ),
        # Judge0 compiles Java as Main.java, so the public class must be Main.
        "starter_code_java": (
            "import java.util.*;\n"
            "import java.io.*;\n\n"
            f"{fmt_c}\n\n"
            "public class Main {\n"
            "    public static void main(String[] args) throws IOException {\n"
            "        String[] data = new String(System.in.readAllBytes()).trim().split(\"\\\\s+\");\n"
            "        int pos = 0;\n"
            "        // TODO: parse data[pos++], solve, and print the answer\n"
            "    }\n"
            "}\n"
        ),
    }


def main():
    out, failed = [], []
    slugs = set()
    for idx, p in enumerate(P):
        assert p["slug"] not in slugs, p["slug"]
        slugs.add(p["slug"])
        rnd = random.Random(1000 + idx)
        inputs = list(dict.fromkeys(p["tests"](rnd)))[:MAX_TESTS]
        cases, err = [], None
        for inp in inputs:
            try:
                got = run(p["solution"], inp)
                want = run(p["brute"], inp)
            except Exception as e:  # noqa: BLE001
                err = f"crash on {inp!r}: {e}"
                break
            if got != want:
                err = f"mismatch on {inp!r}:\n  solution={got!r}\n  brute   ={want!r}"
                break
            cases.append({"input": inp, "expected_output": got})
        if err:
            failed.append((p["slug"], err))
            print(f"FAIL {p['slug']}: {err}")
            continue
        entry = {
            "slug": p["slug"],
            "title": p["title"],
            "difficulty": p["difficulty"],
            "category": p["category"],
            "description": p["description"],
            "constraints": p["constraints"],
            "input_format": p["input_format"],
            "output_format": p["output_format"],
            "python_solution": p["solution"],
            **starters(p),
            "companies": p["companies"],
            "time_complexity_target": TARGETS[p["slug"]][0],
            "space_complexity_target": TARGETS[p["slug"]][1],
            "test_cases": cases,
        }
        out.append(entry)
        print(f"ok   {p['slug']:<40} {len(cases)} cases")
    with open("verified_problems_pack2.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    print(f"\n{len(out)} verified, {len(failed)} failed -> verified_problems_pack2.json")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
