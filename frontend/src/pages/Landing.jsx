import React, { useState, useEffect, useRef } from 'react';
import {
  motion, AnimatePresence, useInView, useMotionValue, useTransform,
  useSpring, useScroll, animate
} from 'framer-motion';
import {
  BrainCircuit, Code2, ArrowRight, CheckCircle2,
  Mic, GitBranch, Sparkles, BarChart3, Play
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Shared primitives                                                  */
/* ------------------------------------------------------------------ */

// GlassCard: spotlight-follows-cursor + optional subtle 3D tilt for
// smaller, card-sized interactive elements. Tilt is intentionally left
// off large panels (the simulation/IDE panels) where it would feel
// gimmicky rather than premium.
function GlassCard({ children, className = "", interactive = false, tilt = false, onClick, active = false }) {
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isHovered, setIsHovered] = useState(false);

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const springRx = useSpring(rx, { stiffness: 220, damping: 20 });
  const springRy = useSpring(ry, { stiffness: 220, damping: 20 });

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (tilt) {
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      ry.set(px * 7);
      rx.set(py * -7);
    }
  };

  const handleLeave = () => {
    setIsHovered(false);
    if (tilt) { rx.set(0); ry.set(0); }
  };

  return (
    <motion.div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleLeave}
      whileTap={interactive ? { scale: 0.98 } : {}}
      style={tilt ? { rotateX: springRx, rotateY: springRy, transformPerspective: 900 } : undefined}
      className={`relative rounded-2xl bg-[#050508]/90 border overflow-hidden backdrop-blur-2xl transition-colors duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),_0_20px_40px_-10px_rgba(0,0,0,0.8)] ${
        active ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-white/[0.08] hover:border-white/20'
      } ${interactive ? 'cursor-pointer' : ''} ${className}`}
    >
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.06), transparent 40%)`,
          opacity: isHovered ? 1 : 0
        }}
      />
      <div className="relative z-10 font-sans h-full">{children}</div>
    </motion.div>
  );
}

function AnimatedNumber({ to, decimals = 0, suffix = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Number(v.toFixed(decimals)));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, to, { duration: 1.6, ease: [0.16, 1, 0.3, 1] });
      const unsub = rounded.on("change", setDisplay);
      return () => { controls.stop(); unsub(); };
    }
  }, [isInView, to, count, rounded]);

  return <span ref={ref} className="tabular-nums font-mono">{display}{suffix}</span>;
}

function MetricColumn({ value, label, color = "text-indigo-400" }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="flex flex-col items-center justify-center p-4 bg-[#08080C] border border-white/[0.08] rounded-xl text-center"
    >
      <div className={`text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tighter mb-1 font-mono ${color}`}>{value}</div>
      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest font-mono leading-tight">{label}</div>
    </motion.div>
  );
}

// Shared focus-visible ring for accessibility across interactive elements
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

// Scroll-spy hook for the nav underline indicator
function useScrollSpy(ids) {
  const [activeId, setActiveId] = useState(ids[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: 0 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return activeId;
}

/* ------------------------------------------------------------------ */
/*  Static content                                                     */
/* ------------------------------------------------------------------ */

const IDE_SNIPPETS = {
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

const DEMO_KEYS = ['google', 'meta', 'amazon', 'microsoft', 'apple', 'netflix', 'startup'];

const LIVE_DEMO_QUESTIONS = {
  google: "Design a globally distributed rate limiter capable of handling 100M+ RPS burst traffic across 5 continents. Walk through your token bucket implementation and how you'd handle consistency under regional partition.",
  meta: "We are launching a new real-time reaction feature for Instagram Live Video. You need to support 2 billion concurrent connections. Design the real-time fanout architecture.",
  amazon: "You are architecting the checkout service for Prime Day. Traffic is expected to spike to 500k RPS in the first minute of the sale. Explain how you'd ensure no customer carts are lost during a regional outage.",
  microsoft: "We are redesigning the real-time collaborative document editor for Word Online to support enterprise compliance standards. Walk through your conflict resolution strategy for offline edits.",
  apple: "You need to architect a secure, zero-trust telemetry sync across millions of on-device secure enclaves, with no plaintext data ever leaving the device.",
  netflix: "You are designing Netflix's multi-region video streaming CDN topology with active-active chaos resiliency. If US-EAST-1 goes dark, how does traffic reroute automatically?",
  startup: "You're the only backend engineer. Design a multi-tenant SaaS billing system — subscriptions, usage metering, payment integration, and idempotent payment retries — that you can ship in two weeks."
};

const SCORE_DIMENSIONS = [
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
const COMPANY_SIM_DATA = {
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
const SIM_ELO_BANDS = {
  google: "1200–1399",
  meta: "1200–1399",
  amazon: "1200–1399",
  microsoft: "1400–1599",
  apple: "1200–1399",
  netflix: "1200–1399",
  startup: null,
};

const HOW_STEPS = [
  { icon: BrainCircuit, color: 'indigo', eyebrow: '01 · Configure', title: 'Company DNA & Persona', desc: "Pick Google, Meta, Amazon, or a startup — and set how hostile the interviewer should be." },
  { icon: Mic, color: 'emerald', eyebrow: '02 · Execute', title: 'Voice or Sandboxed IDE', desc: 'Answer out loud with live speech telemetry, or solve it in a real sandboxed code editor.' },
  { icon: BarChart3, color: 'amber', eyebrow: '03 · Diagnose', title: 'ELO & Study Plan', desc: 'Get scored across 5 dimensions and see exactly which prerequisite topic to study next.' }
];

const NAV_ITEMS = [
  { id: 'how', label: 'How It Works' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'live-coding', label: 'Live Coding' },
  { id: 'knowledge', label: 'Knowledge Graph' },
  { id: 'architecture', label: 'Architecture' },
];

const ARCHITECTURE_CARDS = [
  { title: "FastAPI Backend", desc: "Async Python API handling session orchestration, ELO computation, and the scoring pipeline.", tag: "Python", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { title: "Claude — Question & Scoring", desc: "Claude generates every scenario, Socratic follow-up, and 5-dimension score.", tag: "Claude API", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { title: "Custom RAG & Graph", desc: "Cosine similarity retrieval runs in-process in Python against PostgreSQL — no vector database.", tag: "PostgreSQL + cosine similarity", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  { title: "Judge0 Execution", desc: "Coding problems are generated, then actually executed against hidden test cases in an isolated sandbox before being trusted.", tag: "Judge0 CE", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  { title: "Voice Telemetry", desc: "Audio streams over WebSockets for pace, filler-word, and hesitation detection.", tag: "WebSockets", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { title: "Auth & Security", desc: "Sessions, ELO history, and profiles stored per-user. JWT tokens, bcrypt password hashing.", tag: "JWT + bcrypt", color: "text-slate-300 bg-white/5 border-white/10" }
];

// 93 nodes, organized the way the real prerequisite graph is —
// grouped by domain rather than dumped in one flat block. Statuses
// are illustrative example data for this landing page, not a real
// logged-in user's actual progress.
const KNOWLEDGE_CATEGORIES = [
  {
    title: 'Data Structures & Algorithms',
    nodes: [
      { name: 'Arrays', status: 'passed' }, { name: 'Linked Lists', status: 'passed' }, { name: 'Hash Maps', status: 'passed' },
      { name: 'Stacks', status: 'passed' }, { name: 'Queues', status: 'passed' }, { name: 'Binary Trees', status: 'passed' },
      { name: 'Binary Search Trees', status: 'passed' }, { name: 'Heaps', status: 'passed' }, { name: 'Tries', status: 'locked' },
      { name: 'Graphs', status: 'passed' }, { name: 'Graph Traversal', status: 'passed' }, { name: 'Sorting', status: 'passed' },
      { name: 'Binary Search', status: 'passed' }, { name: 'Recursion', status: 'passed' }, { name: 'Backtracking', status: 'gap' },
      { name: 'Dynamic Programming', status: 'gap' }, { name: 'Bit Manipulation', status: 'gap' }, { name: 'Sliding Window', status: 'gap' },
    ]
  },
  {
    title: 'Systems Design',
    nodes: [
      { name: 'Load Balancing', status: 'gap' }, { name: 'Caching', status: 'passed' }, { name: 'CDN', status: 'passed' },
      { name: 'Rate Limiting', status: 'passed' }, { name: 'Message Queues', status: 'gap' }, { name: 'Microservices', status: 'passed' },
      { name: 'Distributed Systems', status: 'gap' }, { name: 'Consensus', status: 'locked' }, { name: 'Sharding', status: 'locked' },
      { name: 'Replication', status: 'locked' }, { name: 'Consistent Hashing', status: 'locked' }, { name: 'API Gateway', status: 'passed' },
      { name: 'Circuit Breakers', status: 'gap' }, { name: 'Event-Driven Arch', status: 'passed' }, { name: 'Pub/Sub', status: 'passed' },
      { name: 'Service Discovery', status: 'locked' }, { name: 'Idempotency', status: 'passed' }, { name: 'Backpressure', status: 'gap' },
    ]
  },
  {
    title: 'Databases',
    nodes: [
      { name: 'SQL', status: 'passed' }, { name: 'NoSQL', status: 'gap' }, { name: 'Indexing', status: 'passed' },
      { name: 'Transactions', status: 'gap' }, { name: 'ACID', status: 'passed' }, { name: 'CAP Theorem', status: 'gap' },
      { name: 'Query Optimization', status: 'passed' }, { name: 'Normalization', status: 'passed' }, { name: 'DB Sharding', status: 'locked' },
      { name: 'Read Replicas', status: 'locked' }, { name: 'Connection Pooling', status: 'passed' }, { name: 'Time-Series DBs', status: 'locked' },
    ]
  },
  {
    title: 'Networking & Web',
    nodes: [
      { name: 'DNS', status: 'passed' }, { name: 'HTTP/HTTPS', status: 'passed' }, { name: 'REST APIs', status: 'passed' },
      { name: 'GraphQL', status: 'gap' }, { name: 'WebSockets', status: 'gap' }, { name: 'gRPC', status: 'gap' },
      { name: 'TCP/UDP', status: 'passed' }, { name: 'TLS/SSL', status: 'gap' }, { name: 'CORS', status: 'passed' },
      { name: 'OAuth', status: 'gap' },
    ]
  },
  {
    title: 'Security',
    nodes: [
      { name: 'Authentication', status: 'passed' }, { name: 'Authorization', status: 'passed' }, { name: 'Encryption', status: 'gap' },
      { name: 'Hashing', status: 'passed' }, { name: 'JWT', status: 'passed' }, { name: 'SQL Injection', status: 'gap' },
      { name: 'XSS Prevention', status: 'gap' }, { name: 'Rate Limit Abuse', status: 'locked' },
    ]
  },
  {
    title: 'Software Design',
    nodes: [
      { name: 'OOP', status: 'passed' }, { name: 'SOLID Principles', status: 'passed' }, { name: 'Design Patterns', status: 'gap' },
      { name: 'Concurrency', status: 'locked' }, { name: 'Multithreading', status: 'locked' }, { name: 'Memory Management', status: 'gap' },
      { name: 'Garbage Collection', status: 'locked' }, { name: 'Immutability', status: 'passed' }, { name: 'Dependency Injection', status: 'passed' },
      { name: 'Testing Strategies', status: 'passed' },
    ]
  },
  {
    title: 'ML & AI Basics',
    nodes: [
      { name: 'ML Fundamentals', status: 'passed' }, { name: 'Neural Networks', status: 'locked' }, { name: 'Overfitting', status: 'passed' },
      { name: 'Feature Engineering', status: 'passed' }, { name: 'Model Evaluation', status: 'gap' }, { name: 'Gradient Descent', status: 'locked' },
      { name: 'Embeddings', status: 'passed' }, { name: 'Vector Search', status: 'gap' },
    ]
  },
  {
    title: 'Behavioral & Communication',
    nodes: [
      { name: 'Communication', status: 'passed' }, { name: 'Leadership', status: 'locked' }, { name: 'Conflict Resolution', status: 'gap' },
      { name: 'Prioritization', status: 'passed' }, { name: 'Estimation', status: 'passed' }, { name: 'Trade-off Analysis', status: 'passed' },
      { name: 'Stakeholder Mgmt', status: 'locked' }, { name: 'Mentorship', status: 'locked' }, { name: 'Postmortems', status: 'gap' },
    ]
  },
];

const TOTAL_KG_NODES = KNOWLEDGE_CATEGORIES.reduce((sum, cat) => sum + cat.nodes.length, 0);

function kgChipClass(status) {
  if (status === 'passed') return 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300';
  if (status === 'gap') return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
  return 'bg-white/[0.03] border-white/10 text-slate-500';
}
function kgDotClass(status) {
  if (status === 'passed') return 'bg-emerald-400';
  if (status === 'gap') return 'bg-amber-400';
  return 'bg-slate-600';
}

/* ------------------------------------------------------------------ */
/*  Motion variants for orchestrated reveals                           */
/* ------------------------------------------------------------------ */

const heroContainer = { hidden: {}, show: { transition: { staggerChildren: 0.11, delayChildren: 0.05 } } };
const heroItem = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } } };
const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const staggerItem = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } };
const kgCategoryContainer = { hidden: {}, show: { transition: { staggerChildren: 0.02 } } };
const kgChip = { hidden: { opacity: 0, y: 6, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25 } } };

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function Landing({ onGetStarted, onSignIn, onNavigatePrivacy, onNavigateTerms }) {
  const [activeTabIDE, setActiveTabIDE] = useState("Python");
  const [personaTarget, setPersonaTarget] = useState("google");
  const [activeTrack, setActiveTrack] = useState("system");

  // Hero "live scenario" typing demo — cycles through real sample questions.
  const [demoIndex, setDemoIndex] = useState(0);
  const [typedText, setTypedText] = useState("");

  const COMPANY_LOGOS = ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix', 'Startup'];
  const sectionIds = NAV_ITEMS.map((n) => n.id);
  const activeSection = useScrollSpy(sectionIds);

  const { scrollYProgress } = useScroll();
  const progressScaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    let charIndex = 0;
    let typeTimer;
    let holdTimer;
    const fullText = LIVE_DEMO_QUESTIONS[DEMO_KEYS[demoIndex]];
    setTypedText("");

    const typeStep = () => {
      charIndex += 1;
      setTypedText(fullText.slice(0, charIndex));
      if (charIndex < fullText.length) {
        typeTimer = setTimeout(typeStep, 14);
      } else {
        holdTimer = setTimeout(() => {
          setDemoIndex((i) => (i + 1) % DEMO_KEYS.length);
        }, 2400);
      }
    };
    typeTimer = setTimeout(typeStep, 200);
    return () => { clearTimeout(typeTimer); clearTimeout(holdTimer); };
  }, [demoIndex]);

  const handleScrollTo = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const currentSim = COMPANY_SIM_DATA[personaTarget];

  return (
    <div className="relative min-h-screen w-full bg-[#000000] overflow-x-hidden font-sans text-slate-200 selection:bg-indigo-500/30 flex flex-col">

      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
        .animate-shimmer { animation: shimmer 2.5s infinite linear; }
        .animate-marquee { animation: marquee 30s linear infinite; display: flex; width: max-content; }
        .mask-edges {
          mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .typing-cursor {
          display: inline-block; width: 2px; height: 1em; background: #6366f1;
          animation: blink 0.8s step-end infinite; vertical-align: text-bottom; margin-left: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee, .typing-cursor, .animate-pulse { animation: none !important; }
        }
      `}</style>

      {/* Scroll progress indicator */}
      <motion.div
        style={{ scaleX: progressScaleX }}
        className="fixed top-0 left-0 right-0 h-[2px] origin-left z-[60] bg-gradient-to-r from-indigo-500 via-blue-400 to-emerald-400"
      />

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[50vw] h-[50vw] bg-indigo-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-blue-900/15 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute top-[40%] left-[-10%] w-[30vw] h-[40vh] bg-emerald-900/5 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#000000]/60 backdrop-blur-2xl border-b border-white/[0.06] transition-all duration-300">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-white text-black flex items-center justify-center rounded-[4px] font-bold text-[10px]">IC</div>
            <span className="font-semibold text-white tracking-tight text-sm">InterviewCoach</span>
            <span className="hidden sm:flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-slate-500 border-l border-white/10 pl-3 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Solo build
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleScrollTo(e, item.id)}
                className={`relative px-3 py-2 rounded-md text-[11px] font-mono font-bold uppercase tracking-widest transition-colors ${FOCUS_RING} ${
                  activeSection === item.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {item.label}
                {activeSection === item.id && (
                  <motion.div
                    layoutId="navUnderline"
                    className="absolute left-3 right-3 -bottom-0.5 h-[2px] bg-emerald-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-6">
            <button onClick={onSignIn} className={`text-xs font-semibold text-slate-300 hover:text-white transition-colors hidden sm:block rounded ${FOCUS_RING}`}>Sign In</button>
            <button onClick={onGetStarted} className={`relative group overflow-hidden bg-white text-black px-5 py-2 rounded-full text-xs font-bold active:scale-95 transition-all flex items-center gap-2 ${FOCUS_RING}`}>
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
              <span className="relative z-10">Start Simulation</span>
              <ArrowRight size={14} className="relative z-10" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-20 flex-1 w-full pt-32 pb-24">

        {/* HERO */}
        <motion.section
          id="hero"
          variants={heroContainer}
          initial="hidden"
          animate="show"
          className="px-6 flex flex-col items-center justify-center text-center max-w-4xl mx-auto mb-16"
        >
          <motion.div variants={heroItem} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px] font-mono font-bold uppercase tracking-widest mb-6 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            100% Free Portfolio Demo &middot; No Credit Card Required
          </motion.div>

          <motion.div variants={heroItem} className="h-[140px] md:h-[180px] lg:h-[190px] flex items-center justify-center w-full relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTrack}
                initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute w-full"
              >
                <h1 className="text-5xl md:text-7xl lg:text-[80px] font-extrabold tracking-tighter text-white leading-[1.05] max-w-4xl mx-auto mb-6">
                  {activeTrack === 'system' ? 'A real interview.' : 'Live execution.'}<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-300 to-emerald-400">
                    {activeTrack === 'system' ? 'Not a practice quiz.' : 'Not a static text box.'}
                  </span>
                </h1>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <motion.p variants={heroItem} className="text-base md:text-xl text-slate-300 max-w-2xl leading-relaxed mb-8 font-medium">
            Adaptive AI interviewer. Real sandboxed code execution. Live speech telemetry. 5 scoring dimensions. Built solo, powered by Claude.
          </motion.p>

          {/* Live sample scenario — signature hero moment */}
          <motion.div variants={heroItem} className="w-full max-w-2xl mb-8">
            <GlassCard className="p-5 text-left">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                    Sample Scenario &middot; {DEMO_KEYS[demoIndex]}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest hidden sm:inline">Rotates automatically</span>
              </div>
              <p className="text-sm text-slate-200 font-medium leading-relaxed font-mono h-[68px] sm:h-[54px] overflow-hidden">
                {typedText}<span className="typing-cursor" />
              </p>
              <div className="flex items-center justify-between flex-wrap gap-3 mt-4 pt-3 border-t border-white/[0.06]">
                <div className="flex flex-wrap gap-1.5">
                  {SCORE_DIMENSIONS.map((dim) => (
                    <span key={dim.label} className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${dim.color}`}>{dim.label}</span>
                  ))}
                </div>
                <button onClick={onGetStarted} className={`text-[11px] font-bold text-indigo-300 hover:text-indigo-200 flex items-center gap-1 rounded ${FOCUS_RING}`}>
                  Answer this <ArrowRight size={11} />
                </button>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={heroItem} className="flex flex-wrap items-center justify-center gap-4 mb-14">
            <button onClick={onGetStarted} className={`relative group overflow-hidden bg-white text-black px-8 py-4 rounded-xl text-sm font-bold active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center gap-2 ${FOCUS_RING}`}>
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
              <Play size={14} className="fill-current" />
              <span>Try Your First Question &mdash; Free Account</span>
            </button>
            <a
              href="https://github.com/adhi2801/Interview-Coach-AI"
              target="_blank"
              rel="noopener noreferrer"
              className={`px-6 py-4 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center gap-2 ${FOCUS_RING}`}
            >
              <GitBranch size={16} /> View Source Code
            </a>
          </motion.div>

          <motion.div variants={heroItem} className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl relative z-20 mx-auto">
            <GlassCard onClick={() => setActiveTrack("system")} active={activeTrack === "system"} interactive tilt className="p-5 text-left">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400"><BrainCircuit size={18} /></div>
                <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Track A</span>
              </div>
              <h3 className="text-base font-bold text-white mb-1">System Design & Architecture</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">High-throughput scenarios, voice telemetry, and rubric-based scoring.</p>
            </GlassCard>

            <GlassCard onClick={() => setActiveTrack("coding")} active={activeTrack === "coding"} interactive tilt className="p-5 text-left">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400"><Code2 size={18} /></div>
                <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Track B</span>
              </div>
              <h3 className="text-base font-bold text-white mb-1">Live Coding IDE Sandbox</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">Monaco editor, 4 runtimes, real sandboxed test execution.</p>
            </GlassCard>
          </motion.div>
        </motion.section>

        {/* HOW IT WORKS */}
        <section id="how" className="px-6 max-w-5xl mx-auto mb-24 border-t border-white/[0.08] pt-16">
          <div className="text-center mb-12">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-2 block">From zero to scored</span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter text-white">Under 5 minutes, start to finish.</h2>
          </div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {HOW_STEPS.map((step, i) => (
              <motion.div key={i} variants={staggerItem}>
                <GlassCard className="p-6 h-full transition-transform duration-300 hover:-translate-y-1">
                  <div className={`w-10 h-10 rounded-xl bg-${step.color}-500/10 border border-${step.color}-500/20 text-${step.color}-400 flex items-center justify-center mb-4`}>
                    <step.icon size={18} />
                  </div>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-widest text-${step.color}-400 block mb-2`}>{step.eyebrow}</span>
                  <h3 className="text-sm font-bold text-white mb-1.5">{step.title}</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">{step.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* LOGOS + HONEST STATS */}
        <section className="relative z-20 py-8 bg-transparent">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-slate-500 text-center mb-8">
              Simulating technical evaluation standards for
            </p>
            <div className="overflow-hidden w-full max-w-5xl mx-auto mb-16 mask-edges">
              <div className="flex gap-16 w-max animate-marquee opacity-60">
                {[...COMPANY_LOGOS, ...COMPANY_LOGOS, ...COMPANY_LOGOS].map((logo, i) => (
                  <span key={`${logo}-${i}`} className="text-xl font-extrabold text-slate-300 uppercase tracking-tighter cursor-default">{logo}</span>
                ))}
              </div>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6 text-center border-t border-white/[0.08] pt-12"
            >
              <motion.div variants={staggerItem}><MetricColumn value={<AnimatedNumber to={7} />} label="Backend Engines" color="text-purple-400" /></motion.div>
              <motion.div variants={staggerItem}><MetricColumn value={<AnimatedNumber to={5} />} label="Scoring Dimensions" color="text-blue-400" /></motion.div>
              <motion.div variants={staggerItem}><MetricColumn value={<AnimatedNumber to={TOTAL_KG_NODES} />} label="CS Graph Nodes" color="text-indigo-400" /></motion.div>
              <motion.div variants={staggerItem}><MetricColumn value={<AnimatedNumber to={4} />} label="IDE Languages" color="text-emerald-400" /></motion.div>
              <motion.div variants={staggerItem}><MetricColumn value={<AnimatedNumber to={100} suffix="%" />} label="Sandboxed Exec" color="text-amber-400" /></motion.div>
            </motion.div>
          </div>
        </section>

        {/* SIMULATION — mirrors the real InterviewRoom's actual fields, not a separate invented shape */}
        <section id="simulation" className="px-6 max-w-[1400px] mx-auto mt-12 mb-24">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 inline-block mb-4">
              Engine 01 // Company DNA & Persona
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-3">
              Hostile pushback.<br /><span className="text-indigo-400">Real-time adaptation.</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              The AI doesn't accept hand-wavy answers. This is a preview of the actual session screen — pick a company below to see how the question changes.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {DEMO_KEYS.map((pKey) => (
              <button
                key={pKey}
                onClick={() => setPersonaTarget(pKey)}
                className={`relative px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-colors outline-none ${FOCUS_RING} ${
                  personaTarget === pKey ? 'text-white' : 'bg-[#050508] border border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {personaTarget === pKey && (
                  <motion.div layoutId="personaPill" className="absolute inset-0 bg-indigo-600 rounded-xl shadow-md" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                )}
                <span className="relative z-10">{pKey}</span>
              </button>
            ))}
          </div>

          <GlassCard className="p-0 border-white/10 shadow-2xl overflow-hidden">
            <div className="h-12 border-b border-white/[0.08] bg-[#030305] flex items-center justify-between px-6 font-mono text-xs overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`badge-${personaTarget}`}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="flex items-center gap-3"
                >
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${currentSim.badgeColor}`}>{currentSim.badge}</span>
                  <span className="text-slate-400 text-xs font-semibold hidden sm:inline">{currentSim.role}</span>
                  <span className="bg-white/10 border border-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded hidden sm:inline">{currentSim.persona} persona</span>
                </motion.div>
              </AnimatePresence>
              <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">Preview of a real session</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08] bg-[#000000] min-h-[380px]">
              {/* LEFT: question inspector — matches real Context/Constraints/Ask fields */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`q-${personaTarget}`}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
                  className="lg:col-span-5 p-6 space-y-5"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">The Question</span>
                    <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[9px] font-mono font-bold text-slate-300 uppercase">{currentSim.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Context</span>
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">{currentSim.context}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Constraints</span>
                    <ul className="space-y-1.5">
                      {currentSim.constraints.map((c, i) => (
                        <li key={i} className="text-xs text-slate-300 font-medium flex items-start gap-2 leading-relaxed">
                          <span className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-3 border-t border-white/[0.06]">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest block mb-1">The Ask</span>
                    <p className="text-xs font-bold text-white leading-relaxed">{currentSim.ask}</p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* CENTER: persona banner + writing canvas placeholder, like the real center pane */}
              <div className="lg:col-span-4 p-6 flex flex-col bg-[#020204]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`p-${personaTarget}`}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold text-white">{currentSim.persona} Evaluator</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 space-y-3 leading-relaxed">
                      <p>// 1. Clarification &amp; Edge Cases...</p>
                      <p>// 2. Core Architectural Approach...</p>
                      <p>// 3. Trade-offs &amp; Limits...</p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* RIGHT: session telemetry — matches the real pre-answer empty state exactly, no fabricated numbers */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`telemetry-${personaTarget}`}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="lg:col-span-3 p-6 bg-[#020204] flex flex-col justify-between font-mono text-xs"
                >
                <div>
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Session Telemetry</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1"><span>Confidence</span><span className="text-white font-bold">--/10</span></div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: '0%' }} /></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1"><span>Pace (WPM)</span><span className="text-white font-bold">--</span></div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-400" style={{ width: '0%' }} /></div>
                    </div>
                    <div className="flex justify-between items-center text-[10px]"><span className="text-slate-400">Fillers Detected</span><span className="text-white font-bold">0</span></div>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/[0.06] space-y-1 text-[10px]">
                  <div className="flex justify-between text-slate-500"><span>Target Level</span><span className="text-white font-bold">{currentSim.role.split("·").pop().trim()}</span></div>
                  <div className="flex justify-between text-slate-500">
                    <span title="Approximate ELO band for this seniority level">Approx. ELO Band</span>
                    <span className="text-white font-bold">{SIM_ELO_BANDS[personaTarget] || "No fixed levels"}</span>
                  </div>
                </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </GlassCard>
        </section>

        {/* LIVE CODING */}
        <section id="live-coding" className="px-6 max-w-[1400px] mx-auto mb-32">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 block w-max mb-2">
                Engine 02 // Multi-Language IDE
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white">Sandboxed execution.<br />Instant Big-O profiling.</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mr-2 hidden sm:inline">Isolated Linux Sandbox</span>
              <div className="flex items-center gap-1.5 bg-[#08080C] p-1.5 rounded-xl border border-white/10 shrink-0">
                {['Python', 'JavaScript', 'C++', 'Java'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveTabIDE(lang)}
                    className={`relative px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-colors outline-none ${FOCUS_RING} ${
                      activeTabIDE === lang ? "text-black" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {activeTabIDE === lang && (
                      <motion.div layoutId="activeLangPill" className="absolute inset-0 bg-emerald-400 rounded-lg shadow-md" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                    )}
                    <span className="relative z-10">{lang}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <motion.div variants={staggerItem} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          <GlassCard className="p-0 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
              <div className="lg:col-span-3 bg-[#050508] border-r border-white/10 p-6 flex flex-col justify-between">
                <div>
                  <span className="bg-white/10 text-white text-[9px] font-bold px-2 py-1 rounded inline-block w-max mb-4 uppercase tracking-widest">Medium</span>
                  <h3 className="text-lg font-bold text-white mb-3 leading-tight">Rate Limiter &mdash; Token Bucket</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium mb-6">
                    Implement a distributed rate limiter using the Token Bucket algorithm. Handle 100k RPS burst traffic with O(1) time complexity per request.
                  </p>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Constraints</span>
                  <ul className="space-y-2">
                    <li><span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-indigo-300 font-mono text-[11px]">1 &le; capacity &le; 10^9</span></li>
                    <li><span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-indigo-300 font-mono text-[11px]">Memory: O(k) sliding window</span></li>
                    <li><span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-indigo-300 font-mono text-[11px]">Target: &lt; 10ms latency SLA</span></li>
                  </ul>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl font-mono text-[10px] text-slate-400 mt-6">
                  <div className="flex items-center gap-2 mb-1 text-emerald-400"><Sparkles size={14} /> Socratic Hint</div>
                  <span>Consider avoiding a full ZRANGE scan on every request. Can you prune the sorted set asynchronously?</span>
                </div>
              </div>

              <div className="lg:col-span-6 flex flex-col bg-[#030303]">
                <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-[#08080C]">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">rate_limiter.{activeTabIDE === 'Python' ? 'py' : activeTabIDE === 'JavaScript' ? 'js' : activeTabIDE === 'C++' ? 'cpp' : 'java'}</span>
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest px-2 py-1">Read-only preview</span>
                </div>

                <div className="flex-1 p-6 font-mono text-sm leading-relaxed overflow-y-auto relative min-h-[260px]">
                  <AnimatePresence mode="wait">
                    <motion.div key={activeTabIDE} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="flex">
                      <div className="text-slate-600 text-right pr-4 select-none flex flex-col">
                        {Array.from({ length: 12 }).map((_, i) => <span key={i}>{i + 1}</span>)}
                      </div>
                      {IDE_SNIPPETS[activeTabIDE]}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="h-10 border-t border-white/10 bg-[#050508] flex items-center px-4 text-[10px] font-mono text-slate-500 gap-6">
                  <span>Time: <strong className="text-white">O(log n)</strong></span>
                  <span>Space: <strong className="text-white">O(k)</strong></span>
                  <span className="ml-auto">Automated complexity estimation</span>
                </div>
              </div>

              <div className="lg:col-span-3 border-l border-white/10 bg-[#050508] p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Test Runner</h3>
                    <span className="text-[9px] font-mono text-slate-500">Judge0</span>
                  </div>
                  <p className="text-[10px] text-slate-600 font-mono mb-4 leading-relaxed">
                    Example output only — this preview doesn't execute code. Real sessions run your solution against hidden tests via Judge0.
                  </p>
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    className="space-y-3 font-mono text-xs"
                  >
                    {[1, 2, 3, 4, 5].map((test) => (
                      <motion.div
                        key={test}
                        variants={staggerItem}
                        className="bg-[#0A0A0E] border border-white/5 p-3 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-400" />
                          <span className="text-xs text-slate-300 font-medium">Test case {test}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500">Passed</span>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </div>
            </div>
          </GlassCard>
          </motion.div>
        </section>

        {/* KNOWLEDGE GRAPH — full 93-node categorized view, flex-wrap so it never overlaps */}
        <section id="knowledge" className="px-6 max-w-[1200px] mx-auto mb-32">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 inline-block mb-4">
              Engines 03 & 04 // Voice & RAG Graph
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-4">
              Vocal telemetry meets <span className="text-blue-400">{TOTAL_KG_NODES}-node prerequisite tracking.</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              Speech analysis tracks pace and hesitations while the computer science graph traces your exact foundational gaps across every domain below.
            </p>
            <div className="flex items-center justify-center gap-4 text-[10px] font-mono uppercase tracking-widest text-slate-500 pt-4">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Passed</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Gap detected</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-600" /> Not yet reached</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7">
            {KNOWLEDGE_CATEGORIES.map((cat) => (
              <div key={cat.title}>
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 block mb-2.5">
                  {cat.title} <span className="text-slate-700">&middot; {cat.nodes.length}</span>
                </span>
                <motion.div
                  variants={kgCategoryContainer}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "-40px" }}
                  className="flex flex-wrap gap-1.5"
                >
                  {cat.nodes.map((node) => (
                    <motion.span
                      key={node.name}
                      variants={kgChip}
                      whileHover={{ scale: 1.06, y: -1 }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10.5px] font-semibold whitespace-nowrap ${kgChipClass(node.status)}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${kgDotClass(node.status)}`} />
                      {node.name}
                    </motion.span>
                  ))}
                </motion.div>
              </div>
            ))}
          </div>

          <p className="text-center text-[10px] text-slate-600 font-mono mt-10">
            Example diagnostic — your real graph reflects your own sessions.
          </p>
        </section>

        {/* ARCHITECTURE */}
        <section id="architecture" className="px-6 max-w-[1400px] mx-auto mb-32">
          <div className="text-center mb-16">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 mb-2 inline-block">
              Under the Hood
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white">No magic.<br /><span className="text-indigo-400">Just engineering.</span></h2>
            <p className="text-xs text-slate-400 font-medium max-w-md mx-auto mt-3">Every component chosen for a reason. Transparent full-stack architecture.</p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {ARCHITECTURE_CARDS.map((arch, idx) => (
              <motion.div key={idx} variants={staggerItem}>
                <GlassCard tilt className="p-6 flex flex-col justify-between h-full transition-transform duration-300 hover:-translate-y-1">
                  <div>
                    <div className="flex items-center justify-between mb-4 gap-2">
                      <h3 className="text-base font-bold text-white tracking-tight">{arch.title}</h3>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${arch.color}`}>{arch.tag}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">{arch.desc}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-8 bg-[#050508] border border-white/10 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-6 shadow-inner">
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full text-amber-300 text-xs font-bold shrink-0">
              <Sparkles size={14} /> Powered by Claude
            </div>
            <div className="text-xs text-slate-400 leading-relaxed font-medium">
              <strong>Question generation and scoring run on Claude.</strong> Disclosed intentionally — no "proprietary AI" mystification. Claude handles the language model work; this codebase wraps it with rubric enforcement and domain context.
            </div>
          </div>
        </section>

{/* ABOUT / WHY I BUILT THIS */}
        <section className="px-6 max-w-4xl mx-auto mb-32">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <GlassCard className="p-8 md:p-10 border-amber-500/[0.12]">
              <motion.div variants={staggerItem} className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400/90">About this project</span>
              </motion.div>

              <motion.h2 variants={staggerItem} className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-4">
                I built this to prepare myself.
              </motion.h2>

              <motion.p variants={staggerItem} className="text-sm text-slate-400 leading-relaxed font-medium mb-4">
                This is a solo full-stack portfolio project, not a funded company — built to practice for real technical interviews and to demonstrate the kind of systems work that's hard to show on a resume alone: adaptive question generation, a custom RAG pipeline, sandboxed code execution, and a scoring engine that actually adjusts to how you answer.
              </motion.p>

              <motion.p variants={staggerItem} className="text-sm text-slate-400 leading-relaxed font-medium mb-6">
                The coding bank currently has 25 problems across arrays, strings, caching, and sliding-window patterns, with more being added as I go. OAuth login (Google, GitHub) is the one piece intentionally left as a visibly-disabled placeholder with a "Coming soon" tooltip, rather than a dead button that pretends to work. This runs on free-tier hosting, so the first request after a period of inactivity can take a few extra seconds to spin back up — that's an infrastructure trade-off I've made knowingly, not a bug I've missed. I'm one person building and maintaining all of this, so response times, edge cases, and polish are still catching up to where I want them — but nothing here is faked to look further along than it is.
              </motion.p>

              {/* Real problems hit and fixed during the build — specific,
                  not generic "learned a lot" filler. Every item here is a
                  real bug or migration this codebase actually went through. */}
              <motion.div variants={staggerItem} className="border-t border-white/[0.06] pt-6">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 block mb-4">
                  A few real problems this project made me solve
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      title: "Ephemeral disk killed the RAG store",
                      body: "Railway wipes local disk on every redeploy, so the original disk-based ChromaDB vector store lost its embeddings constantly. Migrated to cosine similarity computed in-process against PostgreSQL — no vector DB, just Postgres.",
                    },
                    {
                      title: "A silent WPM inflation bug",
                      body: "The confidence coach's word count compounded on every debounced chunk instead of replacing it, since the frontend sends the full current answer each time — reported WPM would inflate from 200 to 560+ the longer someone typed. One-line fix, real regression until caught.",
                    },
                    {
                      title: "A code sandbox's public API disappeared",
                      body: "The original execution sandbox (Piston) discontinued public access mid-build. Rebuilt the whole coding track on Judge0 instead, including a Pydantic v2 validation cascade that broke along the way.",
                    },
                    {
                      title: "One ELO system, two very different tracks",
                      body: "System-design interviews and coding submissions are graded completely differently, but they share one formula for updating ELO — so a candidate's skill rating means the same thing whether they just solved a problem or just answered a design question.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="bg-[#050508] border border-white/[0.07] rounded-xl p-4 transition-all duration-300 hover:border-white/[0.16] hover:-translate-y-0.5">
                      <span className="block text-xs font-bold text-slate-200 mb-1.5">{item.title}</span>
                      <span className="block text-[11.5px] text-slate-500 leading-relaxed">{item.body}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Personal signature — an anchor to an actual person, not
                  just a copyright line buried in the footer. */}
              <motion.div variants={staggerItem} className="border-t border-white/[0.06] pt-6 mt-6 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                    A
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white">Adhiswauran</span>
                    <span className="block text-[10.5px] text-slate-500">Solo-built, end to end — backend, frontend, and infra</span>
                  </div>
                </div>
                <a
                  href="https://github.com/adhi2801/Interview-Coach-AI/commits"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  See the real commit history <ArrowRight size={12} />
                </a>
              </motion.div>
            </GlassCard>
          </motion.div>
        </section>

        {/* FINAL CTA */}
        <section className="px-6 text-center max-w-3xl mx-auto pt-4 pb-12">
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-white mb-4">
            Stop reading.<br /><span className="text-indigo-400">Start answering.</span>
          </h2>
          <p className="text-base text-slate-400 font-medium mb-10 max-w-md mx-auto">Free account, one real question. See how you actually do under pressure.</p>
          <button onClick={onGetStarted} className={`relative group overflow-hidden bg-white text-black px-10 py-4 rounded-full text-sm font-bold active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] flex items-center justify-center gap-2 mx-auto ${FOCUS_RING}`}>
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
            <span className="relative z-10">Try a Free Question Now</span>
            <ArrowRight size={16} className="relative z-10" />
          </button>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-20 pt-16 pb-8 border-t border-white/[0.05] bg-[#000000]">
        <div className="max-w-[1440px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10 mb-16">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 bg-white text-black flex items-center justify-center rounded-[4px] font-bold text-[10px]">IC</div>
              <span className="font-semibold text-white tracking-tight text-sm">InterviewCoach</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium mb-3">A solo-built AI mock interview platform.</p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 text-xs tracking-wider uppercase">Product</h4>
            <ul className="space-y-3 text-sm text-slate-400 font-medium">
              <li><a href="#simulation" onClick={(e) => handleScrollTo(e, 'simulation')} className="hover:text-white transition-colors">System Design Simulation</a></li>
              <li><a href="#live-coding" onClick={(e) => handleScrollTo(e, 'live-coding')} className="hover:text-white transition-colors">Live Coding Sandbox</a></li>
              <li><a href="#knowledge" onClick={(e) => handleScrollTo(e, 'knowledge')} className="hover:text-white transition-colors">{TOTAL_KG_NODES}-Node Knowledge Graph</a></li>
              <li><a href="#architecture" onClick={(e) => handleScrollTo(e, 'architecture')} className="hover:text-white transition-colors">Architecture</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 text-xs tracking-wider uppercase">Infrastructure</h4>
            <ul className="space-y-3 text-sm text-slate-400 font-medium">
              <li><a href="#architecture" onClick={(e) => handleScrollTo(e, 'architecture')} className="hover:text-white transition-colors">FastAPI / Python</a></li>
              <li><a href="#architecture" onClick={(e) => handleScrollTo(e, 'architecture')} className="hover:text-white transition-colors">PostgreSQL (cosine similarity)</a></li>
              <li><button onClick={() => onNavigatePrivacy?.()} className="hover:text-white transition-colors text-left">Privacy Policy</button></li>
              <li><button onClick={() => onNavigateTerms?.()} className="hover:text-white transition-colors text-left">Terms of Service</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 text-xs tracking-wider uppercase">Creator</h4>
            <ul className="space-y-3 text-sm text-slate-400 font-medium">
              <li><a href="https://github.com/adhi2801/Interview-Coach-AI" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">GitHub Source <ArrowRight size={12} /></a></li>
              <li><a href="https://github.com/adhi2801/Interview-Coach-AI/commits" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">Commit History <ArrowRight size={12} /></a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-6 border-t border-white/5 pt-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
            &copy; 2026 InterviewCoach AI. Designed &amp; Engineered by <span className="text-white">Adhiswauran</span>.
          </p>
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> All Systems Operational
          </div>
        </div>
      </footer>
    </div>
  );
}