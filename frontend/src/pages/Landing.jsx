import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { ThemeToggle, useTheme } from "../context/ThemeContext";
import {
  BrainCircuit, Code2, ArrowRight, Terminal,
  CheckCircle2, Mic
} from 'lucide-react';

// --- Reusable Deep Glass Card ---
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
      className={`relative rounded-2xl bg-[var(--bg-surface)] border overflow-hidden backdrop-blur-2xl transition-all duration-300 ${
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
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

// --- Animated Slot Number ---
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

  return <span ref={ref}>{display}{suffix}</span>;
}

const IDE_SNIPPETS = {
  'Python': (
    <div className="text-[var(--text-secondary)]">
      <span className="text-indigo-400">import</span> redis, time<br/><br/>
      <span className="text-indigo-400">def</span> <span className="text-blue-300">rate_limiter</span>(user_id: str, capacity: int, window: int) -{">"} <span className="text-indigo-400">bool</span>:<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe = redis.pipeline()<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;now = time.time()<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;key = <span className="text-emerald-400">f"rate:</span>&#123;user_id&#125;<span className="text-emerald-400">"</span><br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zadd(key, &#123;now: now&#125;)<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zremrangebyscore(key, 0, now - window)<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zcard(key)<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.expire(key, window)<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;results = pipe.execute()<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">return</span> results[2] {'<='} capacity<br/>
    </div>
  ),
  'JavaScript': (
    <div className="text-[var(--text-secondary)]">
      <span className="text-indigo-400">import</span> Redis <span className="text-indigo-400">from</span> <span className="text-emerald-400">'ioredis'</span>;<br/><br/>
      <span className="text-indigo-400">async function</span> <span className="text-blue-300">rateLimiter</span>(userId, capacity, windowSecs) &#123;<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">const</span> now = Date.now();<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">const</span> key = <span className="text-emerald-400">`rate:$&#123;</span>userId<span className="text-emerald-400">&#125;`</span>;<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">const</span> pipe = redis.pipeline();<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zadd(key, now, now);<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zremrangebyscore(key, 0, now - (windowSecs * 1000));<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zcard(key);<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.expire(key, windowSecs);<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">const</span> results = <span className="text-indigo-400">await</span> pipe.exec();<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">return</span> results[2][1] {'<='} capacity;<br/>
      &#125;<br/>
    </div>
  ),
  'C++': (
    <div className="text-[var(--text-secondary)]">
      <span className="text-indigo-400">#include</span> <span className="text-emerald-400">&lt;sw/redis++/redis++.h&gt;</span><br/><br/>
      <span className="text-indigo-400">bool</span> <span className="text-blue-300">rateLimiter</span>(<span className="text-indigo-400">const</span> std::string& userId, <span className="text-indigo-400">int</span> capacity, <span className="text-indigo-400">int</span> window) &#123;<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">auto</span> now = std::chrono::system_clock::now().time_since_epoch().count();<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">auto</span> key = <span className="text-emerald-400">"rate:"</span> + userId;<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">auto</span> pipe = redis.pipeline();<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zadd(key, std::to_string(now), now);<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zremrangebyscore(key, 0, now - window);<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.zcard(key);<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;pipe.expire(key, window);<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">auto</span> replies = pipe.exec();<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">return</span> replies.get&lt;<span className="text-indigo-400">long long</span>&gt;(2) {'<='} capacity;<br/>
      &#125;<br/>
    </div>
  ),
  'Java': (
    <div className="text-[var(--text-secondary)]">
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
      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">return</span> count.get() {'<='} capacity;<br/>
      &#125;<br/>
    </div>
  )
};

