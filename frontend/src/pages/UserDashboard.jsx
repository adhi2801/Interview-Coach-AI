import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  Search, Play, AlertTriangle, Target, Activity, ChevronRight,
  GitBranch, Code2, ShieldAlert, Settings, LogOut, BookOpen
} from 'lucide-react';
import StudyPlan from './StudyPlan';

const TARGET_COMPANIES = ["Google", "Amazon", "Meta", "Microsoft", "Apple"];

function AnimatedScore({ value, prefix = "", suffix = "" }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [value, count, rounded]);

  return <>{prefix}{display}{suffix}</>;
}

export default function UserDashboard({
  user,
  onStartNew,
  onStartCoding,
  onNavigateHistory,
  onNavigateSettings,
  onNavigateStudyPlan,
  onLogout
}) {
  const [activeTarget, setActiveTarget] = useState("Meta");
  const [hoveredSessionId, setHoveredSessionId] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [flightLedger, setFlightLedger] = useState([]);
  const [eloHistory, setEloHistory] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [studyPlanTopic, setStudyPlanTopic] = useState(null);

  // Real radar data — company-scoped (default view) or session-scoped
  // (when hovering a Flight Ledger row). Cached per key so re-hovering
  // the same session doesn't re-fetch.
  const [radarCache, setRadarCache] = useState({});
  const [radarLoading, setRadarLoading] = useState(true);

  // Real gap queue, company-scoped
  const [gapData, setGapData] = useState({ critical_gap: null, queue: [] });
  const [gapLoading, setGapLoading] = useState(true);

  // Real knowledge-graph coverage — all-time, not company-scoped
  const [skillMatrix, setSkillMatrix] = useState({ categories: [], total_touched: 0, total_topics: 0 });
  const [matrixLoading, setMatrixLoading] = useState(true);

  useEffect(() => {
    async function fetchSkillMatrix() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await axios.get(`${API_URL}/user/skill-matrix`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSkillMatrix(res.data);
      } catch (err) {
        console.warn("Could not load skill matrix:", err);
      }
      setMatrixLoading(false);
    }
    fetchSkillMatrix();
  }, []);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await axios.get(`${API_URL}/user/sessions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const sessions = res.data.sessions || [];

        const ledger = sessions.map((s) => ({
          id: s.id,
          date: s.started_at
            ? new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "—",
          rawDate: s.started_at,
          type: s.role || "Session",
          company: s.company_target || "—",
          eloDelta: s.elo_after ? `${s.elo_after >= (user?.elo_rating || 1200) ? "+" : ""}${Math.round(s.elo_after - (user?.elo_rating || 1200))}` : "",
          score: s.score != null ? `${s.score}/100` : "—",
          persona: s.persona ? s.persona.charAt(0).toUpperCase() + s.persona.slice(1) : "—",
          questionCount: s.question_count || 0,
          eloAfter: s.elo_after,
        }));
        setFlightLedger(ledger);

        const trend = sessions
          .filter((s) => s.elo_after)
          .slice()
          .reverse()
          .map((s) => ({
            date: s.started_at
              ? new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "",
            elo: Math.round(s.elo_after),
          }));
        setEloHistory(trend);
      } catch (err) {
        console.warn("Could not load session history:", err);
      }
      setLoadingSessions(false);
    }
    fetchSessions();
  }, [user]);

  // Real company-scoped radar + gap queue — refetches whenever the
  // Target DNA tab changes.
  useEffect(() => {
    async function fetchCompanyData() {
      setRadarLoading(true);
      setGapLoading(true);
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [radarRes, gapRes] = await Promise.all([
          axios.get(`${API_URL}/user/skill-radar`, { headers, params: { company: activeTarget.toLowerCase() } }),
          axios.get(`${API_URL}/user/gap-queue`, { headers, params: { company: activeTarget.toLowerCase() } }),
        ]);
        setRadarCache((prev) => ({ ...prev, [`company:${activeTarget}`]: radarRes.data }));
        setGapData(gapRes.data);
      } catch (err) {
        console.warn("Could not load company DNA data:", err);
      }
      setRadarLoading(false);
      setGapLoading(false);
    }
    fetchCompanyData();
  }, [activeTarget]);

  // Real per-session radar on hover — cached so repeat hovers are instant.
  useEffect(() => {
    if (hoveredSessionId == null) return;
    const cacheKey = `session:${hoveredSessionId}`;
    if (radarCache[cacheKey]) return;

    let cancelled = false;
    async function fetchSessionRadar() {
      const token = localStorage.getItem("access_token");
      try {
        const res = await axios.get(`${API_URL}/user/skill-radar`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { session_id: hoveredSessionId },
        });
        if (!cancelled) setRadarCache((prev) => ({ ...prev, [cacheKey]: res.data }));
      } catch (err) {
        console.warn("Could not load session radar:", err);
      }
    }
    fetchSessionRadar();
    return () => { cancelled = true; };
  }, [hoveredSessionId, radarCache]);

  const currentElo = user?.elo_rating ? Math.round(user.elo_rating) : 1200;

  const companyRadarEntry = radarCache[`company:${activeTarget}`];
  const sessionRadarEntry = hoveredSessionId != null ? radarCache[`session:${hoveredSessionId}`] : null;
  const activeRadarEntry = sessionRadarEntry || companyRadarEntry;
  const activeRadar = activeRadarEntry?.radar || null;

  // Real 30-day ELO delta, computed from actual history — no hardcoded "+47"
  const recentDelta = eloHistory.length > 1
    ? Math.round(eloHistory[eloHistory.length - 1].elo - eloHistory[0].elo)
    : null;

  /* Keyboard Navigation Listener */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'a' || e.key === 'A') onStartNew?.();
      else if (e.key === 'b' || e.key === 'B') onStartCoding?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartNew, onStartCoding]);

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden">

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer { animation: shimmer 2s infinite linear; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* BACKGROUND VOLUMETRIC LIGHTING */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[50vw] h-[50vw] bg-indigo-900/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-blue-900/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      </div>

      {/* HEADER HUD */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#030305]/95 backdrop-blur-2xl border-b border-white/[0.06] z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTarget("Meta")}>
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
            <div className="flex gap-1 relative">
              {TARGET_COMPANIES.map(c => {
                const isActive = activeTarget === c;
                return (
                  <button
                    key={c}
                    onClick={() => setActiveTarget(c)}
                    className={`relative px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all z-10 outline-none ${
                      isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeCompanyHeaderPill"
                        className="absolute inset-0 bg-white/10 border border-white/10 shadow-sm rounded-md -z-10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] hover:border-white/20 transition-colors px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 cursor-pointer">
            <Search size={14} /> Search command or drill...
            <kbd className="ml-4 font-mono text-[10px] bg-black/40 border border-white/10 px-1.5 py-0.5 rounded text-slate-400">⌘K</kbd>
          </div>

          {/* USER AVATAR & DROPDOWN MENU */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 border border-white/20 flex items-center justify-center shadow-inner cursor-pointer hover:border-white/40 transition-all outline-none"
              title="User Menu"
            >
              <span className="text-white text-xs font-bold">{user?.name?.charAt(0) || "T"}</span>
            </button>

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
                    <p className="text-[10px] font-mono text-slate-400 truncate">{user?.email || ""}</p>
                  </div>
                  <button onClick={() => { setUserMenuOpen(false); onNavigateStudyPlan?.(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-left">
                    <BookOpen size={14} /> Knowledge Graph
                  </button>
                  <button onClick={() => { setUserMenuOpen(false); onStartCoding?.(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-left">
                    <Code2 size={14} className="text-amber-400" /> Coding Sandbox IDE
                  </button>
                  <button onClick={() => { setUserMenuOpen(false); onNavigateSettings?.(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-left">
                    <Settings size={14} /> Settings
                  </button>
                  <div className="border-t border-white/5 pt-1">
                    <button onClick={() => { setUserMenuOpen(false); onLogout?.(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors text-left">
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
      <main className="relative z-20 pt-24 pb-12 px-6 max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ========================================================= */}
          {/* LEFT COLUMN (65%)                                          */}
          {/* ========================================================= */}
          <div className="w-full lg:w-[65%] flex flex-col gap-8">

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTarget}
                initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                {/* MISSION BRIEFING CARD — real ELO, real gap, real drill link */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#050508] border border-white/[0.08] rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] relative overflow-hidden">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Current ELO</span>
                    <div className="flex items-end gap-3 mb-1">
                      <span className="text-5xl font-extrabold text-white tracking-tighter tabular-nums leading-none"><AnimatedScore value={currentElo} /></span>
                      {recentDelta !== null && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 mb-1.5 uppercase tracking-widest border ${
                          recentDelta >= 0 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                        }`}>
                          {recentDelta >= 0 ? "▲" : "▼"} {recentDelta >= 0 ? `+${recentDelta}` : recentDelta}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-slate-400 mt-2">
                      {flightLedger.length > 0 ? `${flightLedger.length} session${flightLedger.length === 1 ? "" : "s"} logged` : "No sessions yet"}
                    </p>
                  </div>

                  <div className="bg-[#050508] border border-white/[0.08] border-l-[3px] border-l-amber-500 rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] relative overflow-hidden flex flex-col justify-center">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Critical Gap</span>
                    {gapLoading ? (
                      <span className="text-xs text-slate-500 font-medium">Loading...</span>
                    ) : gapData.critical_gap ? (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                          <span className="text-lg font-bold text-white tracking-tight leading-tight capitalize">{gapData.critical_gap.gap.replace(/_/g, " ")}</span>
                        </div>
                        <p className="text-[11px] font-medium text-amber-500/80 mt-2">{activeTarget} · seen in {gapData.critical_gap.occurrences} answer{gapData.critical_gap.occurrences === 1 ? "" : "s"}</p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500 font-medium">No gaps detected for {activeTarget} yet.</p>
                    )}
                  </div>

                  <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(59,130,246,0.2)] relative overflow-hidden flex flex-col justify-center">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">Recommended</span>
                    {gapData.critical_gap ? (
                      <>
                        <h3 className="text-sm font-bold text-white leading-snug mb-3 capitalize">Study: {gapData.critical_gap.gap.replace(/_/g, " ")}</h3>
                        <button
                          onClick={() => setStudyPlanTopic(gapData.critical_gap.gap)}
                          className="w-full bg-white text-black px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        >
                          <BookOpen size={12} /> Open Study Path
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-sm font-bold text-white leading-snug mb-3">Start a session with {activeTarget}</h3>
                        <button
                          onClick={onStartNew}
                          className="w-full bg-white text-black px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        >
                          <Play size={12} className="fill-current" /> Launch Now
                        </button>
                      </>
                    )}
                  </div>
                </section>
              </motion.div>
            </AnimatePresence>

            {/* ELO TRAJECTORY CHART — real data, honest empty state */}
            <section className="bg-[#050508] border border-white/[0.08] rounded-2xl p-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-white/[0.05] flex justify-between items-end">
                <div>
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">ELO Trajectory</h2>
                  <p className="text-xs font-medium text-slate-400">
                    {eloHistory.length > 0 ? `${eloHistory.length} scored session${eloHistory.length === 1 ? "" : "s"}` : "No scored sessions yet"}
                  </p>
                </div>
              </div>

              <div className="h-[280px] w-full p-4 relative">
                {eloHistory.length > 0 ? (
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
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 font-medium">
                    Complete a session to start tracking your ELO trajectory.
                  </div>
                )}
              </div>
            </section>

            {/* FLIGHT LEDGER (SESSION HISTORY) — real sessions, honest empty state */}
            <section className="bg-[#050508] border border-white/[0.08] rounded-2xl p-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
              <div className="p-6 border-b border-white/[0.05] flex justify-between items-center bg-[#030305]/50">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Flight Ledger · Session History</h2>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">{flightLedger.length} session{flightLedger.length === 1 ? "" : "s"}</span>
                  <button onClick={onNavigateHistory} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white flex items-center gap-1">View All <ChevronRight size={12}/></button>
                </div>
              </div>

              {loadingSessions ? (
                <div className="p-10 text-center text-xs text-slate-500 font-medium">Loading sessions...</div>
              ) : flightLedger.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500 font-medium">
                  No sessions yet — <button onClick={onStartNew} className="text-blue-400 hover:underline font-bold">start your first interview</button>.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.03]">
                  {flightLedger.map((session) => (
                    <div
                      key={session.id}
                      onMouseEnter={() => setHoveredSessionId(session.id)}
                      onMouseLeave={() => setHoveredSessionId(null)}
                      onClick={() => onNavigateHistory?.(session.id)}
                      className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-12 text-center shrink-0">
                          <span className="block text-[11px] font-bold text-slate-400 uppercase">{session.date.split(" ")[0]}</span>
                          <span className="block text-sm font-mono font-bold text-slate-200">{session.date.split(" ")[1] || ""}</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-2 capitalize">
                            {session.type} <span className="text-slate-600 font-normal">·</span> {session.company}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 text-[11px] font-medium text-slate-400">
                            <span className="flex items-center gap-1 text-slate-500"><Target size={10} /> {session.questionCount} node{session.questionCount === 1 ? "" : "s"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-8 text-right">
                        <div className="hidden sm:block">
                          <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">ELO Δ</span>
                          <span className={`text-xs font-mono font-bold ${session.eloDelta.includes('+') ? 'text-emerald-400' : session.eloDelta.includes('-') ? 'text-rose-400' : 'text-slate-400'}`}>{session.eloDelta || "—"}</span>
                        </div>
                        <div className="hidden sm:block">
                          <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Score</span>
                          <span className="text-xs font-mono font-bold text-white">{session.score}</span>
                        </div>
                        <div className="w-24 text-left hidden lg:block">
                          <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Persona</span>
                          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                            <ShieldAlert size={10} className={session.persona?.toLowerCase().includes('hostile') ? 'text-rose-400' : 'text-slate-500'} /> {session.persona}
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-black group-hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all shrink-0">
                          <Play size={12} className="fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {flightLedger.length > 0 && (
              <div className="text-[10px] font-medium text-slate-400 border border-white/5 bg-black/40 p-3 rounded-lg text-center flex items-center justify-center gap-2">
                <Activity size={12} className="text-blue-500/80" />
                Hover a session row to preview its real per-session score radar.
              </div>
            )}

          </div>

          {/* ========================================================= */}
          {/* RIGHT RAIL (35%)                                           */}
          {/* ========================================================= */}
          <div className="w-full lg:w-[35%] flex flex-col gap-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto scrollbar-hide shrink-0">

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTarget}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="w-full flex flex-col gap-6"
              >
                {/* SCORE RADAR — real 5-dimension average, real per-session preview */}
                <section className="bg-[#050508] border border-white/[0.08] rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] relative overflow-hidden shrink-0">
                  <div className="flex justify-between items-center mb-2 relative z-10">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Score Radar · {activeTarget}</h2>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                      hoveredSessionId
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse"
                        : "bg-white/5 text-slate-500 border-white/10"
                    }`}>
                      {hoveredSessionId ? `Session #${hoveredSessionId}` : "All-time average"}
                    </span>
                  </div>

                  <div className="h-56 w-full relative z-10 -ml-2">
                    {radarLoading && !activeRadar ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">Loading...</div>
                    ) : activeRadar ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={activeRadar}>
                          <PolarGrid stroke="rgba(255,255,255,0.1)" />
                          <PolarAngleAxis dataKey="dim" tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={hoveredSessionId ? 0.4 : 0.2} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center px-6">
                        No scored answers for {activeTarget} yet.
                      </div>
                    )}
                  </div>

                  {activeRadar && (
                    <div className="grid grid-cols-5 gap-1 border-t border-white/[0.06] pt-4 mt-2">
                      {activeRadar.map((stat, i) => (
                        <div key={i} className="text-center">
                          <div className="text-[13px] font-mono font-bold text-white mb-0.5">{stat.value}</div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">{stat.dim}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* GAP FIX QUEUE — real gaps only, honest empty state */}
                <section className="bg-[#050508] border border-white/[0.08] rounded-2xl flex flex-col shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] shrink-0 overflow-hidden">
                  <div className="p-5 border-b border-white/[0.06] flex justify-between items-center bg-[#030305]/50 shrink-0">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Gap Fix Queue</h2>
                    {gapData.queue.length > 0 && (
                      <span className="text-[9px] font-mono text-slate-400 border border-white/5 px-2 py-0.5 rounded">{gapData.queue.length} found</span>
                    )}
                  </div>

                  {gapLoading ? (
                    <div className="p-6 text-center text-xs text-slate-500">Loading...</div>
                  ) : gapData.queue.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">No gaps detected for {activeTarget} yet.</div>
                  ) : (
                    <div className="p-3 space-y-2">
                      {gapData.queue.map((item, idx) => (
                        <GapCard
                          key={item.gap}
                          title={item.gap.replace(/_/g, " ")}
                          meta={`${item.category || "General"} · seen ${item.occurrences}x`}
                          urgency={item.urgency}
                          num={idx + 1}
                          onClick={() => setStudyPlanTopic(item.gap)}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* TRACK SHORTCUTS */}
                <section className="bg-[#050508] border border-white/[0.08] rounded-2xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] shrink-0 grid grid-cols-2 gap-3">
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
                </section>

                {/* SKILL VECTOR MATRIX — real knowledge-graph coverage,
                    live once topics_covered starts getting populated */}
                <section className="bg-[#050508] border border-white/[0.08] rounded-2xl p-5 shrink-0">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Knowledge Graph Coverage</h2>
                    {skillMatrix.total_topics > 0 && (
                      <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {skillMatrix.total_touched} of {skillMatrix.total_topics} Tested
                      </span>
                    )}
                  </div>

                  {matrixLoading ? (
                    <div className="text-xs text-slate-500 text-center py-4">Loading...</div>
                  ) : skillMatrix.categories.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-4">No categories found.</div>
                  ) : skillMatrix.total_touched === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-4">
                      No topics tracked yet — complete a session to start building coverage.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {skillMatrix.categories.map((cat) => (
                        <div key={cat.category} className="flex items-center gap-3">
                          <span className="w-24 text-[10px] font-bold text-slate-300 uppercase tracking-wider truncate shrink-0">{cat.category}</span>
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${cat.total > 0 ? Math.min(100, (cat.touched / cat.total) * 100) : 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 w-10 text-right shrink-0">{cat.touched}/{cat.total}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[9px] text-slate-600 italic mt-4">
                    Counts every topic your real answers have engaged with — not a fixed demo total.
                  </p>
                </section>
              </motion.div>
            </AnimatePresence>

          </div>
        </div>

        <footer className="mt-16 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-slate-500 w-full">
          <div>© 2026 InterviewCoach AI · All rights reserved</div>
          <div className="flex items-center gap-4">
            <button onClick={onNavigateStudyPlan} className="hover:text-slate-300 transition-colors">Knowledge Graph</button>
            <span className="text-slate-700">·</span>
            <button onClick={onNavigateSettings} className="hover:text-slate-300 transition-colors">Settings</button>
            <span className="text-slate-700">·</span>
            <button onClick={onNavigateHistory} className="hover:text-slate-300 transition-colors">Sessions</button>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> All Systems Operational
            </span>
          </div>
        </footer>

      </main>

      {studyPlanTopic && (
        <StudyPlan topicName={studyPlanTopic} company={activeTarget.toLowerCase()} onClose={() => setStudyPlanTopic(null)} />
      )}

    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function GapCard({ title, meta, urgency, num, onClick }) {
  const urgencyColor = urgency === "critical" ? "text-rose-400" : urgency === "high" ? "text-amber-400" : "text-slate-400";
  return (
    <div
      onClick={onClick}
      className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 transition-colors cursor-pointer group flex justify-between items-center"
    >
      <div>
        <h4 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors mb-1 capitalize">{title}</h4>
        <p className="text-[10px] text-slate-400 font-medium capitalize">{meta}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-[10px] font-mono font-bold uppercase ${urgencyColor}`}>{urgency}</span>
        <div className="w-6 h-6 rounded bg-black border border-white/10 flex items-center justify-center text-[10px] font-mono font-bold text-slate-400 group-hover:border-white/30 group-hover:text-white transition-colors">
          {num}
        </div>
      </div>
    </div>
  );
}