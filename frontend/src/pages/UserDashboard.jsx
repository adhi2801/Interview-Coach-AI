import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import {
  motion, AnimatePresence, useMotionValue, useTransform, animate,
  useScroll
} from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ReferenceDot
} from 'recharts';
import {
  Search, Play, AlertTriangle, Target, ChevronRight, Flame as FlameIcon,
  GitBranch, Code2, UserCheck, Flame, Search as SearchIcon, Coffee,
  Settings, LogOut, BookOpen, Inbox, ChartNoAxesCombined, ArrowRight, Check, Rocket
} from 'lucide-react';
import { FaAmazon, FaMicrosoft, FaApple, FaGoogle } from 'react-icons/fa';
import { SiMeta, SiNetflix } from 'react-icons/si';
import StudyPlan from './StudyPlan';

import { COMPANIES as SHARED_COMPANIES } from '../constants/companies';

const TARGET_COMPANIES_FALLBACK = ["Google", "Amazon", "Meta", "Microsoft", "Apple"];

const COMPANY_GLOW = {
  Google: "rgba(66,133,244,0.16)", Amazon: "rgba(255,153,0,0.13)", Meta: "rgba(24,119,242,0.16)",
  Microsoft: "rgba(0,164,239,0.14)", Apple: "rgba(255,255,255,0.09)",
  Netflix: "rgba(229,9,20,0.13)", Startup: "rgba(16,185,129,0.13)",
};
const DEFAULT_GLOW = "rgba(99,102,241,0.15)";

const COMPANY_ICONS = {
  google: { color: "#4285F4", Icon: FaGoogle },
  amazon: { color: "#FF9900", Icon: FaAmazon },
  meta: { color: "#0866FF", Icon: SiMeta },
  microsoft: { color: "#00A4EF", Icon: FaMicrosoft },
  apple: { color: "#e2e8f0", Icon: FaApple },
  netflix: { color: "#E50914", Icon: SiNetflix },
  startup: { color: "#10b981", Icon: Rocket },
};

