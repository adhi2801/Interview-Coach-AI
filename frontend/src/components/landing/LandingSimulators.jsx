import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, CheckCircle2, AlertTriangle, Lock, GitBranch } from 'lucide-react';

export default function LandingSimulators() {
  const [activePersona, setActivePersona] = useState("hostile");
  const [activeLanguage, setActiveLanguage] = useState("python");

  const PERSONA_QUOTES = {
    standard: "Can you walk me through your architectural assumptions and trade-offs?",
    hostile: "That fixed window log won't scale at 100k RPS. Fix the memory bounds immediately.",
    socratic: "Why choose Operational Transformation over CRDTs in this high-concurrency scenario?",
    exhausted: "Right. Keep going. Tell me what the P99 latency SLA looks like."
  };

  const CODE_SNIPPETS = {
    python: `def rate_limiter(user_id: str, limit: int, window: int) -> bool:\n    pipe = redis.pipeline()\n    now = time.time()\n    key = f"rate:{user_id}"\n    pipe.zadd(key, {now: now})\n    pipe.zremrangebyscore(key, 0, now - window)\n    pipe.zcard(key)\n    pipe.expire(key, window)\n    results = pipe.execute()\n    return results[2] <= limit`,
    javascript: `async function rateLimiter(userId, limit, window) {\n    const key = \`rate:\${userId}\`;\n    const now = Date.now();\n    const pipe = redis.pipeline();\n    pipe.zadd(key, now, now);\n    pipe.zremrangebyscore(key, 0, now - window * 1000);\n    pipe.zcard(key);\n    const res = await pipe.exec();\n    return res[2][1] <= limit;\n}`,
    cpp: `bool RateLimiter::allowRequest(const std::string& userId, int limit, int window) {\n    auto now = std::chrono::system_clock::now().time_since_epoch().count();\n    auto key = "rate:" + userId;\n    redis.zadd(key, now, std::to_string(now));\n    redis.zremrangebyscore(key, "0", std::to_string(now - window));\n    return redis.zcard(key) <= limit;\n}`,
    java: `public boolean allowRequest(String userId, int limit, int window) {\n    String key = "rate:" + userId;\n    long now = System.currentTimeMillis();\n    Transaction pipe = jedis.multi();\n    pipe.zadd(key, now, String.valueOf(now));\n    pipe.zremrangeByScore(key, 0, now - (window * 1000));\n    Response<Long> count = pipe.zcard(key);\n    pipe.exec();\n    return count.get() <= limit;\n}`
  };

  return (
    <>
      {/* 3. ENGINE 01 — INTERVIEW EXCHANGE (Concept B Full-Width Single Col) */}
      <section className="relative z-20 py-24 px-6 bg-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-10">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                Engine 01 // Interactive Interrogation
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter text-white mt-4">The interview starts when you do.</h2>
            </div>
            
            <div className="flex items-center gap-1.5 bg-[#08080C] p-1.5 rounded-xl border border-white/10 shrink-0">
              {["standard", "hostile", "socratic", "exhausted"].map((p) => (
                <button
                  key={p}
                  onClick={() => setActivePersona(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all outline-none ${
                    activePersona === p ? "bg-white text-black shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#08080C]/90 border border-white/[0.08] overflow-hidden backdrop-blur-2xl p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono font-bold text-slate-400 ml-2">live_chamber.log</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase hidden sm:block">
                Active Persona: {activePersona}
              </span>
            </div>

            <div className="space-y-4 font-mono text-sm">
              <div className="bg-[#020204] border border-white/10 p-5 rounded-xl">
                <span className="text-[10px] font-sans font-bold text-indigo-400 uppercase tracking-widest block mb-1">Interviewer ({activePersona.toUpperCase()})</span>
                <p className="text-slate-100 font-sans font-medium text-base">"{PERSONA_QUOTES[activePersona]}"</p>
              </div>

              <div className="bg-[#050508] border border-white/10 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <span className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest block mb-1">Candidate Stream (Voice Transcription)</span>
                  <p className="text-slate-300 font-mono text-xs leading-relaxed">"I would transition to a Redis Sorted Set Sliding Window with an In-Memory Token Bucket..."</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl text-xs font-sans font-bold text-blue-300">
                  <Mic size={14} className="animate-pulse text-blue-400" />
                  <span>145 WPM · Conf 8.8</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ENGINE 02 — MONACO IDE */}
      <section className="relative z-20 py-24 px-6 bg-[#020203] border-y border-white/[0.08]">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-10">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                Engine 02 // Sandboxed Live Coding IDE
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter text-white mt-4">A real code editor. Not a static text box.</h2>
            </div>

            <div className="flex items-center gap-1.5 bg-[#08080C] p-1.5 rounded-xl border border-white/10 shrink-0">
              {["python", "javascript", "cpp", "java"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLanguage(lang)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all outline-none ${
                    activeLanguage === lang ? "bg-amber-400 text-black shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#08080C]/90 border border-white/[0.08] overflow-hidden backdrop-blur-2xl">
            <div className="bg-[#050507] px-6 py-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400">solution.{activeLanguage === "python" ? "py" : activeLanguage === "javascript" ? "js" : activeLanguage === "cpp" ? "cpp" : "java"}</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded font-bold uppercase hidden sm:block">
                Isolated Linux Container
              </span>
            </div>

            <div className="p-6 bg-[#000000] font-mono text-xs text-indigo-200 leading-relaxed overflow-x-auto">
              <pre>{CODE_SNIPPETS[activeLanguage]}</pre>
            </div>

            <div className="bg-[#050507] p-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 size={16} /> 10/10 Hidden Test Cases Passed (1.2ms)
              </div>
              <div className="text-slate-400">Time: <span className="text-white font-bold">O(N log N)</span> | Space: <span className="text-white font-bold">O(N)</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ENGINES 03 & 04 — TELEMETRY & KNOWLEDGE GRAPH */}
      <section className="relative z-20 py-24 px-6 bg-transparent">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              Engines 03 & 04 // Telemetry & Knowledge Graph
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter text-white mt-4">Every word analyzed. Every gap exposed.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Live Audio Telemetry */}
            <div className="rounded-2xl bg-[#08080C]/90 border border-white/[0.08] p-6 flex flex-col justify-between backdrop-blur-2xl">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2"><Mic size={16} className="text-emerald-400"/> Real-time Voice Analysis</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="flex items-end gap-1.5 h-20 mb-6 w-full overflow-hidden">
                  {Array.from({length: 16}).map((_, i) => (
                    <motion.div 
                      key={i} 
                      className="flex-1 bg-emerald-400/80 rounded-t-sm" 
                      animate={{ height: [6, Math.random() * 60 + 10, 6] }} 
                      transition={{ duration: 0.4 + Math.random() * 0.5, repeat: Infinity, ease: "easeInOut" }} 
                    />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10 font-mono text-center">
                <div className="bg-[#020204] p-2.5 rounded-lg border border-white/5"><span className="text-[9px] text-slate-500 block uppercase">Pace</span><span className="text-sm font-bold text-white">145 WPM</span></div>
                <div className="bg-[#020204] p-2.5 rounded-lg border border-white/5"><span className="text-[9px] text-slate-500 block uppercase">Confidence</span><span className="text-sm font-bold text-emerald-400">8.7/10</span></div>
                <div className="bg-[#020204] p-2.5 rounded-lg border border-white/5"><span className="text-[9px] text-slate-500 block uppercase">Hesitations</span><span className="text-sm font-bold text-amber-400">3 Logged</span></div>
              </div>
            </div>

            {/* 93-Node Knowledge Graph Tree */}
            <div className="rounded-2xl bg-[#08080C]/90 border border-white/[0.08] p-6 flex flex-col justify-between backdrop-blur-2xl">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2"><GitBranch size={16} className="text-indigo-400"/> Diagnostic Dependency Tree</h3>
                  <span className="text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded">93 Nodes</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-6 font-medium">When you fail a question, the graph walks backward to locate the root prerequisite gap.</p>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center gap-2 bg-[#020204] p-2.5 rounded-lg border border-white/5 text-slate-300"><CheckCircle2 size={14} className="text-emerald-400"/> Distributed Systems</div>
                <div className="flex items-center gap-2 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/30 text-amber-200"><AlertTriangle size={14} className="text-amber-400 animate-pulse"/> Rate Limiting (Active Gap)</div>
                <div className="flex items-center gap-2 opacity-40 p-2.5"><Lock size={14} className="text-slate-500"/> Token Bucket Algorithm</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. ENGINE 05 — 5D PAYOFF REPORT (From Concept A) */}
      <section className="relative z-20 py-24 px-6 bg-[#020203] border-y border-white/[0.08]">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            
            <div className="space-y-6">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Engine 05 // Peer Benchmarking & 5D Payoff
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter text-white">See where you stand. Against 9,200 engineers.</h2>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                Every response is evaluated across 5 dimension vectors (Accuracy, Scalability, Communication, Culture, Confidence) and benchmarked against target company cohorts.
              </p>

              <div className="bg-[#08080C] border border-white/10 p-5 rounded-2xl flex items-center gap-6">
                <div>
                  <span className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Global Rank</span>
                  <div className="text-3xl font-extrabold text-white font-mono tracking-tighter">Top 12%</div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div>
                  <span className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Current Rating</span>
                  <div className="text-xl font-bold text-emerald-400 font-mono">1416 ELO</div>
                </div>
              </div>
            </div>

            {/* 5D Skill Radar Visualizer */}
            <div className="rounded-2xl bg-[#08080C]/90 border border-white/[0.08] backdrop-blur-2xl p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-5">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-300">5D Executive Report</span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Overall: 8.8/10</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="flex justify-between mb-1"><span className="text-slate-400">Technical Accuracy</span><span className="text-white font-bold">9.1/10</span></div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 w-[91%]" /></div>
                </div>
                <div>
                  <div className="flex justify-between mb-1"><span className="text-slate-400">System Scalability</span><span className="text-white font-bold">7.8/10</span></div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-400 w-[78%]" /></div>
                </div>
                <div>
                  <div className="flex justify-between mb-1"><span className="text-slate-400">Communication</span><span className="text-white font-bold">8.3/10</span></div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-indigo-400 w-[83%]" /></div>
                </div>
              </div>

              <div className="flex items-center justify-center relative h-32 mt-4">
                <svg viewBox="0 0 100 100" className="h-full opacity-85">
                  <polygon points="50,10 90,35 75,85 25,85 10,35" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <polygon points="50,20 82,40 68,78 32,78 18,40" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="1.5" />
                </svg>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}