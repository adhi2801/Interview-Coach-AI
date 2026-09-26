// frontend/src/pages/landing/content.jsx
//
// Landing page content, unchanged from the original page: real sample
// scenarios, the company profiles, the 93-topic knowledge graph example and
// the architecture notes. Kept separate from layout so the page design can
// change without touching the copy.

import React from "react";

export const IDE_SNIPPETS = {
  'Python': (
    <div className="text-slate-300 font-mono text-xs leading-relaxed">
      <span className="text-indigo-400">import</span> redis, time<br /><br />
      <span className="text-indigo-400">def</span> <span className="text-blue-300">rate_limiter</span>(user_id: str, capacity: int, window: int) -&gt; <span className="text-indigo-400">bool</span>:<br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe = redis.pipeline()<br />
      &nbsp;&nbsp;&nbsp;&nbsp;now = time.time()<br />
      &nbsp;&nbsp;&nbsp;&nbsp;key = <span className="text-emerald-400">f"rate:&#123;user_id&#125;"</span><br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zadd(key, &#123;now: now&#125;)<br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zremrangebyscore(key, 0, now - window)<br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zcard(key)<br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.expire(key, window)<br />
      &nbsp;&nbsp;&nbsp;&nbsp;results = pipe.execute()<br />
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">return</span> results[2] &lt;= capacity<br />
    </div>
  ),
  'JavaScript': (
    <div className="text-slate-300 font-mono text-xs leading-relaxed">
      <span className="text-indigo-400">import</span> Redis <span className="text-indigo-400">from</span> <span className="text-emerald-400">'ioredis'</span>;<br /><br />
      <span className="text-indigo-400">async function</span> <span className="text-blue-300">rateLimiter</span>(userId, capacity, windowSecs) &#123;<br />
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">const</span> now = Date.now();<br />
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">const</span> key = <span className="text-emerald-400">`rate:$&#123;userId&#125;`</span>;<br />
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">const</span> pipe = redis.pipeline();<br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zadd(key, now, now);<br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zremrangebyscore(key, 0, now - (windowSecs * 1000));<br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zcard(key);<br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.expire(key, windowSecs);<br />
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">const</span> results = <span className="text-indigo-400">await</span> pipe.exec();<br />
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">return</span> results[2][1] &lt;= capacity;<br />
      &#125;<br />
    </div>
  ),
  'C++': (
    <div className="text-slate-300 font-mono text-xs leading-relaxed">
      <span className="text-indigo-400">#include</span> <span className="text-emerald-400">&lt;sw/redis++/redis++.h&gt;</span><br /><br />
      <span className="text-indigo-400">bool</span> <span className="text-blue-300">rateLimiter</span>(<span className="text-indigo-400">const</span> std::string&amp; userId, <span className="text-indigo-400">int</span> capacity, <span className="text-indigo-400">int</span> window) &#123;<br />
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">auto</span> now = std::chrono::system_clock::now().time_since_epoch().count();<br />
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">auto</span> key = <span className="text-emerald-400">"rate:"</span> + userId;<br />
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">auto</span> pipe = redis.pipeline();<br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zadd(key, std::to_string(now), now);<br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zremrangebyscore(key, 0, now - window);<br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zcard(key);<br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.expire(key, window);<br />
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">auto</span> replies = pipe.exec();<br />
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">return</span> replies.get&lt;<span className="text-indigo-400">long long</span>&gt;(2) &lt;= capacity;<br />
      &#125;<br />
    </div>
  ),
  'Java': (
    <div className="text-slate-300 font-mono text-xs leading-relaxed">
      <span className="text-indigo-400">import</span> redis.clients.jedis.Jedis;<br />
      <span className="text-indigo-400">import</span> redis.clients.jedis.Pipeline;<br /><br />
      <span className="text-indigo-400">public boolean</span> <span className="text-blue-300">rateLimiter</span>(String userId, <span className="text-indigo-400">int</span> capacity, <span className="text-indigo-400">int</span> window) &#123;<br />
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">long</span> now = System.currentTimeMillis();<br />
      &nbsp;&nbsp;&nbsp;&nbsp;String key = <span className="text-emerald-400">"rate:"</span> + userId;<br />
      &nbsp;&nbsp;&nbsp;&nbsp;Pipeline pipe = jedis.pipelined();<br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zadd(key, now, String.valueOf(now));<br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zremrangeByScore(key, 0, now - (window * 1000));<br />
      &nbsp;&nbsp;&nbsp;&nbsp;Response&lt;Long&gt; count = pipe.zcard(key);<br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.expire(key, window);<br />
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.sync();<br />
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">return</span> count.get() &lt;= capacity;<br />
      &#125;<br />
    </div>
  )
};

export const DEMO_KEYS = ['google', 'meta', 'amazon', 'microsoft', 'apple', 'netflix', 'startup'];

export const LIVE_DEMO_QUESTIONS = {
  google: "Design a globally distributed rate limiter capable of handling 100M+ RPS burst traffic across 5 continents. Walk through your token bucket implementation and how you'd handle consistency under regional partition.",
  meta: "We are launching a new real-time reaction feature for Instagram Live Video. You need to support 2 billion concurrent connections. Design the real-time fanout architecture.",
  amazon: "You are architecting the checkout service for Prime Day. Traffic is expected to spike to 500k RPS in the first minute of the sale. Explain how you'd ensure no customer carts are lost during a regional outage.",
  microsoft: "We are redesigning the real-time collaborative document editor for Word Online to support enterprise compliance standards. Walk through your conflict resolution strategy for offline edits.",
  apple: "You need to architect a secure, zero-trust telemetry sync across millions of on-device secure enclaves, with no plaintext data ever leaving the device.",
  netflix: "You are designing Netflix's multi-region video streaming CDN topology with active-active chaos resiliency. If US-EAST-1 goes dark, how does traffic reroute automatically?",
  startup: "You're the only backend engineer. Design a multi-tenant SaaS billing system — subscriptions, usage metering, payment integration, and idempotent payment retries — that you can ship in two weeks."
};

export const SCORE_DIMENSIONS = [
  { label: 'Technical Accuracy', color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' },
  { label: 'Problem Solving', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  { label: 'Communication', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  { label: 'Culture Fit', color: 'text-pink-300 bg-pink-500/10 border-pink-500/20' },
  { label: 'Confidence', color: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
];

// Mirrors the real InterviewRoom's actual fields — category tag, context,
// constraints, ask — rather than inventing a separate landing-page-only
// shape. No score/telemetry data here on purpose: a real session never
// shows scores before an answer is submitted, so this preview doesn't either.
export const COMPANY_SIM_DATA = {
  google: {
    badge: "GOOGLE",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    role: "Distributed Systems Eng · L5",
    persona: "Socratic",
    category: "System Design",
    context: "You are designing a globally distributed rate limiter capable of handling 100 million RPS burst traffic across 5 continents.",
    constraints: [
      "Must enforce strict global consistency within a 10ms P99 latency SLA",
      "Cannot use more than O(k) auxiliary memory per node",
      "Must handle network partitions without dropping legitimate requests",
    ],
    ask: "Walk us through your high-level architecture and explain exactly how you would synchronize the token buckets across regions."
  },
  meta: {
    badge: "META",
    badgeColor: "bg-blue-600/10 text-blue-300 border-blue-600/20",
    role: "Infrastructure Eng · L5",
    persona: "Standard",
    category: "System Design",
    context: "We are launching a new real-time reaction feature for Instagram Live Video. You need to support 2 billion concurrent connections.",
    constraints: [
      "Latency from publisher to viewer must be under 50ms global sync",
      "Optimize for speed and rapid prototyping",
      "Handle extreme fan-out bottlenecks efficiently",
    ],
    ask: "Design the real-time fanout architecture. Where do you put the bottlenecks, and how do you shard the websocket connections?"
  },
  amazon: {
    badge: "AMAZON",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    role: "Backend Engineer · L5",
    persona: "Hostile",
    category: "System Design",
    context: "You are architecting the checkout service for Prime Day. Traffic is expected to spike to 500k RPS in the first minute of the sale.",
    constraints: [
      "Prioritize high availability over strict consistency",
      "Must degrade gracefully if the inventory service goes down",
      "Apply the 'Bias for Action' leadership principle to your MVP",
    ],
    ask: "Explain how you would ensure no customer carts are lost during a massive AWS regional outage."
  },
  microsoft: {
    badge: "MICROSOFT",
    badgeColor: "bg-sky-500/10 text-sky-300 border-sky-500/20",
    role: "Systems Architect · L5",
    persona: "Exhausted",
    category: "System Design",
    context: "We are redesigning the real-time collaborative document editor for Word Online to support enterprise compliance standards.",
    constraints: [
      "Must use Operational Transformation (OT) or CRDTs for conflict resolution",
      "Strict backward compatibility with legacy Office formats",
      "Ensure zero data loss during simultaneous multi-user edits",
    ],
    ask: "Walk me through your conflict resolution strategy when two offline users reconnect and sync conflicting paragraphs simultaneously."
  },
  apple: {
    badge: "APPLE",
    badgeColor: "bg-slate-400/10 text-slate-300 border-slate-400/20",
    role: "Low-Level Engineer · L5",
    persona: "Standard",
    category: "Security",
    context: "You need to architect a secure, zero-trust telemetry sync across millions of on-device secure enclaves.",
    constraints: [
      "User privacy is absolute; no plaintext data leaves the device",
      "Cannot exceed 50MB of memory allocation per background daemon",
      "Must achieve zero latency jitter during syncs",
    ],
    ask: "Detail your approach to local data aggregation and how you would construct the encrypted payload for the cloud handshake."
  },
  netflix: {
    badge: "NETFLIX",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    role: "SRE / Cloud Architect · L5",
    persona: "Socratic",
    category: "System Design",
    context: "You are designing Netflix's multi-region video streaming CDN topology with active-active chaos resiliency.",
    constraints: [
      "Must support Tbps global streaming with < 5ms CDN edge latency",
      "Embrace Chaos Engineering; assume any AWS region can vanish instantly",
      "Require zero manual intervention during a failover event",
    ],
    ask: "If US-EAST-1 completely goes dark, exactly how does your DNS routing and edge caching layer automatically reroute 50 million active streams?"
  },
  startup: {
    badge: "STARTUP",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    role: "Founding Engineer · Tech Lead",
    persona: "Standard",
    category: "Machine Learning",
    context: "You are three days before a product launch and your fraud-detection classification model has shown a precision drop.",
    constraints: [
      "Cannot exceed quarterly GPU compute budget, ruling out a full retrain",
      "Launch date cannot move due to partner SLAs",
      "Must communicate the issue and mitigation to non-technical founders",
    ],
    ask: "Walk us through exactly how you would deliver this precision regression finding to your stakeholders under deadline pressure."
  }
};

// Approximate bands, mapped from the real backend ROLE_ELO_BANDS by
// seniority tier — these landing-page role titles don't have exact
// matches in ROLE_ELO_BANDS (which is keyed to the actual /roles
// dropdown values), so this is a best-fit approximation by level,
// not a precise per-role lookup. Labeled "Approx." in the UI for
// that reason.
// Approximate bands, mapped from the real backend ROLE_ELO_BANDS by
// seniority level number (e.g. "L5" → the Staff Band, 1200–1399) — a
// consistent rule applied to every role below that has an explicit
// level. "startup" is intentionally null: the Founding Engineer role
// has no L-number, so there's nothing for this rule to map from —
// showing a number there would be invented, not derived.
export const SIM_ELO_BANDS = {
  google: "1200–1399",
  meta: "1200–1399",
  amazon: "1200–1399",
  microsoft: "1400–1599",
  apple: "1200–1399",
  netflix: "1200–1399",
  startup: null,
};


export const ARCHITECTURE_CARDS = [
  { title: "FastAPI Backend", desc: "Async Python API handling session orchestration, ELO computation, and the scoring pipeline.", tag: "Python", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { title: "Claude — Question & Scoring", desc: "Claude generates every scenario, Socratic follow-up, and 5-dimension score.", tag: "Claude API", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { title: "Custom RAG & Graph", desc: "Cosine similarity retrieval runs in-process in Python against PostgreSQL — no vector database.", tag: "PostgreSQL + cosine similarity", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  { title: "Judge0 Execution", desc: "Coding problems are generated, then actually executed against hidden test cases in an isolated sandbox before being trusted.", tag: "Judge0 CE", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  { title: "Voice Telemetry", desc: "Audio streams over WebSockets for pace, filler-word, and hesitation detection.", tag: "WebSockets", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { title: "Auth & Security", desc: "Sessions, ELO history, and profiles stored per-user. JWT tokens, bcrypt password hashing.", tag: "JWT + bcrypt", color: "text-slate-300 bg-white/5 border-white/10" }
];

// The 93 topics of the real prerequisite graph, exactly as seeded by
// backend/seed_topics.py (names and categories). Statuses are illustrative
// example data for the landing page, not a real user's progress.
export const KNOWLEDGE_CATEGORIES = [
  {
    title: 'Foundations',
    nodes: [
      { name: 'Control Flow', status: 'passed' }, { name: 'Functions', status: 'passed' }, { name: 'Variables & Types', status: 'passed' },
      { name: 'Complexity Analysis', status: 'passed' }, { name: 'Pointers & References', status: 'passed' }, { name: 'Recursion', status: 'passed' },
    ]
  },
  {
    title: 'Data Structures',
    nodes: [
      { name: 'Arrays', status: 'passed' }, { name: 'Queues', status: 'passed' }, { name: 'Stacks', status: 'passed' },
      { name: 'Linked Lists', status: 'passed' }, { name: 'Binary Trees', status: 'passed' }, { name: 'Hash Maps', status: 'passed' },
      { name: 'Binary Search Trees', status: 'passed' }, { name: 'Graphs', status: 'passed' }, { name: 'Heaps', status: 'passed' },
      { name: 'Priority Queue', status: 'passed' }, { name: 'Tries', status: 'passed' }, { name: 'Union Find', status: 'passed' },
      { name: 'Balanced Trees', status: 'locked' }, { name: 'Segment Trees', status: 'locked' },
    ]
  },
  {
    title: 'Algorithms',
    nodes: [
      { name: 'Binary Search', status: 'passed' }, { name: 'Sorting', status: 'passed' }, { name: 'Two Pointers', status: 'passed' },
      { name: 'Bit Manipulation', status: 'gap' }, { name: 'Hashing', status: 'passed' }, { name: 'Sliding Window', status: 'gap' },
      { name: 'Graph Traversal', status: 'passed' }, { name: 'Greedy Algorithms', status: 'passed' }, { name: 'Backtracking', status: 'gap' },
      { name: 'Topological Sort', status: 'passed' }, { name: 'Dijkstra', status: 'locked' }, { name: 'Dynamic Programming', status: 'gap' },
    ]
  },
  {
    title: 'System Design',
    nodes: [
      { name: 'Caching', status: 'passed' }, { name: 'API Gateway', status: 'passed' }, { name: 'CDN', status: 'passed' },
      { name: 'Message Queues', status: 'gap' }, { name: 'Rate Limiting', status: 'passed' }, { name: 'Event-Driven Architecture', status: 'locked' },
      { name: 'Microservices', status: 'locked' }, { name: 'Scalability', status: 'locked' }, { name: 'Consistency Models', status: 'gap' },
      { name: 'Disaster Recovery', status: 'locked' }, { name: 'Distributed Systems', status: 'gap' }, { name: 'Consensus', status: 'locked' },
    ]
  },
  {
    title: 'Databases',
    nodes: [
      { name: 'SQL', status: 'passed' }, { name: 'Indexing', status: 'gap' }, { name: 'Normalization', status: 'passed' },
      { name: 'NoSQL', status: 'passed' }, { name: 'Transactions', status: 'gap' }, { name: 'Replication', status: 'locked' },
      { name: 'Sharding', status: 'locked' },
    ]
  },
  {
    title: 'Networking',
    nodes: [
      { name: 'DNS', status: 'passed' }, { name: 'Networking', status: 'passed' }, { name: 'REST APIs', status: 'passed' },
      { name: 'Load Balancing', status: 'gap' }, { name: 'WebSockets', status: 'passed' }, { name: 'gRPC', status: 'locked' },
    ]
  },
  {
    title: 'Operating Systems',
    nodes: [
      { name: 'Processes & Threads', status: 'locked' }, { name: 'Concurrency', status: 'locked' }, { name: 'Locks', status: 'gap' },
      { name: 'Memory Management', status: 'gap' }, { name: 'Scheduling', status: 'passed' }, { name: 'Virtual Memory', status: 'locked' },
    ]
  },
  {
    title: 'Security',
    nodes: [
      { name: 'SQL Injection', status: 'passed' }, { name: 'Authentication', status: 'passed' }, { name: 'Authorization', status: 'passed' },
      { name: 'JWT Tokens', status: 'passed' }, { name: 'Encryption', status: 'passed' }, { name: 'OAuth', status: 'passed' },
    ]
  },
  {
    title: 'Software Design',
    nodes: [
      { name: 'OOP', status: 'passed' }, { name: 'SOLID Principles', status: 'passed' }, { name: 'Dependency Injection', status: 'passed' },
      { name: 'Design Patterns', status: 'passed' },
    ]
  },
  {
    title: 'Machine Learning',
    nodes: [
      { name: 'Calculus', status: 'locked' }, { name: 'Linear Algebra', status: 'locked' }, { name: 'Statistics', status: 'locked' },
      { name: 'ML Basics', status: 'locked' }, { name: 'Model Evaluation', status: 'locked' }, { name: 'Overfitting', status: 'locked' },
      { name: 'Embeddings', status: 'locked' }, { name: 'Gradient Descent', status: 'locked' }, { name: 'Neural Networks', status: 'locked' },
      { name: 'Attention Mechanism', status: 'locked' }, { name: 'CNNs', status: 'locked' }, { name: 'RNNs', status: 'locked' },
      { name: 'Transformers', status: 'locked' },
    ]
  },
  {
    title: 'Behavioral',
    nodes: [
      { name: 'Behavioral Storytelling', status: 'passed' }, { name: 'Communication', status: 'passed' }, { name: 'Growth Mindset', status: 'passed' },
      { name: 'Conflict Resolution', status: 'passed' }, { name: 'Ownership', status: 'gap' }, { name: 'Decision Making', status: 'gap' },
      { name: 'Leadership', status: 'passed' },
    ]
  },
];

export const TOTAL_KG_NODES = KNOWLEDGE_CATEGORIES.reduce((sum, cat) => sum + cat.nodes.length, 0);
