import React, { useState, useEffect } from "react";
import api from "../lib/api";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import {
  ChevronLeft, ChevronRight, AlertTriangle, Terminal, Target, ArrowRight,
  MessageSquare, ListVideo, Sparkles, XCircle, CheckCircle2, Search
} from "lucide-react";
import StudyPlan from "./StudyPlan";

function AnimatedScore({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => v.toFixed(1));
  const [display, setDisplay] = useState("0.0");
  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on("change", setDisplay);
    return () => { controls.stop(); unsub(); };
  }, [value, count, rounded]);
  return <>{display}</>;
}

// Explicit color lookup — never build Tailwind classes with template
// literals; the build-time scanner drops runtime-interpolated class names.
const THEME_COLORS = {
  emerald: { text: "#34d399", badgeBg: "rgba(16,185,129,0.1)", badgeBorder: "rgba(16,185,129,0.2)", dotBg: "#34d399", glow: "rgba(16,185,129,0.14)", bar: "#10b981" },
  amber:   { text: "#fbbf24", badgeBg: "rgba(245,158,11,0.1)", badgeBorder: "rgba(245,158,11,0.2)", dotBg: "#fbbf24", glow: "rgba(245,158,11,0.14)", bar: "#f59e0b" },
  rose:    { text: "#fb7185", badgeBg: "rgba(244,63,94,0.1)",  badgeBorder: "rgba(244,63,94,0.2)",  dotBg: "#fb7185", glow: "rgba(244,63,94,0.14)", bar: "#f87171" },
};
function themeFor(score) {
  if (score >= 8.0) return THEME_COLORS.emerald;
  if (score >= 6.0) return THEME_COLORS.amber;
  return THEME_COLORS.rose;
}
function signalLabel(score) {
  if (score >= 8.0) return "Strong";
  if (score >= 6.0) return "Mixed";
  return "Needs work";
}

function scoreOf(qn) {
  if (!qn?.scores) return null;
  const s = qn.scores;
  return Math.round(((s.score_technical + s.score_communication + s.score_problem_solving + s.score_cultural_fit + s.score_confidence) / 5) * 10) / 10;
}

