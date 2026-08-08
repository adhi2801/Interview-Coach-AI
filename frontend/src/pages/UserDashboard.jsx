import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  Search, Play, AlertTriangle, Target, ChevronRight, Zap, Trophy,
  GitBranch, Code2, UserCheck, Flame, Settings, LogOut, BookOpen, Inbox, ChartNoAxesCombined
} from 'lucide-react';
import StudyPlan from './StudyPlan';

const TARGET_COMPANIES_FALLBACK = ["Google", "Amazon", "Meta", "Microsoft", "Apple"];

// Ambient orb color shifts to match the active company — purely
// cosmetic, no data implied by the color itself.
const COMPANY_GLOW = {
  Google: "rgba(66,133,244,0.16)",
  Amazon: "rgba(255,153,0,0.13)",
  Meta: "rgba(24,119,242,0.16)",
  Microsoft: "rgba(0,164,239,0.14)",
  Apple: "rgba(255,255,255,0.09)",
};

function AnimatedScore({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [value, count, rounded]);

  return <>{display}</>;
}

// Cursor spotlight + subtle parallax tilt — same craft language as
// Landing's GlassCard, applied here to the mission-briefing row.
function TiltCard({ children, className = "", tilt = false, style = {} }) {
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isHovered, setIsHovered] = useState(false);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (tilt) {
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      ry.set(px * 6);
      rx.set(py * -6);
    }
  };

  const handleLeave = () => {
    setIsHovered(false);
    if (tilt) { rx.set(0); ry.set(0); }
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleLeave}
      style={tilt ? { rotateX: rx, rotateY: ry, transformPerspective: 800, ...style } : style}
      className={`relative rounded-2xl bg-[#08080C]/90 border border-white/[0.08] overflow-hidden backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),_0_16px_40px_-10px_rgba(0,0,0,0.6)] ${className}`}
    >
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(160px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.06), transparent 70%)`,
          opacity: isHovered ? 1 : 0
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}

export default function UserDashboard({
  user, onStartNew, onStartCoding, onNavigateHistory,
  onNavigateSettings, onNavigateStudyPlan, onLogout
}) {
  const [companies, setCompanies] = useState(TARGET_COMPANIES_FALLBACK);
  const [activeTarget, setActiveTarget] = useState("Meta");
  const [hoveredSessionId, setHoveredSessionId] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [flightLedger, setFlightLedger] = useState([]);
  const [visibleLedgerCount, setVisibleLedgerCount] = useState(6);
  const [eloHistory, setEloHistory] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [studyPlanTopic, setStudyPlanTopic] = useState(null);

  // Real company list from the backend's CompanyDNAEngine — not an
  // arbitrary hardcoded 5. Falls back to the same 5 only if the request
  // fails, so the UI never breaks if this endpoint is briefly down.
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await axios.get(`${API_URL}/companies`);
        const list = res.data.companies;
        if (Array.isArray(list) && list.length > 0) {
          const formatted = list.map((c) => c.charAt(0).toUpperCase() + c.slice(1));
          setCompanies(formatted);
          if (!formatted.includes(activeTarget)) setActiveTarget(formatted[0]);
        }
      } catch (err) {
        console.warn("Could not load company list, using fallback:", err);
      }
    }
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [radarCache, setRadarCache] = useState({});
  const [radarLoading, setRadarLoading] = useState(true);
  const [gapData, setGapData] = useState({ critical_gap: null, queue: [] });
  const [gapLoading, setGapLoading] = useState(true);
  const [skillMatrix, setSkillMatrix] = useState({ categories: [], total_touched: 0, total_topics: 0 });
  const [matrixLoading, setMatrixLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await axios.get(`${API_URL}/user/sessions`, { headers: { Authorization: `Bearer ${token}` } });
        const sessions = res.data.sessions || [];

        const ledger = sessions.map((s) => ({
          id: s.id,
          date: s.started_at ? new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—",
          type: s.role || "Session",
          company: s.company_target || "—",
          eloDelta: s.elo_after ? `${s.elo_after >= (user?.elo_rating || 1200) ? "+" : ""}${Math.round(s.elo_after - (user?.elo_rating || 1200))}` : "",
          score: s.score != null ? `${s.score}/100` : "—",
          persona: s.persona ? s.persona.charAt(0).toUpperCase() + s.persona.slice(1) : "—",
          questionCount: s.question_count || 0,
        }));
        setFlightLedger(ledger);
        setVisibleLedgerCount(6);

        const trend = sessions.filter((s) => s.elo_after).slice().reverse().map((s) => ({
          date: s.started_at ? new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
          elo: Math.round(s.elo_after),
        }));
        // Collapse consecutive same-day points to their latest value —
        // multiple sessions on one day otherwise render the same date
        // label twice in a row on the X-axis.
        const dedupedTrend = trend.reduce((acc, point) => {
          if (acc.length > 0 && acc[acc.length - 1].date === point.date) {
            acc[acc.length - 1] = point;
          } else {
            acc.push(point);
          }
          return acc;
        }, []);
        setEloHistory(dedupedTrend);
      } catch (err) {
        console.warn("Could not load session history:", err);
      }
      setLoadingSessions(false);
    }
    fetchSessions();
  }, [user]);

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

  useEffect(() => {
    async function fetchSkillMatrix() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await axios.get(`${API_URL}/user/skill-matrix`, { headers: { Authorization: `Bearer ${token}` } });
        setSkillMatrix(res.data);
      } catch (err) {
        console.warn("Could not load skill matrix:", err);
      }
      setMatrixLoading(false);
    }
    fetchSkillMatrix();
  }, []);

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

  const recentDelta = eloHistory.length > 1
    ? Math.round(eloHistory[eloHistory.length - 1].elo - eloHistory[0].elo)
    : null;

  // Real strongest/weakest, computed from the actual radar — not invented
  let strongest = null, weakest = null;
  if (activeRadar && activeRadar.length > 0) {
    strongest = activeRadar.reduce((a, b) => (b.value > a.value ? b : a));
    weakest = activeRadar.reduce((a, b) => (b.value < a.value ? b : a));
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'a' || e.key === 'A') onStartNew?.();
      else if (e.key === 'b' || e.key === 'B') onStartCoding?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartNew, onStartCoding]);

  const orbColor = COMPANY_GLOW[activeTarget] || COMPANY_GLOW.Meta;

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden">

      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 2s infinite linear; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* AMBIENT ORBS — color shifts with the active Target DNA company */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ background: orbColor }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[10%] w-[50vw] h-[50vw] blur-[150px] rounded-full mix-blend-screen"
        />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-indigo-900/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      </div>

      {/* HEADER */}
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
              {companies.map(c => {
                const isActive = activeTarget === c;
                return (
                  <button
                    key={c} onClick={() => setActiveTarget(c)}
                    className={`relative px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all z-10 outline-none ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    {isActive && (
                      <motion.div layoutId="activeCompanyHeaderPill" className="absolute inset-0 bg-white/10 border border-white/10 shadow-sm rounded-md -z-10" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
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

          <div className="relative">
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 border border-white/20 flex items-center justify-center shadow-inner cursor-pointer hover:border-white/40 transition-all outline-none">
              <span className="text-white text-xs font-bold">{user?.name?.charAt(0) || "T"}</span>
            </button>
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 top-full mt-3 w-56 bg-[#0A0A0C] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-2 z-50 space-y-1">
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

      <main className="relative z-20 pt-24 pb-12 px-6 max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* LEFT COLUMN */}
          <div className="w-full lg:w-[65%] flex flex-col gap-8">

            <AnimatePresence mode="wait">
              <motion.div key={activeTarget} initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }} transition={{ duration: 0.3 }} className="w-full">
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* ELO CARD — now with a real embedded sparkline of actual eloHistory */}
                  <TiltCard tilt className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Current ELO</span>
                      <ChartNoAxesCombined size={16} className="text-indigo-400" />
                    </div>
                    <div className="flex items-end gap-3 mb-1">
                      <span className="text-5xl font-extrabold text-white tracking-tighter tabular-nums leading-none"><AnimatedScore value={currentElo} /></span>
                      {recentDelta !== null && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 mb-1.5 uppercase tracking-widest border ${recentDelta >= 0 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20"}`}>
                          {recentDelta >= 0 ? "▲" : "▼"} {recentDelta >= 0 ? `+${recentDelta}` : recentDelta}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-slate-400 mt-2 mb-3">
                      {flightLedger.length > 0 ? `${flightLedger.length} session${flightLedger.length === 1 ? "" : "s"} logged` : "No sessions yet"}
                    </p>
                    {eloHistory.length > 1 && (
                      <div className="h-8 w-full -mb-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={eloHistory.slice(-10)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="elo" stroke="#6366f1" strokeWidth={1.5} fill="url(#sparkGradient)" isAnimationActive animationDuration={700} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </TiltCard>

                  {/* GAP CARD */}
                  <TiltCard tilt className="p-6 border-l-[3px] !border-l-amber-500 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Critical Gap</span>
                      <AlertTriangle size={16} className="text-amber-400" />
                    </div>
                    {gapLoading ? (
                      <span className="text-xs text-slate-500 font-medium">Loading...</span>
                    ) : gapData.critical_gap ? (
                      <>
                        <span className="text-lg font-bold text-white tracking-tight leading-tight capitalize block">{gapData.critical_gap.gap.replace(/_/g, " ")}</span>
                        <p className="text-[11px] font-medium text-amber-500/80 mt-2">{activeTarget} · seen in {gapData.critical_gap.occurrences} answer{gapData.critical_gap.occurrences === 1 ? "" : "s"}</p>
                        <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${gapData.critical_gap.urgency === "critical" ? "bg-rose-400" : "bg-amber-400"}`} style={{ width: gapData.critical_gap.urgency === "critical" ? "85%" : gapData.critical_gap.urgency === "high" ? "65%" : "40%" }} />
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500 font-medium">No gaps detected for {activeTarget} yet.</p>
                    )}
                  </TiltCard>

                  {/* ACTION CARD */}
                  <TiltCard tilt className="p-6 !border-indigo-500/30 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400">Recommended</span>
                      <Zap size={16} className="text-indigo-400" />
                    </div>
                    {gapData.critical_gap ? (
                      <>
                        <h3 className="text-sm font-bold text-white leading-snug mb-3 capitalize">Study: {gapData.critical_gap.gap.replace(/_/g, " ")}</h3>
                        <button onClick={() => setStudyPlanTopic(gapData.critical_gap.gap)} className="relative overflow-hidden w-full bg-white text-black px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full hover:animate-shimmer" />
                          <BookOpen size={12} /> Open Study Path
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-sm font-bold text-white leading-snug mb-3">Start a session with {activeTarget}</h3>
                        <button onClick={onStartNew} className="relative overflow-hidden w-full bg-white text-black px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full hover:animate-shimmer" />
                          <Play size={12} className="fill-current" /> Launch Now
                        </button>
                      </>
                    )}
                  </TiltCard>
                </section>
              </motion.div>
            </AnimatePresence>

            {/* ELO TRAJECTORY */}
            <TiltCard className="p-0 overflow-hidden flex flex-col">
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
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
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
                      <Area type="monotone" dataKey="elo" stroke="#6366f1" strokeWidth={3} fill="url(#eloGradient)" animationDuration={900} animationEasing="ease-out"
                        activeDot={{ r: 6, fill: "#fff", stroke: "#6366f1", strokeWidth: 3, style: { filter: "drop-shadow(0 0 8px rgba(99,102,241,0.8))" } }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <ChartNoAxesCombined size={18} className="text-slate-600" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Complete a session to start tracking your ELO trajectory.</p>
                  </div>
                )}
              </div>
            </TiltCard>

            {/* FLIGHT LEDGER */}
            <section>
              <div className="flex justify-between items-end px-1 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Flight Ledger</h3>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mt-1">Full session history</p>
                </div>
                <button onClick={onNavigateHistory} className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1">View All <ChevronRight size={12} /></button>
              </div>

              {loadingSessions ? (
                <div className="p-10 text-center text-xs text-slate-500 font-medium border border-white/5 rounded-2xl">Loading sessions...</div>
              ) : flightLedger.length === 0 ? (
                <div className="p-10 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                    <Inbox size={18} className="text-slate-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">No sessions yet</p>
                  <button onClick={onStartNew} className="text-xs text-blue-400 hover:underline font-bold">Start your first interview</button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {flightLedger.slice(0, visibleLedgerCount).map((session, idx) => {
                    const PersonaIcon = session.persona?.toLowerCase() === "hostile" ? Flame : UserCheck;
                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: Math.min(idx, 6) * 0.04, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ x: 4 }}
                        onMouseEnter={() => setHoveredSessionId(session.id)}
                        onMouseLeave={() => setHoveredSessionId(null)}
                        onClick={() => onNavigateHistory?.(session.id)}
                        className="p-4 rounded-xl border border-transparent hover:border-white/[0.06] hover:bg-white/[0.03] hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-colors cursor-pointer group flex items-center justify-between"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-10 text-center shrink-0">
                            <div className="text-[10px] font-mono font-bold uppercase text-slate-500 leading-none">{session.date.split(" ")[0]}</div>
                            <div className="text-lg font-black text-slate-200 mt-0.5 leading-none">{session.date.split(" ")[1] || ""}</div>
                          </div>
                          <div className="h-8 w-px bg-white/10" />
                          <div>
                            <h4 className="text-[15px] font-bold text-white group-hover:text-indigo-400 transition-colors capitalize">{session.type}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] text-slate-500 capitalize">{session.company}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-700" />
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold uppercase text-slate-400">
                                <PersonaIcon size={9} className={session.persona?.toLowerCase() === "hostile" ? "text-rose-400" : "text-slate-400"} /> {session.persona}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-8 text-right">
                          <div className="hidden sm:block">
                            <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-0.5">ELO Δ</div>
                            <div className={`text-sm font-mono font-bold ${session.eloDelta.includes('+') ? 'text-emerald-400' : session.eloDelta.includes('-') ? 'text-rose-400' : 'text-slate-500'}`}>{session.eloDelta || "—"}</div>
                          </div>
                          <div className="hidden sm:block">
                            <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-0.5">Score</div>
                            <div className="text-sm font-mono font-bold text-white">{session.score}</div>
                          </div>
                          <div className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-black transition-all shrink-0">
                            <Play size={12} className="fill-current ml-0.5" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {visibleLedgerCount < flightLedger.length ? (
                    <button
                      onClick={() => setVisibleLedgerCount((n) => n + 5)}
                      className="w-full p-4 border border-dashed border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02] rounded-xl flex items-center justify-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                    >
                      Load 5 more <span className="text-slate-600 normal-case font-medium">({flightLedger.length - visibleLedgerCount} remaining)</span>
                    </button>
                  ) : (
                    <div className="p-6 border border-dashed border-white/[0.06] rounded-xl flex flex-col items-center justify-center text-center gap-1">
                      <p className="text-xs font-medium text-slate-500">End of session history</p>
                    </div>
                  )}
                </div>
              )}
            </section>

          </div>

          {/* RIGHT RAIL */}
          <div className="w-full lg:w-[35%] flex flex-col gap-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto scrollbar-hide shrink-0">
            <AnimatePresence mode="wait">
              <motion.div key={activeTarget} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.3 }} className="w-full flex flex-col gap-6">

                {/* SCORE RADAR */}
                <TiltCard className="p-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Performance DNA</span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${hoveredSessionId ? "bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse" : "bg-white/5 text-slate-500 border-white/10"}`}>
                      {hoveredSessionId ? `Session #${hoveredSessionId}` : `${activeTarget} average`}
                    </span>
                  </div>

                  <div className="h-56 w-full -ml-2">
                    {radarLoading && !activeRadar ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">Loading...</div>
                    ) : activeRadar ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={activeRadar}>
                          <defs>
                            <radialGradient id="radarFillGradient" cx="50%" cy="50%" r="70%">
                              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.55} />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.12} />
                            </radialGradient>
                            <filter id="radarGlow" x="-50%" y="-50%" width="200%" height="200%">
                              <feGaussianBlur stdDeviation="3" result="blur" />
                              <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>
                          <PolarGrid stroke="rgba(255,255,255,0.1)" />
                          <PolarAngleAxis dataKey="dim" tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar
                            name="Score" dataKey="value" stroke="#818cf8" fill="url(#radarFillGradient)"
                            strokeWidth={2.5} filter="url(#radarGlow)"
                            fillOpacity={hoveredSessionId ? 0.9 : 0.75}
                            isAnimationActive animationDuration={550} animationEasing="ease-in-out"
                            dot={{ r: 3, fill: "#fff", stroke: "#818cf8", strokeWidth: 1.5 }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center px-6">No scored answers for {activeTarget} yet.</div>
                    )}
                  </div>

                  {strongest && weakest && (
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Trophy size={11} className="text-emerald-400" />
                          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">Strongest</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">{strongest.dim}</span>
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Target size={11} className="text-rose-400" />
                          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">Weakest</span>
                        </div>
                        <span className="text-xs font-bold text-rose-400 uppercase tracking-wide">{weakest.dim}</span>
                      </div>
                    </div>
                  )}
                </TiltCard>

                {/* GAP FIX QUEUE */}
                <TiltCard className="flex flex-col">
                  <div className="p-5 border-b border-white/[0.06] flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Gap Fix Queue</span>
                    {gapData.queue.length > 0 && <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-bold text-slate-500">{gapData.queue.length} FOUND</span>}
                  </div>
                  {gapLoading ? (
                    <div className="p-6 text-center text-xs text-slate-500">Loading...</div>
                  ) : gapData.queue.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-600">No gaps detected for {activeTarget}</p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-2">
                      {gapData.queue.map((item, idx) => (
                        <motion.div
                          key={item.gap}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                          onClick={() => setStudyPlanTopic(item.gap)}
                          className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.05] hover:border-white/15 hover:bg-white/[0.04] transition-colors group cursor-pointer"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[13px] font-bold text-slate-200 group-hover:text-white capitalize">{item.gap.replace(/_/g, " ")}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 border ${item.urgency === "critical" ? "bg-rose-500/20 text-rose-400 border-rose-500/20" : item.urgency === "high" ? "bg-amber-500/20 text-amber-400 border-amber-500/20" : "bg-white/5 text-slate-400 border-white/10"}`}>{item.urgency}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1.5 capitalize">{item.category || "General"} · seen {item.occurrences}x</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TiltCard>

                {/* KNOWLEDGE GRAPH COVERAGE — real, populates as new answers accrue topics_covered */}
                <TiltCard className="p-5">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Knowledge Graph Coverage</span>
                    {skillMatrix.total_topics > 0 && (
                      <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{skillMatrix.total_touched} / {skillMatrix.total_topics}</span>
                    )}
                  </div>
                  {matrixLoading ? (
                    <div className="text-xs text-slate-500 text-center py-4">Loading...</div>
                  ) : skillMatrix.total_touched === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-4">No topics tracked yet — complete a session to start building coverage.</div>
                  ) : (
                    <div className="space-y-2.5">
                      {skillMatrix.categories.map((cat) => (
                        <div key={cat.category} className="flex items-center gap-3">
                          <span className="w-24 text-[10px] font-bold text-slate-300 uppercase tracking-wider truncate shrink-0">{cat.category}</span>
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${cat.total > 0 ? Math.min(100, (cat.touched / cat.total) * 100) : 0}%` }} />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 w-10 text-right shrink-0">{cat.touched}/{cat.total}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </TiltCard>

                {/* TRACK SHORTCUTS */}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={onStartNew} className="py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-xs font-bold text-slate-300 transition-colors flex items-center justify-center gap-2">
                    <GitBranch size={14} className="text-blue-400" /> Track A <kbd className="hidden xl:inline-block font-mono text-[9px] text-slate-400 ml-1 bg-white/10 px-1 rounded">A</kbd>
                  </button>
                  <button onClick={onStartCoding} className="py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-xs font-bold text-slate-300 transition-colors flex items-center justify-center gap-2">
                    <Code2 size={14} className="text-amber-400" /> Track B <kbd className="hidden xl:inline-block font-mono text-[9px] text-slate-400 ml-1 bg-white/10 px-1 rounded">B</kbd>
                  </button>
                </div>

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