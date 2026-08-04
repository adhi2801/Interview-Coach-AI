import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, Code2, ArrowRight, Terminal, Activity,
  Target, CheckCircle2, ChevronRight, Mic, ShieldAlert,
  GitBranch, Database, Server, Lock, Sparkles, AlertTriangle, Square, User,
  BarChart3, Layers, Play
} from 'lucide-react';

function GlassCard({ children, className = "", interactive = false, onClick, active = false }) {
  const [rect, setRect] = useState(null);
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (cardRef.current) setRect(cardRef.current.getBoundingClientRect());
  }, []);

  const handleMouseMove = (e) => {
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <motion.div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => {
        if (cardRef.current) setRect(cardRef.current.getBoundingClientRect());
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      whileTap={interactive ? { scale: 0.98 } : {}}
      className={`relative rounded-2xl bg-[#050508] border overflow-hidden backdrop-blur-2xl transition-all duration-300 ${
        active ? 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)]' : 'border-white/[0.08] hover:border-white/20'
      } ${
        interactive ? 'cursor-pointer hover:-translate-y-1 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)]' : ''
      } ${className}`}
    >
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.06), transparent 40%)`,
          opacity: isHovered ? 1 : 0
        }}
      />
      <div className="relative z-10 font-sans">
        {children}
      </div>
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
      const controls = animate(count, to, { duration: 2, ease: [0.16, 1, 0.3, 1] });
      const unsub = rounded.on("change", setDisplay);
      return () => { controls.stop(); unsub(); };
    }
  }, [isInView, to, count, rounded]);

  return <span ref={ref} className="tabular-nums font-mono">{display}{suffix}</span>;
}

function MetricColumn({ value, label, icon: Icon, color }) {
  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tighter mb-2">{value}</div>
      <div className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center justify-center gap-1.5">
        {Icon && <Icon size={12} className={color} />}
        <span>{label}</span>
      </div>
    </div>
  );
}

function TechBadge({ label, val }) {
  return (
    <div className="bg-[#08080C] border border-white/10 p-3.5 rounded-xl shadow-inner">
      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 block mb-1">{label}</span>
      <span className="text-xs font-mono font-bold text-white truncate block">{val}</span>
    </div>
  );
}

const IDE_SNIPPETS = {
  'Python': (
    <div className="text-slate-300 font-mono text-xs leading-relaxed">
      <span className="text-indigo-400">import</span> redis, time<br/><br/>
      <span className="text-indigo-400">def</span> <span className="text-blue-300">rate_limiter</span>(user_id: str, capacity: int, window: int) -&gt; <span className="text-indigo-400">bool</span>:<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe = redis.pipeline()<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;now = time.time()<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;key = <span className="text-emerald-400">f"rate:&#123;user_id&#125;"</span><br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zadd(key, &#123;now: now&#125;)<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zremrangebyscore(key, 0, now - window)<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zcard(key)<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.expire(key, window)<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;results = pipe.execute()<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">return</span> results[2] &lt;= capacity<br/>
    </div>
  ),
  'JavaScript': (
    <div className="text-slate-300 font-mono text-xs leading-relaxed">
      <span className="text-indigo-400">import</span> Redis <span className="text-indigo-400">from</span> <span className="text-emerald-400">'ioredis'</span>;<br/><br/>
      <span className="text-indigo-400">async function</span> <span className="text-blue-300">rateLimiter</span>(userId, capacity, windowSecs) &#123;<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">const</span> now = Date.now();<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">const</span> key = <span className="text-emerald-400">`rate:$&#123;userId&#125;`</span>;<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">const</span> pipe = redis.pipeline();<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zadd(key, now, now);<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zremrangebyscore(key, 0, now - (windowSecs * 1000));<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zcard(key);<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.expire(key, windowSecs);<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">const</span> results = <span className="text-indigo-400">await</span> pipe.exec();<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">return</span> results[2][1] &lt;= capacity;<br/>
      &#125;<br/>
    </div>
  ),
  'C++': (
    <div className="text-slate-300 font-mono text-xs leading-relaxed">
      <span className="text-indigo-400">#include</span> <span className="text-emerald-400">&lt;sw/redis++/redis++.h&gt;</span><br/><br/>
      <span className="text-indigo-400">bool</span> <span className="text-blue-300">rateLimiter</span>(<span className="text-indigo-400">const</span> std::string&amp; userId, <span className="text-indigo-400">int</span> capacity, <span className="text-indigo-400">int</span> window) &#123;<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">auto</span> now = std::chrono::system_clock::now().time_since_epoch().count();<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">auto</span> key = <span className="text-emerald-400">"rate:"</span> + userId;<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">auto</span> pipe = redis.pipeline();<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zadd(key, std::to_string(now), now);<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zremrangebyscore(key, 0, now - window);<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zcard(key);<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.expire(key, window);<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">auto</span> replies = pipe.exec();<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">return</span> replies.get&lt;<span className="text-indigo-400">long long</span>&gt;(2) &lt;= capacity;<br/>
      &#125;<br/>
    </div>
  ),
  'Java': (
    <div className="text-slate-300 font-mono text-xs leading-relaxed">
      <span className="text-indigo-400">import</span> redis.clients.jedis.Jedis;<br/>
      <span className="text-indigo-400">import</span> redis.clients.jedis.Pipeline;<br/><br/>
      <span className="text-indigo-400">public boolean</span> <span className="text-blue-300">rateLimiter</span>(String userId, <span className="text-indigo-400">int</span> capacity, <span className="text-indigo-400">int</span> window) &#123;<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">long</span> now = System.currentTimeMillis();<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;String key = <span className="text-emerald-400">"rate:"</span> + userId;<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;Pipeline pipe = jedis.pipelined();<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zadd(key, now, String.valueOf(now));<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zremrangeByScore(key, 0, now - (window * 1000));<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;Response&lt;Long&gt; count = pipe.zcard(key);<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.expire(key, window);<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.sync();<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">return</span> count.get() &lt;= capacity;<br/>
      &#125;<br/>
    </div>
  )
};

