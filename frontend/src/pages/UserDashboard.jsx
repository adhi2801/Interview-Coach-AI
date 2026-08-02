import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  Search, Play, AlertTriangle, Target, Activity, ChevronRight, 
  GitBranch, Code2, ShieldAlert, User, Settings, LogOut, BookOpen, Layers
} from 'lucide-react';

const COMPANY_TELEMETRY = {
  Google: {
    targetName: "Google L4 Track",
    criticalGap: "Behavioral",
    gapDelta: "23 pts below target median",
    recommendedDrill: "Fix Behavioral Gap · Hostile Persona",
    drillType: "system",
    estTime: "45 min",
    eloGain: "+12 ELO",
    thresholdElo: 1350,
    radar: [
      { dim: "Algorithms", value: 85 }, { dim: "Systems", value: 78 },
      { dim: "Behavioral", value: 60 }, { dim: "Coding", value: 88 },
      { dim: "Comm", value: 65 }
    ],
    gapQueue: [
      { id: "g1", title: "Leadership Under Ambiguity", meta: "Behavioral · Google L4 · 15 min", elo: "+12", track: "system" },
      { id: "g2", title: "Distributed Rate Limiting", meta: "Systems · Google L4 · 30 min", elo: "+8", track: "system" },
      { id: "g3", title: "Dynamic Programming · Trees", meta: "Live Coding · Google L4 · 25 min", elo: "+6", track: "coding" },
      { id: "g4", title: "Hostile Interruption Drill", meta: "Composure · Google L4 · 20 min", elo: "+5", track: "system" },
    ]
  },
  Amazon: {
    targetName: "Amazon L5 Track",
    criticalGap: "Leadership Principles",
    gapDelta: "18 pts below LP bar",
    recommendedDrill: "Customer Obsession & Frugality Deep-Dive",
    drillType: "system",
    estTime: "30 min",
    eloGain: "+15 ELO",
    thresholdElo: 1400,
    radar: [
      { dim: "Algorithms", value: 72 }, { dim: "Systems", value: 80 },
      { dim: "Behavioral", value: 52 }, { dim: "Coding", value: 78 },
      { dim: "Comm", value: 58 }
    ],
    gapQueue: [
      { id: "a1", title: "Bias for Action Trade-offs", meta: "Behavioral · Amazon L5 · 20 min", elo: "+15", track: "system" },
      { id: "a2", title: "High-Availability Shopping Cart", meta: "Systems · Amazon L5 · 35 min", elo: "+10", track: "system" },
      { id: "a3", title: "Sliding Window Maximum", meta: "Live Coding · Amazon L5 · 20 min", elo: "+8", track: "coding" },
      { id: "a4", title: "Deep Dive Architecture Defense", meta: "Composure · Amazon L5 · 15 min", elo: "+5", track: "system" },
    ]
  },
  Meta: {
    targetName: "Meta L4 Track",
    criticalGap: "Systems Architecture",
    gapDelta: "15 pts below high-fanout SLA",
    recommendedDrill: "Instagram Live Fanout Architecture",
    drillType: "system",
    estTime: "40 min",
    eloGain: "+14 ELO",
    thresholdElo: 1380,
    radar: [
      { dim: "Algorithms", value: 80 }, { dim: "Systems", value: 65 },
      { dim: "Behavioral", value: 74 }, { dim: "Coding", value: 92 },
      { dim: "Comm", value: 70 }
    ],
    gapQueue: [
      { id: "m1", title: "Real-Time WebSocket Sync", meta: "Systems · Meta L4 · 30 min", elo: "+14", track: "system" },
      { id: "m2", title: "Trie Auto-Complete Search", meta: "Live Coding · Meta L4 · 25 min", elo: "+9", track: "coding" },
      { id: "m3", title: "Product Sense & Rapid Iteration", meta: "Behavioral · Meta L4 · 15 min", elo: "+7", track: "system" },
      { id: "m4", title: "Socratic Edge Case Pressure", meta: "Composure · Meta L4 · 20 min", elo: "+4", track: "system" },
    ]
  },
  Microsoft: {
    targetName: "Microsoft L4 Track",
    criticalGap: "Live Coding Speed",
    gapDelta: "12 pts below timing benchmark",
    recommendedDrill: "Operational Transformation Editor",
    drillType: "coding",
    estTime: "35 min",
    eloGain: "+10 ELO",
    thresholdElo: 1320,
    radar: [
      { dim: "Algorithms", value: 78 }, { dim: "Systems", value: 82 },
      { dim: "Behavioral", value: 80 }, { dim: "Coding", value: 66 },
      { dim: "Comm", value: 85 }
    ],
    gapQueue: [
      { id: "ms1", title: "Merge Intervals & Time Slices", meta: "Live Coding · Microsoft L4 · 25 min", elo: "+10", track: "coding" },
      { id: "ms2", title: "Enterprise Compliance & API Hygiene", meta: "Systems · Microsoft L4 · 30 min", elo: "+8", track: "system" },
      { id: "ms3", title: "Growth Mindset & Failure Analysis", meta: "Behavioral · Microsoft L4 · 15 min", elo: "+6", track: "system" },
      { id: "ms4", title: "LRU Cache Memory Limits", meta: "Live Coding · Microsoft L4 · 20 min", elo: "+5", track: "coding" },
    ]
  },
  Apple: {
    targetName: "Apple L4 Track",
    criticalGap: "Low-Level Memory",
    gapDelta: "20 pts below hardware thrift SLA",
    recommendedDrill: "On-Device Enclave Telemetry Sync",
    drillType: "system",
    estTime: "45 min",
    eloGain: "+16 ELO",
    thresholdElo: 1360,
    radar: [
      { dim: "Algorithms", value: 88 }, { dim: "Systems", value: 68 },
      { dim: "Behavioral", value: 75 }, { dim: "Coding", value: 82 },
      { dim: "Comm", value: 62 }
    ],
    gapQueue: [
      { id: "ap1", title: "Zero-Trust Encryption Mesh", meta: "Systems · Apple L4 · 35 min", elo: "+16", track: "system" },
      { id: "ap2", title: "Bitwise Manipulation & C++ Pointers", meta: "Live Coding · Apple L4 · 30 min", elo: "+11", track: "coding" },
      { id: "ap3", title: "Attention to Craft & UX Trade-offs", meta: "Behavioral · Apple L4 · 20 min", elo: "+7", track: "system" },
      { id: "ap4", title: "Memory Alignment & Cache Misses", meta: "Live Coding · Apple L4 · 20 min", elo: "+5", track: "coding" },
    ]
  }
};