export default function ReplayViewer({ sessionId, onExit, onSelectSession }) {
  const [sessionList, setSessionList] = useState(null);
  const [replay, setReplay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);
  const [studyPlanTopic, setStudyPlanTopic] = useState(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState("All");
  const [sortMode, setSortMode] = useState("recent"); // "recent" | "strongest" | "weakest"

  useEffect(() => {
    async function fetchSessionList() {
      try {
        const res = await api.get(`/user/sessions`);
        setSessionList(res.data.sessions || []);
      } catch (err) { setSessionList([]); }
      setLoading(false);
    }
    async function fetchReplay() {
      try {
        const res = await api.get(`/replay/${sessionId}`);
        setReplay(res.data);
      } catch (err) { console.error("Failed to retrieve session replay:", err); }
      setLoading(false);
    }
    if (sessionId) { fetchReplay(); } else { fetchSessionList(); }
  }, [sessionId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!replay?.questions) return;
      const total = replay.questions.length;
      if (e.key === 'ArrowRight' || ((e.metaKey || e.ctrlKey) && e.key === 'Enter')) {
        e.preventDefault(); setSelected(s => Math.min(total - 1, s + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault(); setSelected(s => Math.max(0, s - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [replay]);

  const noiseSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.1 } })
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-canvas flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-label-3">
          <span className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-caption font-medium text-label-2">Loading sessions…</span>
        </div>
      </div>
    );
  }

  // ==================== SESSION LIST (unchanged, already real & good) ====================
  if (!sessionId) {
    const filteredSessions = (sessionList || []).filter((s) => {
      const q = filterQuery.toLowerCase();
      const matchQuery = !q || (s.company_target || "").toLowerCase().includes(q) || (s.role || "").toLowerCase().includes(q);
      const matchTab = activeFilterTab === "All" ||
        (s.company_target || "").toLowerCase() === activeFilterTab.toLowerCase();
      return matchQuery && matchTab;
    });

    // ── DATA FIX: real chronological ELO delta, not a hardcoded 1200 baseline ──
    // Sort oldest→newest so each session's delta = elo_after[i] - elo_after[i-1].
    // The endpoint caps at 20 sessions, so the oldest one in this window has no
    // prior session to diff against — label it "Baseline", never fabricate a number.
    const chronological = [...filteredSessions].sort(
      (a, b) => new Date(a.started_at || 0) - new Date(b.started_at || 0)
    );
    const withDeltas = chronological.map((s, i) => {
      if (i === 0 || s.elo_after == null) return { ...s, eloDelta: null };
      const prev = chronological[i - 1].elo_after;
      return { ...s, eloDelta: prev != null ? Math.round(s.elo_after - prev) : null };
    });
    const netEloReal =
      withDeltas.length > 1 && withDeltas[0].elo_after != null && withDeltas[withDeltas.length - 1].elo_after != null
        ? Math.round(withDeltas[withDeltas.length - 1].elo_after - withDeltas[0].elo_after)
        : null;

    function scoreBand(score) {
      if (score == null) return "mid";
      if (score >= 80) return "hi";
      if (score >= 50) return "mid";
      return "lo";
    }
    const BAND_STYLE = {
      hi:  { border: "border-l-emerald-500", text: "text-emerald-400", badgeBg: "bg-emerald-500/10", badgeBorder: "border-emerald-500/20", bar: "bg-emerald-500" },
      mid: { border: "border-l-amber-500",   text: "text-amber-400",   badgeBg: "bg-amber-500/10",   badgeBorder: "border-amber-500/20",   bar: "bg-amber-500" },
      lo:  { border: "border-l-rose-500",    text: "text-rose-400",    badgeBg: "bg-rose-500/10",    badgeBorder: "border-rose-500/20",    bar: "bg-rose-500" },
    };

    // Re-sort for display per the active tab — all off the same real fields
    let displayList = [...withDeltas].reverse(); // newest-first by default
    if (sortMode === "strongest" || sortMode === "weakest") {
      const scored = displayList.filter((s) => s.score != null);
      const unscored = displayList.filter((s) => s.score == null);
      scored.sort((a, b) => (sortMode === "strongest" ? b.score - a.score : a.score - b.score));
      displayList = [...scored, ...unscored];
    }
    const [featured, ...gridList] = displayList;
    const featuredLabel =
      sortMode === "strongest" ? "Top session" : sortMode === "weakest" ? "Lowest score" : "Latest session";

    const companies = Array.from(new Set((sessionList || []).map((s) => s.company_target).filter(Boolean)));

    return (
      <div className="min-h-screen w-full bg-canvas text-label font-sans flex flex-col relative overflow-hidden">
        <div className="fixed inset-0 z-10 pointer-events-none opacity-[0.03] mix-blend-soft-light" style={{ backgroundImage: noiseSvg }} />
        <header className="h-16 border-b border-hairline bg-canvas/60 backdrop-blur-2xl flex items-center justify-between px-6 lg:px-10 z-30">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-accent text-white flex items-center justify-center font-bold text-[10px] shadow-[0_0_15px_rgba(41,151,255,0.4)]">IC</div>
            <span className="font-semibold text-white tracking-tight text-sm flex items-center gap-2">
              InterviewCoach <span className="text-label-3 font-normal">/</span> <span className="text-label-2">Session history</span>
            </span>
          </div>
          {onExit && (
            <button onClick={onExit} className="flex items-center gap-2 text-caption font-medium text-label-2 hover:text-white transition-colors bg-white/[0.02] border border-hairline px-3.5 py-1.5 rounded-lg hover:bg-white/[0.05]">
              <ChevronLeft size={14} /> Dashboard
            </button>
          )}
        </header>
        <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 lg:p-10 relative z-20 overflow-y-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <ListVideo className="text-accent" size={24} />
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Session history</h1>
              </div>
              <span className="bg-accent/10 border border-accent/20 text-accent tabular-nums text-[10px] font-bold px-2.5 py-0.5 rounded-full tabular-nums">
                {filteredSessions.length} Sessions
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Real Net ELO over the visible window, chronologically correct, honestly labeled */}
              <div className="flex items-center gap-3 bg-white/[0.02] border border-hairline rounded-lg pl-3 pr-2 py-1.5">
                <div className="flex flex-col items-end leading-tight">
                  <span className="text-caption font-medium text-label-3">Net ELO (last {filteredSessions.length})</span>
                  <span className={`text-sm tabular-nums font-bold tabular-nums ${netEloReal == null ? "text-label-3" : netEloReal >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {netEloReal == null ? "—" : `${netEloReal >= 0 ? "+" : ""}${netEloReal}`}
                  </span>
                </div>
                <div className="w-20 h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={withDeltas.map((s) => ({ elo: s.elo_after }))}>
                      <Line type="monotone" dataKey="elo" stroke={netEloReal >= 0 ? "#34d399" : "#fb7185"} strokeWidth={1.75} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="relative group w-48 sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-label-3" />
                <input type="text" placeholder="Search company, role..." value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full bg-white/[0.02] border border-hairline rounded-lg py-1.5 pl-9 pr-4 text-xs font-medium text-white focus:outline-none focus:border-accent transition-colors placeholder-slate-600 shadow-inner" />
              </div>
            </div>
          </motion.div>

          {/* Sort + company filter — real data-driven filtering, not decorative tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <div className="flex items-center bg-white/[0.02] border border-hairline p-1 rounded-lg">
              {[["recent", "Recent"], ["strongest", "Strongest"], ["weakest", "Weakest"]].map(([key, label]) => (
                <button key={key} onClick={() => setSortMode(key)}
                  className={`px-3 py-1 text-caption font-medium rounded-md transition-all outline-none ${sortMode === key ? "bg-accent text-white shadow-sm" : "text-label-3 hover:text-label-2"}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 ml-auto">
              <button onClick={() => setActiveFilterTab("All")}
                className={`px-2.5 py-1 text-caption font-medium rounded-md border transition-all ${activeFilterTab === "All" ? "bg-white/[0.1] border-white/20 text-white" : "bg-white/[0.02] border-hairline text-label-3 hover:text-label-2"}`}>
                All
              </button>
              {companies.map((co) => (
                <button key={co} onClick={() => setActiveFilterTab(co)}
                  className={`px-2.5 py-1 text-caption font-medium rounded-md border transition-all ${activeFilterTab === co ? "bg-white/[0.1] border-white/20 text-white" : "bg-white/[0.02] border-hairline text-label-3 hover:text-label-2"}`}>
                  {co}
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm font-medium text-label-2 mb-8">Pick a session to replay it question by question.</p>

          {!displayList.length ? (
            <div className="p-16 border border-hairline border-dashed rounded-2xl text-center text-label-3 text-sm font-medium bg-white/[0.02] flex flex-col items-center gap-2">
              <Search size={22} className="text-label-3" />
              No sessions match your filter.
            </div>
          ) : (
            <>
              {/* Featured card — most relevant session for the active sort mode, real data only */}
              {featured && (() => {
                const band = scoreBand(featured.score);
                const style = BAND_STYLE[band];
                const companyName = featured.company_target
                  ? featured.company_target.charAt(0).toUpperCase() + featured.company_target.slice(1)
                  : "Company";
                return (
                  <motion.div
                    key={featured.id}
                    initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -3 }}
                    onClick={() => onSelectSession?.(featured.id)}
                    className={`relative rounded-2xl bg-surface border border-hairline p-6 lg:p-7 mb-4 cursor-pointer backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_50px_-10px_rgba(0,0,0,0.6)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),_0_28px_60px_-10px_rgba(0,0,0,0.7)] transition-shadow group`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-lg bg-slate-700 shadow-inner">
                          {companyName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-caption font-medium text-label-3">{featuredLabel}</span>
                            <span className={`text-[10px] tabular-nums font-bold px-2 py-0.5 rounded-full border ${style.badgeBg} ${style.badgeBorder} ${style.text}`}>
                              {featured.score != null ? `Score ${featured.score}` : "Incomplete"}
                            </span>
                          </div>
                          <h2 className="text-xl font-extrabold text-white tracking-tight">{companyName} · {featured.role || "Role not set"}</h2>
                          <div className="flex items-center gap-2 mt-1 text-xs text-label-2">
                            <span>{featured.started_at ? new Date(featured.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
                            {featured.persona && <><span className="text-label-3">·</span><span className="text-caption bg-white/[0.04] border border-hairline px-1.5 py-0.5 rounded">{featured.persona}</span></>}
                            <span className="text-label-3">·</span>
                            <span className="tabular-nums">{featured.question_count > 0 ? `${featured.question_count} question${featured.question_count !== 1 ? "s" : ""} scored` : "No nodes scored"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-caption font-medium text-label-3 mb-1">ELO Delta</div>
                        {featured.eloDelta == null ? (
                          <span className="text-sm tabular-nums font-bold text-label-3 italic" title="Oldest session in this window — no prior session to diff against">Baseline</span>
                        ) : (
                          <span className={`text-lg tabular-nums font-bold tabular-nums ${featured.eloDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {featured.eloDelta >= 0 ? "+" : ""}{featured.eloDelta}
                          </span>
                        )}
                        {featured.elo_after != null && <div className="text-[10px] text-label-3 tabular-nums">→ {Math.round(featured.elo_after)}</div>}
                      </div>
                    </div>

                    {featured.score != null && (
                      <div className="mt-5">
                        <div className="flex justify-between mb-1.5">
                          <span className="text-caption font-medium text-label-3">Aggregate Score</span>
                          <span className={`text-xs tabular-nums font-bold tabular-nums ${style.text}`}>{featured.score} / 100</span>
                        </div>
                        <div className="h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${featured.score}%` }} transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} className={`h-full rounded-full ${style.bar}`} />
                        </div>
                        <p className="text-[10px] text-label-3 italic mt-1.5">Open the session to see every question and score.</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-5">
                      <button className="relative overflow-hidden flex items-center gap-2 bg-white text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-slate-200 active:scale-[0.98] transition-all group/btn">
                        <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500 bg-gradient-to-r from-transparent via-black/10 to-transparent" />
                        <span className="relative">Continue Reviewing</span>
                        <ArrowRight size={12} className="relative" />
                      </button>
                      <span className="text-[11px] text-label-3 tabular-nums">Session #{featured.id}</span>
                    </div>
                  </motion.div>
                );
              })()}

              {/* Grid of remaining sessions — colored by real score band, not decoration */}
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {gridList.map((s, i) => {
                    const band = scoreBand(s.score);
                    const style = BAND_STYLE[band];
                    const companyName = s.company_target ? s.company_target.charAt(0).toUpperCase() + s.company_target.slice(1) : "Company";
                    return (
                      <motion.div key={s.id} layout
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.4, delay: 0.05 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} onClick={() => onSelectSession?.(s.id)}
                        className={`relative rounded-2xl bg-surface border border-hairline p-5 flex flex-col justify-between h-[152px] group cursor-pointer overflow-hidden backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)] hover:border-white/[0.12] transition-colors`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-sm bg-slate-700 shadow-inner">{companyName.charAt(0)}</div>
                            <div>
                              <h3 className="text-sm font-bold text-white tracking-tight leading-tight group-hover:text-accent transition-colors">{companyName}</h3>
                              <p className="text-[11px] font-medium text-label-2">{s.role || "Role not set"}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] tabular-nums font-bold px-1.5 py-0.5 rounded border ${style.badgeBg} ${style.badgeBorder} ${style.text} tabular-nums`}>
                            {s.score != null ? s.score : "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          {s.eloDelta == null ? (
                            <span className="text-xs tabular-nums font-bold text-label-3 italic">Baseline</span>
                          ) : (
                            <span className={`text-xs tabular-nums font-bold tabular-nums ${s.eloDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {s.eloDelta >= 0 ? "+" : ""}{s.eloDelta}
                            </span>
                          )}
                          {s.persona && <span className="text-caption text-label-3 bg-white/[0.04] border border-hairline px-1.5 py-0.5 rounded">{s.persona}</span>}
                        </div>
                        <div className="flex justify-between items-end w-full pt-3 mt-auto border-t border-hairline">
                          <span className="text-caption font-medium text-label-3 flex items-center gap-2 tabular-nums">
                            #{s.id} <span className="w-1 h-1 bg-slate-600 rounded-full" /> {s.started_at ? new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                          </span>
                          <div className="text-caption font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            Open <ArrowRight size={11} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </>
          )}
          <footer className="mt-16 pt-6 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] tabular-nums text-label-3">
            <div>InterviewCoach</div>
          </footer>
        </main>
      </div>
    );
  }

  if (!replay || replay.error || !replay.questions?.length) {
    return (
      <div className="h-screen w-full bg-canvas flex items-center justify-center font-sans">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto"><AlertTriangle size={24} /></div>
          <h2 className="text-lg font-bold text-white tracking-tight">Session Not Found</h2>
          <p className="text-xs text-label-2 font-medium leading-relaxed">Unable to load data for Session #{sessionId}. Verify network connection or select another record.</p>
          {onExit && <button onClick={onExit} className="mt-4 px-6 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] border border-hairline rounded-xl text-xs font-bold text-white transition-all">Return to Dashboard</button>}
        </div>
      </div>
    );
  }

  // ==================== DETAIL VIEW — real replay data ====================
  const totalNodes = replay.questions.length;
  const q = replay.questions[selected] || {};
  const ovNum = scoreOf(q) ?? 0;
  const theme = themeFor(ovNum);
  const scoredCount = replay.questions.filter(qn => qn.scores).length;

  const trajectoryData = replay.questions.map((qn, idx) => ({
    node: `Q${idx + 1}`,
    score: scoreOf(qn),
  }));
  const scoredScores = trajectoryData.filter(d => d.score != null).map(d => d.score);
  const avgScore = scoredScores.length > 0 ? (scoredScores.reduce((a, b) => a + b, 0) / scoredScores.length).toFixed(1) : null;

  // Real gaps only, single location on the page — no duplicate list.
  const realGaps = q.gaps?.length > 0 ? q.gaps.map(gap => ({
    title: gap.gap.replace(/_/g, " "),
    prereqs: gap.prerequisites_to_study_first || [],
    text: gap.prerequisites_to_study_first?.length > 0
      ? `Prerequisite dependencies detected: ${gap.prerequisites_to_study_first.join(", ")}.`
      : "Trade-off reasoning was underdeveloped for this response.",
  })) : [];

  const hasElo = replay.elo_before != null && replay.elo_after != null;

  return (
    <div className="h-screen w-full bg-canvas text-label font-sans flex flex-col overflow-hidden selection:bg-accent/30 relative">
      <div className="fixed inset-0 z-10 pointer-events-none opacity-[0.03] mix-blend-soft-light" style={{ backgroundImage: noiseSvg }} />

      <header className="h-14 border-b border-hairline bg-canvas/60 backdrop-blur-2xl flex items-center justify-between px-6 z-50 flex-shrink-0 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-accent flex items-center justify-center font-bold text-white text-[10px] shadow-[0_0_15px_rgba(41,151,255,0.4)]">IC</div>
            <span className="text-white text-sm font-semibold tracking-tight hidden sm:block">InterviewCoach</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2 tabular-nums text-xs">
            <span className="text-label font-medium">{replay.company || "Company"}</span>
            <span className="text-label-3">&gt;</span>
            <span className="text-label-2 font-medium">{replay.role || "Role"}</span>
            <span className="text-label-3">&gt;</span>
            <span className="text-accent font-medium bg-accent/10 border border-accent/20 px-2 py-0.5 rounded text-caption shadow-sm">Replays</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 tabular-nums text-xs">
            <span className="text-label-3 font-medium hidden md:inline">Questions</span>
            <div className="flex items-center gap-1 bg-white/[0.03] border border-hairline px-2 py-1 rounded">
              {replay.questions.map((qn, idx) => {
                const isScored = !!qn.scores;
                const isActive = selected === idx;
                return (
                  <button key={idx} onClick={() => setSelected(idx)}
                    className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all outline-none border ${
                      isActive ? 'bg-accent text-white shadow-sm border-accent' :
                      isScored ? 'text-label-2 border-emerald-500/30 hover:bg-white/5' :
                      'text-label-3 border-dashed border-white/15 hover:bg-white/5'
                    }`}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <button onClick={onExit} className="flex items-center gap-1.5 text-caption font-medium text-label-2 hover:text-white transition-colors bg-white/[0.04] border border-hairline px-3.5 py-1.5 rounded-lg hover:bg-white/[0.08] outline-none">
            <ChevronLeft size={14} /> Exit Replay
          </button>
        </div>
      </header>

      <main className="flex-1 w-full flex justify-center overflow-y-auto scrollbar-hide relative z-20 bg-transparent">
        <div className="max-w-[1500px] w-full px-6 lg:px-10 py-8 flex flex-col lg:flex-row items-start gap-8">

          <div className="w-full lg:w-[65%] flex flex-col gap-6 shrink-0 pb-32">
            <AnimatePresence mode="wait">
              <motion.div key={selected} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3, ease: "easeOut" }} className="flex flex-col gap-6">

                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} className="flex items-center gap-3">
                  <div className="w-px h-7" style={{ background: `linear-gradient(to bottom, transparent, ${theme.dotBg}99, transparent)` }} />
                  <span className="text-caption font-medium text-label-3">
                    Question {selected + 1} of {totalNodes}
                  </span>
                  <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-caption font-medium text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {scoredCount} of {totalNodes} scored
                  </span>
                </motion.div>

                {/* SCORE CARD — single instance, real dimension breakdown */}
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1}
                  className="rounded-2xl bg-surface border border-hairline p-6 md:p-8 relative overflow-hidden backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]">
                  {q.scores ? (
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-[9.5px] font-medium text-label-3">Score</span>
                          <span className="inline-flex items-center gap-1.5 text-[9.5px] font-medium px-2.5 py-1 rounded-full border"
                            style={{ background: theme.badgeBg, borderColor: theme.badgeBorder, color: theme.text }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.dotBg }} />
                            {signalLabel(ovNum)}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-4">
                          <span className="text-5xl font-black tabular-nums tracking-tight" style={{ color: theme.text }}>
                            <AnimatedScore value={ovNum} />
                          </span>
                          <span className="text-lg text-label-3 font-normal">/ 10</span>
                        </div>
                        <p className="text-sm leading-relaxed text-label-2 max-w-[520px]">
                          {q.scores.overall_summary || "Diagnostic review complete for this interview node."}
                        </p>
                      </div>
                      <div className="min-w-[240px]">
                        <p className="text-[9.5px] font-medium text-label-3 mb-3">Per-Dimension Breakdown</p>
                        <div className="flex flex-col">
                          {[
                            { name: "Technical Accuracy", value: q.scores.score_technical },
                            { name: "Communication", value: q.scores.score_communication },
                            { name: "Problem Solving", value: q.scores.score_problem_solving },
                            { name: "Culture Fit", value: q.scores.score_cultural_fit },
                            { name: "Confidence", value: q.scores.score_confidence },
                          ].map((d, i) => {
                            const dt = themeFor(d.value);
                            return (
                              <div key={d.name} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center py-2.5 border-b border-hairline last:border-0">
                                <span className="text-xs font-medium text-label-2">{d.name}</span>
                                <div className="w-[90px] h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
                                  <motion.div className="h-full rounded-full" style={{ background: dt.bar }}
                                    initial={{ width: 0 }} animate={{ width: `${(d.value / 10) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.05 }} />
                                </div>
                                <span className="text-xs tabular-nums font-bold text-right min-w-[28px]" style={{ color: dt.text }}>{d.value.toFixed(1)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <span className="text-5xl font-black tabular-nums text-label-3 block mb-3">—</span>
                      <p className="text-xs text-label-3">This node has not been scored yet. Complete the interview session to generate scores.</p>
                    </div>
                  )}
                </motion.div>

                {/* QUESTION */}
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2}
                  className="rounded-2xl bg-surface border border-hairline p-6 md:p-8 space-y-5 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between border-b border-hairline pb-4">
                    <div className="flex items-center gap-2.5">
                      <Terminal size={16} className="text-accent" />
                      <h3 className="text-xs font-medium text-label-2">The Question</h3>
                    </div>
                    {q.category && (
                      <span className="text-caption bg-white/5 text-label-2 border border-hairline px-2 py-0.5 rounded font-medium">{q.category}</span>
                    )}
                  </div>
                  {q.scenario && (
                    <div className="space-y-1.5">
                      <span className="text-caption font-medium text-accent block">Situation</span>
                      <p className="text-sm text-label-2 leading-relaxed">{q.scenario}</p>
                    </div>
                  )}
                  {q.ask && (
                    <div className="p-4 rounded-xl bg-white/[0.04] border-l-2" style={{ borderColor: theme.dotBg }}>
                      <span className="text-caption font-medium text-accent block mb-1.5">The Ask</span>
                      <p className="text-sm font-bold text-white leading-relaxed">{q.ask}</p>
                    </div>
                  )}
                  {q.constraints?.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-caption font-medium text-blue-400 block">Constraints</span>
                      <ul className="space-y-2">
                        {q.constraints.map((c, i) => (
                          <li key={i} className="text-sm text-label-2 flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent/70 mt-1.5 shrink-0" /> {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!q.scenario && !q.ask && <p className="text-sm text-label-2">{q.question}</p>}
                </motion.div>

                {/* SUBMITTED ANSWER */}
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}
                  className="rounded-2xl bg-surface border border-hairline p-6 md:p-8 space-y-4 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between border-b border-hairline pb-4">
                    <div className="flex items-center gap-2.5">
                      <MessageSquare size={16} className="text-label-2" />
                      <h3 className="text-xs font-medium text-label-2">Candidate Submitted Response</h3>
                    </div>
                    <span className="text-caption text-label-2 bg-white/5 border border-hairline px-2 py-0.5 rounded font-medium">
                      {q.answer ? `${q.answer.length.toLocaleString()} CHARS` : "No data"}
                    </span>
                  </div>
                  <div className="bg-surface border border-hairline p-5 rounded-xl tabular-nums text-sm text-label leading-[1.8] whitespace-pre-wrap shadow-inner max-h-[340px] overflow-y-auto scrollbar-hide">
                    {q.answer || "[No candidate response recorded for this node]"}
                  </div>
                </motion.div>

                {/* DETECTED GAPS — single location on the page */}
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}
                  className="rounded-2xl bg-surface border border-hairline p-6 md:p-8 space-y-5 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between border-b border-hairline pb-4">
                    <div>
                      <h3 className="text-xs font-medium text-label-2 flex items-center gap-2.5">
                        <Sparkles size={16} className="text-accent" /> Detected Gaps
                      </h3>
                      <p className="text-[11px] text-label-3 mt-1">From scoring pipeline · this node only</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {realGaps.length > 0 ? (
                        <span className="text-caption text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded font-medium">{realGaps.length} DETECTED</span>
                      ) : (
                        <span className="text-caption text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded font-medium">0 GAPS</span>
                      )}
                      {realGaps.length > 0 && (
                        <button onClick={() => setStudyPlanTopic(realGaps[0].title)}
                          className="text-caption font-medium text-accent border border-accent/25 bg-accent/[0.08] px-2.5 py-1 rounded hover:bg-accent/[0.16] transition-colors">
                          Knowledge Graph →
                        </button>
                      )}
                    </div>
                  </div>

                  {realGaps.length > 0 ? (
                    <div className="space-y-3">
                      {realGaps.map((gap, idx) => (
                        <div key={idx} onClick={() => setStudyPlanTopic(gap.title)}
                          className="bg-surface border border-rose-500/20 p-4 rounded-xl space-y-2 relative overflow-hidden group cursor-pointer hover:border-rose-500/35 transition-colors">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500/50" />
                          <div className="flex items-center justify-between pl-2">
                            <span className="text-sm font-bold text-white flex items-center gap-2 capitalize">
                              <XCircle size={16} className="text-rose-400 shrink-0" /> {gap.title}
                            </span>
                            <span className="text-caption bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-medium">Gap Detected</span>
                          </div>
                          <p className="text-sm text-label-2 leading-relaxed pl-8">{gap.text}</p>
                          {gap.prereqs.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pl-8 pt-1">
                              {gap.prereqs.map((p, i) => (
                                <span key={i} className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-hairline text-label-2 flex items-center gap-1">
                                  <ArrowRight size={9} className="opacity-50" /> {p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : q.scores ? (
                    <div className="text-center py-6">
                      <CheckCircle2 size={22} className="text-emerald-500/50 mx-auto mb-2" />
                      <p className="text-sm font-bold text-label-2">No gaps detected for this node</p>
                      <p className="text-xs text-label-3 mt-1">Scoring pipeline found all expected signals present in your answer.</p>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm font-bold text-label-3">Gap detection pending</p>
                      <p className="text-xs text-label-3 mt-1">Complete this node to generate gap analysis.</p>
                    </div>
                  )}
                </motion.div>

              </motion.div>
            </AnimatePresence>

            <footer className="pt-6 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] tabular-nums text-label-3">
              <div>InterviewCoach</div>
            </footer>
          </div>

          {/* SIDEBAR — Radar + Trajectory + optional real ELO */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.25 }}
            className="w-full lg:w-[35%] flex flex-col gap-5 lg:sticky lg:top-6 pb-32">

            {q.scores && (
              <div className="rounded-2xl bg-surface border border-hairline p-5 space-y-2 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-caption font-medium text-label-2">5D Skill Profile</h3>
                  <span className="text-caption bg-white/5 text-label-2 border border-hairline px-2 py-0.5 rounded font-medium">Question {selected + 1}</span>
                </div>
                <div className="w-full h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={[
                      { dim: "Tech", value: q.scores.score_technical },
                      { dim: "Comm", value: q.scores.score_communication },
                      { dim: "Prob", value: q.scores.score_problem_solving },
                      { dim: "Cult", value: q.scores.score_cultural_fit },
                      { dim: "Conf", value: q.scores.score_confidence },
                    ]}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="dim" tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: "bold" }} />
                      <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                      <Radar dataKey="value" stroke="#2997FF" fill="#2997FF" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                {(() => {
                  const dims = [
                    { name: "Technical", value: q.scores.score_technical }, { name: "Communication", value: q.scores.score_communication },
                    { name: "Problem Solving", value: q.scores.score_problem_solving }, { name: "Culture Fit", value: q.scores.score_cultural_fit },
                    { name: "Confidence", value: q.scores.score_confidence },
                  ];
                  const best = dims.reduce((a, b) => (b.value > a.value ? b : a));
                  const worst = dims.reduce((a, b) => (b.value < a.value ? b : a));
                  return (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2.5 rounded-lg bg-white/[0.03] border border-hairline">
                        <p className="text-caption font-medium text-label-3 mb-0.5">Strongest</p>
                        <p className="text-xs font-bold text-emerald-400">{best.name}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/[0.03] border border-hairline">
                        <p className="text-caption font-medium text-label-3 mb-0.5">Needs Work</p>
                        <p className="text-xs font-bold text-rose-400">{worst.name}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="rounded-2xl bg-surface border border-hairline p-5 space-y-1 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-caption font-medium text-label-2">Session Trajectory</h3>
                <span className="text-[10px] tabular-nums text-white font-bold bg-white/5 border border-hairline px-2 py-0.5 rounded">{avgScore ? `AVG ${avgScore}` : "AVG —"}</span>
              </div>
              <p className="text-[10.5px] text-label-3">{scoredCount} of {totalNodes} questions scored</p>
              <div className="w-full h-36 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trajectoryData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <XAxis dataKey="node" tick={{ fill: "#64748b", fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} dy={8} />
                    <YAxis domain={[0, 10]} tick={{ fill: "#64748b", fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} ticks={[0, 5, 10]} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <Tooltip contentStyle={{ backgroundColor: "#0A0A0E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px", color: "#fff" }}
                      formatter={(v) => v == null ? ["Not scored yet"] : [v.toFixed(1)]} />
                    <Line type="monotone" dataKey="score" stroke="#2997FF" strokeWidth={2} connectNulls={false}
                      dot={{ fill: "#2997FF", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#fff", stroke: "#2997FF", strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {hasElo && (
              <div className="rounded-2xl bg-surface border border-hairline p-5 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]">
                <p className="text-caption font-medium text-label-2 mb-2.5">ELO This Session</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black tabular-nums text-white">{Math.round(replay.elo_after)}</span>
                  <span className={`text-xs tabular-nums font-bold px-2.5 py-1 rounded-lg border ${replay.elo_after >= replay.elo_before ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-rose-500/10 border-rose-500/25 text-rose-400"}`}>
                    {replay.elo_after >= replay.elo_before ? "+" : ""}{Math.round(replay.elo_after - replay.elo_before)}
                  </span>
                </div>
              </div>
            )}

          </motion.div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 h-16 bg-canvas/80 backdrop-blur-2xl border-t border-hairline flex items-center justify-between px-6 lg:px-10 z-50 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-4">
          <span className="text-label-3 text-caption font-medium">Question</span>
          <div className="flex items-center gap-1.5 bg-white/5 border border-hairline px-3 py-1 rounded-md text-white font-bold tabular-nums text-sm shadow-inner">
            {selected + 1} <span className="text-label-3 font-normal">/</span> {totalNodes}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setSelected(s => Math.max(0, s - 1))} disabled={selected === 0}
            className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-hairline text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all outline-none flex items-center gap-2">
            <ChevronLeft size={14} /> Previous
          </button>
          <button onClick={() => setSelected(s => Math.min(totalNodes - 1, s + 1))} disabled={selected === totalNodes - 1}
            className="px-5 py-2.5 rounded-lg bg-white text-black hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all outline-none flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.15)]">
            Next question <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {studyPlanTopic && (
          <StudyPlan topicName={studyPlanTopic} company={replay.company?.toLowerCase()} onClose={() => setStudyPlanTopic(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}