const COMPANY_SCENARIOS = {
  'Google': {
    role: "DISTRIBUTED SYSTEMS ENG",
    persona: "SOCRATIC PERSONA",
    context: "You are designing a globally distributed rate limiter capable of handling 100 million RPS burst traffic across 5 continents.",
    constraints: [
      "Must enforce strict global consistency within a 10ms P99 latency SLA",
      "Cannot use more than O(k) auxiliary memory per node",
      "Must handle network partitions without dropping legitimate requests"
    ],
    ask: "Walk us through your high-level architecture and explain exactly how you would synchronize the token buckets across regions."
  },
  'Amazon': {
    role: "BACKEND ENGINEER",
    persona: "HOSTILE PERSONA",
    context: "You are architecting the checkout service for Prime Day. Traffic is expected to spike to 500k RPS in the first minute of the sale.",
    constraints: [
      "Prioritize high availability over strict consistency",
      "Must degrade gracefully if the inventory service goes down",
      "Apply the 'Bias for Action' leadership principle to your MVP"
    ],
    ask: "Explain how you would ensure no customer carts are lost during a massive AWS regional outage."
  },
  'Meta': {
    role: "INFRASTRUCTURE ENG",
    persona: "STANDARD PERSONA",
    context: "We are launching a new real-time reaction feature for Instagram Live Video. You need to support 2 billion concurrent connections.",
    constraints: [
      "Latency from publisher to viewer must be under 50ms global sync",
      "Optimize for speed and rapid prototyping",
      "Handle extreme fan-out bottlenecks efficiently"
    ],
    ask: "Design the real-time fanout architecture. Where do you put the bottlenecks, and how do you shard the websocket connections?"
  },
  'Microsoft': {
    role: "SYSTEMS ARCHITECT",
    persona: "EXHAUSTED PERSONA",
    context: "We are redesigning the real-time collaborative document editor for Word Online to support enterprise compliance standards.",
    constraints: [
      "Must use Operational Transformation (OT) or CRDTs for conflict resolution",
      "Strict backward compatibility with legacy Office formats",
      "Ensure zero data loss during simultaneous multi-user edits"
    ],
    ask: "Walk me through your conflict resolution strategy when two offline users reconnect and sync conflicting paragraphs simultaneously."
  },
  'Apple': {
    role: "LOW-LEVEL ENGINEER",
    persona: "STANDARD PERSONA",
    context: "You need to architect a secure, zero-trust telemetry sync across millions of on-device secure enclaves.",
    constraints: [
      "User privacy is absolute; no plaintext data leaves the device",
      "Cannot exceed 50MB of memory allocation per background daemon",
      "Must achieve zero latency jitter during syncs"
    ],
    ask: "Detail your approach to local data aggregation and how you would construct the encrypted payload for the cloud handshake."
  },
  'Netflix': {
    role: "SRE / CLOUD ARCHITECT",
    persona: "SOCRATIC PERSONA",
    context: "You are designing Netflix's multi-region video streaming CDN topology with active-active chaos resiliency.",
    constraints: [
      "Must support Tbps global streaming with < 5ms CDN edge latency",
      "Embrace Chaos Engineering; assume any AWS region can vanish instantly",
      "Require zero manual intervention during a failover event"
    ],
    ask: "If US-EAST-1 completely goes dark, exactly how does your DNS routing and edge caching layer automatically reroute 50 million active streams?"
  },
  'Startup': {
    role: "FOUNDING ENGINEER",
    persona: "STANDARD PERSONA",
    context: "You are three days before a product launch and your binary classification model, trained to flag fraudulent sellers, has shown a precision drop.",
    constraints: [
      "Cannot exceed quarterly GPU compute budget, ruling out a full retrain",
      "Launch date cannot move due to partner SLAs",
      "Must communicate the issue and mitigation to non-technical founders"
    ],
    ask: "Walk us through exactly how you would deliver this precision regression finding to your stakeholders under deadline pressures."
  }
};

