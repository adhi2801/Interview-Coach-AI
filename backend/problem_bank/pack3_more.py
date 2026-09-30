"""Problem pack 3, second half (appended to pack3.P on import)."""

from problem_bank.pack2 import ints
from problem_bank.pack3 import problem

# ---------------------------------------------------------------- 16
problem(
    slug="keyword-grid-search",
    title="Find a Keyword in a Letter Grid",
    difficulty=5,
    category="Backtracking",
    companies=["microsoft", "amazon", "meta"],
    targets=("O(r · c · 3^L)", "O(L)"),
    description=(
        "A puzzle screen shows a grid of letters. A keyword can be traced by starting on any cell and stepping up, "
        "down, left or right, using each cell **at most once**.\n\nPrint `FOUND` or `NOT FOUND`."
    ),
    constraints=["1 ≤ r, c ≤ 6", "1 ≤ keyword length ≤ 15", "Uppercase letters only"],
    input_format="First line: r, c and the keyword. Then r lines of c letters.",
    output_format="`FOUND` or `NOT FOUND`.",
    solution='''
import sys
x = sys.stdin.read().split()
r, c, w = int(x[0]), int(x[1]), x[2]
g = [list(x[3 + i]) for i in range(r)]
def dfs(i, j, k):
    if g[i][j] != w[k]:
        return False
    if k == len(w) - 1:
        return True
    ch, g[i][j] = g[i][j], "#"
    found = any(0 <= a < r and 0 <= b < c and dfs(a, b, k + 1)
                for a, b in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)))
    g[i][j] = ch
    return found
print("FOUND" if any(dfs(i, j, 0) for i in range(r) for j in range(c)) else "NOT FOUND")
''',
    brute='''
import sys
x = sys.stdin.read().split()
r, c, w = int(x[0]), int(x[1]), x[2]
g = [x[3 + i] for i in range(r)]
paths = [((i, j),) for i in range(r) for j in range(c) if g[i][j] == w[0]]
for k in range(1, len(w)):
    nxt = []
    for p in paths:
        i, j = p[-1]
        for a, b in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
            if 0 <= a < r and 0 <= b < c and (a, b) not in p and g[a][b] == w[k]:
                nxt.append(p + ((a, b),))
    paths = nxt
print("FOUND" if paths else "NOT FOUND")
''',
    tests=lambda r: [
        "3 4 ABCCED\nABCE\nSFCS\nADEE", "3 4 SEE\nABCE\nSFCS\nADEE", "3 4 ABCB\nABCE\nSFCS\nADEE", "1 1 A\nA", "2 2 AAAAA\nAA\nAA",
    ] + [
        (lambda a, b: f"{a} {b} {''.join(r.choice('AB') for _ in range(r.randint(1, 6)))}\n" +
         "\n".join("".join(r.choice("AB") for _ in range(b)) for _ in range(a)))(r.randint(1, 4), r.randint(1, 4))
        for _ in range(7)
    ],
)