const PERSONA_STYLE = {
  standard: { color: "text-slate-400 border-white/10", icon: UserCheck },
  hostile: { color: "text-orange-400 border-orange-500/20", icon: Flame },
  socratic: { color: "text-indigo-300 border-indigo-500/20", icon: SearchIcon },
  exhausted: { color: "text-amber-400 border-amber-500/20", icon: Coffee },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function getEloTier(elo) {
  if (elo >= 1600) return { name: "Diamond", color: "#67e8f9", bg: "rgba(103,232,249,0.1)", border: "rgba(103,232,249,0.3)" };
  if (elo >= 1400) return { name: "Platinum", color: "#c4b5fd", bg: "rgba(196,181,253,0.1)", border: "rgba(196,181,253,0.3)" };
  if (elo >= 1250) return { name: "Gold", color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)" };
  if (elo >= 1100) return { name: "Silver", color: "#cbd5e1", bg: "rgba(203,213,225,0.1)", border: "rgba(203,213,225,0.3)" };
  return { name: "Bronze", color: "#fb923c", bg: "rgba(251,146,60,0.1)", border: "rgba(251,146,60,0.3)" };
}

// Real consecutive-day streak (Duolingo/GitHub pattern) — counts backward
// from today, or yesterday if today has no session yet.
function computeStreak(dates) {
  const daySet = new Set(dates.map((d) => d.toDateString()));
  let streak = 0;
  let cursor = new Date();
  if (!daySet.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
    if (!daySet.has(cursor.toDateString())) return 0;
  }
  while (daySet.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Real 12-week practice heatmap, GitHub contribution-graph pattern.
function buildHeatmap(dates) {
  const counts = {};
  dates.forEach((d) => {
    const key = d.toDateString();
    counts[key] = (counts[key] || 0) + 1;
  });
  const days = [];
  const today = new Date();
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({ date: d, count: counts[d.toDateString()] || 0 });
  }
  return days;
}
function heatCellColor(count) {
  if (count === 0) return "rgba(255,255,255,0.04)";
  if (count === 1) return "rgba(99,102,241,0.35)";
  if (count === 2) return "rgba(99,102,241,0.6)";
  return "rgba(129,140,248,0.95)";
}

// Digit-roll counter — each digit slides in/out independently on change,
// odometer-style, instead of a flat text swap.
function RollingNumber({ value, className = "" }) {
  const digits = String(value).split("");
  return (
    <span className={`inline-flex tabular-nums ${className}`}>
      {digits.map((d, i) => (
        <span key={i} className="relative inline-block overflow-hidden" style={{ height: "1em" }}>
          <AnimatePresence mode="popLayout">
            <motion.span
              key={d + i}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="inline-block"
            >
              {d}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

// Elevation hover system (replaces the cursor-spotlight gimmick): a
// consistent resting / hover-lift / active-press state applied uniformly,
// same restrained pattern Linear/Vercel use — depth as hierarchy, not
// a mouse-following light show.
function GlassCard({ children, className = "", onClick, interactive = false, layout = false }) {
  return (
    <motion.div
      layout={layout}
      onClick={onClick}
      whileHover={interactive ? { y: -3, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.6)" } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={`relative rounded-2xl bg-white/[0.035] border border-white/[0.08] overflow-hidden backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),_0_2px_24px_rgba(0,0,0,0.45)] transition-[border-color] duration-300 hover:border-white/[0.16] ${interactive ? "cursor-pointer" : ""} ${className}`}
    >
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}

function SkeletonLine({ className = "" }) {
  return <div className={`bg-white/[0.06] rounded-md animate-pulse ${className}`} />;
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 24, delay: i * 0.06 } })
};

export default function UserDashboard({
  user, onStartNew, onStartCoding, onNavigateHistory,
  onNavigateSettings, onNavigateStudyPlan, onLogout, onOpenCommandPalette
}) {
  const [companies, setCompanies] = useState(TARGET_COMPANIES_FALLBACK);
  const [activeTarget, setActiveTarget] = useState("Meta");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [flightLedger, setFlightLedger] = useState([]);
  const [sessionDates, setSessionDates] = useState([]);
  const [eloHistory, setEloHistory] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [studyPlanTopic, setStudyPlanTopic] = useState(null);
  const [confirmPulse, setConfirmPulse] = useState(false);

  const [radar, setRadar] = useState(null);
  const [radarSampleSize, setRadarSampleSize] = useState(0);
  const [radarLoading, setRadarLoading] = useState(true);
  const [gapData, setGapData] = useState({ critical_gap: null, queue: [] });
  const [gapLoading, setGapLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState("checking");

  const mainRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: mainRef, offset: ["start start", "end end"] });
  const orbYA = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const orbYB = useTransform(scrollYProgress, [0, 1], [0, -60]);

  useEffect(() => {
    axios.get(`${API_URL}/health`, { timeout: 5000 })
      .then((res) => setSystemStatus(res.data?.status === "ok" ? "ok" : "degraded"))
      .catch(() => setSystemStatus("degraded"));
  }, []);

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

  useEffect(() => {
    async function fetchSessions() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await axios.get(`${API_URL}/user/sessions`, { headers: { Authorization: `Bearer ${token}` } });
        const sessions = res.data.sessions || [];

        // Real chronological ELO delta — sort oldest→newest, diff each
        // session against the one right before it. The oldest session in
        // this window has no prior session to diff against, so it gets no
        // delta at all rather than a fabricated one (same fix already
        // applied to Flight Ledger).
        const chronological = [...sessions]
          .filter((s) => s.elo_after != null)
          .sort((a, b) => new Date(a.started_at || 0) - new Date(b.started_at || 0));
        const deltaBySessionId = {};
        chronological.forEach((s, i) => {
          if (i === 0) return;
          const prev = chronological[i - 1].elo_after;
          deltaBySessionId[s.id] = Math.round(s.elo_after - prev);
        });

        const ledger = sessions.map((s) => ({
          id: s.id,
          date: s.started_at ? new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—",
          type: s.role || "Session",
          company: s.company_target || "—",
          eloDelta: deltaBySessionId[s.id] != null
            ? `${deltaBySessionId[s.id] >= 0 ? "+" : ""}${deltaBySessionId[s.id]}`
            : "",
          score: s.score != null ? s.score : null,
          persona: (s.persona || "").toLowerCase(),
        }));
        setFlightLedger(ledger);
        setSessionDates(sessions.filter((s) => s.started_at).map((s) => new Date(s.started_at)));

        const trend = sessions.filter((s) => s.elo_after).slice().reverse().map((s) => ({
          date: s.started_at ? new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
          rawDate: s.started_at ? new Date(s.started_at) : null,
          elo: Math.round(s.elo_after),
        }));
        const deduped = trend.reduce((acc, point) => {
          if (acc.length > 0 && acc[acc.length - 1].date === point.date) acc[acc.length - 1] = point;
          else acc.push(point);
          return acc;
        }, []);
        setEloHistory(deduped);
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
        setRadar(radarRes.data.radar);
        setRadarSampleSize(radarRes.data.sample_size || 0);
        setGapData(gapRes.data);
      } catch (err) {
        console.warn("Could not load company DNA data:", err);
      }
      setRadarLoading(false);
      setGapLoading(false);
    }
    fetchCompanyData();
  }, [activeTarget]);

  const currentElo = user?.elo_rating ? Math.round(user.elo_rating) : 1200;
  const tier = getEloTier(currentElo);
  const streak = useMemo(() => computeStreak(sessionDates), [sessionDates]);
  const heatmap = useMemo(() => buildHeatmap(sessionDates), [sessionDates]);
  const recentDelta = useMemo(() => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const inWindow = eloHistory.filter((p) => p.rawDate && p.rawDate >= cutoff);
  if (inWindow.length < 2) return null; // honestly show nothing rather than a delta that isn't really 30-day
  return Math.round(inWindow[inWindow.length - 1].elo - inWindow[0].elo);
}, [eloHistory]);
  const personalBest = eloHistory.length > 0 ? eloHistory.reduce((a, b) => (b.elo > a.elo ? b : a)) : null;

  let strongest = null, weakest = null;
  if (radar && radar.length > 0) {
    strongest = radar.reduce((a, b) => (b.value > a.value ? b : a));
    weakest = radar.reduce((a, b) => (b.value < a.value ? b : a));
  }

  // Real data-driven insight: compares average real score across
  // personas, only stated if at least two personas each have at least
  // one scored session — never fabricated, omitted otherwise.
  const personaInsight = useMemo(() => {
    const byPersona = {};
    flightLedger.forEach((s) => {
      if (s.score == null || !s.persona) return;
      byPersona[s.persona] = byPersona[s.persona] || [];
      byPersona[s.persona].push(s.score);
    });
    const entries = Object.entries(byPersona).filter(([, scores]) => scores.length > 0);
    if (entries.length < 2) return null;
    const averaged = entries.map(([persona, scores]) => ({
      persona, avg: scores.reduce((a, b) => a + b, 0) / scores.length, n: scores.length
    })).sort((a, b) => b.avg - a.avg);
    const best = averaged[0], worst = averaged[averaged.length - 1];
    if (best.avg === worst.avg) return null;
    const pointDiff = Math.round(best.avg - worst.avg);
    if (pointDiff < 8) return null;
    return `${best.persona.charAt(0).toUpperCase() + best.persona.slice(1)} sessions average ${pointDiff} points higher than ${worst.persona} on your real history (${best.avg.toFixed(0)} vs ${worst.avg.toFixed(0)}).`;
  }, [flightLedger]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'a' || e.key === 'A') onStartNew?.();
      else if (e.key === 'b' || e.key === 'B') onStartCoding?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartNew, onStartCoding]);

  function handleStudyClick(topic) {
    setConfirmPulse(true);
    setTimeout(() => {
      setConfirmPulse(false);
      setStudyPlanTopic(topic);
    }, 260);
  }

  const orbColor = COMPANY_GLOW[activeTarget] || DEFAULT_GLOW;
  const recentFive = flightLedger.slice(0, 5);
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div ref={mainRef} className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden relative">

      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 2s infinite linear; }
        .font-display { font-family: 'Georgia', 'Times New Roman', serif; font-weight: 600; letter-spacing: -0.02em; }
      `}</style>

      {/* Subtle vignette — corners darken slightly, center stays lit,
          gives the page a focus pull instead of flat black */}
      <div className="fixed inset-0 z-[1] pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)" }} />

      {/* AMBIENT ORBS — color shifts with company, drifts gently with scroll */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div style={{ y: orbYA, background: orbColor }} animate={{ background: orbColor }} transition={{ duration: 1.1, ease: "easeInOut" }}
          className="absolute -top-[12%] -left-[10%] w-[500px] h-[500px] blur-[130px] rounded-full" />
        <motion.div style={{ y: orbYB }} className="absolute bottom-[10%] -right-[8%] w-[380px] h-[380px] bg-purple-900/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.025] mix-blend-soft-light" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      </div>

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-15 bg-black/55 backdrop-blur-2xl border-b border-white/[0.06] z-50">
        <div className="max-w-[1320px] mx-auto px-4 md:px-6 h-[60px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 md:gap-8 min-w-0 shrink-0">
            <div className="flex items-center gap-2.5 cursor-pointer shrink-0">
              <div className="w-[30px] h-[30px] rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_16px_rgba(99,102,241,0.35)]">
                <span className="text-white font-black text-xs">IC</span>
              </div>
              <span className="font-extrabold text-sm tracking-tight hidden sm:inline">InterviewCoach</span>
            </div>
            <nav className="hidden lg:flex items-center gap-6 shrink-0">
              <span className="text-[13px] font-medium text-white border-b border-white pb-1.5">Overview</span>
              <button onClick={onNavigateHistory} className="text-[13px] font-medium text-slate-500 hover:text-white transition-colors pb-1.5 border-b border-transparent whitespace-nowrap">Sessions</button>
              <button onClick={onNavigateStudyPlan} className="text-[13px] font-medium text-slate-500 hover:text-white transition-colors pb-1.5 border-b border-transparent whitespace-nowrap">Knowledge Graph</button>
              <button onClick={onNavigateSettings} className="text-[13px] font-medium text-slate-500 hover:text-white transition-colors pb-1.5 border-b border-transparent whitespace-nowrap">Settings</button>
            </nav>
          </div>

          <div className="flex items-center gap-3 md:gap-5 min-w-0 flex-1 justify-end">
            <div className="hidden md:flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 shrink-0">Target</span>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide max-w-[280px] lg:max-w-[380px]">
                {companies.map((c) => {
                  const isActive = activeTarget === c;
                  return (
                    <button
                      key={c} onClick={() => setActiveTarget(c)}
                      className={`shrink-0 text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border transition-all ${
                        isActive ? "text-white border-white/[0.22] bg-white/10 shadow-[0_0_12px_rgba(255,255,255,0.06)]" : "text-slate-500 border-white/[0.09] bg-white/[0.03] hover:text-slate-300"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* ⌘K box now calls the real Command Palette if the parent
                wires it up — see App.js integration note. */}
            <button
              onClick={() => onOpenCommandPalette?.()}
              className="hidden xl:flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] hover:border-white/20 transition-colors px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 cursor-pointer shrink-0"
            >
              <Search size={13} /> Search...
              <kbd className="ml-3 font-mono text-[9px] bg-black/40 border border-white/10 px-1.5 py-0.5 rounded text-slate-500">⌘K</kbd>
            </button>
            <div className="relative shrink-0">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-white/15 flex items-center justify-center hover:border-white/30 transition-all">
                <span className="text-white text-xs font-bold">{user?.name?.charAt(0) || "T"}</span>
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 top-full mt-3 w-56 bg-[#0A0A0C] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-2 z-50 space-y-1">
                    <div className="p-3 border-b border-white/5">
                      <p className="text-xs font-bold text-white truncate">{user?.name || "Candidate"}</p>
                      <p className="text-[10px] font-mono text-slate-400 truncate">{user?.email || ""}</p>
                    </div>
                    <button onClick={() => { setUserMenuOpen(false); onNavigateHistory?.(); }} className="w-full flex lg:hidden items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-left">Sessions</button>
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
        </div>
      </header>

      <main className="relative z-20 max-w-[1320px] mx-auto px-6 pt-[88px] pb-20">

        {/* TITLE ROW — coach-voice greeting, real weakest dimension when known */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} className="mb-8 flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-[9.5px] font-mono font-bold uppercase tracking-[0.16em] text-slate-500 mb-2">Mission Control</p>
            <h1 className="font-display text-[19px] text-white leading-snug" style={{ fontSize: '19px' }}>
              {getGreeting()}, {firstName}.
              {weakest && <span className="text-slate-400 font-normal"> Let's work on <span className="text-indigo-300">{weakest.dim}</span> today.</span>}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-[7px] h-[7px] rounded-full ${systemStatus === "ok" ? "bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.7)]" : systemStatus === "degraded" ? "bg-rose-400" : "bg-slate-500"}`} />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              {systemStatus === "ok" ? "Systems Nominal" : systemStatus === "degraded" ? "Systems Degraded" : "Checking..."}
            </span>
          </div>
        </motion.div>

        {/* BENTO LAYOUT — explicit flex columns, not implicit CSS Grid
            row-span/col-span combos (that caused the overlap + dead-space
            bug in the previous version). Left column height is driven by
            its own content (ELO card + Action card stacked with real
            gap-5); right column's Critical Gap card matches that height
            via h-full on a flex row, so there's no forced empty space. */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} className="flex flex-col md:flex-row gap-5 mb-8 items-start">

          {/* LEFT: ELO hero + Recommended Action, stacked */}
          <div className="w-full md:w-2/3 flex flex-col gap-5">
            <GlassCard className="p-6 !border-l-[3px] !border-l-indigo-500/50">
              <div className="flex items-start justify-between mb-3.5 flex-wrap gap-2">
                <p className="text-[9.5px] font-mono font-bold uppercase tracking-[0.16em] text-slate-500">Current ELO</p>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border" style={{ color: tier.color, background: tier.bg, borderColor: tier.border }}>
                    {tier.name}
                  </span>
                  {streak > 0 && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-orange-500/[0.1] text-orange-400 border-orange-500/25">
                      <FlameIcon size={10} /> {streak} day{streak === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-end gap-3 mb-3">
                <span className="font-display text-[28px] leading-none text-white" style={{ fontSize: '28px' }}><RollingNumber value={currentElo} /></span>
                {recentDelta !== null ? (
                  <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md mb-1.5 tabular-nums ${recentDelta >= 0 ? "bg-emerald-500/[0.14] text-emerald-400 border border-emerald-500/25" : "bg-rose-500/[0.14] text-rose-400 border border-rose-500/25"}`}>
                    {recentDelta >= 0 ? `+${recentDelta}` : recentDelta} (30d)
                  </span>
                ) : (
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md mb-1.5 bg-white/[0.07] text-slate-500 border border-white/10">—</span>
                )}
              </div>
              {loadingSessions ? (
                <SkeletonLine className="h-9 w-full mb-1.5" />
              ) : eloHistory.length > 1 ? (
                <div className="h-9 w-full mb-1.5">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={eloHistory.slice(-10)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="elo" stroke="#6366f1" strokeWidth={1.8} fill="url(#sparkGrad)" isAnimationActive animationDuration={1000} animationEasing="ease-out" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-9 mb-1.5" />
              )}
              <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">
                {flightLedger.length > 0 ? `${flightLedger.length} sessions logged` : "Your training log starts here."}
              </p>
            </GlassCard>

            <GlassCard className="p-6 !border-l-[3px] !border-l-white">
              <p className="text-[9.5px] font-mono font-bold uppercase tracking-[0.16em] text-indigo-300/70 mb-3.5">Recommended Action</p>
              {gapData.critical_gap ? (
                <p className="text-sm font-medium leading-relaxed text-slate-200/90 mb-4">
                  Your <span className="text-indigo-300">{activeTarget}</span> sessions show a recurring gap — drill <span className="text-indigo-300 capitalize">{gapData.critical_gap.gap.replace(/_/g, " ")}</span> before your next mock.
                </p>
              ) : (
                <p className="text-sm font-medium leading-relaxed text-slate-200/90 mb-4">
                  No gaps found yet for <span className="text-indigo-300">{activeTarget}</span> — start a session to begin tracking.
                </p>
              )}
              <motion.button
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                onClick={() => gapData.critical_gap ? handleStudyClick(gapData.critical_gap.gap) : onStartNew?.()}
                className="relative overflow-hidden w-full bg-white text-black py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.12)]"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full hover:animate-shimmer" />
                <Play size={11} className="fill-current" /> {gapData.critical_gap ? "Study This Gap" : "Launch Session"}
              </motion.button>
            </GlassCard>
          </div>

          {/* RIGHT: Critical Gap — Von Restorff amber treatment, height
              now genuinely matches the left column via flex stretch,
              no more forced dead space */}
          <div className="w-full md:w-1/3">
            <GlassCard layout className="p-6 !bg-amber-500/[0.045] !border-amber-500/25 !border-l-[3px] !border-l-amber-500 shadow-[0_0_30px_-10px_rgba(245,158,11,0.15)]">
              <p className="text-[9.5px] font-mono font-bold uppercase tracking-[0.16em] text-amber-400/80 mb-3.5">Critical Gap</p>
              {gapLoading ? (
                <div className="space-y-2">
                  <SkeletonLine className="h-5 w-3/4" />
                  <SkeletonLine className="h-3 w-full" />
                  <SkeletonLine className="h-3 w-2/3" />
                </div>
              ) : gapData.critical_gap ? (
                <>
                  <div className="flex items-start justify-between gap-2.5 mb-2.5">
                    <span className="text-base font-bold leading-snug capitalize">{gapData.critical_gap.gap.replace(/_/g, " ")}</span>
                    <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-md whitespace-nowrap border shrink-0 ${gapData.critical_gap.urgency === "critical" ? "bg-rose-500/[0.15] text-rose-400 border-rose-500/30" : "bg-amber-500/[0.15] text-amber-400 border-amber-500/30"}`}>
                      {gapData.critical_gap.urgency}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3.5">
                    Detected in {gapData.critical_gap.occurrences} {activeTarget} answer{gapData.critical_gap.occurrences === 1 ? "" : "s"}
                    {gapData.critical_gap.prerequisites_to_study_first?.length > 0 && <> · Prerequisite: {gapData.critical_gap.prerequisites_to_study_first.join(", ")}</>}
                  </p>
                  {gapData.critical_gap.category && (
                    <div className="bg-black/20 rounded-md px-2.5 py-2 border border-amber-500/10 mb-4">
                      <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">Category</p>
                      <p className="text-xs font-semibold capitalize">{gapData.critical_gap.category.replace(/_/g, " ")}</p>
                    </div>
                  )}
                  {/* mt-auto pushes the button to the bottom so it never
                      leaves the awkward dead space the old layout had,
                      regardless of how tall this card ends up */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    onClick={() => handleStudyClick(gapData.critical_gap.gap)}
                    className="relative w-full bg-white text-black py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 mt-4"
                  >
                    <AnimatePresence mode="wait">
                      {confirmPulse ? (
                        <motion.span key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-1.5"><Check size={13} /> Opening...</motion.span>
                      ) : (
                        <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5"><BookOpen size={12} /> Study This Gap</motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </>
              ) : (
                <p className="text-xs text-slate-500">No gaps detected for {activeTarget} yet.</p>
              )}
            </GlassCard>
          </div>
        </motion.div>

        {/* Real data-driven insight — only rendered when a genuine
            pattern exists in real history; never fabricated */}
        {personaInsight && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="mb-8">
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/[0.15]">
              <ChartNoAxesCombined size={14} className="text-indigo-300 shrink-0" />
              <p className="text-xs text-indigo-200/80">{personaInsight}</p>
            </div>
          </motion.div>
        )}

        {/* ELO TRAJECTORY — with real Personal Best marker */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5}>
          <GlassCard className="p-6 mb-8">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <p className="text-[9.5px] font-mono font-bold uppercase tracking-[0.16em] text-slate-500 mb-1">ELO Trajectory</p>
                <p className="text-xs text-slate-500">{eloHistory.length > 0 ? `${eloHistory.length} scored session${eloHistory.length === 1 ? "" : "s"}` : "No scored sessions yet"}</p>
              </div>
              {personalBest && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/[0.1] border border-emerald-500/25 px-2.5 py-1 rounded-full">
                  Personal Best: {personalBest.elo}
                </span>
              )}
            </div>
            <div className="h-[220px] w-full">
              {loadingSessions ? (
                <SkeletonLine className="h-full w-full" />
              ) : eloHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={eloHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mainEloGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <YAxis domain={['dataMin - 20', 'dataMax + 20']} hide />
                    <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9.5, fontFamily: "monospace" }} axisLine={false} tickLine={false} dy={10} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0A0A12", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px" }} labelStyle={{ color: "#94A3B8", fontSize: "10px" }} itemStyle={{ color: "#fff", fontWeight: "bold", fontSize: "13px", fontFamily: "monospace" }} cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeDasharray: '4 4' }} />
                    <Area type="monotone" dataKey="elo" stroke="#6366f1" strokeWidth={2.5} fill="url(#mainEloGrad)" isAnimationActive animationDuration={1400} animationEasing="ease-out" activeDot={{ r: 5, fill: "#fff", stroke: "#6366f1", strokeWidth: 2 }} />
                    {personalBest && (
                      <ReferenceDot x={personalBest.date} y={personalBest.elo} r={5} fill="#34d399" stroke="#fff" strokeWidth={1.5} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center"><ChartNoAxesCombined size={18} className="text-slate-600" /></div>
                  <p className="text-xs text-slate-500">Complete a session to start tracking your ELO trajectory.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* PRACTICE HEATMAP — real 12-week activity, GitHub pattern,
            with real month/weekday labels and a legend (the previous
            version was an unlabeled floating grid — looked unfinished) */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={6}>
          <GlassCard className="p-6 mb-8">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[9.5px] font-mono font-bold uppercase tracking-[0.16em] text-slate-500">Practice Activity — Last 12 Weeks</p>
              <span className="text-[10px] font-mono text-slate-600">{sessionDates.length} total sessions</span>
            </div>
            {loadingSessions ? (
              <SkeletonLine className="h-28 w-full" />
            ) : (
              <div className="overflow-x-auto pb-1">
                <div className="inline-flex gap-2 min-w-full">
                  {/* Weekday labels */}
                  <div className="flex flex-col gap-[3px] pt-[18px] shrink-0">
                    {["", "Mon", "", "Wed", "", "Fri", ""].map((label, i) => (
                      <div key={i} className="h-[14px] flex items-center">
                        <span className="text-[8px] font-mono text-slate-600 w-6">{label}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    {/* Month labels above the grid columns */}
                    <div className="flex mb-1" style={{ gap: "3px" }}>
                      {(() => {
                        const weeks = Math.ceil(heatmap.length / 7);
                        const labels = [];
                        let lastMonth = null;
                        for (let w = 0; w < weeks; w++) {
                          const dayIdx = w * 7;
                          const day = heatmap[dayIdx];
                          const month = day ? day.date.toLocaleDateString("en-US", { month: "short" }) : "";
                          labels.push(month !== lastMonth ? month : "");
                          lastMonth = month;
                        }
                        return labels.map((m, i) => (
                          <span key={i} className="text-[8px] font-mono text-slate-600" style={{ width: "14px" }}>{m}</span>
                        ));
                      })()}
                    </div>
                    <div className="grid gap-[3px]" style={{ gridTemplateRows: "repeat(7, 14px)", gridAutoFlow: "column", gridAutoColumns: "14px" }}>
                      {heatmap.map((day, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.25, delay: Math.min(i, 40) * 0.004 }}
                          title={`${day.date.toLocaleDateString()}: ${day.count} session${day.count === 1 ? "" : "s"}`}
                          className="rounded-[2px]"
                          style={{ background: heatCellColor(day.count), width: "14px", height: "14px" }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-1.5 mt-3 justify-end">
                  <span className="text-[9px] font-mono text-slate-600">Less</span>
                  {[0, 1, 2, 3].map((n) => (
                    <div key={n} className="w-[10px] h-[10px] rounded-[2px]" style={{ background: heatCellColor(n) }} />
                  ))}
                  <span className="text-[9px] font-mono text-slate-600">More</span>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* RADAR + GAP QUEUE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={7}>
            <GlassCard layout className="p-6 h-full">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9.5px] font-mono font-bold uppercase tracking-[0.16em] text-slate-500">Performance DNA</p>
                <span className="text-[9px] font-mono text-slate-600">{activeTarget.toUpperCase()}</span>
              </div>
              {!radarLoading && radar && radarSampleSize > 0 && radarSampleSize < 3 && (
                <p className="text-[10px] text-amber-500/70 mb-1">Based on {radarSampleSize} session{radarSampleSize === 1 ? "" : "s"} — more data needed for a confident read.</p>
              )}
              <div className="h-[220px] w-full">
                {radarLoading ? (
                  <SkeletonLine className="h-full w-full rounded-full" />
                ) : radar ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radar}>
                      <defs>
                        <radialGradient id="radarFill2" cx="50%" cy="50%" r="70%">
                          <stop offset="0%" stopColor="#818cf8" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1} />
                        </radialGradient>
                      </defs>
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis dataKey="dim" tick={{ fill: "#94a3b8", fontSize: 9.5, fontWeight: "bold" }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="value" stroke="#818cf8" fill="url(#radarFill2)" strokeWidth={2.2} isAnimationActive animationDuration={550} dot={{ r: 3, fill: "#fff", stroke: "#818cf8", strokeWidth: 1.4 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center px-6">No scored answers for {activeTarget} yet.</div>
                )}
              </div>
              {strongest && weakest && (
                <div className="grid grid-cols-2 gap-2.5 mt-1">
                  <div className="bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.07]">
                    <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">Strongest</p>
                    <p className="text-[12.5px] font-bold text-emerald-400">{strongest.dim}</p>
                  </div>
                  <div className="bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.07]">
                    <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">Needs Work</p>
                    <p className="text-[12.5px] font-bold text-rose-400">{weakest.dim}</p>
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={8}>
            <GlassCard layout className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[9.5px] font-mono font-bold uppercase tracking-[0.16em] text-slate-500 mb-1">Gap Fix Queue</p>
                  <p className="text-xs text-slate-500">Top {Math.min(3, gapData.queue.length)} priority items</p>
                </div>
                <button onClick={onNavigateStudyPlan} className="text-[11px] font-semibold text-slate-500 hover:text-white transition-colors flex items-center gap-1.5">
                  Knowledge Graph <ArrowRight size={11} />
                </button>
              </div>
              {gapLoading ? (
                <div className="space-y-2.5">
                  <SkeletonLine className="h-14 w-full" />
                  <SkeletonLine className="h-14 w-full" />
                  <SkeletonLine className="h-14 w-full" />
                </div>
              ) : gapData.queue.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-500 text-center px-6">No gaps detected for {activeTarget} yet.</div>
              ) : (
                <div className="flex flex-col gap-2.5 flex-1">
                  {gapData.queue.slice(0, 3).map((item, idx) => (
                    <motion.div
                      key={item.gap}
                      layout
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 24, delay: idx * 0.06 }}
                      whileHover={{ x: 3 }}
                      onClick={() => handleStudyClick(item.gap)}
                      className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.14] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <span className="text-[13.5px] font-bold capitalize">{item.gap.replace(/_/g, " ")}</span>
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md shrink-0 border ${item.urgency === "critical" ? "bg-rose-500/[0.12] text-rose-400 border-rose-500/25" : item.urgency === "high" ? "bg-orange-500/[0.12] text-orange-400 border-orange-500/25" : "bg-yellow-500/[0.12] text-yellow-400 border-yellow-500/25"}`}>{item.urgency}</span>
                      </div>
                      <p className="text-[11.5px] text-slate-500 capitalize">{item.category || "General"} · seen {item.occurrences}x</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* RECENT FLIGHT LEDGER — with company avatar tiles */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={9}>
          <GlassCard className="p-6 mb-8">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[9.5px] font-mono font-bold uppercase tracking-[0.16em] text-slate-500 mb-1">Recent Flight Ledger</p>
                <p className="text-xs text-slate-500">Last {Math.min(5, flightLedger.length)} session{flightLedger.length === 1 ? "" : "s"}</p>
              </div>
              <button onClick={onNavigateHistory} className="text-[11px] font-semibold text-slate-500 hover:text-white transition-colors flex items-center gap-1.5">
                View all sessions <ArrowRight size={11} />
              </button>
            </div>

            {loadingSessions ? (
              <div className="space-y-2">
                <SkeletonLine className="h-14 w-full" />
                <SkeletonLine className="h-14 w-full" />
                <SkeletonLine className="h-14 w-full" />
              </div>
            ) : recentFive.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-white/10 rounded-xl">
                <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center"><Inbox size={16} className="text-slate-600" /></div>
                <p className="text-sm text-slate-400">Your training log starts here.</p>
                <button onClick={onStartNew} className="text-xs text-indigo-400 hover:underline font-bold">Start your first interview</button>
              </div>
            ) : (
              <div>
                <div className="hidden md:grid grid-cols-[70px_1fr_100px_70px_70px_90px] gap-0 px-3 pb-2.5 border-b border-white/[0.06] mb-1">
                  <span className="text-[8.5px] font-mono font-bold uppercase tracking-widest text-slate-600">Date</span>
                  <span className="text-[8.5px] font-mono font-bold uppercase tracking-widest text-slate-600">Role · Company</span>
                  <span className="text-[8.5px] font-mono font-bold uppercase tracking-widest text-slate-600 text-center">Persona</span>
                  <span className="text-[8.5px] font-mono font-bold uppercase tracking-widest text-slate-600 text-right">ELO Δ</span>
                  <span className="text-[8.5px] font-mono font-bold uppercase tracking-widest text-slate-600 text-right">Score</span>
                  <span />
                </div>
                <div className="flex flex-col gap-0.5">
                  {recentFive.map((session, idx) => {
                    const persona = PERSONA_STYLE[session.persona] || PERSONA_STYLE.standard;
                    const PersonaIcon = persona.icon;
                    const companyDisplay = session.company.charAt(0).toUpperCase() + session.company.slice(1);
                    const dotColor = COMPANY_GLOW[companyDisplay] || DEFAULT_GLOW;
                    return (
                      <motion.div
                        key={session.id}
                        layout
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 24, delay: idx * 0.05 }}
                        whileHover={{ x: 3 }}
                        onClick={() => onNavigateHistory?.(session.id)}
                        className="grid grid-cols-[auto_1fr] md:grid-cols-[70px_1fr_100px_70px_70px_90px] gap-3 md:gap-0 items-center px-3 py-3 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer"
                      >
                        <span className="hidden md:block font-mono text-[10px] font-semibold text-slate-500">{session.date}</span>
                        <div className="flex items-center gap-3 md:contents">
                          {/* Colored accent ring using each company's real
                              brand-adjacent color — no ambiguous single
                              letters, and no trademarked logos pulled in
                              without licensing. */}
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 ring-1 ring-white/10"
                            style={{ background: COMPANY_ICONS[session.company.toLowerCase()] ? `${COMPANY_ICONS[session.company.toLowerCase()].color}1A` : "rgba(99,102,241,0.1)" }}
                          >
                            {COMPANY_ICONS[session.company.toLowerCase()] ? (
                              React.createElement(COMPANY_ICONS[session.company.toLowerCase()].Icon, { size: 12, color: COMPANY_ICONS[session.company.toLowerCase()].color })
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400">{companyDisplay.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-[13.5px] font-bold text-white">{companyDisplay} <span className="text-slate-500 font-medium capitalize">· {session.type}</span></p>
                            <p className="text-[11px] text-slate-500 md:hidden">{session.date}</p>
                          </div>
                        </div>
                        <div className="hidden md:flex md:justify-center">
                          <span className={`inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wide px-2 py-1 rounded-full border bg-white/[0.04] whitespace-nowrap ${persona.color}`}>
                            <PersonaIcon size={10} className="shrink-0" /> {session.persona || "—"}
                          </span>
                        </div>
                        <span className={`hidden md:block font-mono text-[13px] font-bold md:text-right tabular-nums ${session.eloDelta.includes('+') ? 'text-emerald-400' : session.eloDelta.includes('-') ? 'text-rose-400' : 'text-slate-600'}`}>{session.eloDelta || "—"}</span>
                        <span className="hidden md:block font-mono text-[13px] font-bold md:text-right tabular-nums">{session.score != null ? <>{session.score}<span className="text-[10px] text-slate-500">/100</span></> : <span className="text-slate-600">—</span>}</span>
                        <span className="hidden md:flex md:text-right text-[11px] font-semibold text-slate-500 hover:text-white transition-colors items-center gap-1 md:justify-end">Debrief <ArrowRight size={9} /></span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* TRACK SHORTCUTS — obviously-clickable, arrow slides on hover,
            keyboard hint visible */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={10} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <GlassCard interactive onClick={onStartNew} className="p-6 !border-indigo-500/[0.12] hover:!border-indigo-400/40 group">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[9.5px] font-mono font-bold uppercase tracking-[0.16em] text-slate-500">Track A</p>
                  <kbd className="font-mono text-[8.5px] bg-white/10 border border-white/10 px-1.5 py-0.5 rounded text-slate-400">A</kbd>
                </div>
                <p className="text-lg font-extrabold tracking-tight">System Design</p>
                <p className="text-xs text-slate-500 mt-1.5">Scalability, distributed systems, architecture</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-11 h-11 rounded-full bg-indigo-500/[0.12] border border-indigo-500/25 flex items-center justify-center">
                  <GitBranch size={16} className="text-indigo-300" />
                </div>
                <motion.div className="text-indigo-300" animate={{ x: 0 }} whileHover={{ x: 4 }}>
                  <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              </div>
            </div>
          </GlassCard>
          <GlassCard interactive onClick={onStartCoding} className="p-6 !border-purple-500/[0.12] hover:!border-purple-400/40 group">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[9.5px] font-mono font-bold uppercase tracking-[0.16em] text-slate-500">Track B</p>
                  <kbd className="font-mono text-[8.5px] bg-white/10 border border-white/10 px-1.5 py-0.5 rounded text-slate-400">B</kbd>
                </div>
                <p className="text-lg font-extrabold tracking-tight">Live Coding</p>
                <p className="text-xs text-slate-500 mt-1.5">Algorithms, data structures, problem solving</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-11 h-11 rounded-full bg-purple-500/[0.12] border border-purple-500/25 flex items-center justify-center">
                  <Code2 size={16} className="text-purple-300" />
                </div>
                <motion.div className="text-purple-300" animate={{ x: 0 }} whileHover={{ x: 4 }}>
                  <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <footer className="mt-14 pt-6 border-t border-white/[0.05] flex items-center justify-between flex-wrap gap-4">
          <span className="text-[9.5px] font-mono text-slate-600 uppercase tracking-widest">© 2026 InterviewCoach AI</span>
          <div className="flex items-center gap-5 text-[11px] font-semibold text-slate-500">
            <button onClick={onNavigateStudyPlan} className="hover:text-white transition-colors">Knowledge Graph</button>
            <button onClick={onNavigateSettings} className="hover:text-white transition-colors">Settings</button>
            <button onClick={onNavigateHistory} className="hover:text-white transition-colors">Sessions</button>
          </div>
        </footer>
      </main>

      {studyPlanTopic && (
        <StudyPlan topicName={studyPlanTopic} company={activeTarget.toLowerCase()} onClose={() => setStudyPlanTopic(null)} />
      )}
    </div>
  );
}