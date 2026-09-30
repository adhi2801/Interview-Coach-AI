"""
Problem pack 3: topics packs 1 and 2 don't cover — binary search on the
answer, two-heap streaming, merge-sort counting, bipartite graphs, DAG
critical paths, multi-source BFS, grid backtracking and more DP shapes.

Same contract as pack2: whitespace-separated stdin, output compared after
strip(), and every reference solution is checked against a deliberately
different brute force on generated inputs before it is published
(scripts/build_problem_pack.py pack3). "targets" holds the reference
solution's time and space complexity, shown in the coding room.
"""

from problem_bank.pack2 import ints

P = []


def problem(**kw):
    P.append(kw)
    return kw


def arr(r, n_lo, n_hi, v_lo, v_hi):
    n = r.randint(n_lo, n_hi)
    return n, [r.randint(v_lo, v_hi) for _ in range(n)]


# ---------------------------------------------------------------- 1
problem(
    slug="ship-capacity-within-days",
    title="Shipping Capacity Within a Deadline",
    difficulty=4,
    category="Binary Search",
    companies=["amazon", "google", "microsoft"],
    targets=("O(n log S)", "O(1)"),
    description=(
        "A warehouse ships packages in the order they sit on the conveyor. Each day one truck leaves, loaded with a "
        "contiguous run of packages whose total weight doesn't exceed the truck's capacity.\n\n"
        "Given the package weights and a deadline of `d` days, print the **smallest truck capacity** that ships "
        "everything within `d` days."
    ),
    constraints=["1 ≤ d ≤ n ≤ 10^5", "1 ≤ weight ≤ 500"],
    input_format="First line: n and d. Second line: n weights.",
    output_format="The minimum capacity.",
    solution='''
import sys
x = sys.stdin.read().split()
n, d = int(x[0]), int(x[1])
w = list(map(int, x[2:2 + n]))
def days(cap):
    used, load = 1, 0
    for v in w:
        if load + v > cap:
            used += 1
            load = 0
        load += v
    return used
lo, hi = max(w), sum(w)
while lo < hi:
    mid = (lo + hi) // 2
    if days(mid) <= d:
        hi = mid
    else:
        lo = mid + 1
print(lo)
''',
    brute='''
import sys
x = sys.stdin.read().split()
n, d = int(x[0]), int(x[1])
w = list(map(int, x[2:2 + n]))
cap = max(w)
while True:
    used, load = 1, 0
    for v in w:
        if load + v > cap:
            used, load = used + 1, 0
        load += v
    if used <= d:
        print(cap)
        break
    cap += 1
''',
    tests=lambda r: ["10 5\n1 2 3 4 5 6 7 8 9 10", "6 3\n3 2 2 4 1 4", "5 4\n1 2 3 1 1", "1 1\n7"] + [
        (lambda n: f"{n} {r.randint(1, n)}\n{ints(r.randint(1, 30) for _ in range(n))}")(r.randint(1, 25))
        for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 2
problem(
    slug="running-median-latency",
    title="Running Median Latency",
    difficulty=5,
    category="Heaps",
    companies=["google", "meta", "netflix"],
    targets=("O(n log n)", "O(n)"),
    description=(
        "A dashboard shows the median request latency after every new sample arrives.\n\n"
        "Given latencies in arrival order, print the median after each one. With an even count, the median is the "
        "**lower** of the two middle values."
    ),
    constraints=["1 ≤ n ≤ 10^5", "0 ≤ latency ≤ 10^9"],
    input_format="First line: n. Second line: n latencies.",
    output_format="n integers on one line: the median after each sample.",
    solution='''
import sys, heapq
x = sys.stdin.read().split()
n = int(x[0])
lo, hi, out = [], [], []
for v in map(int, x[1:1 + n]):
    if not lo or v <= -lo[0]:
        heapq.heappush(lo, -v)
    else:
        heapq.heappush(hi, v)
    if len(lo) > len(hi) + 1:
        heapq.heappush(hi, -heapq.heappop(lo))
    elif len(hi) > len(lo):
        heapq.heappush(lo, -heapq.heappop(hi))
    out.append(-lo[0])
print(*out)
''',
    brute='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
seen, out = [], []
for v in map(int, x[1:1 + n]):
    seen.append(v)
    s = sorted(seen)
    out.append(s[(len(s) - 1) // 2])
print(*out)
''',
    tests=lambda r: ["5\n5 15 1 3 8", "1\n42", "4\n2 2 2 2", "6\n6 5 4 3 2 1"] + [
        (lambda n: f"{n}\n{ints(r.randint(0, 50) for _ in range(n))}")(r.randint(1, 30)) for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 3
problem(
    slug="max-product-growth-window",
    title="Best Compounded Growth Window",
    difficulty=4,
    category="Dynamic Programming",
    companies=["amazon", "microsoft", "apple"],
    targets=("O(n)", "O(1)"),
    description=(
        "Each day's growth factor is an integer (negative means a reversal, zero a reset). The compounded growth of a "
        "run of consecutive days is the product of their factors.\n\n"
        "Print the **largest product** of any non-empty contiguous run."
    ),
    constraints=["1 ≤ n ≤ 10^4", "-10 ≤ factor ≤ 10", "The answer fits in 64 bits for the given tests"],
    input_format="First line: n. Second line: n integers.",
    output_format="The maximum product.",
    solution='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
a = list(map(int, x[1:1 + n]))
best = hi = lo = a[0]
for v in a[1:]:
    cands = (v, hi * v, lo * v)
    hi, lo = max(cands), min(cands)
    best = max(best, hi)
print(best)
''',
    brute='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
a = list(map(int, x[1:1 + n]))
best = None
for i in range(n):
    p = 1
    for j in range(i, n):
        p *= a[j]
        best = p if best is None or p > best else best
print(best)
''',
    tests=lambda r: ["4\n2 3 -2 4", "3\n-2 0 -1", "1\n-5", "5\n-2 -3 0 -2 -40", "3\n0 0 0"] + [
        (lambda n: f"{n}\n{ints(r.randint(-4, 4) for _ in range(n))}")(r.randint(1, 16)) for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 4
problem(
    slug="split-workload-evenly",
    title="Split the Workload Evenly",
    difficulty=4,
    category="Dynamic Programming",
    companies=["google", "amazon", "meta"],
    targets=("O(n · S)", "O(S)"),
    description=(
        "Two on-call engineers split a batch of tickets; each ticket takes a whole number of hours and can't be split.\n\n"
        "Print `YES` if the tickets can be divided into two groups with **exactly equal** total hours, otherwise `NO`."
    ),
    constraints=["1 ≤ n ≤ 200", "1 ≤ hours ≤ 100"],
    input_format="First line: n. Second line: n ticket durations.",
    output_format="`YES` or `NO`.",
    solution='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
a = list(map(int, x[1:1 + n]))
s = sum(a)
if s % 2:
    print("NO")
else:
    reach = 1
    for v in a:
        reach |= reach << v
    print("YES" if reach >> (s // 2) & 1 else "NO")
''',
    brute='''
import sys
from itertools import product
x = sys.stdin.read().split()
n = int(x[0])
a = list(map(int, x[1:1 + n]))
ok = any(sum(v for v, pick in zip(a, mask) if pick) * 2 == sum(a) for mask in product((0, 1), repeat=n))
print("YES" if ok else "NO")
''',
    tests=lambda r: ["4\n1 5 11 5", "4\n1 2 3 5", "1\n2", "2\n7 7", "3\n3 3 3"] + [
        (lambda n: f"{n}\n{ints(r.randint(1, 12) for _ in range(n))}")(r.randint(1, 14)) for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 5
problem(
    slug="common-event-subsequence",
    title="Longest Common Event Sequence",
    difficulty=4,
    category="Dynamic Programming",
    companies=["google", "microsoft", "apple"],
    targets=("O(n · m)", "O(m)"),
    description=(
        "Two services log the same user journey, but each drops some events. Events are single lowercase letters.\n\n"
        "Print the length of the **longest sequence of events that appears in both logs in the same order** "
        "(not necessarily contiguously)."
    ),
    constraints=["1 ≤ |a|, |b| ≤ 2000", "Lowercase letters only"],
    input_format="Two lines: the two logs.",
    output_format="The length of the longest common subsequence.",
    solution='''
import sys
a, b = sys.stdin.read().split()[:2]
prev = [0] * (len(b) + 1)
for ca in a:
    cur = [0] * (len(b) + 1)
    for j, cb in enumerate(b, 1):
        cur[j] = prev[j - 1] + 1 if ca == cb else max(prev[j], cur[j - 1])
    prev = cur
print(prev[-1])
''',
    brute='''
import sys
from functools import lru_cache
a, b = sys.stdin.read().split()[:2]
@lru_cache(None)
def f(i, j):
    if i == len(a) or j == len(b):
        return 0
    if a[i] == b[j]:
        return 1 + f(i + 1, j + 1)
    return max(f(i + 1, j), f(i, j + 1))
print(f(0, 0))
''',
    tests=lambda r: ["abcde\nace", "abc\nabc", "abc\ndef", "a\na"] + [
        "".join(r.choice("abc") for _ in range(r.randint(1, 12))) + "\n" + "".join(r.choice("abc") for _ in range(r.randint(1, 12)))
        for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 6
problem(
    slug="charging-station-loop",
    title="Charging Station Loop",
    difficulty=4,
    category="Greedy",
    companies=["amazon", "apple", "google"],
    targets=("O(n)", "O(1)"),
    description=(
        "A delivery drone flies a fixed loop of `n` charging stations. At station `i` it can take `charge[i]` units, "
        "and flying on to station `i + 1` (wrapping round to 0) costs `cost[i]`. It starts empty.\n\n"
        "Print the **smallest station index** from which the drone can complete the full loop, or `-1` if none can."
    ),
    constraints=["1 ≤ n ≤ 10^5", "0 ≤ charge[i], cost[i] ≤ 10^4"],
    input_format="First line: n. Second line: charge. Third line: cost.",
    output_format="The starting station, or `-1`.",
    solution='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
g = list(map(int, x[1:1 + n]))
c = list(map(int, x[1 + n:1 + 2 * n]))
if sum(g) < sum(c):
    print(-1)
else:
    start, tank = 0, 0
    for i in range(n):
        tank += g[i] - c[i]
        if tank < 0:
            start, tank = i + 1, 0
    print(start)
''',
    brute='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
g = list(map(int, x[1:1 + n]))
c = list(map(int, x[1 + n:1 + 2 * n]))
ans = -1
for s in range(n):
    tank, ok = 0, True
    for k in range(n):
        i = (s + k) % n
        tank += g[i] - c[i]
        if tank < 0:
            ok = False
            break
    if ok:
        ans = s
        break
print(ans)
''',
    tests=lambda r: ["5\n1 2 3 4 5\n3 4 5 1 2", "3\n2 3 4\n3 4 3", "1\n5\n5", "2\n0 0\n0 0"] + [
        (lambda n: f"{n}\n{ints(r.randint(0, 6) for _ in range(n))}\n{ints(r.randint(0, 6) for _ in range(n))}")(r.randint(1, 12))
        for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 7
problem(
    slug="spiral-rack-inventory",
    title="Spiral Rack Inventory Walk",
    difficulty=3,
    category="Arrays & Matrices",
    companies=["microsoft", "amazon", "apple"],
    targets=("O(r · c)", "O(1) beyond the output"),
    description=(
        "A robot counts stock on a rectangular rack, starting at the top-left slot and walking clockwise in a spiral "
        "toward the centre.\n\nPrint the slot values in the order the robot visits them."
    ),
    constraints=["1 ≤ r, c ≤ 100"],
    input_format="First line: r and c. Then r lines of c integers.",
    output_format="All r · c values on one line, in spiral order.",
    solution='''
import sys
x = sys.stdin.read().split()
r, c = int(x[0]), int(x[1])
m = [list(map(int, x[2 + i * c:2 + (i + 1) * c])) for i in range(r)]
top, bot, left, right = 0, r - 1, 0, c - 1
out = []
while top <= bot and left <= right:
    out += m[top][left:right + 1]
    out += [m[i][right] for i in range(top + 1, bot + 1)]
    if top < bot:
        out += m[bot][left:right][::-1]
    if left < right:
        out += [m[i][left] for i in range(bot - 1, top, -1)]
    top, bot, left, right = top + 1, bot - 1, left + 1, right - 1
print(*out)
''',
    brute='''
import sys
x = sys.stdin.read().split()
r, c = int(x[0]), int(x[1])
m = [list(map(int, x[2 + i * c:2 + (i + 1) * c])) for i in range(r)]
seen = [[False] * c for _ in range(r)]
dirs = [(0, 1), (1, 0), (0, -1), (-1, 0)]
i = j = d = 0
out = []
for _ in range(r * c):
    out.append(m[i][j])
    seen[i][j] = True
    ni, nj = i + dirs[d][0], j + dirs[d][1]
    if not (0 <= ni < r and 0 <= nj < c) or seen[ni][nj]:
        d = (d + 1) % 4
        ni, nj = i + dirs[d][0], j + dirs[d][1]
    i, j = ni, nj
print(*out)
''',
    tests=lambda r: ["3 3\n1 2 3\n4 5 6\n7 8 9", "3 4\n1 2 3 4\n5 6 7 8\n9 10 11 12", "1 1\n5", "1 4\n1 2 3 4", "4 1\n1\n2\n3\n4"] + [
        (lambda a, b: f"{a} {b}\n" + "\n".join(ints(r.randint(0, 99) for _ in range(b)) for _ in range(a)))(r.randint(1, 6), r.randint(1, 6))
        for _ in range(7)
    ],
)

# ---------------------------------------------------------------- 8
problem(
    slug="validate-permission-tree",
    title="Validate a Permission Search Tree",
    difficulty=4,
    category="Trees",
    companies=["google", "meta", "microsoft"],
    targets=("O(n)", "O(h)"),
    description=(
        "Permission IDs are stored in a binary search tree: every ID in a node's left subtree must be strictly smaller "
        "than the node's, and every ID in its right subtree strictly larger.\n\n"
        "The tree is given in level order, with `null` for a missing child. Print `VALID` or `INVALID`."
    ),
    constraints=["1 ≤ nodes ≤ 10^4", "-10^9 ≤ id ≤ 10^9"],
    input_format="First line: k, the number of tokens. Second line: k tokens in level order (integers or `null`).",
    output_format="`VALID` or `INVALID`.",
    solution='''
import sys
x = sys.stdin.read().split()
k = int(x[0])
t = x[1:1 + k]
left, right, val = {}, {}, {}
val[0] = int(t[0])
queue, i = [0], 1
for node in queue:
    for side in (left, right):
        if i < k:
            if t[i] != "null":
                idx = len(val)
                val[idx] = int(t[i])
                side[node] = idx
                queue.append(idx)
            i += 1
ok = True
stack = [(0, None, None)]
while stack and ok:
    n, lo, hi = stack.pop()
    v = val[n]
    if (lo is not None and v <= lo) or (hi is not None and v >= hi):
        ok = False
    if n in left:
        stack.append((left[n], lo, v))
    if n in right:
        stack.append((right[n], v, hi))
print("VALID" if ok else "INVALID")
''',
    brute='''
import sys
x = sys.stdin.read().split()
k = int(x[0])
t = x[1:1 + k]
nodes = [[int(t[0]), None, None]]
queue, i = [0], 1
while queue and i < k:
    cur = queue.pop(0)
    for side in (1, 2):
        if i < k and t[i] != "null":
            nodes.append([int(t[i]), None, None])
            nodes[cur][side] = len(nodes) - 1
            queue.append(len(nodes) - 1)
        i += 1
def collect(n):
    if n is None:
        return []
    return collect(nodes[n][1]) + [nodes[n][0]] + collect(nodes[n][2])
def ok(n):
    if n is None:
        return True
    v, l, r = nodes[n]
    return all(u < v for u in collect(l)) and all(u > v for u in collect(r)) and ok(l) and ok(r)
print("VALID" if ok(0) else "INVALID")
''',
    tests=lambda r: [
        "3\n2 1 3", "7\n5 1 4 null null 3 6", "7\n5 4 6 null null 3 7", "1\n1", "3\n1 1 null",
        "7\n10 5 15 null null 6 20", "7\n8 4 12 2 6 10 14",
    ] + [
        (lambda vals: f"{len(vals)}\n{' '.join(vals)}")(
            [str(r.randint(1, 20))] + [r.choice([str(r.randint(1, 20)), "null"]) for _ in range(r.randint(0, 8))]
        ) for _ in range(5)
    ],
)

# ---------------------------------------------------------------- 9
problem(
    slug="network-tree-diameter",
    title="Longest Hop Count in a Tree Network",
    difficulty=4,
    category="Graphs & Trees",
    companies=["amazon", "netflix", "google"],
    targets=("O(n)", "O(n)"),
    description=(
        "A private network of `n` routers is wired as a tree (connected, no cycles). The worst-case latency is set by "
        "the two routers that are the most hops apart.\n\nPrint that largest number of hops."
    ),
    constraints=["1 ≤ n ≤ 10^5"],
    input_format="First line: n. Then n − 1 lines, each an edge `u v` (0-indexed).",
    output_format="The diameter in hops.",
    solution='''
import sys
from collections import deque
x = sys.stdin.read().split()
n = int(x[0])
g = [[] for _ in range(n)]
for i in range(n - 1):
    u, v = int(x[1 + 2 * i]), int(x[2 + 2 * i])
    g[u].append(v)
    g[v].append(u)
def far(s):
    dist = [-1] * n
    dist[s] = 0
    q = deque([s])
    while q:
        u = q.popleft()
        for v in g[u]:
            if dist[v] < 0:
                dist[v] = dist[u] + 1
                q.append(v)
    best = max(range(n), key=lambda i: dist[i])
    return best, dist[best]
a, _ = far(0)
print(far(a)[1])
''',
    brute='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
INF = 10 ** 9
d = [[0 if i == j else INF for j in range(n)] for i in range(n)]
for i in range(n - 1):
    u, v = int(x[1 + 2 * i]), int(x[2 + 2 * i])
    d[u][v] = d[v][u] = 1
for k in range(n):
    for i in range(n):
        for j in range(n):
            if d[i][k] + d[k][j] < d[i][j]:
                d[i][j] = d[i][k] + d[k][j]
print(max(max(row) for row in d))
''',
    tests=lambda r: ["1", "2\n0 1", "5\n0 1\n1 2\n2 3\n1 4", "4\n0 1\n0 2\n0 3"] + [
        (lambda n: f"{n}" + "".join(f"\n{i} {r.randint(0, i - 1)}" for i in range(1, n)))(r.randint(1, 18)) for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 10
problem(
    slug="two-team-split",
    title="Split Rivals Into Two Teams",
    difficulty=4,
    category="Graphs & BFS",
    companies=["meta", "google", "amazon"],
    targets=("O(n + m)", "O(n + m)"),
    description=(
        "For a hackathon, `n` people must be split into two teams. Some pairs are rivals and must end up on "
        "**different** teams.\n\nPrint `YES` if such a split exists, otherwise `NO`."
    ),
    constraints=["1 ≤ n ≤ 10^5", "0 ≤ m ≤ 2·10^5", "No self-rivalries"],
    input_format="First line: n and m. Then m lines `u v` (0-indexed).",
    output_format="`YES` or `NO`.",
    solution='''
import sys
from collections import deque
x = sys.stdin.read().split()
n, m = int(x[0]), int(x[1])
g = [[] for _ in range(n)]
for i in range(m):
    u, v = int(x[2 + 2 * i]), int(x[3 + 2 * i])
    g[u].append(v)
    g[v].append(u)
color = [-1] * n
ok = True
for s in range(n):
    if color[s] >= 0 or not ok:
        continue
    color[s] = 0
    q = deque([s])
    while q and ok:
        u = q.popleft()
        for v in g[u]:
            if color[v] < 0:
                color[v] = 1 - color[u]
                q.append(v)
            elif color[v] == color[u]:
                ok = False
print("YES" if ok else "NO")
''',
    brute='''
import sys
from itertools import product
x = sys.stdin.read().split()
n, m = int(x[0]), int(x[1])
e = [(int(x[2 + 2 * i]), int(x[3 + 2 * i])) for i in range(m)]
ok = any(all(c[u] != c[v] for u, v in e) for c in product((0, 1), repeat=n))
print("YES" if ok else "NO")
''',
    tests=lambda r: ["4 4\n0 1\n1 2\n2 3\n3 0", "3 3\n0 1\n1 2\n2 0", "1 0", "5 2\n0 1\n3 4"] + [
        (lambda n: (lambda es: f"{n} {len(es)}" + "".join(f"\n{u} {v}" for u, v in es))(
            sorted({tuple(sorted(r.sample(range(n), 2))) for _ in range(r.randint(0, n + 2))}) if n > 1 else []
        ))(r.randint(1, 11)) for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 11
problem(
    slug="longest-consecutive-ticket-ids",
    title="Longest Run of Consecutive Ticket IDs",
    difficulty=3,
    category="Hash Tables",
    companies=["google", "amazon", "meta"],
    targets=("O(n)", "O(n)"),
    description=(
        "Support tickets were imported out of order and some are duplicated.\n\n"
        "Print the length of the **longest run of consecutive IDs** (like 7, 8, 9, 10) present in the list."
    ),
    constraints=["0 ≤ n ≤ 10^5", "-10^9 ≤ id ≤ 10^9"],
    input_format="First line: n. Second line: n IDs (empty when n = 0).",
    output_format="The length of the longest run.",
    solution='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
s = set(map(int, x[1:1 + n]))
best = 0
for v in s:
    if v - 1 not in s:
        end = v
        while end + 1 in s:
            end += 1
        best = max(best, end - v + 1)
print(best)
''',
    brute='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
a = sorted(set(map(int, x[1:1 + n])))
best = run = 0
for i, v in enumerate(a):
    run = run + 1 if i and a[i - 1] == v - 1 else 1
    best = max(best, run)
print(best)
''',
    tests=lambda r: ["6\n100 4 200 1 3 2", "0\n", "10\n0 3 7 2 5 8 4 6 0 1", "3\n5 5 5"] + [
        (lambda n: f"{n}\n{ints(r.randint(-10, 10) for _ in range(n))}")(r.randint(1, 25)) for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 12
problem(
    slug="cheapest-transit-passes",
    title="Cheapest Transit Passes",
    difficulty=4,
    category="Dynamic Programming",
    companies=["apple", "amazon", "google"],
    targets=("O(n)", "O(n)"),
    description=(
        "You know the days of the year you'll commute. A 1-day pass costs `a`, a 7-day pass `b` and a 30-day pass `c`; "
        "a k-day pass bought on day d covers days d through d + k − 1.\n\n"
        "Print the **minimum total cost** to cover every commuting day."
    ),
    constraints=["1 ≤ n ≤ 365", "1 ≤ day ≤ 365, strictly increasing", "1 ≤ a, b, c ≤ 1000"],
    input_format="First line: n, a, b, c. Second line: the n commuting days.",
    output_format="The minimum cost.",
    solution='''
import sys
x = sys.stdin.read().split()
n, a, b, c = map(int, x[:4])
days = set(map(int, x[4:4 + n]))
dp = [0] * 400
for d in range(1, 366):
    if d not in days:
        dp[d] = dp[d - 1]
    else:
        dp[d] = min(dp[d - 1] + a, dp[max(0, d - 7)] + b, dp[max(0, d - 30)] + c)
print(dp[365])
''',
    brute='''
import sys
from functools import lru_cache
x = sys.stdin.read().split()
n, a, b, c = map(int, x[:4])
days = list(map(int, x[4:4 + n]))
@lru_cache(None)
def f(i):
    if i == n:
        return 0
    best = None
    for span, cost in ((1, a), (7, b), (30, c)):
        j = i
        while j < n and days[j] < days[i] + span:
            j += 1
        v = cost + f(j)
        best = v if best is None or v < best else best
    return best
print(f(0))
''',
    tests=lambda r: ["6 2 7 15\n1 4 6 7 8 20", "12 2 7 15\n1 2 3 4 5 6 7 8 9 10 30 31", "1 5 3 10\n100"] + [
        (lambda n: f"{n} {r.randint(1, 5)} {r.randint(3, 20)} {r.randint(10, 60)}\n{ints(sorted(r.sample(range(1, 90), n)))}")(r.randint(1, 20))
        for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 13
problem(
    slug="fewest-palindrome-segments",
    title="Fewest Cuts Into Palindromic Segments",
    difficulty=6,
    category="Dynamic Programming",
    companies=["google", "amazon", "microsoft"],
    targets=("O(n²)", "O(n²)"),
    description=(
        "A barcode string must be cut into pieces that each read the same forwards and backwards.\n\n"
        "Print the **minimum number of cuts** needed."
    ),
    constraints=["1 ≤ length ≤ 2000", "Lowercase letters only"],
    input_format="A single line with the string.",
    output_format="The minimum number of cuts.",
    solution='''
import sys
s = sys.stdin.read().split()[0]
n = len(s)
pal = [[False] * n for _ in range(n)]
for i in range(n - 1, -1, -1):
    for j in range(i, n):
        pal[i][j] = s[i] == s[j] and (j - i < 2 or pal[i + 1][j - 1])
cuts = [0] * n
for j in range(n):
    if pal[0][j]:
        cuts[j] = 0
    else:
        cuts[j] = min(cuts[i - 1] + 1 for i in range(1, j + 1) if pal[i][j])
print(cuts[-1])
''',
    brute='''
import sys
from functools import lru_cache
s = sys.stdin.read().split()[0]
@lru_cache(None)
def f(i):
    if i == len(s):
        return -1
    return min(1 + f(j) for j in range(i + 1, len(s) + 1) if s[i:j] == s[i:j][::-1])
print(f(0))
''',
    tests=lambda r: ["aab", "a", "ab", "racecar", "abccbaxy"] + [
        "".join(r.choice("ab") for _ in range(r.randint(1, 14))) for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 14
problem(
    slug="kth-smallest-sorted-grid",
    title="k-th Smallest Reading in a Sorted Grid",
    difficulty=5,
    category="Binary Search",
    companies=["google", "meta", "apple"],
    targets=("O(n log(max − min))", "O(1)"),
    description=(
        "Sensor readings are arranged in an n × n grid where every row and every column is sorted in non-decreasing "
        "order.\n\nPrint the **k-th smallest** reading (counting duplicates)."
    ),
    constraints=["1 ≤ n ≤ 300", "1 ≤ k ≤ n²", "-10^9 ≤ value ≤ 10^9"],
    input_format="First line: n and k. Then n lines of n integers.",
    output_format="The k-th smallest value.",
    solution='''
import sys
x = sys.stdin.read().split()
n, k = int(x[0]), int(x[1])
m = [list(map(int, x[2 + i * n:2 + (i + 1) * n])) for i in range(n)]
def count_le(v):
    i, j, c = n - 1, 0, 0
    while i >= 0 and j < n:
        if m[i][j] <= v:
            c += i + 1
            j += 1
        else:
            i -= 1
    return c
lo, hi = m[0][0], m[-1][-1]
while lo < hi:
    mid = (lo + hi) // 2
    if count_le(mid) >= k:
        hi = mid
    else:
        lo = mid + 1
print(lo)
''',
    brute='''
import sys
x = sys.stdin.read().split()
n, k = int(x[0]), int(x[1])
print(sorted(map(int, x[2:2 + n * n]))[k - 1])
''',
    tests=lambda r: ["3 8\n1 5 9\n10 11 13\n12 13 15", "1 1\n-5", "2 3\n1 2\n1 3"] + [
        (lambda n: (lambda g: f"{n} {r.randint(1, n * n)}\n" + "\n".join(ints(row) for row in g))(
            (lambda base: [[base[i] + base[j] * 2 + i * j for j in range(n)] for i in range(n)])(sorted(r.randint(-5, 5) for _ in range(n)))
        ))(r.randint(1, 6)) for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 15
problem(
    slug="merge-sorted-log-feeds",
    title="Merge k Sorted Log Feeds",
    difficulty=4,
    category="Heaps",
    companies=["amazon", "google", "netflix"],
    targets=("O(N log k)", "O(k)"),
    description=(
        "Each of k servers produces a feed of event timestamps already sorted ascending.\n\n"
        "Print one merged, sorted feed of all timestamps."
    ),
    constraints=["1 ≤ k ≤ 10^4", "Total timestamps N ≤ 10^5"],
    input_format="First line: k. Then k lines, each starting with its length L followed by L sorted timestamps.",
    output_format="All timestamps on one line in sorted order (an empty line if there are none).",
    solution='''
import sys, heapq
x = sys.stdin.read().split()
k = int(x[0])
pos, feeds = 1, []
for _ in range(k):
    L = int(x[pos])
    feeds.append(list(map(int, x[pos + 1:pos + 1 + L])))
    pos += 1 + L
heap = [(f[0], i, 0) for i, f in enumerate(feeds) if f]
heapq.heapify(heap)
out = []
while heap:
    v, i, j = heapq.heappop(heap)
    out.append(v)
    if j + 1 < len(feeds[i]):
        heapq.heappush(heap, (feeds[i][j + 1], i, j + 1))
print(*out)
''',
    brute='''
import sys
x = sys.stdin.read().split()
k = int(x[0])
pos, allv = 1, []
for _ in range(k):
    L = int(x[pos])
    allv += list(map(int, x[pos + 1:pos + 1 + L]))
    pos += 1 + L
print(*sorted(allv))
''',
    tests=lambda r: ["3\n3 1 4 5\n3 1 3 4\n2 2 6", "2\n0\n1 7", "1\n0"] + [
        (lambda k: f"{k}" + "".join(
            (lambda L: f"\n{L}" + (" " + ints(sorted(r.randint(0, 30) for _ in range(L))) if L else ""))(r.randint(0, 6))
            for _ in range(k)))(r.randint(1, 5)) for _ in range(9)
    ],
)


# The second half lives in its own file to keep each readable; importing it
# appends its problems to P.
from problem_bank import pack3_more  # noqa: E402,F401
