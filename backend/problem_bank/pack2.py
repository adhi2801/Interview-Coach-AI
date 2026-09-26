"""
Problem pack 2: hand-written coding problems with reference solutions,
independent brute-force checkers and test-input generators.

Nothing in here is trusted on its own. build_problem_pack.py runs every
reference solution as a real stdin/stdout program, runs the brute force on
the same inputs, and only emits a problem if they agree on every case.

Conventions (same contract as verified_problems.json):
  - input is whitespace-separated tokens on stdin, output on stdout
  - output is compared after strip()
  - "brute" is a deliberately different (slow, obvious) algorithm; it only
    ever sees the small generated inputs
"""

import random


def ints(xs):
    return " ".join(map(str, xs))


P = []


def problem(**kw):
    P.append(kw)
    return kw


# ---------------------------------------------------------------- 1
problem(
    slug="payment-reconciliation-pair",
    title="Payment Reconciliation Pair",
    difficulty=2,
    category="Hash Tables",
    companies=["amazon", "google", "microsoft"],
    description=(
        "Finance flags a refund batch as balanced when two individual payments in the ledger add up exactly to the refund amount.\n\n"
        "Given the ledger as a list of integer amounts and a target, find indices `i < j` with `a[i] + a[j] = target`. "
        "If several pairs exist, choose the one with the **smallest j**, and for that j the **smallest i**. "
        "Print `-1 -1` if no pair exists."
    ),
    constraints=["2 ≤ n ≤ 10^5", "-10^9 ≤ a[i], target ≤ 10^9"],
    input_format="First line: n and target. Second line: n integers a[0..n-1].",
    output_format="Two integers i and j (0-indexed), or `-1 -1`.",
    solution='''
import sys
d = sys.stdin.read().split()
n, t = int(d[0]), int(d[1])
a = list(map(int, d[2:2 + n]))
first = {}
for j, x in enumerate(a):
    if t - x in first:
        print(first[t - x], j)
        break
    if x not in first:
        first[x] = j
else:
    print(-1, -1)
''',
    brute='''
import sys
d = sys.stdin.read().split()
n, t = int(d[0]), int(d[1])
a = list(map(int, d[2:2 + n]))
ans = (-1, -1)
for j in range(n):
    hit = [i for i in range(j) if a[i] + a[j] == t]
    if hit:
        ans = (hit[0], j)
        break
print(*ans)
''',
    tests=lambda r: [
        "4 9\n2 7 11 15",
        "3 6\n3 2 4",
        "2 6\n3 3",
        "3 100\n1 2 3",
        "5 0\n-3 1 3 -1 0",
    ] + [
        (lambda n: f"{n} {r.randint(-20, 20)}\n{ints(r.randint(-10, 10) for _ in range(n))}")(r.randint(2, 40))
        for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 2
problem(
    slug="config-bracket-validator",
    title="Config File Bracket Validator",
    difficulty=2,
    category="Stacks",
    companies=["google", "microsoft", "meta"],
    description=(
        "Before a deploy, the pipeline lints the bracket structure of every generated config. "
        "A bracket string is valid when every opening bracket `(`, `[` or `{` is closed by the same type, in the correct order.\n\n"
        "Given a string made only of the six bracket characters, print `VALID` or `INVALID`."
    ),
    constraints=["1 ≤ length ≤ 10^5", "Only the characters ()[]{}"],
    input_format="A single line containing the bracket string (no spaces).",
    output_format="`VALID` or `INVALID`.",
    solution='''
import sys
s = sys.stdin.read().split()[0]
pair = {")": "(", "]": "[", "}": "{"}
st = []
ok = True
for c in s:
    if c in "([{":
        st.append(c)
    elif not st or st.pop() != pair[c]:
        ok = False
        break
print("VALID" if ok and not st else "INVALID")
''',
    brute='''
import sys
s = sys.stdin.read().split()[0]
prev = None
while prev != s:
    prev = s
    s = s.replace("()", "").replace("[]", "").replace("{}", "")
print("VALID" if s == "" else "INVALID")
''',
    tests=lambda r: ["()", "()[]{}", "(]", "([)]", "{[]}", "(((", "}"] + [
        "".join(r.choice("()[]{}") for _ in range(r.randint(1, 12))) for _ in range(6)
    ] + ["(" * 20 + ")" * 20, "{[()()]}" * 3],
)

# ---------------------------------------------------------------- 3
problem(
    slug="merge-maintenance-windows",
    title="Merge Maintenance Windows",
    difficulty=3,
    category="Intervals",
    companies=["amazon", "microsoft", "google"],
    description=(
        "Several teams booked maintenance windows on the same cluster. To publish one status-page schedule, "
        "overlapping or touching windows must be merged.\n\n"
        "Each window is `[start, end]` with `start ≤ end`. Windows that share at least one point (e.g. `[1,3]` and `[3,5]`) merge. "
        "Print the merged windows sorted by start."
    ),
    constraints=["1 ≤ n ≤ 10^5", "0 ≤ start ≤ end ≤ 10^9"],
    input_format="First line: n. Next n lines: start end.",
    output_format="One merged window per line: `start end`, sorted by start.",
    solution='''
import sys
d = list(map(int, sys.stdin.read().split()))
n = d[0]
iv = sorted((d[1 + 2 * i], d[2 + 2 * i]) for i in range(n))
out = []
for s, e in iv:
    if out and s <= out[-1][1]:
        out[-1][1] = max(out[-1][1], e)
    else:
        out.append([s, e])
print("\\n".join(f"{s} {e}" for s, e in out))
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
n = d[0]
iv = [(d[1 + 2 * i], d[2 + 2 * i]) for i in range(n)]
# Double coordinates so touching points stay connected, then scan.
cov = set()
for s, e in iv:
    for x in range(2 * s, 2 * e + 1):
        cov.add(x)
xs = sorted(cov)
out = []
for x in xs:
    if out and x == out[-1][1] + 1:
        out[-1][1] = x
    else:
        out.append([x, x])
print("\\n".join(f"{s // 2} {e // 2}" for s, e in out))
''',
    tests=lambda r: ["4\n1 3\n2 6\n8 10\n15 18", "2\n1 4\n4 5", "1\n5 5", "3\n1 10\n2 3\n4 5"] + [
        (lambda n: f"{n}\n" + "\n".join((lambda s: f"{s} {s + r.randint(0, 6)}")(r.randint(0, 40)) for _ in range(n)))(r.randint(1, 12))
        for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 4
problem(
    slug="next-warmer-reading",
    title="Next Warmer Sensor Reading",
    difficulty=4,
    category="Monotonic Stack",
    companies=["google", "amazon", "meta"],
    description=(
        "A datacenter logs one inlet-temperature reading per minute. For capacity planning you need, for every minute, "
        "how many minutes until a **strictly warmer** reading arrives. If none does, the answer for that minute is 0."
    ),
    constraints=["1 ≤ n ≤ 10^5", "-100 ≤ t[i] ≤ 150"],
    input_format="First line: n. Second line: n integer readings.",
    output_format="n space-separated integers.",
    solution='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, t = d[0], d[1:]
ans = [0] * n
st = []
for i, x in enumerate(t):
    while st and t[st[-1]] < x:
        j = st.pop()
        ans[j] = i - j
    st.append(i)
print(*ans)
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, t = d[0], d[1:]
out = []
for i in range(n):
    out.append(next((j - i for j in range(i + 1, n) if t[j] > t[i]), 0))
print(*out)
''',
    tests=lambda r: ["8\n73 74 75 71 69 72 76 73", "4\n30 40 50 60", "3\n30 20 10", "1\n5"] + [
        (lambda n: f"{n}\n{ints(r.randint(-5, 5) for _ in range(n))}")(r.randint(1, 30)) for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 5
problem(
    slug="best-revenue-streak",
    title="Best Revenue Streak",
    difficulty=3,
    category="Dynamic Programming",
    companies=["amazon", "google", "microsoft"],
    description=(
        "Daily profit for a product can be negative. Marketing wants the **contiguous** run of days with the largest total profit "
        "(at least one day). Print that total."
    ),
    constraints=["1 ≤ n ≤ 10^5", "-10^4 ≤ p[i] ≤ 10^4"],
    input_format="First line: n. Second line: n integers.",
    output_format="A single integer: the maximum subarray sum.",
    solution='''
import sys
d = list(map(int, sys.stdin.read().split()))
a = d[1:1 + d[0]]
best = cur = a[0]
for x in a[1:]:
    cur = max(x, cur + x)
    best = max(best, cur)
print(best)
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
a = d[1:1 + d[0]]
print(max(sum(a[i:j + 1]) for i in range(len(a)) for j in range(i, len(a))))
''',
    tests=lambda r: ["9\n-2 1 -3 4 -1 2 1 -5 4", "1\n1", "5\n5 4 -1 7 8", "3\n-3 -1 -2"] + [
        (lambda n: f"{n}\n{ints(r.randint(-20, 20) for _ in range(n))}")(r.randint(1, 30)) for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 6
problem(
    slug="longest-unique-session",
    title="Longest Session Without Repeated Events",
    difficulty=4,
    category="Sliding Window",
    companies=["meta", "amazon", "google"],
    description=(
        "Each character of a clickstream string is one event type. Analytics wants the length of the longest **contiguous** "
        "stretch in which no event type repeats."
    ),
    constraints=["1 ≤ length ≤ 10^5", "Lowercase letters and digits only"],
    input_format="A single line with the event string (no spaces).",
    output_format="A single integer.",
    solution='''
import sys
s = sys.stdin.read().split()[0]
last = {}
lo = best = 0
for i, c in enumerate(s):
    if last.get(c, -1) >= lo:
        lo = last[c] + 1
    last[c] = i
    best = max(best, i - lo + 1)
print(best)
''',
    brute='''
import sys
s = sys.stdin.read().split()[0]
print(max(j - i for i in range(len(s)) for j in range(i + 1, len(s) + 1) if len(set(s[i:j])) == j - i))
''',
    tests=lambda r: ["abcabcbb", "bbbbb", "pwwkew", "a", "abcdef", "abba"] + [
        "".join(r.choice("abcde") for _ in range(r.randint(1, 25))) for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 7
problem(
    slug="shard-load-product-except-self",
    title="Shard Load Multiplier",
    difficulty=4,
    category="Arrays & Prefix Products",
    companies=["amazon", "meta", "microsoft"],
    description=(
        "A capacity model multiplies the load factors of every *other* shard to predict contention on each shard. "
        "For every index i, compute the product of all elements except a[i], **modulo 1,000,000,007** "
        "(take the result in the range 0..10^9+6).\n\n"
        "Division is not allowed: a load factor may be 0."
    ),
    constraints=["2 ≤ n ≤ 10^5", "-10^9 ≤ a[i] ≤ 10^9"],
    input_format="First line: n. Second line: n integers.",
    output_format="n space-separated integers.",
    solution='''
import sys
M = 10**9 + 7
d = list(map(int, sys.stdin.read().split()))
n, a = d[0], d[1:]
pre = [1] * (n + 1)
for i in range(n):
    pre[i + 1] = pre[i] * a[i] % M
out = [0] * n
suf = 1
for i in range(n - 1, -1, -1):
    out[i] = pre[i] * suf % M
    suf = suf * a[i] % M
print(*out)
''',
    brute='''
import sys
M = 10**9 + 7
d = list(map(int, sys.stdin.read().split()))
n, a = d[0], d[1:]
out = []
for i in range(n):
    p = 1
    for j in range(n):
        if j != i:
            p *= a[j]
    out.append(p % M)
print(*out)
''',
    tests=lambda r: ["4\n1 2 3 4", "5\n-1 1 0 -3 3", "2\n0 0", "3\n1000000000 1000000000 7"] + [
        (lambda n: f"{n}\n{ints(r.randint(-9, 9) for _ in range(n))}")(r.randint(2, 15)) for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 8
problem(
    slug="rotated-release-index",
    title="Search a Rotated Release Index",
    difficulty=5,
    category="Binary Search",
    companies=["google", "microsoft", "amazon"],
    description=(
        "Release build numbers are stored in a sorted ring buffer that was rotated at an unknown pivot, e.g. `[40 50 60 10 20 30]`. "
        "All numbers are distinct.\n\n"
        "Answer q lookups: for each build number print its index in the buffer, or -1. Aim for O(log n) per lookup."
    ),
    constraints=["1 ≤ n ≤ 10^5", "1 ≤ q ≤ 10^5", "All values distinct, |value| ≤ 10^9"],
    input_format="First line: n q. Second line: the n buffer values. Third line: q lookup values.",
    output_format="q lines, one index (or -1) per lookup.",
    solution='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, q = d[0], d[1]
a = d[2:2 + n]
qs = d[2 + n:2 + n + q]
def find(t):
    lo, hi = 0, n - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == t:
            return mid
        if a[lo] <= a[mid]:
            if a[lo] <= t < a[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if a[mid] < t <= a[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
print("\\n".join(str(find(t)) for t in qs))
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, q = d[0], d[1]
a = d[2:2 + n]
qs = d[2 + n:2 + n + q]
print("\\n".join(str(a.index(t)) if t in a else "-1" for t in qs))
''',
    tests=lambda r: ["7 3\n4 5 6 7 0 1 2\n0 3 4", "1 2\n1\n1 0", "2 2\n3 1\n1 3"] + [
        (lambda n, k: (lambda base: f"{n} 6\n{ints(base[k:] + base[:k])}\n{ints(r.choice(base + [-99, 999]) for _ in range(6))}")(sorted(r.sample(range(-50, 50), n))))(*(lambda n: (n, r.randint(0, n - 1)))(r.randint(1, 20)))
        for _ in range(10)
    ],
)

# ---------------------------------------------------------------- 9
problem(
    slug="minimum-meeting-rooms",
    title="Minimum Interview Rooms",
    difficulty=5,
    category="Heaps",
    companies=["google", "meta", "amazon"],
    description=(
        "An onsite loop schedules interviews as half-open intervals `[start, end)`. A room freed at time t can host an interview "
        "starting at t. Print the minimum number of rooms needed so that no two interviews in the same room overlap."
    ),
    constraints=["1 ≤ n ≤ 10^5", "0 ≤ start < end ≤ 10^9"],
    input_format="First line: n. Next n lines: start end.",
    output_format="A single integer.",
    solution='''
import sys, heapq
d = list(map(int, sys.stdin.read().split()))
n = d[0]
iv = sorted((d[1 + 2 * i], d[2 + 2 * i]) for i in range(n))
h = []
for s, e in iv:
    if h and h[0] <= s:
        heapq.heapreplace(h, e)
    else:
        heapq.heappush(h, e)
print(len(h))
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
n = d[0]
iv = [(d[1 + 2 * i], d[2 + 2 * i]) for i in range(n)]
pts = {s for s, _ in iv}
print(max(sum(1 for s, e in iv if s <= t < e) for t in pts))
''',
    tests=lambda r: ["3\n0 30\n5 10\n15 20", "2\n7 10\n2 4", "3\n1 5\n5 10\n10 15", "1\n0 1"] + [
        (lambda n: f"{n}\n" + "\n".join((lambda s: f"{s} {s + r.randint(1, 8)}")(r.randint(0, 30)) for _ in range(n)))(r.randint(1, 15))
        for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 10
problem(
    slug="top-k-frequent-errors",
    title="Top K Error Codes",
    difficulty=4,
    category="Hash Tables & Sorting",
    companies=["amazon", "microsoft", "google"],
    description=(
        "An on-call dashboard shows the k most frequent error codes from the last hour. Rank codes by frequency (descending); "
        "break ties by code in lexicographic (ascending) order. Print the top k."
    ),
    constraints=["1 ≤ n ≤ 10^5", "1 ≤ k ≤ number of distinct codes", "Codes are uppercase letters, digits or `_`, length ≤ 20"],
    input_format="First line: n k. Second line: n error codes.",
    output_format="k lines, each `code count`.",
    solution='''
import sys
from collections import Counter
d = sys.stdin.read().split()
n, k = int(d[0]), int(d[1])
c = Counter(d[2:2 + n])
top = sorted(c.items(), key=lambda kv: (-kv[1], kv[0]))[:k]
print("\\n".join(f"{a} {b}" for a, b in top))
''',
    brute='''
import sys
d = sys.stdin.read().split()
n, k = int(d[0]), int(d[1])
codes = d[2:2 + n]
left = sorted(set(codes))
out = []
for _ in range(k):
    best = None
    for x in left:
        cnt = codes.count(x)
        if best is None or cnt > best[1]:
            best = (x, cnt)
    out.append(best)
    left.remove(best[0])
print("\\n".join(f"{a} {b}" for a, b in out))
''',
    tests=lambda r: ["6 2\nE500 E404 E500 E503 E404 E500", "3 3\nA B C", "1 1\nTIMEOUT"] + [
        (lambda codes: f"{len(codes)} {r.randint(1, len(set(codes)))}\n{' '.join(codes)}")([r.choice(["E500", "E404", "E503", "E429", "DB_DOWN", "OOM"]) for _ in range(r.randint(1, 25))])
        for _ in range(10)
    ],
)

# ---------------------------------------------------------------- 11
problem(
    slug="alert-propagation-time",
    title="Alert Propagation Time",
    difficulty=6,
    category="Graphs & Shortest Paths",
    companies=["google", "amazon", "netflix"],
    description=(
        "An incident alert starts at node s of a paging network. Directed link `u v w` means node u forwards the alert to v after w seconds. "
        "Print the time until **every** node has received the alert, or -1 if some node never does."
    ),
    constraints=["1 ≤ n ≤ 10^4", "0 ≤ m ≤ 10^5", "0 ≤ w ≤ 10^4", "Nodes are numbered 1..n"],
    input_format="First line: n m s. Next m lines: u v w.",
    output_format="A single integer.",
    solution='''
import sys, heapq
d = list(map(int, sys.stdin.read().split()))
n, m, s = d[0], d[1], d[2]
g = [[] for _ in range(n + 1)]
for i in range(m):
    u, v, w = d[3 + 3 * i: 6 + 3 * i]
    g[u].append((v, w))
INF = float("inf")
dist = [INF] * (n + 1)
dist[s] = 0
pq = [(0, s)]
while pq:
    du, u = heapq.heappop(pq)
    if du > dist[u]:
        continue
    for v, w in g[u]:
        if du + w < dist[v]:
            dist[v] = du + w
            heapq.heappush(pq, (dist[v], v))
far = max(dist[1:])
print(-1 if far == INF else far)
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, m, s = d[0], d[1], d[2]
E = [tuple(d[3 + 3 * i: 6 + 3 * i]) for i in range(m)]
INF = float("inf")
dist = [INF] * (n + 1)
dist[s] = 0
for _ in range(n):
    for u, v, w in E:
        if dist[u] + w < dist[v]:
            dist[v] = dist[u] + w
far = max(dist[1:])
print(-1 if far == INF else far)
''',
    tests=lambda r: ["4 3 2\n2 1 1\n2 3 1\n3 4 1", "2 1 1\n1 2 1", "2 1 2\n1 2 1", "1 0 1"] + [
        (lambda n, m: f"{n} {m} {r.randint(1, n)}\n" + "\n".join(f"{r.randint(1, n)} {r.randint(1, n)} {r.randint(0, 9)}" for _ in range(m)))(*(lambda n: (n, r.randint(0, n * 3)))(r.randint(1, 8)))
        for _ in range(10)
    ],
)

# ---------------------------------------------------------------- 12
problem(
    slug="datacenter-link-components",
    title="Data Center Link Components",
    difficulty=5,
    category="Union-Find",
    companies=["amazon", "google", "microsoft"],
    description=(
        "n data centers start fully isolated. Network engineers bring up links one at a time; a link joins two data centers "
        "(links are bidirectional and may be redundant). After **each** link, print how many isolated groups remain."
    ),
    constraints=["1 ≤ n ≤ 10^5", "1 ≤ m ≤ 10^5", "1 ≤ u, v ≤ n"],
    input_format="First line: n m. Next m lines: u v.",
    output_format="m lines, the number of groups after each link.",
    solution='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, m = d[0], d[1]
p = list(range(n + 1))
def find(x):
    while p[x] != x:
        p[x] = p[p[x]]
        x = p[x]
    return x
comp = n
out = []
for i in range(m):
    a, b = find(d[2 + 2 * i]), find(d[3 + 2 * i])
    if a != b:
        p[a] = b
        comp -= 1
    out.append(comp)
print("\\n".join(map(str, out)))
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, m = d[0], d[1]
adj = {i: set() for i in range(1, n + 1)}
out = []
for i in range(m):
    u, v = d[2 + 2 * i], d[3 + 2 * i]
    adj[u].add(v); adj[v].add(u)
    seen = set(); c = 0
    for s in adj:
        if s in seen:
            continue
        c += 1
        st = [s]; seen.add(s)
        while st:
            x = st.pop()
            for y in adj[x]:
                if y not in seen:
                    seen.add(y); st.append(y)
    out.append(c)
print("\\n".join(map(str, out)))
''',
    tests=lambda r: ["5 4\n1 2\n3 4\n2 3\n1 4", "1 1\n1 1", "3 2\n1 2\n1 2"] + [
        (lambda n, m: f"{n} {m}\n" + "\n".join(f"{r.randint(1, n)} {r.randint(1, n)}" for _ in range(m)))(*(lambda n: (n, r.randint(1, 12)))(r.randint(1, 10)))
        for _ in range(10)
    ],
)

# ---------------------------------------------------------------- 13
problem(
    slug="build-pipeline-stages",
    title="Build Pipeline Minimum Stages",
    difficulty=6,
    category="Graphs & Topological Sort",
    companies=["google", "meta", "microsoft"],
    description=(
        "A CI system runs build jobs in parallel **stages**. Dependency `a b` means job a must finish in an earlier stage than job b. "
        "Any number of jobs can run in the same stage.\n\n"
        "Print the minimum number of stages to run all n jobs, or `-1` if the dependencies contain a cycle."
    ),
    constraints=["1 ≤ n ≤ 10^5", "0 ≤ m ≤ 2·10^5", "Jobs numbered 1..n"],
    input_format="First line: n m. Next m lines: a b.",
    output_format="A single integer.",
    solution='''
import sys
from collections import deque
d = list(map(int, sys.stdin.read().split()))
n, m = d[0], d[1]
g = [[] for _ in range(n + 1)]
indeg = [0] * (n + 1)
for i in range(m):
    a, b = d[2 + 2 * i], d[3 + 2 * i]
    g[a].append(b); indeg[b] += 1
q = deque(i for i in range(1, n + 1) if indeg[i] == 0)
stage = [1] * (n + 1)
seen = 0
while q:
    u = q.popleft(); seen += 1
    for v in g[u]:
        stage[v] = max(stage[v], stage[u] + 1)
        indeg[v] -= 1
        if indeg[v] == 0:
            q.append(v)
print(max(stage[1:]) if seen == n else -1)
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, m = d[0], d[1]
E = [(d[2 + 2 * i], d[3 + 2 * i]) for i in range(m)]
st = [1] * (n + 1)
for _ in range(n + 1):
    changed = False
    for a, b in E:
        if st[b] < st[a] + 1:
            st[b] = st[a] + 1; changed = True
    if not changed:
        break
print(-1 if changed else max(st[1:]))
''',
    tests=lambda r: ["4 3\n1 2\n2 3\n1 4", "3 3\n1 2\n2 3\n3 1", "3 0", "2 1\n1 1"] + [
        (lambda n, m, dag: f"{n} {m}\n" + "\n".join((lambda a, b: f"{min(a, b) if dag else a} {max(a, b) if dag else b}")(*r.sample(range(1, n + 1), 2)) for _ in range(m)))(*(lambda n: (n, r.randint(0, 2 * n), r.random() < 0.7))(r.randint(2, 9)))
        for _ in range(10)
    ],
)

# ---------------------------------------------------------------- 14
problem(
    slug="config-key-ladder",
    title="Config Key Migration Ladder",
    difficulty=7,
    category="Graphs & BFS",
    companies=["google", "amazon", "meta"],
    description=(
        "A config key must be migrated from `begin` to `end`, changing **exactly one character** per step, and every intermediate key "
        "must exist in the allowed dictionary (`end` must be in it too; `begin` need not be). All keys have the same length.\n\n"
        "Print the number of keys in the shortest migration sequence including begin and end, or 0 if impossible."
    ),
    constraints=["1 ≤ key length ≤ 10", "1 ≤ dictionary size ≤ 5000", "Lowercase letters only"],
    input_format="First line: begin end n. Second line: n dictionary words.",
    output_format="A single integer.",
    solution='''
import sys
from collections import deque
d = sys.stdin.read().split()
b, e, n = d[0], d[1], int(d[2])
words = set(d[3:3 + n])
if e not in words:
    print(0)
else:
    q = deque([(b, 1)]); seen = {b}
    ans = 0
    while q:
        w, k = q.popleft()
        if w == e:
            ans = k; break
        for i in range(len(w)):
            for c in "abcdefghijklmnopqrstuvwxyz":
                x = w[:i] + c + w[i + 1:]
                if x in words and x not in seen:
                    seen.add(x); q.append((x, k + 1))
    print(ans)
''',
    brute='''
import sys
d = sys.stdin.read().split()
b, e, n = d[0], d[1], int(d[2])
words = list(dict.fromkeys(d[3:3 + n]))
nodes = [b] + [w for w in words if w != b]
adj = lambda x, y: sum(p != q for p, q in zip(x, y)) == 1
INF = 10**9
dist = {w: INF for w in nodes}; dist[b] = 1
for _ in range(len(nodes)):
    for x in nodes:
        for y in nodes:
            if y in words and adj(x, y) and dist[x] + 1 < dist[y]:
                dist[y] = dist[x] + 1
print(dist.get(e, INF) if e in words and dist.get(e, INF) < INF else 0)
''',
    tests=lambda r: ["hit cog 6\nhot dot dog lot log cog", "hit cog 5\nhot dot dog lot log", "a c 3\na b c", "abc abc 1\nabc"] + [
        (lambda words: f"{r.choice(words)} {r.choice(words)} {len(words)}\n{' '.join(words)}")(list({"".join(r.choice("abc") for _ in range(3)) for _ in range(r.randint(3, 14))}))
        for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 15
problem(
    slug="lru-cache-simulator",
    title="LRU Cache Simulator",
    difficulty=6,
    category="Design & Simulation",
    companies=["amazon", "google", "microsoft", "meta"],
    description=(
        "Simulate an in-memory LRU cache with a fixed capacity.\n\n"
        "- `GET k` prints the value for key k (and marks k most-recently used), or `-1` if absent.\n"
        "- `PUT k v` inserts or updates k (marking it most-recently used). If this pushes the size past capacity, "
        "evict the least-recently used key first.\n\n"
        "Every operation must be O(1) on average."
    ),
    constraints=["1 ≤ capacity ≤ 10^5", "1 ≤ q ≤ 2·10^5", "0 ≤ k, v ≤ 10^9"],
    input_format="First line: capacity q. Next q lines: `GET k` or `PUT k v`.",
    output_format="One line per GET.",
    solution='''
import sys
from collections import OrderedDict
d = sys.stdin.read().split()
cap, q = int(d[0]), int(d[1])
c = OrderedDict(); out = []; i = 2
for _ in range(q):
    op = d[i]
    if op == "GET":
        k = d[i + 1]; i += 2
        if k in c:
            c.move_to_end(k); out.append(c[k])
        else:
            out.append("-1")
    else:
        k, v = d[i + 1], d[i + 2]; i += 3
        c[k] = v; c.move_to_end(k)
        if len(c) > cap:
            c.popitem(last=False)
print("\\n".join(out))
''',
    brute='''
import sys
d = sys.stdin.read().split()
cap, q = int(d[0]), int(d[1])
order = []; val = {}; out = []; i = 2
for _ in range(q):
    if d[i] == "GET":
        k = d[i + 1]; i += 2
        if k in val:
            order.remove(k); order.append(k); out.append(val[k])
        else:
            out.append("-1")
    else:
        k, v = d[i + 1], d[i + 2]; i += 3
        if k in val:
            order.remove(k)
        order.append(k); val[k] = v
        if len(order) > cap:
            del val[order.pop(0)]
print("\\n".join(out))
''',
    tests=lambda r: ["2 9\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nPUT 4 4\nGET 1\nGET 3\nGET 4", "1 3\nPUT 5 50\nPUT 5 51\nGET 5"] + [
        (lambda cap, q: f"{cap} {q}\n" + "\n".join((f"GET {r.randint(0, 6)}" if r.random() < 0.45 or j == q - 1 else f"PUT {r.randint(0, 6)} {r.randint(0, 99)}") for j in range(q)))(r.randint(1, 4), r.randint(3, 25))
        for _ in range(10)
    ],
)

# ---------------------------------------------------------------- 16
problem(
    slug="rolling-hit-counter",
    title="Rolling Five-Minute Hit Counter",
    difficulty=4,
    category="Design & Queues",
    companies=["google", "amazon", "netflix"],
    description=(
        "An API gateway counts hits over a rolling 300-second window. Timestamps are in seconds and never decrease across operations.\n\n"
        "- `HIT t` records a hit at time t (several hits can share a timestamp).\n"
        "- `COUNT t` prints the number of hits in the window `(t - 300, t]`."
    ),
    constraints=["1 ≤ q ≤ 2·10^5", "1 ≤ t ≤ 2·10^9, non-decreasing"],
    input_format="First line: q. Next q lines: `HIT t` or `COUNT t`.",
    output_format="One line per COUNT.",
    solution='''
import sys
from collections import deque
d = sys.stdin.read().split()
q = int(d[0]); dq = deque(); out = []
for i in range(q):
    op, t = d[1 + 2 * i], int(d[2 + 2 * i])
    while dq and dq[0] <= t - 300:
        dq.popleft()
    if op == "HIT":
        dq.append(t)
    else:
        out.append(str(len(dq)))
print("\\n".join(out))
''',
    brute='''
import sys
d = sys.stdin.read().split()
q = int(d[0]); hits = []; out = []
for i in range(q):
    op, t = d[1 + 2 * i], int(d[2 + 2 * i])
    if op == "HIT":
        hits.append(t)
    else:
        out.append(str(sum(1 for h in hits if t - 300 < h <= t)))
print("\\n".join(out))
''',
    tests=lambda r: ["6\nHIT 1\nHIT 2\nHIT 3\nCOUNT 4\nHIT 300\nCOUNT 301", "2\nHIT 5\nCOUNT 305"] + [
        (lambda ts: f"{len(ts)}\n" + "\n".join((f"COUNT {t}" if r.random() < 0.35 else f"HIT {t}") for t in ts))(sorted(r.randint(1, 900) for _ in range(r.randint(1, 30))))
        for _ in range(10)
    ],
)

# ---------------------------------------------------------------- 17
problem(
    slug="typo-edit-distance",
    title="Search Query Typo Distance",
    difficulty=6,
    category="Dynamic Programming",
    companies=["google", "microsoft", "amazon"],
    description=(
        "Spell-correct ranks candidates by edit distance: the minimum number of single-character insertions, deletions or "
        "substitutions that turn the typed query into the candidate. Print that distance."
    ),
    constraints=["0 ≤ lengths ≤ 2000", "Lowercase letters; an empty word is given as `-`"],
    input_format="One line: query candidate (use `-` for an empty word).",
    output_format="A single integer.",
    solution='''
import sys
a, b = sys.stdin.read().split()[:2]
a = "" if a == "-" else a
b = "" if b == "-" else b
prev = list(range(len(b) + 1))
for i in range(1, len(a) + 1):
    cur = [i] + [0] * len(b)
    for j in range(1, len(b) + 1):
        cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
    prev = cur
print(prev[-1])
''',
    brute='''
import sys
from functools import lru_cache
a, b = sys.stdin.read().split()[:2]
a = "" if a == "-" else a
b = "" if b == "-" else b
@lru_cache(None)
def f(i, j):
    if i == len(a): return len(b) - j
    if j == len(b): return len(a) - i
    if a[i] == b[j]: return f(i + 1, j + 1)
    return 1 + min(f(i + 1, j), f(i, j + 1), f(i + 1, j + 1))
print(f(0, 0))
''',
    tests=lambda r: ["horse ros", "intention execution", "- abc", "abc -", "same same"] + [
        f"{''.join(r.choice('abc') for _ in range(r.randint(1, 9)))} {''.join(r.choice('abc') for _ in range(r.randint(1, 9)))}" for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 18
problem(
    slug="longest-rising-latency-trend",
    title="Longest Rising Metric Trend",
    difficulty=6,
    category="Dynamic Programming & Binary Search",
    companies=["google", "meta", "amazon"],
    description=(
        "Given a series of metric samples, find the length of the longest **strictly increasing subsequence** "
        "(samples need not be adjacent). n can be large, so O(n log n) is expected."
    ),
    constraints=["1 ≤ n ≤ 2·10^5", "|x| ≤ 10^9"],
    input_format="First line: n. Second line: n integers.",
    output_format="A single integer.",
    solution='''
import sys, bisect
d = list(map(int, sys.stdin.read().split()))
tails = []
for x in d[1:1 + d[0]]:
    k = bisect.bisect_left(tails, x)
    if k == len(tails):
        tails.append(x)
    else:
        tails[k] = x
print(len(tails))
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
a = d[1:1 + d[0]]
L = [1] * len(a)
for i in range(len(a)):
    for j in range(i):
        if a[j] < a[i]:
            L[i] = max(L[i], L[j] + 1)
print(max(L))
''',
    tests=lambda r: ["8\n10 9 2 5 3 7 101 18", "6\n0 1 0 3 2 3", "7\n7 7 7 7 7 7 7", "1\n42"] + [
        (lambda n: f"{n}\n{ints(r.randint(-10, 10) for _ in range(n))}")(r.randint(1, 40)) for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 19
problem(
    slug="coin-change-ways",
    title="Ways to Make Change",
    difficulty=5,
    category="Dynamic Programming",
    companies=["amazon", "google"],
    description=(
        "A payments kiosk has unlimited coins of each denomination. Count the number of **combinations** (order does not matter) "
        "that sum to exactly `amount`, modulo 1,000,000,007."
    ),
    constraints=["1 ≤ n ≤ 100", "1 ≤ coin ≤ 10^4, distinct", "0 ≤ amount ≤ 10^5"],
    input_format="First line: n amount. Second line: n coin values.",
    output_format="A single integer.",
    solution='''
import sys
M = 10**9 + 7
d = list(map(int, sys.stdin.read().split()))
n, amt = d[0], d[1]
ways = [1] + [0] * amt
for c in d[2:2 + n]:
    for s in range(c, amt + 1):
        ways[s] = (ways[s] + ways[s - c]) % M
print(ways[amt])
''',
    brute='''
import sys
from functools import lru_cache
d = list(map(int, sys.stdin.read().split()))
n, amt = d[0], d[1]
coins = sorted(d[2:2 + n])
@lru_cache(None)
def f(i, rem):
    if rem == 0: return 1
    if i == len(coins): return 0
    return sum(f(i + 1, rem - k * coins[i]) for k in range(rem // coins[i] + 1))
print(f(0, amt) % (10**9 + 7))
''',
    tests=lambda r: ["3 5\n1 2 5", "1 3\n2", "1 0\n7", "4 100\n1 5 10 25"] + [
        f"{k} {r.randint(0, 60)}\n{ints(r.sample(range(1, 20), k))}" for k in (r.randint(1, 5) for _ in range(9))
    ],
)

# ---------------------------------------------------------------- 20
problem(
    slug="feature-budget-knapsack",
    title="Sprint Feature Budget",
    difficulty=6,
    category="Dynamic Programming",
    companies=["amazon", "microsoft", "google"],
    description=(
        "A team has `W` engineer-days for the sprint. Each candidate feature costs w[i] days and delivers value v[i]; a feature is "
        "either fully built or skipped. Print the maximum total value that fits in the budget."
    ),
    constraints=["1 ≤ n ≤ 200", "1 ≤ W ≤ 10^4", "1 ≤ w[i] ≤ 10^4", "0 ≤ v[i] ≤ 10^6"],
    input_format="First line: n W. Next n lines: w v.",
    output_format="A single integer.",
    solution='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, W = d[0], d[1]
best = [0] * (W + 1)
for i in range(n):
    w, v = d[2 + 2 * i], d[3 + 2 * i]
    for c in range(W, w - 1, -1):
        best[c] = max(best[c], best[c - w] + v)
print(best[W])
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, W = d[0], d[1]
it = [(d[2 + 2 * i], d[3 + 2 * i]) for i in range(n)]
ans = 0
for mask in range(1 << n):
    w = sum(it[i][0] for i in range(n) if mask >> i & 1)
    if w <= W:
        ans = max(ans, sum(it[i][1] for i in range(n) if mask >> i & 1))
print(ans)
''',
    tests=lambda r: ["3 50\n10 60\n20 100\n30 120", "1 5\n6 100", "2 10\n5 10\n5 10"] + [
        (lambda n: f"{n} {r.randint(1, 30)}\n" + "\n".join(f"{r.randint(1, 12)} {r.randint(0, 50)}" for _ in range(n)))(r.randint(1, 12))
        for _ in range(10)
    ],
)

# ---------------------------------------------------------------- 21
problem(
    slug="warehouse-robot-paths",
    title="Warehouse Robot Paths",
    difficulty=4,
    category="Dynamic Programming",
    companies=["amazon", "google"],
    description=(
        "A warehouse robot starts in the top-left cell of an r×c grid and must reach the bottom-right cell, moving only right or down. "
        "Cells marked `#` hold shelving and cannot be entered; `.` cells are free.\n\n"
        "Print the number of distinct paths modulo 1,000,000,007 (0 if start or goal is blocked)."
    ),
    constraints=["1 ≤ r, c ≤ 1000"],
    input_format="First line: r c. Next r lines: a row of `.` and `#`.",
    output_format="A single integer.",
    solution='''
import sys
M = 10**9 + 7
d = sys.stdin.read().split()
r, c = int(d[0]), int(d[1])
g = d[2:2 + r]
dp = [0] * c
for i in range(r):
    for j in range(c):
        if g[i][j] == "#":
            dp[j] = 0
        elif i == 0 and j == 0:
            dp[j] = 1
        else:
            dp[j] = (dp[j] + (dp[j - 1] if j else 0)) % M
print(dp[-1])
''',
    brute='''
import sys
sys.setrecursionlimit(10000)
d = sys.stdin.read().split()
r, c = int(d[0]), int(d[1])
g = d[2:2 + r]
def go(i, j):
    if i >= r or j >= c or g[i][j] == "#": return 0
    if i == r - 1 and j == c - 1: return 1
    return go(i + 1, j) + go(i, j + 1)
print(go(0, 0) % (10**9 + 7))
''',
    tests=lambda r: ["3 3\n...\n.#.\n...", "2 2\n.#\n..", "1 1\n.", "1 1\n#", "2 2\n..\n.#"] + [
        (lambda h, w: f"{h} {w}\n" + "\n".join("".join("#" if r.random() < 0.2 else "." for _ in range(w)) for _ in range(h)))(r.randint(1, 7), r.randint(1, 7))
        for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 22
problem(
    slug="ring-maintenance-scheduling",
    title="Ring Cluster Maintenance",
    difficulty=5,
    category="Dynamic Programming",
    companies=["google", "amazon", "microsoft"],
    description=(
        "Servers are arranged in a ring; taking server i offline for patching frees `g[i]` units of spare capacity. "
        "Two **adjacent** servers (including the last and the first) may never be offline together. "
        "Print the maximum capacity that can be freed."
    ),
    constraints=["1 ≤ n ≤ 10^5", "0 ≤ g[i] ≤ 10^4"],
    input_format="First line: n. Second line: n integers.",
    output_format="A single integer.",
    solution='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, a = d[0], d[1:1 + d[0]]
def line(xs):
    take = skip = 0
    for x in xs:
        take, skip = skip + x, max(take, skip)
    return max(take, skip)
print(a[0] if n == 1 else max(line(a[1:]), line(a[:-1])))
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, a = d[0], d[1:1 + d[0]]
best = 0
for m in range(1 << n):
    ok = all(not (m >> i & 1 and m >> ((i + 1) % n) & 1) for i in range(n)) if n > 1 else True
    if ok:
        best = max(best, sum(a[i] for i in range(n) if m >> i & 1))
print(best)
''',
    tests=lambda r: ["3\n2 3 2", "4\n1 2 3 1", "1\n7", "2\n5 9"] + [
        (lambda n: f"{n}\n{ints(r.randint(0, 20) for _ in range(n))}")(r.randint(1, 14)) for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 23
problem(
    slug="decode-sms-codes",
    title="Decode Compressed SMS Codes",
    difficulty=5,
    category="Dynamic Programming",
    companies=["meta", "google", "amazon"],
    description=(
        "A legacy SMS gateway encodes letters as numbers: A=1, B=2, ..., Z=26, then concatenates the digits. "
        "Given a digit string, count how many letter strings could have produced it, modulo 1,000,000,007. "
        "Codes with a leading zero (like `06`) are not valid."
    ),
    constraints=["1 ≤ length ≤ 10^5", "Digits only"],
    input_format="A single line with the digit string.",
    output_format="A single integer.",
    solution='''
import sys
M = 10**9 + 7
s = sys.stdin.read().split()[0]
prev2, prev1 = 1, (1 if s[0] != "0" else 0)
for i in range(1, len(s)):
    cur = prev1 if s[i] != "0" else 0
    if s[i - 1] != "0" and 10 <= int(s[i - 1:i + 1]) <= 26:
        cur += prev2
    prev2, prev1 = prev1, cur % M
print(prev1 % M)
''',
    brute='''
import sys
s = sys.stdin.read().split()[0]
def f(i):
    if i == len(s): return 1
    if s[i] == "0": return 0
    r = f(i + 1)
    if i + 1 < len(s) and int(s[i:i + 2]) <= 26:
        r += f(i + 2)
    return r
print(f(0) % (10**9 + 7))
''',
    tests=lambda r: ["12", "226", "06", "10", "2101", "0", "11106"] + [
        "".join(r.choice("0121226") for _ in range(r.randint(1, 16))) for _ in range(7)
    ],
)

# ---------------------------------------------------------------- 24
problem(
    slug="hashtag-word-break",
    title="Hashtag Word Break",
    difficulty=5,
    category="Dynamic Programming",
    companies=["meta", "google", "amazon"],
    description=(
        "To index hashtags like `#interviewcoach`, search splits them into dictionary words. "
        "Given a lowercase string and a dictionary, print `YES` if the string can be split into a sequence of one or more dictionary "
        "words (words may be reused), otherwise `NO`."
    ),
    constraints=["1 ≤ length ≤ 3000", "1 ≤ dictionary size ≤ 1000", "word length ≤ 20"],
    input_format="First line: the string and n. Second line: n dictionary words.",
    output_format="`YES` or `NO`.",
    solution='''
import sys
d = sys.stdin.read().split()
s, n = d[0], int(d[1])
words = set(d[2:2 + n])
L = max(map(len, words))
ok = [True] + [False] * len(s)
for i in range(1, len(s) + 1):
    for k in range(1, min(L, i) + 1):
        if ok[i - k] and s[i - k:i] in words:
            ok[i] = True
            break
print("YES" if ok[-1] else "NO")
''',
    brute='''
import sys
d = sys.stdin.read().split()
s, n = d[0], int(d[1])
words = d[2:2 + n]
def f(t):
    if t == "": return True
    return any(t.startswith(w) and f(t[len(w):]) for w in words)
print("YES" if f(s) else "NO")
''',
    tests=lambda r: ["leetcode 2\nleet code", "applepenapple 2\napple pen", "catsandog 5\ncats dog sand and cat", "a 1\nb"] + [
        (lambda words: f"{''.join(r.choice(words + ['x']) for _ in range(r.randint(1, 5)))} {len(words)}\n{' '.join(words)}")(list({"".join(r.choice("ab") for _ in range(r.randint(1, 3))) for _ in range(4)}))
        for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 25
problem(
    slug="balanced-template-generator",
    title="Balanced Template Generator",
    difficulty=5,
    category="Backtracking",
    companies=["google", "meta", "microsoft"],
    description=(
        "A templating engine needs every balanced arrangement of n pairs of parentheses to fuzz its parser. "
        "Print all of them in **lexicographic order** (`(` sorts before `)`), one per line."
    ),
    constraints=["1 ≤ n ≤ 8"],
    input_format="A single integer n.",
    output_format="Every balanced string of length 2n, sorted, one per line.",
    solution='''
import sys
n = int(sys.stdin.read().split()[0])
out = []
def go(s, o, c):
    if len(s) == 2 * n:
        out.append(s); return
    if o < n: go(s + "(", o + 1, c)
    if c < o: go(s + ")", o, c + 1)
go("", 0, 0)
print("\\n".join(out))
''',
    brute='''
import sys
from itertools import product
n = int(sys.stdin.read().split()[0])
res = []
for t in product("()", repeat=2 * n):
    bal = 0
    for ch in t:
        bal += 1 if ch == "(" else -1
        if bal < 0: break
    if bal == 0:
        res.append("".join(t))
print("\\n".join(sorted(res)))
''',
    tests=lambda r: ["1", "2", "3", "4", "5", "6", "7"],
)

# ---------------------------------------------------------------- 26
problem(
    slug="non-attacking-queens-count",
    title="Non-Attacking Queens",
    difficulty=7,
    category="Backtracking",
    companies=["google", "microsoft"],
    description=(
        "Count the ways to place n queens on an n×n board so that no two attack each other (same row, column or diagonal)."
    ),
    constraints=["1 ≤ n ≤ 11"],
    input_format="A single integer n.",
    output_format="A single integer.",
    solution='''
import sys
n = int(sys.stdin.read().split()[0])
full = (1 << n) - 1
def go(cols, d1, d2):
    if cols == full: return 1
    total = 0
    free = full & ~(cols | d1 | d2)
    while free:
        bit = free & -free
        free ^= bit
        total += go(cols | bit, (d1 | bit) << 1 & full, (d2 | bit) >> 1)
    return total
print(go(0, 0, 0))
''',
    brute='''
import sys
from itertools import permutations
n = int(sys.stdin.read().split()[0])
print(sum(1 for p in permutations(range(n)) if len({p[i] + i for i in range(n)}) == n and len({p[i] - i for i in range(n)}) == n))
''',
    tests=lambda r: ["1", "2", "3", "4", "5", "6", "7", "8"],
)

# ---------------------------------------------------------------- 27
problem(
    slug="largest-capacity-rectangle",
    title="Largest Rack Capacity Rectangle",
    difficulty=8,
    category="Monotonic Stack",
    companies=["google", "amazon", "microsoft"],
    description=(
        "Adjacent racks in a row have heights h[i] (units of free space, each rack 1 unit wide). "
        "Find the area of the largest axis-aligned rectangle that fits entirely inside the skyline formed by the racks."
    ),
    constraints=["1 ≤ n ≤ 10^5", "0 ≤ h[i] ≤ 10^4"],
    input_format="First line: n. Second line: n heights.",
    output_format="A single integer.",
    solution='''
import sys
d = list(map(int, sys.stdin.read().split()))
h = d[1:1 + d[0]] + [0]
st = []; best = 0
for i, x in enumerate(h):
    start = i
    while st and st[-1][1] >= x:
        j, y = st.pop()
        best = max(best, y * (i - j))
        start = j
    st.append((start, x))
print(best)
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
h = d[1:1 + d[0]]
best = 0
for i in range(len(h)):
    m = 10**9
    for j in range(i, len(h)):
        m = min(m, h[j]); best = max(best, m * (j - i + 1))
print(best)
''',
    tests=lambda r: ["6\n2 1 5 6 2 3", "2\n2 4", "1\n0", "5\n3 3 3 3 3"] + [
        (lambda n: f"{n}\n{ints(r.randint(0, 9) for _ in range(n))}")(r.randint(1, 30)) for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 28
problem(
    slug="sliding-window-peak-load",
    title="Sliding Window Peak Load",
    difficulty=6,
    category="Sliding Window & Deques",
    companies=["amazon", "google", "netflix"],
    description=(
        "For autoscaling, print the peak request load inside every window of k consecutive seconds, from left to right. "
        "Expected O(n) overall."
    ),
    constraints=["1 ≤ k ≤ n ≤ 2·10^5", "|x| ≤ 10^9"],
    input_format="First line: n k. Second line: n integers.",
    output_format="n-k+1 space-separated integers.",
    solution='''
import sys
from collections import deque
d = list(map(int, sys.stdin.read().split()))
n, k = d[0], d[1]
a = d[2:2 + n]
dq = deque(); out = []
for i, x in enumerate(a):
    while dq and a[dq[-1]] <= x:
        dq.pop()
    dq.append(i)
    if dq[0] <= i - k:
        dq.popleft()
    if i >= k - 1:
        out.append(a[dq[0]])
print(*out)
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, k = d[0], d[1]
a = d[2:2 + n]
print(*[max(a[i:i + k]) for i in range(n - k + 1)])
''',
    tests=lambda r: ["8 3\n1 3 -1 -3 5 3 6 7", "1 1\n1", "4 4\n4 3 2 1"] + [
        (lambda n: f"{n} {r.randint(1, n)}\n{ints(r.randint(-9, 9) for _ in range(n))}")(r.randint(1, 30)) for _ in range(10)
    ],
)

# ---------------------------------------------------------------- 29
problem(
    slug="subarrays-hitting-budget",
    title="Billing Windows That Hit Budget",
    difficulty=4,
    category="Prefix Sums & Hash Tables",
    companies=["meta", "amazon", "google"],
    description=(
        "Daily cost deltas can be negative (credits). Count the number of contiguous day ranges whose total equals exactly k."
    ),
    constraints=["1 ≤ n ≤ 2·10^5", "|a[i]| ≤ 1000", "|k| ≤ 10^7"],
    input_format="First line: n k. Second line: n integers.",
    output_format="A single integer.",
    solution='''
import sys
from collections import defaultdict
d = list(map(int, sys.stdin.read().split()))
n, k = d[0], d[1]
seen = defaultdict(int); seen[0] = 1
s = ans = 0
for x in d[2:2 + n]:
    s += x
    ans += seen[s - k]
    seen[s] += 1
print(ans)
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, k = d[0], d[1]
a = d[2:2 + n]
print(sum(1 for i in range(n) for j in range(i, n) if sum(a[i:j + 1]) == k))
''',
    tests=lambda r: ["3 2\n1 1 1", "3 3\n1 2 3", "4 0\n0 0 0 0", "5 -1\n1 -1 -1 1 -1"] + [
        (lambda n: f"{n} {r.randint(-4, 4)}\n{ints(r.randint(-3, 3) for _ in range(n))}")(r.randint(1, 30)) for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 30
problem(
    slug="stale-cache-spread",
    title="Stale Cache Spread",
    difficulty=5,
    category="Graphs & BFS",
    companies=["amazon", "netflix", "google"],
    description=(
        "A grid of cache nodes: `2` is stale, `1` is fresh, `0` is empty. Every minute, each stale node makes its fresh "
        "4-directional neighbours stale. Print the minutes until no fresh node remains, or -1 if some fresh node can never become stale."
    ),
    constraints=["1 ≤ r, c ≤ 500"],
    input_format="First line: r c. Next r lines: c digits separated by spaces.",
    output_format="A single integer.",
    solution='''
import sys
from collections import deque
d = sys.stdin.read().split()
r, c = int(d[0]), int(d[1])
g = [list(map(int, d[2 + i * c: 2 + (i + 1) * c])) for i in range(r)]
q = deque((i, j, 0) for i in range(r) for j in range(c) if g[i][j] == 2)
fresh = sum(row.count(1) for row in g)
t = 0
while q:
    i, j, t0 = q.popleft(); t = max(t, t0)
    for x, y in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
        if 0 <= x < r and 0 <= y < c and g[x][y] == 1:
            g[x][y] = 2; fresh -= 1; q.append((x, y, t0 + 1))
print(t if fresh == 0 else -1)
''',
    brute='''
import sys
d = sys.stdin.read().split()
r, c = int(d[0]), int(d[1])
g = [list(map(int, d[2 + i * c: 2 + (i + 1) * c])) for i in range(r)]
mins = 0
while True:
    nxt = [row[:] for row in g]
    ch = False
    for i in range(r):
        for j in range(c):
            if g[i][j] == 1 and any(0 <= x < r and 0 <= y < c and g[x][y] == 2 for x, y in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1))):
                nxt[i][j] = 2; ch = True
    if not ch: break
    g = nxt; mins += 1
print(-1 if any(1 in row for row in g) else mins)
''',
    tests=lambda r: ["3 3\n2 1 1\n1 1 0\n0 1 1", "3 3\n2 1 1\n0 1 1\n1 0 1", "1 2\n0 2", "1 1\n1"] + [
        (lambda h, w: f"{h} {w}\n" + "\n".join(" ".join(str(r.choice([0, 1, 1, 1, 2])) for _ in range(w)) for _ in range(h)))(r.randint(1, 6), r.randint(1, 6))
        for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 31
problem(
    slug="org-chart-common-manager",
    title="Lowest Common Manager",
    difficulty=6,
    category="Trees",
    companies=["google", "meta", "microsoft"],
    description=(
        "An org chart has n employees numbered 1..n; employee 1 is the CEO and every other employee has exactly one manager. "
        "For each query `u v`, print the **lowest common manager**: the deepest employee who is u or an ancestor of u, and also "
        "v or an ancestor of v. Answer every query in O(log n)."
    ),
    constraints=["1 ≤ n ≤ 10^5", "1 ≤ q ≤ 10^5"],
    input_format="First line: n q. Second line: n-1 integers, the managers of employees 2..n. Next q lines: u v.",
    output_format="q lines.",
    solution='''
import sys
from collections import deque
d = list(map(int, sys.stdin.read().split()))
n, q = d[0], d[1]
par = [0, 0] + d[2:2 + n - 1]
kids = [[] for _ in range(n + 1)]
for v in range(2, n + 1):
    kids[par[v]].append(v)
LOG = max(1, n.bit_length())
depth = [0] * (n + 1)
up = [[0] * (n + 1) for _ in range(LOG)]
dq = deque([1]); up[0][1] = 1
while dq:
    u = dq.popleft()
    for v in kids[u]:
        depth[v] = depth[u] + 1; up[0][v] = u; dq.append(v)
for k in range(1, LOG):
    for v in range(1, n + 1):
        up[k][v] = up[k - 1][up[k - 1][v]]
def lca(a, b):
    if depth[a] < depth[b]: a, b = b, a
    diff = depth[a] - depth[b]
    for k in range(LOG):
        if diff >> k & 1: a = up[k][a]
    if a == b: return a
    for k in range(LOG - 1, -1, -1):
        if up[k][a] != up[k][b]:
            a, b = up[k][a], up[k][b]
    return up[0][a]
base = 1 + n
out = [str(lca(d[base + 2 * i], d[base + 2 * i + 1])) for i in range(q)]
print("\\n".join(out))
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, q = d[0], d[1]
par = [0, 0] + d[2:2 + n - 1]
def chain(x):
    c = [x]
    while x != 1:
        x = par[x]; c.append(x)
    return c
base = 1 + n
out = []
for i in range(q):
    u, v = d[base + 2 * i], d[base + 2 * i + 1]
    anc = set(chain(u))
    out.append(str(next(x for x in chain(v) if x in anc)))
print("\\n".join(out))
''',
    tests=lambda r: ["5 3\n1 1 2 2\n4 5\n4 3\n1 5", "1 1\n\n1 1"] + [
        (lambda n: f"{n} 6\n{ints(r.randint(1, v - 1) for v in range(2, n + 1))}\n" + "\n".join(f"{r.randint(1, n)} {r.randint(1, n)}" for _ in range(6)))(r.randint(2, 25))
        for _ in range(10)
    ],
)

# ---------------------------------------------------------------- 32
problem(
    slug="corrupted-packet-id",
    title="Find the Unpaired Packet",
    difficulty=2,
    category="Bit Manipulation",
    companies=["amazon", "microsoft", "apple"],
    description=(
        "Every packet ID in a capture appears exactly twice (sent and acknowledged) except one packet that was never acknowledged. "
        "Find it in O(n) time and O(1) extra memory."
    ),
    constraints=["1 ≤ n ≤ 3·10^5, n odd", "0 ≤ id ≤ 2^31 - 1"],
    input_format="First line: n. Second line: n packet IDs.",
    output_format="The unpaired ID.",
    solution='''
import sys
d = list(map(int, sys.stdin.read().split()))
x = 0
for v in d[1:1 + d[0]]:
    x ^= v
print(x)
''',
    brute='''
import sys
from collections import Counter
d = list(map(int, sys.stdin.read().split()))
print(next(k for k, v in Counter(d[1:1 + d[0]]).items() if v == 1))
''',
    tests=lambda r: ["3\n2 2 1", "5\n4 1 2 1 2", "1\n1"] + [
        (lambda ids, odd: (lambda arr: f"{len(arr)}\n{ints(arr)}")(r.sample(ids + ids + [odd], len(ids) * 2 + 1)))(r.sample(range(0, 1000), r.randint(0, 12)), 5000 + r.randint(0, 99))
        for _ in range(10)
    ],
)

# ---------------------------------------------------------------- 33
problem(
    slug="hop-to-last-region",
    title="Fewest Hops to the Last Region",
    difficulty=5,
    category="Greedy",
    companies=["amazon", "google", "microsoft"],
    description=(
        "Regions are laid out in a line. From region i, a replication job can hop forward to any region up to `a[i]` positions ahead. "
        "It is guaranteed the last region is reachable. Print the minimum number of hops from region 0 to the last region."
    ),
    constraints=["1 ≤ n ≤ 10^5", "0 ≤ a[i] ≤ 1000"],
    input_format="First line: n. Second line: n integers.",
    output_format="A single integer.",
    solution='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, a = d[0], d[1:1 + d[0]]
jumps = end = far = 0
for i in range(n - 1):
    far = max(far, i + a[i])
    if i == end:
        jumps += 1; end = far
print(jumps)
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, a = d[0], d[1:1 + d[0]]
INF = 10**9
best = [INF] * n; best[0] = 0
for i in range(n):
    for j in range(i + 1, min(n, i + a[i] + 1)):
        best[j] = min(best[j], best[i] + 1)
print(best[-1])
''',
    tests=lambda r: ["5\n2 3 1 1 4", "5\n2 3 0 1 4", "1\n0", "3\n1 1 1"] + [
        (lambda n: f"{n}\n{ints([r.randint(1, 4) for _ in range(n - 1)] + [r.randint(0, 3)])}")(r.randint(1, 30)) for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 34
problem(
    slug="job-scheduler-cooldown",
    title="Job Scheduler With Cooldown",
    difficulty=6,
    category="Greedy & Heaps",
    companies=["meta", "amazon", "google"],
    description=(
        "A worker runs one job per tick. Jobs are labelled by type (uppercase letter); two jobs of the same type must be separated "
        "by at least `k` ticks in which the worker runs other jobs or idles. Jobs can run in any order. "
        "Print the minimum number of ticks to finish every job."
    ),
    constraints=["1 ≤ n ≤ 10^5", "0 ≤ k ≤ 100"],
    input_format="First line: n k. Second line: n job letters separated by spaces.",
    output_format="A single integer.",
    solution='''
import sys
from collections import Counter
d = sys.stdin.read().split()
n, k = int(d[0]), int(d[1])
c = Counter(d[2:2 + n]).values()
mx = max(c)
print(max(n, (mx - 1) * (k + 1) + sum(1 for v in c if v == mx)))
''',
    brute='''
import sys, heapq
from collections import Counter
d = sys.stdin.read().split()
n, k = int(d[0]), int(d[1])
heap = [-v for v in Counter(d[2:2 + n]).values()]
heapq.heapify(heap)
cool = []  # (ready_tick, -count)
t = 0
while heap or cool:
    t += 1
    ready = [x for x in cool if x[0] <= t]
    for x in ready:
        cool.remove(x); heapq.heappush(heap, x[1])
    if heap:
        v = heapq.heappop(heap) + 1
        if v < 0:
            cool.append((t + k + 1, v))
print(t)
''',
    tests=lambda r: ["6 2\nA A A B B B", "6 0\nA A A B B B", "12 2\nA A A A A A B C D E F G", "1 5\nA"] + [
        (lambda n: f"{n} {r.randint(0, 4)}\n{' '.join(r.choice('ABCD') for _ in range(n))}")(r.randint(1, 20)) for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 35
problem(
    slug="budget-formula-calculator",
    title="Budget Formula Calculator",
    difficulty=7,
    category="Stacks & Parsing",
    companies=["google", "meta", "microsoft"],
    description=(
        "A spreadsheet stores budget formulas using non-negative integers, `+`, `-` (binary or unary) and parentheses, with no spaces. "
        "Evaluate the formula **without** using any built-in eval."
    ),
    constraints=["1 ≤ length ≤ 10^5", "Intermediate values fit in 64-bit signed integers", "The formula is valid"],
    input_format="A single line with the formula (no spaces).",
    output_format="A single integer.",
    solution='''
import sys
s = sys.stdin.read().split()[0]
res, num, sign, st = 0, 0, 1, []
operand = False  # True right after a number or a closing ")"
for ch in s:
    if ch.isdigit():
        num = num * 10 + int(ch); operand = True
    elif ch in "+-":
        d = 1 if ch == "+" else -1
        if operand:  # binary operator: bank the finished term
            res += sign * num; num = 0; sign = d
        else:  # unary sign, e.g. "--(" or "(-"
            sign *= d
        operand = False
    elif ch == "(":
        st.append((res, sign)); res, sign = 0, 1; operand = False
    elif ch == ")":
        res += sign * num; num = 0
        pr, ps = st.pop()
        res = pr + ps * res
        sign = 1; operand = True
print(res + sign * num)
''',
    brute='''
import sys
s = sys.stdin.read().split()[0]
# Generated inputs only contain digits, + - ( ), so Python's grammar agrees.
print(eval(s.replace("--", "- -"), {"__builtins__": {}}))
''',
    tests=lambda r: ["1+1", "2-1+2", "(1+(4+5+2)-3)+(6+8)", "-(2+3)", "10-(-2)", "0"] + [
        (lambda gen: gen(gen, 3))(lambda g, depth: (str(r.randint(0, 99)) if depth == 0 or r.random() < 0.3 else ("-" if r.random() < 0.2 else "") + "(" + g(g, depth - 1) + r.choice("+-") + g(g, depth - 1) + ")") + (r.choice("+-") + str(r.randint(0, 50)) if r.random() < 0.5 else ""))
        for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 36
problem(
    slug="cheapest-route-limited-layovers",
    title="Cheapest Route With Limited Layovers",
    difficulty=7,
    category="Graphs & Shortest Paths",
    companies=["amazon", "google", "meta"],
    description=(
        "A travel-booking backend prices one-way flights `u v cost`. Find the cheapest price from city s to city t using at most "
        "k layovers (so at most k+1 flights). Print -1 if no such route exists."
    ),
    constraints=["1 ≤ n ≤ 100", "0 ≤ m ≤ n·(n-1)", "1 ≤ cost ≤ 10^4", "0 ≤ k < n", "Cities are numbered 0..n-1"],
    input_format="First line: n m s t k. Next m lines: u v cost.",
    output_format="A single integer.",
    solution='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, m, s, t, k = d[:5]
E = [tuple(d[5 + 3 * i: 8 + 3 * i]) for i in range(m)]
INF = float("inf")
dist = [INF] * n; dist[s] = 0
for _ in range(k + 1):
    nd = dist[:]
    for u, v, w in E:
        if dist[u] + w < nd[v]:
            nd[v] = dist[u] + w
    dist = nd
print(-1 if dist[t] == INF else dist[t])
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, m, s, t, k = d[:5]
adj = [[] for _ in range(n)]
for i in range(m):
    u, v, w = d[5 + 3 * i: 8 + 3 * i]
    adj[u].append((v, w))
best = [float("inf")]
def dfs(u, cost, flights):
    if u == t:
        best[0] = min(best[0], cost)
    if flights == k + 1:
        return
    for v, w in adj[u]:
        dfs(v, cost + w, flights + 1)
dfs(s, 0, 0)
print(-1 if best[0] == float("inf") else best[0])
''',
    tests=lambda r: ["4 5 0 3 1\n0 1 100\n1 2 100\n2 0 100\n1 3 600\n2 3 200", "3 3 0 2 1\n0 1 100\n1 2 100\n0 2 500", "3 3 0 2 0\n0 1 100\n1 2 100\n0 2 500", "2 0 0 1 1"] + [
        (lambda n: (lambda E: f"{n} {len(E)} {r.randrange(n)} {r.randrange(n)} {r.randint(0, 3)}\n" + "\n".join(f"{u} {v} {r.randint(1, 20)}" for u, v in E))(r.sample([(u, v) for u in range(n) for v in range(n) if u != v], r.randint(0, n * (n - 1) // 2))))(r.randint(2, 6))
        for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 37
problem(
    slug="fiber-backbone-mst",
    title="Cheapest Fiber Backbone",
    difficulty=6,
    category="Graphs & MST",
    companies=["google", "amazon", "microsoft"],
    description=(
        "An ISP can lay fiber between pairs of offices at the quoted cost. Choose links so every office is connected (directly or "
        "indirectly) at minimum total cost. Print that cost, or -1 if the offices cannot all be connected."
    ),
    constraints=["1 ≤ n ≤ 10^5", "0 ≤ m ≤ 2·10^5", "1 ≤ cost ≤ 10^6", "Offices numbered 1..n"],
    input_format="First line: n m. Next m lines: u v cost.",
    output_format="A single integer.",
    solution='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, m = d[0], d[1]
E = sorted((d[4 + 3 * i], d[2 + 3 * i], d[3 + 3 * i]) for i in range(m))
p = list(range(n + 1))
def f(x):
    while p[x] != x:
        p[x] = p[p[x]]; x = p[x]
    return x
total = used = 0
for w, u, v in E:
    a, b = f(u), f(v)
    if a != b:
        p[a] = b; total += w; used += 1
print(total if used == n - 1 else -1)
''',
    brute='''
import sys
d = list(map(int, sys.stdin.read().split()))
n, m = d[0], d[1]
INF = float("inf")
W = [[INF] * (n + 1) for _ in range(n + 1)]
for i in range(m):
    u, v, w = d[2 + 3 * i: 5 + 3 * i]
    if u != v:
        W[u][v] = W[v][u] = min(W[u][v], w)
inT = {1}; total = 0
while len(inT) < n:
    best = min(((W[u][v], v) for u in inT for v in range(1, n + 1) if v not in inT), default=(INF, 0))
    if best[0] == INF:
        total = -1; break
    total += best[0]; inT.add(best[1])
print(total)
''',
    tests=lambda r: ["4 5\n1 2 1\n2 3 4\n1 3 3\n3 4 2\n1 4 10", "3 1\n1 2 5", "1 0", "2 2\n1 2 7\n1 2 3"] + [
        (lambda n, m: f"{n} {m}\n" + "\n".join(f"{r.randint(1, n)} {r.randint(1, n)} {r.randint(1, 30)}" for _ in range(m)))(*(lambda n: (n, r.randint(0, 3 * n)))(r.randint(1, 9)))
        for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 38
problem(
    slug="max-signal-path-tree",
    title="Maximum Signal Path in a Relay Tree",
    difficulty=8,
    category="Trees & Recursion",
    companies=["google", "meta", "amazon"],
    description=(
        "Relays form a binary tree; each relay adds a (possibly negative) gain to any signal passing through it. "
        "A path is any sequence of relays connected by tree edges (it need not pass through the root, and contains at least one relay). "
        "Print the maximum total gain of any path.\n\n"
        "The tree is given in level order, with `null` for missing children (the standard serialization)."
    ),
    constraints=["1 ≤ nodes ≤ 3·10^4", "-1000 ≤ gain ≤ 1000"],
    input_format="A single line of level-order tokens (integers or `null`).",
    output_format="A single integer.",
    solution='''
import sys
from collections import deque
tok = sys.stdin.read().split()
vals = [None if t == "null" else int(t) for t in tok]
L = {}; R = {}
q = deque([0]); i = 1
while q and i < len(vals):
    u = q.popleft()
    for side in (L, R):
        if i < len(vals):
            if vals[i] is not None:
                side[u] = i; q.append(i)
            i += 1
order = []; st = [0]
while st:
    u = st.pop(); order.append(u)
    for c in (L.get(u), R.get(u)):
        if c is not None: st.append(c)
down = {}; best = -10**18
for u in reversed(order):
    l = max(0, down.get(L.get(u), 0)) if u in L else 0
    r = max(0, down.get(R.get(u), 0)) if u in R else 0
    best = max(best, vals[u] + l + r)
    down[u] = vals[u] + max(l, r)
print(best)
''',
    brute='''
import sys
from collections import deque
tok = sys.stdin.read().split()
vals = [None if t == "null" else int(t) for t in tok]
adj = {0: []}
q = deque([0]); i = 1
while q and i < len(vals):
    u = q.popleft()
    for _ in range(2):
        if i < len(vals):
            if vals[i] is not None:
                adj.setdefault(u, []).append(i); adj.setdefault(i, []).append(u); q.append(i)
            i += 1
nodes = list(adj)
best = -10**18
for s in nodes:
    # every simple path from s: DFS accumulating sums
    st = [(s, -1, vals[s])]
    while st:
        u, p, tot = st.pop()
        best = max(best, tot)
        for v in adj[u]:
            if v != p:
                st.append((v, u, tot + vals[v]))
print(best)
''',
    tests=lambda r: ["1 2 3", "-10 9 20 null null 15 7", "-3", "2 -1", "5 4 8 11 null 13 4 7 2 null null null 1"] + [
        (lambda n: " ".join(["%d" % r.randint(-10, 10)] + [("null" if r.random() < 0.25 else "%d" % r.randint(-10, 10)) for _ in range(n)]))(r.randint(0, 20))
        for _ in range(9)
    ],
)