const ELO_HISTORY = [
  { date: "Jun 1", elo: 1050 }, { date: "Jun 8", elo: 1080 },
  { date: "Jun 15", elo: 1075 }, { date: "Jun 22", elo: 1110 },
  { date: "Jun 29", elo: 1145 }, { date: "Jul 6", elo: 1130 },
  { date: "Jul 13", elo: 1165 }, { date: "Jul 20", elo: 1188 },
];


const TARGET_COMPANIES = ["Google", "Amazon", "Meta", "Microsoft", "Apple"];

export default function UserDashboard({ 
  user, 
  onStartNew, 
  onStartCoding, 
  onNavigateHistory, 
  onNavigateSettings, 
  onNavigateStudyPlan, 
  onLogout 
}) {
  const [activeTarget, setActiveTarget] = useState("Google");
  const [hoveredSessionId, setHoveredSessionId] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [flightLedger, setFlightLedger] = useState([]);
  const [eloHistory, setEloHistory] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await axios.get(`${API_URL}/user/sessions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const sessions = res.data.sessions || [];

        // Build the flight ledger from real sessions, most recent first
        const ledger = sessions.map((s) => ({
          id: s.id,
          date: s.started_at
            ? new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "—",
          type: s.role || "Session",
          topic: s.company_target || "—",
          company: `${s.company_target || "—"}`,
          eloDelta: s.elo_after ? `${s.elo_after >= (user?.elo_rating || 1200) ? "+" : ""}` : "",
          score: s.score != null ? `${s.score}/100` : "—",
          persona: s.persona ? s.persona.charAt(0).toUpperCase() + s.persona.slice(1) : "—",
          track: "system",
          eloAfter: s.elo_after,
        }));
        setFlightLedger(ledger);

        // Build ELO trend from real sessions, oldest first, using elo_after snapshots
        const trend = sessions
          .filter((s) => s.elo_after)
          .slice()
          .reverse()
          .map((s) => ({
            date: s.started_at
              ? new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "",
            elo: s.elo_after,
          }));
        setEloHistory(trend);
      } catch (err) {
        console.warn("Could not load session history:", err);
      }
      setLoadingSessions(false);
    }
    fetchSessions();
  }, [user]);

  const currentElo = user?.elo_rating ? Math.round(user.elo_rating) : 1188;
  const currentCompanyData = COMPANY_TELEMETRY[activeTarget] || COMPANY_TELEMETRY.Google;

  // Real sessions don't carry per-session radar breakdowns yet, so the radar
  // always reflects the company average for now. (Hover-to-scrub disabled
  // until the backend returns per-session skill vectors.)
  const activeRadar = currentCompanyData.radar;

  /* Keyboard Navigation Listener */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'Enter') {
        if (currentCompanyData.drillType === 'coding') {
          onStartCoding?.();
        } else {
          onStartNew?.();
        }
      } else if (e.key === 'a' || e.key === 'A') {
        onStartNew?.();
      } else if (e.key === 'b' || e.key === 'B') {
        onStartCoding?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCompanyData, onStartNew, onStartCoding]);

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* CSS Overrides for animations and scrollbars */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer { animation: shimmer 2s infinite linear; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* BACKGROUND VOLUMETRIC LIGHTING — blur automatically disabled on mobile via App.css media query */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[50vw] h-[50vw] bg-indigo-900/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-blue-900/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      </div>

      {/* HEADER HUD */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#030305]/95 backdrop-blur-2xl border-b border-white/[0.06] z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTarget("Google")}>
            <div className="w-6 h-6 bg-white text-black flex items-center justify-center rounded-[4px] font-bold text-[10px]">IC</div>
            <span className="font-semibold text-white tracking-tight text-sm">InterviewCoach</span>
          </div>
          <div className="hidden md:flex items-center gap-1 bg-white/[0.03] p-1 rounded-md border border-white/5">
            <button className="px-3 py-1 rounded text-xs font-semibold bg-white/10 text-white shadow-sm">Overview</button>
            <button onClick={onNavigateHistory} className="px-3 py-1 rounded text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors">Sessions</button>
            <button onClick={onNavigateStudyPlan} className="px-3 py-1 rounded text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors">Knowledge Graph</button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Target DNA:</span>
            <div className="flex gap-1">
              {TARGET_COMPANIES.map(c => (
                <button 
                  key={c} 
                  onClick={() => setActiveTarget(c)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                    activeTarget === c ? 'bg-white/10 text-white border border-white/10 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] hover:border-white/20 transition-colors px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 cursor-pointer">
            <Search size={14} /> Search command or drill...
            <kbd className="ml-4 font-mono text-[10px] bg-black/40 border border-white/10 px-1.5 py-0.5 rounded text-slate-400">⌘K</kbd>
          </div>

          {/* USER AVATAR & DROPDOWN MENU */}
          <div className="relative">
            <div 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 border border-white/20 flex items-center justify-center shadow-inner cursor-pointer hover:border-white/40 transition-colors"
            >
              <span className="text-white text-xs font-bold">{user?.name?.charAt(0) || "T"}</span>
            </div>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-3 w-56 bg-[#0A0A0C] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-2 z-50 space-y-1"
                >
                  <div className="p-3 border-b border-white/5">
                    <p className="text-xs font-bold text-white truncate">{user?.name || "Candidate"}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">{user?.email || "candidate@interviewcoach.ai"}</p>
                  </div>
                  <button onClick={() => { setUserMenuOpen(false); onNavigateStudyPlan?.(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                    <BookOpen size={14} /> Knowledge Graph
                  </button>
                  <button onClick={() => { setUserMenuOpen(false); onStartCoding?.(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                    <Code2 size={14} className="text-amber-400" /> Coding Sandbox IDE
                  </button>
                  <button onClick={() => { setUserMenuOpen(false); onNavigateSettings?.(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                    <Settings size={14} /> Settings
                  </button>
                  <div className="border-t border-white/5 pt-1">
                    <button onClick={() => { setUserMenuOpen(false); onLogout?.(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors">
                      <LogOut size={14} /> Log Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT STACK */}
      <main className="relative z-20 pt-24 pb-20 px-6 max-w-[1600px] mx-auto w-full flex flex-col lg:flex-row gap-8 items-start">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN (65%) — RICH NARRATIVE TIMELINE                               */}
        {/* ========================================================================= */}
        <div className="w-full lg:w-[65%] flex flex-col gap-8">
          
          {/* MISSION BRIEFING CARD */}
          {}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#050508] border border-white/[0.08] rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] relative overflow-hidden">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Current ELO</span>
              <div className="flex items-end gap-3 mb-1">
                <span className="text-5xl font-extrabold text-white tracking-tighter tabular-nums leading-none">{currentElo}</span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1 mb-1">
                  ▲ +47 <span className="text-emerald-500/50">/ 30d</span>
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 mt-2">Top 18% · Senior Bracket</p>
            </div>

            <div className="bg-[#050508] border border-white/[0.08] border-l-[3px] border-l-amber-500 rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] relative overflow-hidden flex flex-col justify-center">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Critical Gap</span>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                <span className="text-2xl font-bold text-white tracking-tight leading-none truncate">{currentCompanyData.criticalGap}</span>
              </div>
              <p className="text-[11px] font-medium text-amber-500/80 mt-2">{activeTarget} L4 · {currentCompanyData.gapDelta}</p>
            </div>

            <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(59,130,246,0.2)] relative overflow-hidden flex flex-col justify-center">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">Directive</span>
              <h3 className="text-sm font-bold text-white leading-snug mb-3 truncate">{currentCompanyData.recommendedDrill}</h3>
              <button 
                onClick={() => currentCompanyData.drillType === 'coding' ? onStartCoding?.() : onStartNew?.()} 
                className="w-full bg-white text-black px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              >
                <Play size={12} className="fill-current" /> Launch Now <kbd className="font-mono text-[9px] bg-black/10 px-1 py-0.5 rounded text-black/70">↵</kbd>
              </button>
            </div>
          </section>

          {/* ELO TRAJECTORY CHART */}
          {}
          <section className="bg-[#050508] border border-white/[0.08] rounded-2xl p-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/[0.05] flex justify-between items-end">
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">ELO Trajectory · {currentCompanyData.targetName}</h2>
                <p className="text-xs font-medium text-slate-400">47 sessions over 90 days · Avg. +12 ELO per session</p>
              </div>
              <div className="flex gap-1 bg-black/50 border border-white/5 p-1 rounded-lg">
                <button className="px-3 py-1 rounded text-[10px] font-bold text-slate-400 hover:text-white">7d</button>
                <button className="px-3 py-1 rounded text-[10px] font-bold bg-white/10 text-white shadow-sm">30d</button>
                <button className="px-3 py-1 rounded text-[10px] font-bold text-slate-400 hover:text-white">90d</button>
              </div>
            </div>
            
            <div className="h-[280px] w-full p-4 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE5LjUgMEwxOS41IDIwTTAgMTkuNUwyMCAxOS41IiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wMikiIGZpbGw9Im5vbmUiLz48L3N2Zz4=')]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={eloHistory} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <YAxis domain={['dataMin - 20', 'dataMax + 20']} hide />
                  <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} dy={10} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: "#08080C", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", boxShadow: "0 10px 30px rgba(0,0,0,0.8)" }}
                    labelStyle={{ color: "#94A3B8", fontSize: "10px", textTransform: "uppercase", fontWeight: 700 }}
                    itemStyle={{ color: "#fff", fontWeight: "bold", fontSize: "14px", fontFamily: "monospace" }}
                    cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area 
                    type="monotone" dataKey="elo" stroke="#3b82f6" strokeWidth={3} fill="url(#eloGradient)"
                    activeDot={{ r: 6, fill: "#fff", stroke: "#3b82f6", strokeWidth: 3, style: { filter: "drop-shadow(0 0 8px rgba(59,130,246,0.8))" } }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute top-4 right-4 text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20">
                Target Benchmark: {currentCompanyData.thresholdElo} ELO
              </div>
            </div>
          </section>

          {/* SKILL VECTOR MATRIX */}
          {}
          <section className="bg-[#050508] border border-white/[0.08] rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Skill Vector Matrix · Knowledge Graph Coverage</h2>
                <button onClick={onNavigateStudyPlan} className="text-[10px] font-mono font-bold text-indigo-400 hover:text-white bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20 transition-colors">
                  51 of 93 Tested →
                </button>
             </div>
             
             <div className="space-y-3">
               <MatrixRow label="Algorithms" activeCount={8} totalCount={12} theme="blue" />
               <MatrixRow label="Systems" activeCount={5} totalCount={10} theme="emerald" />
               <MatrixRow label="Behavioral" activeCount={2} totalCount={8} theme="amber" warning />
               <MatrixRow label="Live Coding" activeCount={6} totalCount={9} theme="purple" />
             </div>

             <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-medium text-slate-400">
               <div className="flex items-center gap-4">
                 <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-[2px] bg-white/30" /> Mastered</div>
                 <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-[2px] bg-white/10" /> Partial</div>
                 <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-[2px] bg-black border border-white/10" /> Untested</div>
               </div>
               <button onClick={onNavigateStudyPlan} className="text-slate-300 hover:text-white transition-colors font-bold">Explore Knowledge Graph (93 Nodes) →</button>
             </div>
          </section>

          {/* FLIGHT LEDGER (SESSION HISTORY) */}
          {}
          <section className="bg-[#050508] border border-white/[0.08] rounded-2xl p-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
            <div className="p-6 border-b border-white/[0.05] flex justify-between items-center bg-[#030305]/50">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Flight Ledger · Session History</h2>
              <div className="flex items-center gap-3">
                 <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">{flightLedger.length} sessions</span>
                 <button onClick={onNavigateHistory} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white flex items-center gap-1">Sort: Recent <ChevronRight size={12}/></button>
              </div>
            </div>

            {flightLedger.length === 0 && !loadingSessions && (
              <div className="p-10 text-center text-sm text-slate-400">
                No sessions yet — launch your first drill to start building your Flight Ledger.
              </div>
            )}
            <div className="divide-y divide-white/[0.03]">
              {flightLedger.map((session) => (
                <div 
                  key={session.id}
                  onMouseEnter={() => setHoveredSessionId(session.id)}
                  onMouseLeave={() => setHoveredSessionId(null)}
                  onClick={() => session.track === 'coding' ? onStartCoding?.() : onNavigateHistory?.(session.id)}
                  className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 text-center">
                      <span className="block text-[11px] font-bold text-slate-400 uppercase">{session.date.split(" ")[0]}</span>
                      <span className="block text-sm font-mono font-bold text-slate-200">{session.date.split(" ")[1]}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                        {session.type} <span className="text-slate-600 font-normal">·</span> {session.topic}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-[11px] font-medium text-slate-400">
                        <span className="flex items-center gap-1"><Target size={10} className="text-slate-500"/> {session.company}</span>
                        <span className="flex items-center gap-1"><Activity size={10} className="text-slate-500"/> 47 min</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 text-right">
                    <div className="hidden sm:block">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">ELO Δ</span>
                      <span className={`text-xs font-mono font-bold ${session.eloDelta.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>{session.eloDelta}</span>
                    </div>
                    <div className="hidden sm:block">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Score</span>
                      <span className="text-xs font-mono font-bold text-white">{session.score}</span>
                    </div>
                    <div className="w-24 text-left hidden lg:block">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Persona</span>
                      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                        <ShieldAlert size={10} className={session.persona === 'Hostile' ? 'text-red-400' : 'text-slate-500'} /> {session.persona}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-black group-hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all">
                      <Play size={12} className="fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-white/[0.04] bg-[#030305]/50 text-center">
              <button onClick={onNavigateHistory} className="text-[10px] font-mono text-slate-400 hover:text-white uppercase tracking-widest font-bold">Load 43 previous sessions ↓</button>
            </div>
          </section>

          {/* TEMPORAL SCRUBBING HINT */}
          <div className="text-[10px] font-medium text-slate-400 border border-white/5 bg-black/40 p-3 rounded-lg text-center flex items-center justify-center gap-2">
            <Activity size={12} className="text-blue-500/80" />
            ⚡ Interaction: Hovering over any past session row scrubs the radar chart in real time.
          </div>

        </div>

        {/* ========================================================================= */}
        {/* RIGHT RAIL (35%) — STICKY INSTRUMENT DECK                                 */}
        {/* ========================================================================= */}
        {}
        <div className="w-full lg:w-[35%] flex flex-col gap-6">
          
          {/* COMPANY DNA RADAR CHART */}
          <section className="bg-[#050508] border border-white/[0.08] rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] relative overflow-hidden shrink-0">
            <div className="flex justify-between items-center mb-2 relative z-10">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Company DNA · {activeTarget} L4</h2>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                hoveredSessionId 
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse" 
                  : "bg-white/5 text-slate-500 border-white/10"
              }`}>
                {hoveredSessionId ? `Previewing Session #${hoveredSessionId}` : "Live Company Average"}
              </span>
            </div>

            <div className="h-56 w-full relative z-10 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={activeRadar}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="dim" tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={hoveredSessionId ? 0.4 : 0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-5 gap-1 border-t border-white/[0.06] pt-4 mt-2">
              {activeRadar.map((stat, i) => (
                <div key={i} className="text-center">
                   <div className="text-[13px] font-mono font-bold text-white mb-0.5">{stat.value}</div>
                   <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">{stat.dim}</div>
                </div>
              ))}
            </div>
          </section>

          {/* RECOMMENDED ACTION DECK */}
          <section className="bg-[#050508] border border-white/[0.08] rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] shrink-0">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Recommended Action</h2>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-4">
              <h3 className="text-sm font-bold text-white mb-1">{currentCompanyData.recommendedDrill}</h3>
              <p className="text-[11px] text-slate-400 font-medium mb-4">
                {activeTarget} L4 · Est. {currentCompanyData.estTime} · <span className="text-emerald-400">{currentCompanyData.eloGain}</span>
              </p>
              
              <button 
                onClick={() => currentCompanyData.drillType === 'coding' ? onStartCoding?.() : onStartNew?.()} 
                className="relative group overflow-hidden w-full bg-white text-black py-3 rounded-lg text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] outline-none"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <Play size={14} className="fill-current" /> Launch Drill <kbd className="font-mono text-[10px] bg-black/10 px-1.5 py-0.5 rounded ml-1 text-black/60 shadow-sm border border-black/10">↵</kbd>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={onStartNew}
                className="py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-xs font-bold text-slate-300 transition-colors flex items-center justify-center gap-2"
              >
                <GitBranch size={14} className="text-blue-400" /> Track A <kbd className="hidden xl:inline-block font-mono text-[9px] text-slate-400 ml-1 bg-white/10 px-1 rounded">A</kbd>
              </button>
              <button 
                onClick={onStartCoding}
                className="py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-xs font-bold text-slate-300 transition-colors flex items-center justify-center gap-2"
              >
                <Code2 size={14} className="text-amber-400" /> Track B <kbd className="hidden xl:inline-block font-mono text-[9px] text-slate-400 ml-1 bg-white/10 px-1 rounded">B</kbd>
              </button>
            </div>
          </section>

          {/* GAP FIX QUEUE */}
          <section className="bg-[#050508] border border-white/[0.08] rounded-2xl flex flex-col shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex-1 min-h-0 overflow-hidden">
            <div className="p-5 border-b border-white/[0.06] flex justify-between items-center bg-[#030305]/50 shrink-0">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Gap Fix Queue</h2>
              <span className="text-[9px] font-mono text-slate-400 border border-white/5 px-2 py-0.5 rounded">{currentCompanyData.gapQueue.length} Recommended Drills</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {currentCompanyData.gapQueue.map((item, idx) => (
                <GapCard 
                  key={item.id} 
                  title={item.title} 
                  meta={item.meta} 
                  elo={item.elo} 
                  num={idx + 1} 
                  onClick={() => item.track === 'coding' ? onStartCoding?.() : onStartNew?.()}
                />
              ))}
            </div>
          </section>

        </div>
      </main>

    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function MatrixRow({ label, activeCount, totalCount, theme, warning }) {
  const getColors = () => {
    if (theme === 'blue') return 'bg-blue-500 border-blue-400';
    if (theme === 'emerald') return 'bg-emerald-500 border-emerald-400';
    if (theme === 'amber') return 'bg-amber-500 border-amber-400';
    return 'bg-purple-500 border-purple-400';
  };

  return (
    <div className="flex items-center gap-6">
      <div className="w-28 flex items-center justify-between shrink-0">
        <span className={`text-[11px] font-bold tracking-wider ${warning ? 'text-amber-500' : 'text-slate-300'}`}>
          {label} {warning && '⚠️'}
        </span>
      </div>
      
      <div className="flex-1 flex gap-1.5 flex-wrap">
        {Array.from({ length: totalCount }).map((_, i) => {
          const isActive = i < activeCount;
          const isPartial = i === activeCount;
          
          let classes = "w-4 h-4 rounded-sm border ";
          if (isActive) classes += `${getColors()} opacity-90`;
          else if (isPartial) classes += `${getColors()} opacity-30`;
          else classes += "bg-black border-white/10 opacity-50";

          return <div key={i} className={classes} />;
        })}
      </div>
      
      <div className="w-10 text-right shrink-0">
        <span className="text-[10px] font-mono font-bold text-slate-400">{activeCount}/{totalCount}</span>
      </div>
    </div>
  );
}

function GapCard({ title, meta, elo, num, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 transition-colors cursor-pointer group flex justify-between items-center"
    >
      <div>
        <h4 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors mb-1">{title}</h4>
        <p className="text-[10px] text-slate-400 font-medium">{meta}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-emerald-400 transition-colors">{elo} ELO</span>
        <div className="w-6 h-6 rounded bg-black border border-white/10 flex items-center justify-center text-[10px] font-mono font-bold text-slate-400 group-hover:border-white/30 group-hover:text-white transition-colors">
          {num}
        </div>
      </div>
    </div>
  );
}