# ---------------------------------------------------------------- 17
problem(
    slug="signed-budget-ways",
    title="Ways to Sign a Budget",
    difficulty=4,
    category="Dynamic Programming",
    companies=["meta", "google", "amazon"],
    targets=("O(n · S)", "O(S)"),
    description=(
        "Each line item in a budget is either added or subtracted. Given the item amounts and a target net total, "
        "print **how many ways** there are to choose a sign for every item so the total equals the target."
    ),
    constraints=["1 ≤ n ≤ 20", "0 ≤ amount ≤ 1000", "sum of amounts ≤ 1000", "-1000 ≤ target ≤ 1000"],
    input_format="First line: n and target. Second line: n amounts.",
    output_format="The number of ways.",
    solution='''
import sys
x = sys.stdin.read().split()
n, t = int(x[0]), int(x[1])
a = list(map(int, x[2:2 + n]))
ways = {0: 1}
for v in a:
    nxt = {}
    for s, c in ways.items():
        nxt[s + v] = nxt.get(s + v, 0) + c
        nxt[s - v] = nxt.get(s - v, 0) + c
    ways = nxt
print(ways.get(t, 0))
''',
    brute='''
import sys
from itertools import product
x = sys.stdin.read().split()
n, t = int(x[0]), int(x[1])
a = list(map(int, x[2:2 + n]))
print(sum(1 for signs in product((1, -1), repeat=n) if sum(s * v for s, v in zip(signs, a)) == t))
''',
    tests=lambda r: ["5 3\n1 1 1 1 1", "1 1\n1", "2 0\n0 0", "3 100\n1 2 3"] + [
        (lambda n: f"{n} {r.randint(-6, 6)}\n{ints(r.randint(0, 4) for _ in range(n))}")(r.randint(1, 12)) for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 18
problem(
    slug="sliding-log-rate-limiter",
    title="Sliding-Log Rate Limiter",
    difficulty=3,
    category="Queues & Simulation",
    companies=["stripe", "amazon", "google"],
    targets=("O(n)", "O(k)"),
    description=(
        "An API allows at most `k` **accepted** requests in any window of `w` seconds: a request at time `t` is accepted "
        "if fewer than `k` accepted requests have times in `(t − w, t]`. Rejected requests don't count.\n\n"
        "Given request times in non-decreasing order, print `1` for each accepted request and `0` for each rejected one."
    ),
    constraints=["1 ≤ n ≤ 10^5", "1 ≤ k ≤ n", "1 ≤ w ≤ 10^9"],
    input_format="First line: n, k and w. Second line: n request times.",
    output_format="n digits separated by spaces.",
    solution='''
import sys
from collections import deque
x = sys.stdin.read().split()
n, k, w = int(x[0]), int(x[1]), int(x[2])
log, out = deque(), []
for t in map(int, x[3:3 + n]):
    while log and log[0] <= t - w:
        log.popleft()
    if len(log) < k:
        log.append(t)
        out.append(1)
    else:
        out.append(0)
print(*out)
''',
    brute='''
import sys
x = sys.stdin.read().split()
n, k, w = int(x[0]), int(x[1]), int(x[2])
accepted, out = [], []
for t in map(int, x[3:3 + n]):
    recent = sum(1 for a in accepted if t - w < a <= t)
    if recent < k:
        accepted.append(t)
        out.append(1)
    else:
        out.append(0)
print(*out)
''',
    tests=lambda r: ["6 2 10\n1 2 3 11 12 25", "3 1 1\n5 5 6", "1 1 5\n0"] + [
        (lambda n: f"{n} {r.randint(1, 4)} {r.randint(1, 8)}\n{ints(sorted(r.randint(0, 20) for _ in range(n)))}")(r.randint(1, 20))
        for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 19
problem(
    slug="release-critical-path",
    title="Release Critical Path",
    difficulty=5,
    category="Graphs",
    companies=["microsoft", "amazon", "google"],
    targets=("O(n + m)", "O(n + m)"),
    description=(
        "A release has `n` tasks with known durations and dependencies (task `v` can start only after task `u` "
        "finishes). With unlimited engineers working in parallel, the release takes as long as its critical path.\n\n"
        "The dependencies never form a cycle. Print the **shortest possible release time**."
    ),
    constraints=["1 ≤ n ≤ 10^5", "0 ≤ m ≤ 2·10^5", "1 ≤ duration ≤ 1000"],
    input_format="First line: n and m. Second line: n durations. Then m lines `u v` (0-indexed).",
    output_format="The minimum total time.",
    solution='''
import sys
from collections import deque
x = sys.stdin.read().split()
n, m = int(x[0]), int(x[1])
dur = list(map(int, x[2:2 + n]))
g = [[] for _ in range(n)]
indeg = [0] * n
for i in range(m):
    u, v = int(x[2 + n + 2 * i]), int(x[3 + n + 2 * i])
    g[u].append(v)
    indeg[v] += 1
finish = dur[:]
q = deque(i for i in range(n) if indeg[i] == 0)
while q:
    u = q.popleft()
    for v in g[u]:
        finish[v] = max(finish[v], finish[u] + dur[v])
        indeg[v] -= 1
        if indeg[v] == 0:
            q.append(v)
print(max(finish))
''',
    brute='''
import sys
x = sys.stdin.read().split()
n, m = int(x[0]), int(x[1])
dur = list(map(int, x[2:2 + n]))
preds = [[] for _ in range(n)]
for i in range(m):
    u, v = int(x[2 + n + 2 * i]), int(x[3 + n + 2 * i])
    preds[v].append(u)
def finish(v):
    return dur[v] + max((finish(u) for u in preds[v]), default=0)
print(max(finish(v) for v in range(n)))
''',
    tests=lambda r: ["4 4\n3 2 4 1\n0 1\n0 2\n1 3\n2 3", "1 0\n5", "3 0\n1 9 2", "3 2\n1 1 1\n0 1\n1 2"] + [
        (lambda n: (lambda es: f"{n} {len(es)}\n{ints(r.randint(1, 9) for _ in range(n))}" + "".join(f"\n{u} {v}" for u, v in es))(
            sorted({(a, b) for a, b in (sorted(r.sample(range(n), 2)) for _ in range(r.randint(0, 2 * n)))}) if n > 1 else []
        ))(r.randint(1, 10)) for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 20
problem(
    slug="distinct-search-tree-shapes",
    title="Distinct Index Tree Shapes",
    difficulty=4,
    category="Dynamic Programming",
    companies=["amazon", "google", "apple"],
    targets=("O(n²)", "O(n)"),
    description=(
        "An index stores the keys 1..n in a binary search tree. Different insertion orders can produce different tree "
        "shapes.\n\nPrint how many **structurally different** binary search trees hold exactly the keys 1..n."
    ),
    constraints=["1 ≤ n ≤ 35"],
    input_format="A single integer n.",
    output_format="The number of distinct trees.",
    solution='''
import sys
n = int(sys.stdin.read().split()[0])
t = [1] + [0] * n
for k in range(1, n + 1):
    t[k] = sum(t[i] * t[k - 1 - i] for i in range(k))
print(t[n])
''',
    brute='''
import sys
from functools import lru_cache
n = int(sys.stdin.read().split()[0])
@lru_cache(None)
def shapes(lo, hi):
    if lo > hi:
        return 1
    return sum(shapes(lo, root - 1) * shapes(root + 1, hi) for root in range(lo, hi + 1))
print(shapes(1, n))
''',
    tests=lambda r: ["1", "2", "3", "5", "10", "19", "35"] + [str(r.randint(1, 30)) for _ in range(5)],
)

# ---------------------------------------------------------------- 21
problem(
    slug="out-of-order-deliveries",
    title="Count Out-of-Order Deliveries",
    difficulty=5,
    category="Divide & Conquer",
    companies=["google", "amazon", "microsoft"],
    targets=("O(n log n)", "O(n)"),
    description=(
        "Parcels were numbered in dispatch order but arrived in some other order. A pair of parcels is out of order "
        "when the one that arrived earlier has the larger number.\n\n"
        "Given the arrival sequence, print the number of out-of-order pairs."
    ),
    constraints=["1 ≤ n ≤ 10^5", "-10^9 ≤ value ≤ 10^9"],
    input_format="First line: n. Second line: n integers in arrival order.",
    output_format="The number of pairs i < j with a[i] > a[j].",
    solution='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
a = list(map(int, x[1:1 + n]))
def sort_count(v):
    if len(v) < 2:
        return v, 0
    mid = len(v) // 2
    left, cl = sort_count(v[:mid])
    right, cr = sort_count(v[mid:])
    merged, i, j, c = [], 0, 0, cl + cr
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            c += len(left) - i
            j += 1
    merged += left[i:] + right[j:]
    return merged, c
print(sort_count(a)[1])
''',
    brute='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
a = list(map(int, x[1:1 + n]))
print(sum(1 for i in range(n) for j in range(i + 1, n) if a[i] > a[j]))
''',
    tests=lambda r: ["5\n2 4 1 3 5", "5\n5 4 3 2 1", "1\n7", "4\n1 1 1 1"] + [
        (lambda n: f"{n}\n{ints(r.randint(-10, 10) for _ in range(n))}")(r.randint(1, 40)) for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 22
problem(
    slug="next-release-version",
    title="Next Build Permutation",
    difficulty=4,
    category="Arrays & Two Pointers",
    companies=["google", "meta", "microsoft"],
    targets=("O(n)", "O(1)"),
    description=(
        "Build IDs are sequences of digits, and builds are numbered through every arrangement of the same digits in "
        "lexicographic order.\n\nGiven a build ID, print the **next** arrangement in that order; after the largest "
        "arrangement, wrap round to the smallest."
    ),
    constraints=["1 ≤ n ≤ 10^5", "0 ≤ digit ≤ 9"],
    input_format="First line: n. Second line: n digits separated by spaces.",
    output_format="The next arrangement, as n digits separated by spaces.",
    solution='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
a = list(map(int, x[1:1 + n]))
i = n - 2
while i >= 0 and a[i] >= a[i + 1]:
    i -= 1
if i >= 0:
    j = n - 1
    while a[j] <= a[i]:
        j -= 1
    a[i], a[j] = a[j], a[i]
a[i + 1:] = reversed(a[i + 1:])
print(*a)
''',
    brute='''
import sys
from itertools import permutations
x = sys.stdin.read().split()
n = int(x[0])
a = tuple(map(int, x[1:1 + n]))
perms = sorted(set(permutations(a)))
k = perms.index(a)
print(*perms[(k + 1) % len(perms)])
''',
    tests=lambda r: ["3\n1 2 3", "3\n3 2 1", "3\n1 1 5", "1\n4", "4\n1 3 2 2"] + [
        (lambda n: f"{n}\n{ints(r.randint(0, 3) for _ in range(n))}")(r.randint(1, 7)) for _ in range(7)
    ],
)

# ---------------------------------------------------------------- 23
problem(
    slug="largest-clear-square",
    title="Largest Clear Square on a Floor Plan",
    difficulty=5,
    category="Dynamic Programming",
    companies=["amazon", "apple", "google"],
    targets=("O(r · c)", "O(c)"),
    description=(
        "A floor plan marks each cell as free (`1`) or blocked (`0`). A new server rack needs a square of free cells.\n\n"
        "Print the **area** of the largest all-free square."
    ),
    constraints=["1 ≤ r, c ≤ 300"],
    input_format="First line: r and c. Then r lines of c characters, each `0` or `1`.",
    output_format="The largest square's area.",
    solution='''
import sys
x = sys.stdin.read().split()
r, c = int(x[0]), int(x[1])
grid = x[2:2 + r]
prev = [0] * (c + 1)
best = 0
for i in range(r):
    cur = [0] * (c + 1)
    for j in range(1, c + 1):
        if grid[i][j - 1] == "1":
            cur[j] = 1 + min(prev[j], cur[j - 1], prev[j - 1])
            best = max(best, cur[j])
    prev = cur
print(best * best)
''',
    brute='''
import sys
x = sys.stdin.read().split()
r, c = int(x[0]), int(x[1])
grid = x[2:2 + r]
best = 0
for i in range(r):
    for j in range(c):
        k = 1
        while i + k <= r and j + k <= c and all(grid[a][b] == "1" for a in range(i, i + k) for b in range(j, j + k)):
            best = max(best, k)
            k += 1
print(best * best)
''',
    tests=lambda r: ["4 5\n10100\n10111\n11111\n10010", "2 2\n01\n10", "1 1\n0", "3 3\n111\n111\n111"] + [
        (lambda a, b: f"{a} {b}\n" + "\n".join("".join(r.choice("0111") for _ in range(b)) for _ in range(a)))(r.randint(1, 7), r.randint(1, 7))
        for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 24
problem(
    slug="fewest-relay-hops",
    title="Fewest Relay Hops",
    difficulty=4,
    category="Greedy",
    companies=["amazon", "google", "microsoft"],
    targets=("O(n)", "O(1)"),
    description=(
        "Relay towers stand in a line. From tower `i` a signal can jump forward to any tower up to `reach[i]` positions "
        "ahead.\n\nPrint the **fewest jumps** to get from tower 0 to the last tower, or `-1` if it can't be reached."
    ),
    constraints=["1 ≤ n ≤ 10^5", "0 ≤ reach[i] ≤ 10^5"],
    input_format="First line: n. Second line: n reaches.",
    output_format="The minimum number of jumps, or `-1`.",
    solution='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
a = list(map(int, x[1:1 + n]))
jumps, end, far = 0, 0, 0
ans = 0
for i in range(n - 1):
    if i > far:
        break
    far = max(far, i + a[i])
    if i == end:
        jumps += 1
        end = far
        if end >= n - 1:
            break
if n == 1:
    ans = 0
elif end >= n - 1:
    ans = jumps
else:
    ans = -1
print(ans)
''',
    brute='''
import sys
from collections import deque
x = sys.stdin.read().split()
n = int(x[0])
a = list(map(int, x[1:1 + n]))
dist = [-1] * n
dist[0] = 0
q = deque([0])
while q:
    i = q.popleft()
    for j in range(i + 1, min(n, i + a[i] + 1)):
        if dist[j] < 0:
            dist[j] = dist[i] + 1
            q.append(j)
print(dist[-1])
''',
    tests=lambda r: ["5\n2 3 1 1 4", "5\n3 2 1 0 4", "1\n0", "2\n0 5", "6\n1 1 1 1 1 1"] + [
        (lambda n: f"{n}\n{ints(r.randint(0, 3) for _ in range(n))}")(r.randint(1, 18)) for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 25
problem(
    slug="most-bookable-meetings",
    title="Book the Most Meetings in One Room",
    difficulty=3,
    category="Greedy",
    companies=["google", "microsoft", "meta"],
    targets=("O(n log n)", "O(n)"),
    description=(
        "Requests for a single meeting room each have a start and end time `[s, e)`. A meeting that ends at time t "
        "doesn't clash with one that starts at t.\n\nPrint the **largest number of requests** that can all be booked."
    ),
    constraints=["1 ≤ n ≤ 10^5", "0 ≤ s < e ≤ 10^9"],
    input_format="First line: n. Then n lines `s e`.",
    output_format="The maximum number of non-clashing meetings.",
    solution='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
iv = sorted(((int(x[1 + 2 * i]), int(x[2 + 2 * i])) for i in range(n)), key=lambda p: p[1])
count, last = 0, None
for s, e in iv:
    if last is None or s >= last:
        count += 1
        last = e
print(count)
''',
    brute='''
import sys
from itertools import combinations
x = sys.stdin.read().split()
n = int(x[0])
iv = [(int(x[1 + 2 * i]), int(x[2 + 2 * i])) for i in range(n)]
best = 0
for k in range(n, 0, -1):
    for combo in combinations(sorted(iv), k):
        if all(combo[i][1] <= combo[i + 1][0] for i in range(k - 1)):
            best = k
            break
    if best:
        break
print(best)
''',
    tests=lambda r: ["4\n1 2\n2 3\n3 4\n1 3", "3\n1 2\n1 2\n1 2", "1\n0 5", "3\n0 10\n1 2\n3 4"] + [
        (lambda n: f"{n}" + "".join((lambda s: f"\n{s} {s + r.randint(1, 5)}")(r.randint(0, 15)) for _ in range(n)))(r.randint(1, 10))
        for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 26
problem(
    slug="best-circular-revenue-run",
    title="Best Revenue Run on a Circular Calendar",
    difficulty=5,
    category="Dynamic Programming",
    companies=["amazon", "google", "netflix"],
    targets=("O(n)", "O(1)"),
    description=(
        "Daily net revenue for a repeating weekly-style cycle is given; the cycle wraps round, so the last day is followed "
        "by the first.\n\nPrint the **largest total** of any non-empty run of consecutive days (each day used at most once)."
    ),
    constraints=["1 ≤ n ≤ 10^5", "-10^4 ≤ value ≤ 10^4"],
    input_format="First line: n. Second line: n integers.",
    output_format="The maximum circular subarray sum.",
    solution='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
a = list(map(int, x[1:1 + n]))
best_max = cur_max = best_min = cur_min = a[0]
for v in a[1:]:
    cur_max = max(v, cur_max + v)
    best_max = max(best_max, cur_max)
    cur_min = min(v, cur_min + v)
    best_min = min(best_min, cur_min)
total = sum(a)
print(best_max if best_max < 0 else max(best_max, total - best_min))
''',
    brute='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
a = list(map(int, x[1:1 + n]))
print(max(sum(a[(i + k) % n] for k in range(length)) for i in range(n) for length in range(1, n + 1)))
''',
    tests=lambda r: ["4\n1 -2 3 -2", "3\n5 -3 5", "3\n-3 -2 -3", "1\n-7"] + [
        (lambda n: f"{n}\n{ints(r.randint(-8, 8) for _ in range(n))}")(r.randint(1, 16)) for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 27
problem(
    slug="integer-square-root",
    title="Integer Square Root Without a Math Library",
    difficulty=2,
    category="Binary Search",
    companies=["apple", "microsoft", "amazon"],
    targets=("O(log x)", "O(1)"),
    description=(
        "An embedded controller has no floating point. Given a non-negative integer `x`, print the largest integer `r` "
        "with `r · r ≤ x`."
    ),
    constraints=["0 ≤ x ≤ 10^18"],
    input_format="A single integer x.",
    output_format="floor(√x).",
    solution='''
import sys
v = int(sys.stdin.read().split()[0])
lo, hi = 0, 10 ** 9 + 1
while lo < hi:
    mid = (lo + hi + 1) // 2
    if mid * mid <= v:
        lo = mid
    else:
        hi = mid - 1
print(lo)
''',
    brute='''
import sys
v = int(sys.stdin.read().split()[0])
r = 0
while (r + 1) * (r + 1) <= v:
    r += 1
print(r)
''',
    tests=lambda r: ["0", "1", "8", "16", "2147395599"] + [str(r.randint(0, 10 ** 8)) for _ in range(5)] + [str(r.randint(1, 3000) ** 2 - r.randint(0, 1)) for _ in range(2)],
)

# ---------------------------------------------------------------- 28
problem(
    slug="trading-with-cooldown",
    title="Trading With a Cooldown Day",
    difficulty=5,
    category="Dynamic Programming",
    companies=["google", "amazon", "meta"],
    targets=("O(n)", "O(1)"),
    description=(
        "Given a share's daily prices, you may buy and sell as many times as you like, holding at most one share at a "
        "time. After selling, you must wait **one full day** before buying again.\n\nPrint the maximum profit."
    ),
    constraints=["1 ≤ n ≤ 10^5", "0 ≤ price ≤ 10^4"],
    input_format="First line: n. Second line: n prices.",
    output_format="The maximum profit.",
    solution='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
p = list(map(int, x[1:1 + n]))
hold, sold, rest = -p[0], 0, 0
for v in p[1:]:
    hold, sold, rest = max(hold, rest - v), hold + v, max(rest, sold)
print(max(sold, rest))
''',
    brute='''
import sys
from functools import lru_cache
x = sys.stdin.read().split()
n = int(x[0])
p = list(map(int, x[1:1 + n]))
@lru_cache(None)
def f(i, holding):
    if i >= n:
        return 0
    if holding:
        return max(f(i + 1, True), p[i] + f(i + 2, False))
    return max(f(i + 1, False), -p[i] + f(i + 1, True))
print(f(0, False))
''',
    tests=lambda r: ["5\n1 2 3 0 2", "1\n1", "3\n3 2 1", "4\n1 4 2 7"] + [
        (lambda n: f"{n}\n{ints(r.randint(0, 9) for _ in range(n))}")(r.randint(1, 16)) for _ in range(8)
    ],
)

# ---------------------------------------------------------------- 29
problem(
    slug="nearest-exit-distances",
    title="Distance to the Nearest Exit",
    difficulty=5,
    category="Graphs & BFS",
    companies=["amazon", "microsoft", "google"],
    targets=("O(r · c)", "O(r · c)"),
    description=(
        "A building floor is a grid where `0` marks an exit and `1` a walkable cell; people move up, down, left or "
        "right. There is at least one exit.\n\nFor every cell, print the number of steps to the **nearest exit**."
    ),
    constraints=["1 ≤ r, c ≤ 300", "At least one exit"],
    input_format="First line: r and c. Then r lines of c characters, each `0` or `1`.",
    output_format="r lines of c integers: the distance for each cell.",
    solution='''
import sys
from collections import deque
x = sys.stdin.read().split()
r, c = int(x[0]), int(x[1])
g = x[2:2 + r]
dist = [[-1] * c for _ in range(r)]
q = deque()
for i in range(r):
    for j in range(c):
        if g[i][j] == "0":
            dist[i][j] = 0
            q.append((i, j))
while q:
    i, j = q.popleft()
    for a, b in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
        if 0 <= a < r and 0 <= b < c and dist[a][b] < 0:
            dist[a][b] = dist[i][j] + 1
            q.append((a, b))
print("\\n".join(" ".join(map(str, row)) for row in dist))
''',
    brute='''
import sys
x = sys.stdin.read().split()
r, c = int(x[0]), int(x[1])
g = x[2:2 + r]
exits = [(i, j) for i in range(r) for j in range(c) if g[i][j] == "0"]
rows = [" ".join(str(min(abs(i - a) + abs(j - b) for a, b in exits)) for j in range(c)) for i in range(r)]
print("\\n".join(rows))
''',
    tests=lambda r: ["3 3\n000\n010\n111", "1 1\n0", "2 3\n111\n110"] + [
        (lambda a, b: (lambda rows: f"{a} {b}\n" + "\n".join(rows))(
            (lambda rows: rows if any("0" in row for row in rows) else ["0" + rows[0][1:]] + rows[1:])(
                ["".join(r.choice("0111") for _ in range(b)) for _ in range(a)])
        ))(r.randint(1, 6), r.randint(1, 6)) for _ in range(9)
    ],
)

# ---------------------------------------------------------------- 30
problem(
    slug="postfix-metric-evaluator",
    title="Postfix Metric Formula Evaluator",
    difficulty=2,
    category="Stacks",
    companies=["microsoft", "amazon", "apple"],
    targets=("O(n)", "O(n)"),
    description=(
        "A monitoring tool stores alert formulas in postfix (reverse Polish) notation, like `3 4 + 2 *`.\n\n"
        "Evaluate the formula and print the result. Operators are `+`, `-`, `*` and `/`; division truncates toward "
        "zero. The formula is always valid and never divides by zero."
    ),
    constraints=["1 ≤ tokens ≤ 10^4", "Intermediate values fit in 32-bit signed integers"],
    input_format="First line: n. Second line: n tokens.",
    output_format="The formula's value.",
    solution='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
st = []
for tok in x[1:1 + n]:
    if tok in "+-*/" and len(tok) == 1:
        b, a = st.pop(), st.pop()
        if tok == "+":
            st.append(a + b)
        elif tok == "-":
            st.append(a - b)
        elif tok == "*":
            st.append(a * b)
        else:
            q = abs(a) // abs(b)
            st.append(q if (a >= 0) == (b >= 0) else -q)
    else:
        st.append(int(tok))
print(st[-1])
''',
    brute='''
import sys
x = sys.stdin.read().split()
n = int(x[0])
toks = x[1:1 + n]
def evaluate(i):
    tok = toks[i]
    if tok in ("+", "-", "*", "/"):
        b, i = evaluate(i - 1)
        a, i = evaluate(i)
        if tok == "+":
            return a + b, i
        if tok == "-":
            return a - b, i
        if tok == "*":
            return a * b, i
        return int(a / b), i
    return int(tok), i - 1
print(evaluate(n - 1)[0])
''',
    tests=lambda r: ["5\n3 4 + 2 *", "5\n4 13 5 / +", "13\n10 6 9 3 + -11 * / * 17 + 5 +", "1\n-7", "3\n-7 2 /"] + [
        (lambda k: (lambda toks: f"{len(toks)}\n{' '.join(toks)}")(
            (lambda build: build(build, k))(lambda self, d: [str(r.randint(-9, 9))] if d == 0 else
                                            self(self, d - 1) + [str(r.randint(1, 9))] + [r.choice("+-*")])
        ))(r.randint(0, 5)) for _ in range(7)
    ],
)