export default function Landing({ onGetStarted, onSignIn }) {
  const [activeTrack, setActiveTrack] = useState("system");
  const [activeTabIDE, setActiveTabIDE] = useState("Python");
  const [activeCompany, setActiveCompany] = useState("Google");
  const { theme } = useTheme();

  const COMPANIES = ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix', 'Startup'];
  const FAANG_LOGOS = ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix', 'Stripe'];

  return (
    <div className="relative min-h-screen w-full bg-[var(--bg-canvas)] overflow-x-hidden font-sans text-[var(--text-primary)] selection:bg-blue-500/30 flex flex-col">
      {/* --- INLINE CSS ANIMATIONS --- */}
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

      {/* --- LAYER 1: AMBIENT VOLUMETRIC LIGHTING (dark mode only) --- */}
      {theme === 'dark' && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[10%] w-[50vw] h-[50vw] bg-indigo-900/20 blur-[150px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-blue-900/15 blur-[150px] rounded-full mix-blend-screen" />
          <div className="absolute top-[40%] left-[-10%] w-[30vw] h-[40vh] bg-emerald-900/5 blur-[120px] rounded-full mix-blend-screen" />
          <div 
            className="absolute inset-0 opacity-[0.03] mix-blend-soft-light"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />
        </div>
      )}

      {/* --- LAYER 2: FLOATING NAVIGATION --- */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-canvas)]/50 backdrop-blur-xl border-b border-[var(--border-subtle)] transition-all duration-300">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-white text-black flex items-center justify-center rounded-[4px] font-bold text-[10px]">IC</div>
            <span className="font-semibold text-[var(--text-primary)] tracking-tight text-sm">
              InterviewCoach <span className="text-[9px] ml-1 bg-white/10 px-1.5 py-0.5 rounded text-[var(--text-muted)]">BETA</span>
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#system-design" className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">System Design</a>
            <a href="#live-coding" className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Live Coding</a>
            <a href="#engines" className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Engines</a>
            <a href="#architecture" className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Architecture</a>
          </nav>

          <div className="flex items-center gap-6">
            <ThemeToggle />
            <button onClick={onSignIn} className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hidden sm:block">Sign In</button>
            <button onClick={onGetStarted} className="relative group overflow-hidden bg-white text-black px-5 py-2 rounded-full text-xs font-bold active:scale-95 transition-all flex items-center gap-2">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
              <span className="relative z-10">Start Free Demo</span>
              <ArrowRight size={14} className="relative z-10" />
            </button>
          </div>
        </div>
      </header>

      {/* --- LAYER 3: MAIN CONTENT STACK --- */}
      <main className="relative z-20 flex-1 w-full pt-32 pb-24">
        
        {/* SECTION 1: HERO FOLD */}
        <section className="px-6 flex flex-col items-center justify-center text-center max-w-5xl mx-auto mb-20">
          <h1 className="text-6xl md:text-7xl lg:text-[84px] font-extrabold tracking-tighter text-[var(--text-primary)] leading-[1.05] mb-6">
            A real interview.<br />
            Not a practice quiz.
          </h1>
          <p className="text-lg md:text-xl text-[var(--text-muted)] font-medium leading-relaxed max-w-2xl mx-auto mb-16">
            Adaptive ELO difficulty, real-time voice telemetry, and sandboxed code execution. Test drive the exact interview chamber before stepping inside.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
            <GlassCard 
              interactive 
              onClick={() => setActiveTrack("system")}
              active={activeTrack === "system"}
              className="p-8 text-center flex flex-col items-center justify-center min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <BrainCircuit size={24} />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Track A</h3>
              <p className="text-sm text-[var(--text-muted)] mb-6">System Design & Architecture</p>
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
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Track B</h3>
              <p className="text-sm text-[var(--text-muted)] mb-6">Live Coding IDE & Algorithms</p>
              <button onClick={onGetStarted} className="w-full py-3 rounded-lg bg-white text-black text-sm font-bold active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                Start Live Coding
              </button>
            </GlassCard>
          </div>
          <p className="mt-8 text-[11px] font-mono font-medium text-slate-500">No account required · Instant access · 1 free session</p>
        </section>

        {/* INFINITE FAANG LOGO MARQUEE */}
        <section className="w-full overflow-hidden mask-edges mb-32 max-w-6xl mx-auto">
          <div className="animate-marquee flex gap-16 md:gap-32 items-center opacity-60">
            {[...FAANG_LOGOS, ...FAANG_LOGOS, ...FAANG_LOGOS].map((logo, idx) => (
              <span key={idx} className="text-xl md:text-2xl font-extrabold text-[var(--text-secondary)] uppercase tracking-tighter">
                {logo}
              </span>
            ))}
          </div>
        </section>

        {/* SECTION 2: THE INTERVIEW EXCHANGE (ENGINE 01) */}
        <section id="system-design" className="px-6 max-w-[1400px] mx-auto mb-32">
          <div className="flex flex-col xl:flex-row items-start xl:items-end justify-between mb-8 gap-6">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
                Engine 01 — Adaptive ELO + Company DNA + 4 Personas
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-[var(--text-primary)]">
                Hostile pushback.<br/>Real-time adaptation.
              </h2>
            </div>
            
            {/* Dynamic Company DNA Pills */}
            <div className="flex flex-wrap items-center gap-2 bg-[#050508] border border-white/10 p-1.5 rounded-xl xl:rounded-full">
              {COMPANIES.map(comp => (
                <button 
                  key={comp}
                  onClick={() => setActiveCompany(comp)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    activeCompany === comp 
                      ? 'bg-white text-black shadow-sm' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {comp.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <GlassCard className="p-0 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
              {/* Chat Canvas */}
              <div className="lg:col-span-8 p-8 flex flex-col bg-black/40 relative">
                <div className="flex items-center gap-3 mb-10">
                  <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> {activeCompany} L5 · System Design · Hostile Persona
                  </div>
                </div>

                <div className="flex-1 space-y-6 flex flex-col justify-end pb-12">
                  <div className="flex gap-4 max-w-xl">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[var(--text-primary)] shrink-0"><Terminal size={14} /></div>
                    <div className="bg-[#111116] border border-white/10 p-4 rounded-2xl rounded-tl-sm text-sm text-slate-200 font-medium leading-relaxed">
                      "Your rate limiter uses a fixed window. How does it handle 100k RPS spike traffic without overwhelming memory?"
                    </div>
                  </div>

                  <div className="flex gap-4 max-w-xl self-end flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[var(--text-primary)] shrink-0"><Mic size={14} /></div>
                    <div className="bg-blue-600 p-4 rounded-2xl rounded-tr-sm text-sm text-[var(--text-primary)] font-medium leading-relaxed shadow-[0_10px_30px_rgba(37,99,235,0.2)]">
                      "I would transition to a Redis Sorted Set Sliding Window with an In-Memory Token Bucket..."
                    </div>
                  </div>
                </div>
                
                {/* Simulated Voice Input Bar */}
                <div className="absolute bottom-6 left-8 right-8 h-12 bg-white/5 border border-white/10 rounded-full flex items-center px-4 justify-between backdrop-blur-md">
                  <div className="flex items-center gap-1.5">
                    {Array.from({length: 12}).map((_, i) => (
                      <motion.div key={i} animate={{ height: [4, Math.random() * 20 + 4, 4] }} transition={{ duration: 0.5 + Math.random(), repeat: Infinity }} className="w-1 bg-emerald-400 rounded-full" />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[var(--text-muted)]">Listening... 145 WPM</span>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[var(--text-secondary)]"><ArrowRight size={14} /></div>
                </div>
              </div>

              {/* Right Panel Telemetry */}
              <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#050508] p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-6">Adaptive ELO Engine</h3>
                  <div className="mb-8">
                    <span className="text-5xl font-extrabold text-[var(--text-primary)] tracking-tighter tabular-nums"><AnimatedNumber to={1416} /></span>
                    <span className="text-xs text-emerald-400 font-bold ml-3 block mt-1">↑ 12 pts this session · L5 Calibrated</span>
                  </div>
                  <div className="w-full h-px bg-white/10 mb-4 relative">
                    <div className="absolute top-0 left-0 h-full bg-emerald-400 w-[70%]" />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>L4 (1050)</span><span>L5 (1400)</span>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/10">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Socratic Debugger</h3>
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                    <p className="text-xs font-medium text-amber-400 mb-2">"Nested loops result in O(N²). Can you bring time complexity down to O(N)?"</p>
                    <p className="text-[10px] text-amber-500/70 leading-snug">Never gives answers. Guides toward optimal Big-O bounds.</p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* SECTION 3: LIVE CODING IDE (ENGINE 02) */}
        <section id="live-coding" className="px-6 max-w-[1400px] mx-auto mb-32">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
                Engine 02 — Sandboxed Multi-Language IDE
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-[var(--text-primary)]">
                Sandboxed multi-language IDE.<br/>Instant Big-O profiling.
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mr-2">Isolated Linux Sandbox</span>
              <div className="flex items-center gap-2 bg-[#050508] border border-white/10 p-1.5 rounded-full">
                {/* Dynamically mapped strictly to supported languages */}
                {['Python', 'JavaScript', 'C++', 'Java'].map((lang) => (
                  <button 
                    key={lang} 
                    onClick={() => setActiveTabIDE(lang)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${activeTabIDE === lang ? "bg-white text-black" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <GlassCard className="p-0 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
              
              {/* Left Panel: Problem Spec */}
              <div className="lg:col-span-3 bg-[#050508] border-r border-white/10 p-6 flex flex-col">
                <span className="bg-white/10 text-[var(--text-primary)] text-[9px] font-bold px-2 py-1 rounded inline-block w-max mb-4 uppercase tracking-widest">Medium</span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 leading-tight">Rate Limiter — Token Bucket</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium mb-8">
                  Implement a distributed rate limiter using the Token Bucket algorithm. Handle 100k RPS burst traffic with O(1) time complexity per request.
                </p>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Constraints</h4>
                
                {/* Upgraded Constraint Chips */}
                <ul className="space-y-2 mb-8">
                  <li><span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-indigo-300 font-mono text-[11px]">1 ≤ capacity ≤ 10^9</span></li>
                  <li><span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-indigo-300 font-mono text-[11px]">Memory: O(k) sliding window</span></li>
                  <li><span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-indigo-300 font-mono text-[11px]">Target: {"<"} 10ms latency SLA</span></li>
                  <li><span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-indigo-300 font-mono text-[11px]">Multi-region consistency</span></li>
                </ul>
                
                <div className="mt-auto bg-black/50 border border-white/5 p-4 rounded-xl font-mono text-[10px] text-[var(--text-muted)]">
                  <span className="block mb-1">Knowledge Graph Path:</span>
                  <span className="text-blue-400 font-bold">Distributed Systems → Rate Limiting → Token Bucket → Redis Sorted Sets</span>
                </div>
              </div>

              {/* Center Panel: Editor */}
              <div className="lg:col-span-6 flex flex-col bg-[#030303]">
                <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-[#08080C]">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-700" />
                    <div className="w-3 h-3 rounded-full bg-slate-700" />
                    <div className="w-3 h-3 rounded-full bg-slate-700" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">rate_limiter.{activeTabIDE === 'Python' ? 'py' : activeTabIDE === 'JavaScript' ? 'js' : activeTabIDE === 'C++' ? 'cpp' : 'java'}</span>
                  <button className="bg-white text-black px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1"><ArrowRight size={10}/> Run</button>
                </div>
                <div className="flex-1 p-6 font-mono text-sm leading-relaxed overflow-y-auto">
                  <div className="flex">
                    <div className="text-slate-600 text-right pr-4 select-none flex flex-col">
                      {Array.from({length: 12}).map((_, i) => <span key={i}>{i+1}</span>)}
                    </div>
                    {/* Dynamic Code Snippet Render */}
                    {IDE_SNIPPETS[activeTabIDE]}
                  </div>
                </div>
                <div className="h-10 border-t border-white/10 bg-[#050508] flex items-center px-4 text-[10px] font-mono text-slate-500 gap-6">
                  <span>Time: <strong className="text-[var(--text-primary)]">O(log n)</strong></span>
                  <span>Space: <strong className="text-[var(--text-primary)]">O(k)</strong></span>
                  <span className="ml-auto">Automated complexity estimation</span>
                </div>
              </div>

              {/* Right Panel: Test Runner */}
              <div className="lg:col-span-3 border-l border-white/10 bg-[#050508] p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Test Runner</h3>
                  <span className="text-[9px] font-mono text-[var(--text-muted)]">Exec: 1.2ms</span>
                </div>
                <div className="space-y-3 flex-1">
                  {[1, 2, 3, 4, 5].map((test) => (
                    <div key={test} className="bg-[#0A0A0E] border border-white/5 p-3 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-slate-500" />
                        <span className="text-xs text-[var(--text-secondary)] font-medium">Test case {test}</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-600">0.{test + 2}ms</span>
                    </div>
                  ))}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl mt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span className="text-sm font-bold text-[var(--text-primary)]">10 / 10 Hidden Test Cases</span>
                    </div>
                    <p className="text-[10px] text-emerald-500/70">Evaluates edge cases, large inputs, and memory constraints.</p>
                  </div>
                </div>
              </div>

            </div>
          </GlassCard>
        </section>

        {/* SECTION 4: TELEMETRY & KNOWLEDGE GRAPH (ENGINES 03 & 04) */}
        <section id="engines" className="px-6 max-w-[1400px] mx-auto mb-32">
          <div className="text-center mb-16">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
              Engines 03 &amp; 04 — Live Speech Telemetry + 93-Node Knowledge Graph
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-[var(--text-primary)]">
              Vocal telemetry meets<br/><span className="text-[var(--text-muted)]">93-node prerequisite tracking.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <GlassCard className="p-8 h-[380px] flex flex-col justify-between">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Live Speech &amp; Voice Telemetry</h3>
                  <span className="text-xl font-bold text-[var(--text-primary)]">Real-time vocal analysis</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Recording</span>
                </div>
              </div>

              {/* Bar Chart Visualization */}
              <div className="flex items-end gap-1.5 h-32 mb-8 w-full px-2">
                {[40, 70, 45, 90, 60, 30, 80, 50, 40, 85, 65, 35, 75, 45, 60, 40].map((h, i) => (
                  <div key={i} className={`flex-1 rounded-t-sm transition-all duration-500 ${i % 4 === 0 ? 'bg-slate-700' : 'bg-slate-500'}`} style={{ height: `${h}%` }} />
                ))}
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                  <span className="block text-2xl font-bold text-[var(--text-primary)] tabular-nums tracking-tighter mb-1">145</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">WPM</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                  <span className="block text-2xl font-bold text-[var(--text-primary)] tabular-nums tracking-tighter mb-1">0.87</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Confidence</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                  <span className="block text-2xl font-bold text-[var(--text-primary)] tabular-nums tracking-tighter mb-1">2.1s</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Latency R/T</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                  <span className="block text-2xl font-bold text-[var(--text-primary)] tabular-nums tracking-tighter mb-1">3</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Hesitations</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-8 h-[380px] flex flex-col justify-between">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">93-Topic Knowledge Graph</h3>
                  <span className="text-xl font-bold text-[var(--text-primary)]">Diagnostic question dependency tree</span>
                </div>
                <span className="bg-white/10 text-[var(--text-primary)] font-bold text-[10px] px-3 py-1.5 rounded-full uppercase tracking-widest">93 Nodes</span>
              </div>

              <div className="flex-1 flex items-center justify-center bg-black/30 border border-white/5 rounded-xl mb-6 shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
                <div className="text-center relative z-10">
                  <NetworkIcon />
                  <p className="text-xs text-[var(--text-muted)] font-mono mt-4">[ Knowledge graph — node-edge visualization ]</p>
                  <p className="text-[9px] text-slate-600 mt-2 uppercase tracking-widest">Active path: Distributed Systems → Rate Limiting → Token Bucket</p>
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                <span className="bg-white text-black px-3 py-1.5 rounded text-[10px] font-bold whitespace-nowrap">Distributed Systems</span>
                <ArrowRight size={12} className="text-slate-600 shrink-0" />
                <span className="bg-[#111116] border border-white/10 text-[var(--text-primary)] px-3 py-1.5 rounded text-[10px] font-bold whitespace-nowrap shadow-sm">Rate Limiting</span>
                <ArrowRight size={12} className="text-slate-600 shrink-0" />
                <span className="bg-[#111116] border border-white/10 text-[var(--text-primary)] px-3 py-1.5 rounded text-[10px] font-bold whitespace-nowrap shadow-sm">Token Bucket</span>
                <ArrowRight size={12} className="text-slate-600 shrink-0" />
                <span className="border border-white/10 text-slate-500 px-3 py-1.5 rounded text-[10px] font-medium whitespace-nowrap opacity-50">Redis Sorted Set</span>
              </div>
            </GlassCard>

          </div>
        </section>

        {/* SECTION 5: PAYOFF & ARCHITECTURE */}
        <section id="architecture" className="px-6 max-w-[1400px] mx-auto mb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 5D Benchmarking */}
            <GlassCard className="p-8 md:p-12 h-full flex flex-col justify-center">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4 block">Engine 05 — Peer Benchmarking</span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter text-[var(--text-primary)] mb-4 leading-tight">See where you stand.<br/>Against 9,200 engineers.</h2>
              <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed mb-12">Global rank vs. peers in your exact company + level cohort. Percentile updates in real time.</p>
              
              <div className="bg-[#050508] border border-white/10 p-8 rounded-2xl">
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <span className="text-5xl font-extrabold text-[var(--text-primary)] tracking-tighter tabular-nums leading-none">Top 12%</span>
                    <span className="text-[10px] text-slate-500 block mt-2">of 9,200 peers · Google L5 · System Design</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-[var(--text-secondary)] tabular-nums leading-none">88<span className="text-sm text-slate-500 font-normal">th</span></span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest block mt-1">Percentile</span>
                  </div>
                </div>
                
                <div className="mt-8 relative pt-2">
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-white w-[88%]" />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 mt-2 font-mono">
                    <span>0th</span>
                    <span className="text-[var(--text-muted)]">— You are here (88th)</span>
                    <span>100th</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Architecture Stack */}
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4 block">Engineering Architecture</span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter text-[var(--text-primary)] mb-4 leading-tight">Built from scratch.<br/>For production scale.</h2>
              <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed mb-10">No generic templates. No low-code platforms. Production-grade infrastructure.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TechBadge label="Backend API" val="FastAPI / Python 3.11" />
                <TechBadge label="AI Scorer" val="Claude 3.5 Sonnet" />
                <TechBadge label="Live Voice" val="Whisper 60B · WebSockets" />
                <TechBadge label="Vector DB" val="PostgreSQL + pgvector" />
                <TechBadge label="Code Sandbox" val="Isolated Linux containers" />
                <TechBadge label="Frontend" val="React 18 / Tailwind" />
              </div>
            </div>

          </div>
        </section>

        {/* SECTION 6: CLOSING CTA */}
        <section className="px-6 text-center max-w-3xl mx-auto pt-16 pb-12 border-t border-white/10">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4 block">Ready to test your skill?</span>
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-[var(--text-primary)] mb-6">Stop reading.</h2>
          <p className="text-base text-[var(--text-muted)] font-medium mb-10 max-w-md mx-auto">Free portfolio demo. No credit card required. Master technical, behavioral, and live coding interviews natively.</p>
          <button onClick={onGetStarted} className="relative group overflow-hidden bg-white text-black px-10 py-4 rounded-full text-sm font-bold active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] flex items-center justify-center gap-2 mx-auto">
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
            <span className="relative z-10">Start Free Demo</span>
            <ArrowRight size={16} className="relative z-10" />
          </button>
        </section>

      </main>

      {/* RICH ENTERPRISE FOOTER */}
      <footer className="relative z-20 pt-16 pb-8 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
        <div className="max-w-[1440px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10 mb-16">
          
          <div className="md:col-span-1">
             <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 bg-[var(--text-primary)] text-[var(--bg-canvas)] flex items-center justify-center rounded-[4px] font-bold text-[10px]">IC</div>
              <span className="font-semibold text-[var(--text-primary)] tracking-tight text-sm">InterviewCoach</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium">Autonomous Technical Interview Flight Simulator. Master FAANG interviews with real-time AI telemetry.</p>
          </div>

          <div>
            <h4 className="text-[var(--text-primary)] font-bold mb-4 text-xs tracking-wider uppercase">Product</h4>
            <ul className="space-y-3 text-sm text-[var(--text-muted)] font-medium">
              <li><a href="#system-design" className="hover:text-[var(--text-primary)] transition-colors">System Design Tracker</a></li>
              <li><a href="#live-coding" className="hover:text-[var(--text-primary)] transition-colors">Live Coding Sandbox</a></li>
              <li><a href="#engines" className="hover:text-[var(--text-primary)] transition-colors">93-Node Knowledge Graph</a></li>
              <li><a href="#engines" className="hover:text-[var(--text-primary)] transition-colors">5D Adaptive Scorer</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[var(--text-primary)] font-bold mb-4 text-xs tracking-wider uppercase">Infrastructure & Legal</h4>
            <ul className="space-y-3 text-sm text-[var(--text-muted)] font-medium">
              <li><span className="hover:text-[var(--text-primary)] transition-colors cursor-default">FastAPI / Python 3.11</span></li>
              <li><span className="hover:text-[var(--text-primary)] transition-colors cursor-default">PostgreSQL + JWT Security</span></li>
              <li><a href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[var(--text-primary)] font-bold mb-4 text-xs tracking-wider uppercase">Creator</h4>
            <p className="text-xs text-[var(--text-muted)] font-medium mb-3">Designed & Engineered by <strong className="text-[var(--text-primary)]">Adhiswauran</strong></p>
            <ul className="space-y-3 text-sm text-[var(--text-muted)] font-medium">
              <li><a href="https://github.com/adhi2801/Interview-Coach-AI" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1">GitHub Source <ArrowRight size={12}/></a></li>
              <li><a href="https://github.com/adhi2801/Interview-Coach-AI/commits/main" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1">System Audit Log <ArrowRight size={12}/></a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-[1440px] mx-auto px-6 border-t border-white/5 pt-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
            © 2026 InterviewCoach AI. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold uppercase tracking-widest">All Systems Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Helper Components ---
function TechBadge({ label, val }) {
  return (
    <div className="bg-[#08080C] border border-white/10 p-3.5 rounded-xl shadow-inner">
      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 block mb-1">{label}</span>
      <span className="text-xs font-mono font-bold text-[var(--text-primary)] truncate block">{val}</span>
    </div>
  );
}

// Simple Network Icon mock for the Knowledge Graph placeholder
function NetworkIcon() {
  return (
    <svg width="120" height="120" viewBox="0 0 100 100" className="mx-auto text-indigo-500/40">
      <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
      <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="50" cy="15" r="4" fill="#6366f1" />
      <circle cx="85" cy="50" r="4" fill="#3b82f6" />
      <circle cx="50" cy="85" r="4" fill="#10b981" />
      <circle cx="15" cy="50" r="4" fill="#f59e0b" />
      <circle cx="50" cy="50" r="6" fill="#ffffff" />
      <line x1="50" y1="15" x2="50" y2="50" stroke="currentColor" strokeWidth="1" />
      <line x1="85" y1="50" x2="50" y2="50" stroke="currentColor" strokeWidth="1" />
      <line x1="50" y1="85" x2="50" y2="50" stroke="currentColor" strokeWidth="1" />
      <line x1="15" y1="50" x2="50" y2="50" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}