const PERSONA_QUOTES = {
  standard: "Can you walk me through your architectural assumptions and trade-offs?",
  hostile: "That fixed window log won't scale at 100k RPS. Fix the memory bounds immediately.",
  socratic: "Why choose Operational Transformation over CRDTs in this high-concurrency scenario?",
  exhausted: "Right. Keep going. Tell me what the P99 latency SLA looks like."
};

export default function Landing({ onGetStarted, onSignIn, onNavigatePrivacy, onNavigateTerms }) {
  const [activeTrack, setActiveTrack] = useState("system");
  const [activeTabIDE, setActiveTabIDE] = useState("Python");
  const [activeCompany, setActiveCompany] = useState("Amazon");
  const [isSimulatingRun, setIsSimulatingRun] = useState(false);

  const COMPANIES = ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix', 'Startup'];
  const COMPANY_LOGOS = ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix'];

  const handleRunCode = () => {
    setIsSimulatingRun(true);
    setTimeout(() => setIsSimulatingRun(false), 1400);
  };

  const handleScrollTo = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#000000] overflow-x-hidden font-sans text-slate-200 selection:bg-blue-500/30 flex flex-col">
      
      {/* CSS Overrides */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-shimmer {
          animation: shimmer 2.5s infinite linear;
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
          display: flex;
          width: max-content;
        }
        .mask-edges {
          mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
        }
      `}</style>

      {/* AMBIENT LIGHTING */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[50vw] h-[50vw] bg-indigo-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-blue-900/15 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute top-[40%] left-[-10%] w-[30vw] h-[40vh] bg-emerald-900/5 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* FLOATING NAVIGATION */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/[0.06] transition-all duration-300">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-white text-black flex items-center justify-center rounded-[4px] font-bold text-[10px]">IC</div>
            <span className="font-semibold text-white tracking-tight text-sm">
              InterviewCoach <span className="text-[9px] ml-1 bg-white/10 px-1.5 py-0.5 rounded text-slate-400">PROD</span>
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#system-design" onClick={(e) => handleScrollTo(e, 'system-design')} className="text-xs font-semibold text-slate-300 hover:text-white transition-colors">System Design</a>
            <a href="#live-coding" onClick={(e) => handleScrollTo(e, 'live-coding')} className="text-xs font-semibold text-slate-300 hover:text-white transition-colors">Live Coding</a>
            <a href="#engines" onClick={(e) => handleScrollTo(e, 'engines')} className="text-xs font-semibold text-slate-300 hover:text-white transition-colors">Engines</a>
            <a href="#architecture" onClick={(e) => handleScrollTo(e, 'architecture')} className="text-xs font-semibold text-slate-300 hover:text-white transition-colors">Architecture</a>
          </nav>

          <div className="flex items-center gap-6">
            <button onClick={onSignIn} className="text-xs font-semibold text-slate-300 hover:text-white transition-colors hidden sm:block">Sign In</button>
            <button onClick={onGetStarted} className="relative group overflow-hidden bg-white text-black px-5 py-2 rounded-full text-xs font-bold active:scale-95 transition-all flex items-center gap-2">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
              <span className="relative z-10">Start Simulation</span>
              <ArrowRight size={14} className="relative z-10" />
            </button>
          </div>
        </div>
      </header>

      {}
      <main className="relative z-20 flex-1 w-full pt-32 pb-24">
        
        {/* HERO SECTION */}
        <section className="px-6 flex flex-col items-center justify-center text-center max-w-5xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-6 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Autonomous Technical Interview Flight Simulator
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-[80px] font-extrabold tracking-tighter text-white leading-[1.05] max-w-5xl mb-6">
            A real interview.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
              Not a practice quiz.
            </span>
          </h1>

          <p className="text-base md:text-xl text-slate-300 max-w-2xl leading-relaxed mb-12 font-medium">
            Adaptive ELO difficulty, real-time speech telemetry, and sandboxed execution. Test drive the exact interview chamber before stepping inside.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-12">
            <GlassCard 
              interactive 
              onClick={() => setActiveTrack("system")}
              active={activeTrack === "system"}
              className="p-8 text-center flex flex-col items-center justify-center min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <BrainCircuit size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Track A</h3>
              <p className="text-sm text-slate-400 mb-6">System Design &amp; Architecture</p>
              <button onClick={onGetStarted} className="w-full py-3 rounded-lg bg-white text-black text-sm font-bold active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                Start System Design
              </button>
            </GlassCard>

            <GlassCard 
              interactive 
              onClick={() => setActiveTrack("coding")}
              active={activeTrack === "coding"}
              className="p-8 text-center flex flex-col items-center justify-center min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <Code2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Track B</h3>
              <p className="text-sm text-slate-400 mb-6">Live Coding IDE &amp; Algorithms</p>
              <button onClick={onGetStarted} className="w-full py-3 rounded-lg bg-white text-black text-sm font-bold active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                Start Live Coding
              </button>
            </GlassCard>
          </div>

          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-6 text-center pt-8 border-t border-white/[0.08]">
            <MetricColumn value={<AnimatedNumber to={93} />} label="CS Graph Nodes" icon={Layers} color="text-indigo-400" />
            <MetricColumn value={<AnimatedNumber to={4} />} label="IDE Languages" icon={Code2} color="text-amber-400" />
            <MetricColumn value={<AnimatedNumber to={100} suffix="%" />} label="Sandboxed Exec" icon={Terminal} color="text-emerald-400" />
            <MetricColumn value="5D" label="Telemetry Vectors" icon={BarChart3} color="text-blue-400" />
          </div>
        </section>

        {/* LOGO MARQUEE */}
        <section className="w-full overflow-hidden mask-edges mb-32 max-w-6xl mx-auto">
          <div className="animate-marquee flex gap-16 md:gap-32 items-center opacity-60">
            {[...COMPANY_LOGOS, ...COMPANY_LOGOS, ...COMPANY_LOGOS].map((logo, idx) => (
              <span key={idx} className="text-xl md:text-2xl font-extrabold text-slate-300 uppercase tracking-tighter">
                {logo}
              </span>
            ))}
          </div>
        </section>

        {}
        <section id="system-design" className="px-6 max-w-[1400px] mx-auto mb-32">
          <div className="flex flex-col xl:flex-row items-start xl:items-end justify-between mb-8 gap-6">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-400 mb-2 block">
                Engine 01 &middot; Adaptive ELO + Company DNA + 4 Personas
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white">
                Hostile pushback.<br/>Real-time adaptation.
              </h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 bg-[#050508] border border-white/10 p-1.5 rounded-xl xl:rounded-full">
              {COMPANIES.map(comp => (
                <button 
                  key={comp}
                  onClick={() => setActiveCompany(comp)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all relative outline-none ${
                    activeCompany === comp ? 'text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {activeCompany === comp && (
                    <motion.div 
                      layoutId="activeCompanyPill"
                      className="absolute inset-0 bg-white rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{comp.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>

          <GlassCard className="p-0 overflow-hidden border-white/10 shadow-2xl">
            <div className="h-12 border-b border-white/[0.08] bg-[#030305] flex items-center justify-between px-6 font-mono text-xs">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-white flex items-center justify-center font-extrabold text-black text-[9px]">IC</div>
                <span className="bg-white/5 border border-white/10 px-2.5 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-widest">
                  {activeCompany.toUpperCase()}
                </span>
                <span className="text-slate-400 text-[11px] font-semibold hidden sm:inline">&middot; {COMPANY_SCENARIOS[activeCompany].role}</span>
                <span className="bg-white/10 border border-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">
                  {COMPANY_SCENARIOS[activeCompany].persona}
                </span>
              </div>

              <div className="flex items-center gap-4 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 uppercase font-bold">TIME REMAINING</span>
                  <span className="text-white font-bold font-mono">1:57</span>
                </div>
                <div className="w-px h-3 bg-white/10 hidden sm:block" />
                <div className="flex items-center gap-2 hidden sm:flex">
                  <span className="text-slate-500 uppercase font-bold">NODE</span>
                  <span className="text-white font-bold font-mono">1/5</span>
                </div>
                <div className="w-px h-3 bg-white/10 hidden sm:block" />
                <div className="flex items-center gap-2 hidden sm:flex">
                  <span className="text-slate-500 uppercase font-bold">ELO</span>
                  <span className="text-white font-bold font-mono">1170</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px] bg-[#000000]">
              <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#020204] p-6 flex flex-col justify-between space-y-6">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={activeCompany} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2">
                        <Terminal size={14} className="text-blue-400" /> THE QUESTION
                      </span>
                      <span className="text-[9px] font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-300 uppercase">
                        COMMUNICATION
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest block mb-1">CONTEXT</span>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          {COMPANY_SCENARIOS[activeCompany].context}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest block mb-1">CONSTRAINTS</span>
                        <ul className="space-y-1.5 text-xs text-slate-300">
                          {COMPANY_SCENARIOS[activeCompany].constraints.map((constraint, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-blue-400 font-mono">&gt;</span> {constraint}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  <motion.div 
                    key={`ask-${activeCompany}`} 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                    className="pt-3 border-t border-white/[0.06]"
                  >
                    <span className="text-[10px] font-bold font-mono text-blue-400 uppercase tracking-widest block mb-1">THE ASK</span>
                    <p className="text-xs font-bold text-white leading-relaxed">
                      {COMPANY_SCENARIOS[activeCompany].ask}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="lg:col-span-5 p-6 flex flex-col justify-between relative bg-[#000000] border-b lg:border-b-0 lg:border-r border-white/[0.08]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`persona-${activeCompany}`}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}
                  >
                    <div className={`flex items-center gap-2 mb-4 text-xs font-bold ${activeCompany === 'Amazon' ? 'text-red-400' : activeCompany === 'Microsoft' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeCompany === 'Amazon' ? 'bg-red-400' : activeCompany === 'Microsoft' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      {COMPANY_SCENARIOS[activeCompany].persona.replace(' PERSONA', '')} Evaluator <span className="text-slate-400 font-normal italic">
                        {activeCompany === 'Amazon' ? '"I don\'t want to hear about happy paths. What breaks first?"' :
                         activeCompany === 'Microsoft' ? '"Okay so... just talk me through it."' :
                         '"I\'m listening. Walk me through it."'}
                      </span>
                    </div>

                    <div className="font-mono text-xs text-slate-500 space-y-4 leading-relaxed">
                      <p>// 1. Clarification &amp; Edge Cases...</p>
                      <p>// 2. Core Architectural Approach...</p>
                      <p>// 3. Trade-offs &amp; Limits...</p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="lg:col-span-3 bg-[#020204] p-6 flex flex-col justify-between font-mono text-xs">
                <div>
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-6">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SESSION TELEMETRY</span>
                    <Activity size={14} className="text-emerald-400 animate-pulse" />
                  </div>

                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>CONFIDENCE</span>
                        <span className="text-white font-bold">--/10</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: "20%" }} animate={{ width: "65%" }} transition={{ duration: 1.5 }} className="h-full bg-blue-500" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>PACE (WPM)</span>
                        <span className="text-white font-bold">--</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: "10%" }} animate={{ width: "48%" }} transition={{ duration: 1.5 }} className="h-full bg-indigo-500" />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">FILLERS DETECTED</span>
                      <span className="text-white font-bold">0</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06] space-y-1 text-[10px]">
                  <div className="flex justify-between text-slate-500">
                    <span>TARGET LEVEL</span>
                    <span className="text-white font-bold">L3</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>THRESHOLD ELO</span>
                    <span className="text-white font-bold">1100</span>
                  </div>
                </div>
              </div>

            </div>
          </GlassCard>
        </section>

        {}
        <section id="live-coding" className="px-6 max-w-[1400px] mx-auto mb-32">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 block w-max mb-2">
                Engine 02 &middot; Sandboxed Multi-Language IDE
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white">
                Sandboxed multi-language IDE.<br/>Instant Big-O profiling.
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mr-2 hidden sm:inline">Isolated Linux Sandbox</span>
              <div className="flex items-center gap-1.5 bg-[#08080C] p-1.5 rounded-xl border border-white/10 shrink-0">
                {['Python', 'JavaScript', 'C++', 'Java'].map((lang) => (
                  <button 
                    key={lang} 
                    onClick={() => setActiveTabIDE(lang)}
                    className={`relative px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all outline-none ${
                      activeTabIDE === lang ? "text-black" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {activeTabIDE === lang && (
                      <motion.div 
                        layoutId="activeLangPill" 
                        className="absolute inset-0 bg-amber-400 rounded-lg shadow-md" 
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{lang}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

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

                <div className="bg-black/50 border border-white/5 p-4 rounded-xl font-mono text-[10px] text-slate-400 mt-6">
                  <span className="block mb-1 text-slate-500">KNOWLEDGE GRAPH PATH:</span>
                  <span className="text-blue-400 font-bold">Distributed Systems &rarr; Rate Limiting &rarr; Token Bucket</span>
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
                  <button 
                    onClick={handleRunCode}
                    className="text-[10px] font-mono font-bold text-black bg-white hover:bg-slate-200 px-3 py-1 rounded uppercase flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Play size={10} fill="currentColor" /> Run Sandbox
                  </button>
                </div>

                <div className="flex-1 p-6 font-mono text-sm leading-relaxed overflow-y-auto relative min-h-[260px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTabIDE}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex"
                    >
                      <div className="text-slate-600 text-right pr-4 select-none flex flex-col">
                        {Array.from({length: 12}).map((_, i) => <span key={i}>{i+1}</span>)}
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
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Test Runner</h3>
                    <span className="text-[9px] font-mono text-slate-400">Exec: 1.2ms</span>
                  </div>
                  
                  <div className="space-y-3 font-mono text-xs">
                    {isSimulatingRun ? (
                      <div className="flex items-center gap-2 text-blue-400 p-4 border border-blue-500/20 bg-blue-500/10 rounded-xl font-bold">
                        <Activity size={16} className="animate-spin" />
                        <span>Compiling &amp; Executing...</span>
                      </div>
                    ) : (
                      [1, 2, 3, 4, 5].map((test) => (
                        <div key={test} className="bg-[#0A0A0E] border border-white/5 p-3 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            <span className="text-xs text-slate-300 font-medium">Test case {test}</span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-500">0.{test + 2}ms</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl mt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span className="text-sm font-bold text-white">10 / 10 Hidden Test Cases</span>
                  </div>
                  <p className="text-[10px] text-emerald-500/70">Evaluates edge cases, large inputs, and memory constraints.</p>
                </div>
              </div>

            </div>
          </GlassCard>
        </section>

        {}
        <section id="engines" className="px-6 max-w-[1400px] mx-auto mb-32">
          <div className="text-center mb-16">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 mb-2 inline-block">
              Engines 03 &amp; 04 // Live Speech Telemetry + 93-Node Knowledge Graph
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white">
              Vocal telemetry meets<br/><span className="text-slate-500">93-node prerequisite tracking.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-8 h-[380px] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Live Speech &amp; Voice Telemetry</h3>
                    <span className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <Mic size={18} className="text-emerald-400"/> Real-time vocal analysis
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-rose-400">Recording</span>
                  </div>
                </div>

                <div className="flex items-end gap-1.5 h-32 mb-6 w-full overflow-hidden px-2 border-b border-white/5 pb-2">
                  {Array.from({length: 16}).map((_, i) => (
                    <motion.div 
                      key={i} 
                      className="flex-1 bg-gradient-to-t from-emerald-500/40 to-emerald-400 rounded-t-sm" 
                      animate={{ height: [Math.random() * 20 + 10, Math.random() * 80 + 20, Math.random() * 20 + 10] }} 
                      transition={{ duration: 0.4 + Math.random() * 0.5, repeat: Infinity, ease: "easeInOut" }} 
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 font-mono text-center">
                <div className="bg-[#020204] p-3 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-500 block uppercase mb-1">Pace</span>
                  <span className="text-sm font-bold text-white tabular-nums"><AnimatedNumber to={145}/> WPM</span>
                </div>
                <div className="bg-[#020204] p-3 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-500 block uppercase mb-1">Confidence</span>
                  <span className="text-sm font-bold text-emerald-400 tabular-nums">0.87</span>
                </div>
                <div className="bg-[#020204] p-3 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-500 block uppercase mb-1">Latency R/T</span>
                  <span className="text-sm font-bold text-blue-400 tabular-nums">2.1s</span>
                </div>
                <div className="bg-[#020204] p-3 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-500 block uppercase mb-1">Hesitations</span>
                  <span className="text-sm font-bold text-amber-400 tabular-nums">3 Logged</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-8 h-[380px] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">93-Topic Knowledge Graph</h3>
                    <span className="text-xl font-bold text-white flex items-center gap-2"><GitBranch size={18} className="text-indigo-400"/> Diagnostic Dependency Tree</span>
                  </div>
                  <span className="bg-white/10 text-white font-bold text-[10px] px-3 py-1.5 rounded-full uppercase tracking-widest font-mono">93 Nodes</span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-medium mb-6">When you fail a question, the graph walks backward to locate the root prerequisite gap.</p>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <motion.div initial={{opacity:0, x:20}} whileInView={{opacity:1, x:0}} viewport={{once:true}} transition={{delay:0.1}} className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span className="font-bold">Distributed Systems</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest font-bold bg-emerald-500/20 px-2 py-0.5 rounded">PASSED</span>
                </motion.div>

                <motion.div initial={{opacity:0, x:20}} whileInView={{opacity:1, x:0}} viewport={{once:true}} transition={{delay:0.2}} className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-400 shrink-0 animate-pulse" />
                    <span className="font-bold">Rate Limiting Algorithms</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest font-bold bg-amber-500/20 px-2 py-0.5 rounded">ACTIVE GAP</span>
                </motion.div>

                <motion.div initial={{opacity:0, x:20}} whileInView={{opacity:1, x:0}} viewport={{once:true}} transition={{delay:0.3}} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-slate-500 opacity-50">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-slate-600 shrink-0" />
                    <span>Token Bucket &amp; Redis Sorted Sets</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest font-bold bg-white/5 px-2 py-0.5 rounded">LOCKED</span>
                </motion.div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2">
                <span>PREREQUISITE DEPENDENCY PATH</span>
                <span className="text-blue-400 font-bold">DISCOVERABLE VIA STUDY PLAN</span>
              </div>
            </GlassCard>
          </div>
        </section>

        {}
        <section id="architecture" className="px-6 max-w-[1400px] mx-auto mb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Engine 05 // Peer Benchmarking &amp; 5D Payoff
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter text-white">See where you stand.<br/>Against 9,200 engineers.</h2>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                Every response is evaluated across 5 dimension vectors (Accuracy, Scalability, Communication, Culture, Confidence) and benchmarked against target company cohorts.
              </p>

              <div className="bg-[#08080C] border border-white/10 p-6 rounded-2xl flex items-center gap-6">
                <div>
                  <span className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Global Rank</span>
                  <div className="text-4xl font-extrabold text-white font-mono tracking-tighter">Top 12%</div>
                </div>
                <div className="w-px h-12 bg-white/10" />
                <div>
                  <span className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Current Rating</span>
                  <div className="text-2xl font-bold text-emerald-400 font-mono flex items-center gap-2"><AnimatedNumber to={1416}/> ELO</div>
                </div>
              </div>
            </div>

            <GlassCard className="p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-5">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-300">5D Executive Report</span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Overall: 8.8/10</span>
              </div>

              <div className="space-y-3 font-mono text-xs mb-6">
                <div>
                  <div className="flex justify-between mb-1"><span className="text-slate-400">Technical Accuracy</span><span className="text-white font-bold">9.1/10</span></div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{width:0}} whileInView={{width:"91%"}} viewport={{once:true}} transition={{duration:1, delay:0.2}} className="h-full bg-emerald-400" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1"><span className="text-slate-400">System Scalability</span><span className="text-white font-bold">7.8/10</span></div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{width:0}} whileInView={{width:"78%"}} viewport={{once:true}} transition={{duration:1, delay:0.3}} className="h-full bg-blue-400" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1"><span className="text-slate-400">Communication</span><span className="text-white font-bold">8.3/10</span></div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{width:0}} whileInView={{width:"83%"}} viewport={{once:true}} transition={{duration:1, delay:0.4}} className="h-full bg-indigo-400" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center relative h-36">
                <svg viewBox="0 0 100 100" className="h-full opacity-85 overflow-visible">
                  <polygon points="50,10 90,35 75,85 25,85 10,35" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <motion.polygon 
                    initial={{ points: "50,50 50,50 50,50 50,50 50,50" }}
                    whileInView={{ points: "50,20 82,40 68,78 32,78 18,40" }}
                    viewport={{once:true}}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                    fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1.5" 
                  />
                </svg>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* CLOSING CONVERSION CTA */}
        <section className="px-6 text-center max-w-3xl mx-auto pt-16 pb-12 border-t border-white/10">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-4 block">Ready to test your skill?</span>
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-white mb-6">Stop reading.</h2>
          <p className="text-base text-slate-400 font-medium mb-10 max-w-md mx-auto">Free portfolio demo. No credit card required. Master technical, behavioral, and live coding interviews natively.</p>
          <button onClick={onGetStarted} className="relative group overflow-hidden bg-white text-black px-10 py-4 rounded-full text-sm font-bold active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] flex items-center justify-center gap-2 mx-auto">
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
            <span className="relative z-10">Start Free Demo</span>
            <ArrowRight size={16} className="relative z-10" />
          </button>
        </section>

      </main>

      {}
      <footer className="relative z-20 pt-16 pb-8 border-t border-white/[0.05] bg-black">
        <div className="max-w-[1440px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10 mb-16">
          
          <div className="md:col-span-1">
             <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 bg-white text-black flex items-center justify-center rounded-[4px] font-bold text-[10px]">IC</div>
              <span className="font-semibold text-white tracking-tight text-sm">InterviewCoach</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">Autonomous Technical Interview Flight Simulator. Master FAANG interviews with real-time AI telemetry.</p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 text-xs tracking-wider uppercase">Product</h4>
            <ul className="space-y-3 text-sm text-slate-400 font-medium">
              <li><a href="#system-design" onClick={(e) => handleScrollTo(e, 'system-design')} className="hover:text-white transition-colors">System Design Tracker</a></li>
              <li><a href="#live-coding" onClick={(e) => handleScrollTo(e, 'live-coding')} className="hover:text-white transition-colors">Live Coding Sandbox</a></li>
              <li><a href="#engines" onClick={(e) => handleScrollTo(e, 'engines')} className="hover:text-white transition-colors">93-Node Knowledge Graph</a></li>
              <li><a href="#architecture" onClick={(e) => handleScrollTo(e, 'architecture')} className="hover:text-white transition-colors">5D Adaptive Scorer</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 text-xs tracking-wider uppercase">Infrastructure &amp; Legal</h4>
            <ul className="space-y-3 text-sm text-slate-400 font-medium">
              <li><a href="#architecture" onClick={(e) => handleScrollTo(e, 'architecture')} className="hover:text-white transition-colors">FastAPI / Python 3.11</a></li>
              <li><a href="#architecture" onClick={(e) => handleScrollTo(e, 'architecture')} className="hover:text-white transition-colors">PostgreSQL + JWT Security</a></li>
              <li><a href="/privacy" onClick={(e) => { e.preventDefault(); if (onNavigatePrivacy) onNavigatePrivacy(); else window.location.href = '/privacy'; }} className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" onClick={(e) => { e.preventDefault(); if (onNavigateTerms) onNavigateTerms(); else window.location.href = '/terms'; }} className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 text-xs tracking-wider uppercase">Creator</h4>
            <p className="text-xs text-slate-400 font-medium mb-3">Designed &amp; Engineered by <strong className="text-white">Adhiswauran</strong></p>
            <ul className="space-y-3 text-sm text-slate-400 font-medium">
              <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">GitHub Source <ArrowRight size={12}/></a></li>
              <li><a href="#architecture" onClick={(e) => handleScrollTo(e, 'architecture')} className="hover:text-white transition-colors flex items-center gap-1">System Audit Log <ArrowRight size={12}/></a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-[1440px] mx-auto px-6 border-t border-white/5 pt-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
            &copy; 2026 InterviewCoach AI. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest">All Systems Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}