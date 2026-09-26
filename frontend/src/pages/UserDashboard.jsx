import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from "../lib/api";
import {
  motion, AnimatePresence, useMotionValue, useTransform, animate,
} from "motion/react";
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
import { AppHeader, PageIntro } from "../components/app/AppChrome";

import { COMPANIES as SHARED_COMPANIES } from '../constants/companies';
import { GlassCard as LiquidCard } from "../components/fx/LiquidGlass";

const TARGET_COMPANIES_FALLBACK = ["Google", "Amazon", "Meta", "Microsoft", "Apple"];


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
    <LiquidCard tilt={interactive} interactive={interactive} layout={layout} onClick={onClick} radius={10} className={className}>
      {children}
    </LiquidCard>
  );
}

function SkeletonLine({ className = "" }) {
  return <div className={`bg-white/[0.06] rounded-md animate-pulse ${className}`} />;
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 24, delay: Math.min(i, 3) * 0.05 } })
};

export default function UserDashboard({
  user, onStartNew, onStartCoding, onNavigateHistory,
  onNavigateSettings, onNavigateStudyPlan, onLogout, onOpenCommandPalette, onEloUpdate
}) {
  const [companies, setCompanies] = useState(TARGET_COMPANIES_FALLBACK);
  const [activeTarget, setActiveTarget] = useState("Meta");
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

  useEffect(() => {
    api.get(`/health`, { timeout: 5000 })
      .then((res) => setSystemStatus(res.data?.status === "ok" ? "ok" : "degraded"))
      .catch(() => setSystemStatus("degraded"));
  }, []);

    useEffect(() => {
    api.get(`/user/profile-summary`)
      .then((res) => {
        const realElo = res.data?.elo_rating;
        if (typeof realElo === "number" && Math.round(realElo) !== Math.round(user?.elo_rating || 1200)) {
          onEloUpdate?.(realElo);
        }
      })
      .catch((err) => console.warn("Could not verify current ELO:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await api.get(`/companies`);
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
        const res = await api.get(`/user/activity`);
        const activity = res.data.activity || [];

        const ledger = activity.map((e) => ({
          id: `${e.track}-${e.id}`,
          track: e.track,
          date: e.timestamp ? new Date(e.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—",
          type: e.track === "interview" ? (e.role || "Session") : (e.problem_title || "Coding"),
          company: e.track === "interview" ? (e.company_target || "—") : "—",
          eloDelta: e.elo_delta != null ? `${e.elo_delta >= 0 ? "+" : ""}${e.elo_delta}` : "",
          eloBefore: e.elo_before,
          eloAfter: e.elo_after,
          score: e.track === "interview" ? e.score : (e.tests_total ? Math.round((e.tests_passed / e.tests_total) * 100) : null),
          persona: e.track === "interview" ? (e.persona || "").toLowerCase() : null,
          language: e.track === "coding" ? e.language : null,
        }));
        setFlightLedger(ledger);
        setSessionDates(activity.filter((e) => e.timestamp).map((e) => new Date(e.timestamp)));

        const trend = activity
          .filter((e) => e.elo_after != null)
          .slice()
          .reverse()
          .map((e) => ({
            date: e.timestamp ? new Date(e.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
            rawDate: e.timestamp ? new Date(e.timestamp) : null,
            elo: Math.round(e.elo_after),
          }));
        const deduped = trend.reduce((acc, point) => {
          if (acc.length > 0 && acc[acc.length - 1].date === point.date) acc[acc.length - 1] = point;
          else acc.push(point);
          return acc;
        }, []);
        setEloHistory(deduped);
      } catch (err) {
        console.warn("Could not load activity history:", err);
      }
      setLoadingSessions(false);
    }
    fetchSessions();
  }, [user]);

  useEffect(() => {
    async function fetchCompanyData() {
      setRadarLoading(true);
      setGapLoading(true);
      try {
        const [radarRes, gapRes] = await Promise.all([
          api.get(`/user/skill-radar`, { params: { company: activeTarget.toLowerCase() } }),
          api.get(`/user/gap-queue`, { params: { company: activeTarget.toLowerCase() } }),
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

  const recentFive = flightLedger.slice(0, 5);
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div ref={mainRef} className="relative min-h-screen overflow-x-clip bg-transparent font-sans text-slate-200 selection:bg-indigo-500/40">

      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 2s infinite linear; }
        .font-display { font-family: var(--font-sans); font-weight: 600; letter-spacing: -0.04em; }
      `}</style>

      <AppHeader />

      <PageIntro
        index="01"
        label="Overview"
        title={`${getGreeting()}, ${firstName}.`}
        subtitle={weakest ? `Your weakest dimension right now is ${weakest.dim}. Today's plan starts there.` : "Your rating, your gaps and what to practise next, all from your real sessions."}
        aside={
          <div className="w-full max-w-md space-y-4 lg:w-[380px]">
            <div className="flex items-center gap-2">
              <span className={`h-[7px] w-[7px] ${systemStatus === "ok" ? "bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]" : systemStatus === "degraded" ? "bg-rose-400" : "bg-slate-500"}`} />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/45">
                {systemStatus === "ok" ? "All systems operational" : systemStatus === "degraded" ? "Backend degraded" : "Checking backend…"}
              </span>
            </div>
            <div>
              <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/40">Target company</p>
              <div className="flex flex-wrap gap-1.5">
                {companies.map((c) => {
                  const isActive = activeTarget === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setActiveTarget(c)}
                      className={`border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors ${isActive ? "border-indigo-400/60 bg-indigo-500/15 text-white" : "border-white/10 text-white/45 hover:border-white/25 hover:text-white/80"}`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        }
      />

      <main className="relative z-20 mx-auto max-w-[1280px] border-x border-white/[0.08] px-4 pb-20 pt-8 md:px-8">

        {/* BENTO LAYOUT — explicit flex columns, not implicit CSS Grid
            row-span/col-span combos (that caused the overlap + dead-space
            bug in the previous version). Left column height is driven by
            its own content (ELO card + Action card stacked with real
            gap-5); right column's Critical Gap card matches that height
            via h-full on a flex row, so there's no forced empty space. */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ amount: 0.12 }} custom={1} className="flex flex-col md:flex-row gap-5 mb-8 items-start">

          {/* LEFT: ELO hero + Recommended Action, stacked */}
          <div className="w-full md:w-2/3 flex flex-col gap-5">
            <GlassCard className="p-6 border-l-[3px]! !border-l-indigo-500/50">
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
                <span className="font-display text-[40px] leading-none text-white"><RollingNumber value={currentElo} /></span>
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

            <GlassCard className="p-6 border-l-[3px]! !border-l-white">
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
                className="relative overflow-hidden w-full btn-liquid py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.12)]"
              >
                <div className="absolute inset-0 w-full h-full bg-linear-to-r from-transparent via-black/10 to-transparent -translate-x-full hover:animate-shimmer" />
                <Play size={11} className="fill-current" /> {gapData.critical_gap ? "Study This Gap" : "Launch Session"}
              </motion.button>
            </GlassCard>
          </div>

          {/* RIGHT: Critical Gap — Von Restorff amber treatment, height
              now genuinely matches the left column via flex stretch,
              no more forced dead space */}
          <div className="w-full md:w-1/3">
            <GlassCard layout className="p-6 !bg-amber-500/[0.045] !border-amber-500/25 border-l-[3px]! !border-l-amber-500 shadow-[0_0_30px_-10px_rgba(245,158,11,0.15)]">
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
                    className="relative w-full btn-liquid py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 mt-4"
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
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ amount: 0.12 }} custom={4} className="mb-8">
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/[0.15]">
              <ChartNoAxesCombined size={14} className="text-indigo-300 shrink-0" />
              <p className="text-xs text-indigo-200/80">{personaInsight}</p>
            </div>
          </motion.div>
        )}

        {/* ELO TRAJECTORY — with real Personal Best marker */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ amount: 0.12 }} custom={5}>
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
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ amount: 0.12 }} custom={6}>
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
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ amount: 0.12 }} custom={7}>
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

          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ amount: 0.12 }} custom={8}>
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
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ amount: 0.12 }} custom={9}>
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
                    const isCoding = session.track === "coding";
                    const persona = !isCoding ? (PERSONA_STYLE[session.persona] || PERSONA_STYLE.standard) : null;
                    const PersonaIcon = persona?.icon;
                    const companyDisplay = isCoding ? "Coding" : session.company.charAt(0).toUpperCase() + session.company.slice(1);
                    return (
                      <motion.div
                        key={session.id}
                        layout
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 24, delay: idx * 0.05 }}
                        whileHover={{ x: 3 }}
                        onClick={() => onNavigateHistory?.(session.id)}
                        className="grid grid-cols-[1fr_auto] md:grid-cols-[70px_1fr_100px_70px_70px_90px] gap-3 md:gap-0 items-center px-3 py-3 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer"
                      >
                        <span className="hidden md:block font-mono text-[10px] font-semibold text-slate-500">{session.date}</span>
                        <div className="flex min-w-0 items-center gap-3">
                          {/* Colored accent ring using each company's real
                              brand-adjacent color — no ambiguous single
                              letters, and no trademarked logos pulled in
                              without licensing. */}
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 ring-1 ring-white/10"
                            style={{ background: isCoding ? "rgba(168,85,247,0.15)" : (COMPANY_ICONS[session.company.toLowerCase()] ? `${COMPANY_ICONS[session.company.toLowerCase()].color}1A` : "rgba(99,102,241,0.1)") }}
                          >
                            {isCoding ? (
                              <Code2 size={12} className="text-purple-300" />
                            ) : COMPANY_ICONS[session.company.toLowerCase()] ? (
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
                          {isCoding ? (
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wide px-2 py-1 rounded-full border bg-purple-500/[0.08] border-purple-500/20 text-purple-300 whitespace-nowrap">
                              {session.language || "—"}
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wide px-2 py-1 rounded-full border bg-white/[0.04] whitespace-nowrap ${persona.color}`}>
                              <PersonaIcon size={10} className="shrink-0" /> {session.persona || "—"}
                            </span>
                          )}
                        </div>
                        <div className="hidden md:flex md:flex-col md:items-end">
                          {session.eloBefore != null && session.eloAfter != null ? (
                            <>
                              <span className={`font-mono text-[13px] font-bold tabular-nums ${session.eloDelta.includes('+') ? 'text-emerald-400' : session.eloDelta.includes('-') ? 'text-rose-400' : 'text-slate-600'}`}>{session.eloDelta}</span>
                              <span className="font-mono text-[9px] text-slate-600 tabular-nums">{Math.round(session.eloBefore)} → {Math.round(session.eloAfter)}</span>
                            </>
                          ) : (
                            <span className="font-mono text-[13px] font-bold text-slate-600">—</span>
                          )}
                        </div>
                        <span className="block font-mono text-[13px] font-bold text-right tabular-nums">{session.score != null ? <>{session.score}<span className="text-[10px] text-slate-500">/100</span></> : <span className="text-slate-600">—</span>}</span>
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
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ amount: 0.12 }} custom={10} className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

      <AnimatePresence>
        {studyPlanTopic && (
          <StudyPlan topicName={studyPlanTopic} company={activeTarget.toLowerCase()} onClose={() => setStudyPlanTopic(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}