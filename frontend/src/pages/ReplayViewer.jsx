import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import { 
  ChevronLeft, ChevronRight, AlertTriangle, Terminal, Activity, 
  Target, ArrowRight, MessageSquare, ListVideo, 
  Sparkles, CheckCircle2, XCircle, Code2, Cpu, ShieldAlert,
  Network, Search, Filter
} from "lucide-react";
import { API_URL } from "../config";
import StudyPlan from "./StudyPlan";

function AnimatedScore({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => v.toFixed(1));
  const [display, setDisplay] = useState("0.0");

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [value, count, rounded]);

  return <>{display}</>;
}

function parsePromptFallback(questionText, scenarioText, constraintsArray, askText, role = "", category = "") {
  const roleLower = role.toLowerCase();
  const categoryLower = category.toLowerCase();

  const isFrontend = roleLower.includes("frontend") || categoryLower.includes("frontend") || roleLower.includes("ui");
  const isBehavioral = categoryLower.includes("behavioral") || categoryLower.includes("leadership") || categoryLower.includes("management");
  const isSystems = roleLower.includes("systems") || roleLower.includes("architect") || categoryLower.includes("system");
  const isSecurity = roleLower.includes("security") || categoryLower.includes("security") || roleLower.includes("devops");

  let defaultActions = [
    "Big-O Time & Space Analysis",
    "Optimal Data Structure Selection",
    "Comprehensive Edge Case Coverage",
    "Memory Allocation & Garbage Collection Bounds"
  ];

  if (isFrontend) {
    defaultActions = [
      "Keyboard Navigation Compliance",
      "Screen Reader ARIA Attributes",
      "Launch Timeline Risk Triage",
      "Cross-Functional Partner Alignment"
    ];
  } else if (isBehavioral) {
    defaultActions = [
      "STAR Situation Framing",
      "Direct Ownership & Accountability",
      "Stakeholder Conflict Resolution",
      "Measurable Outcome Quantification"
    ];
  } else if (isSystems) {
    defaultActions = [
      "Distributed Consensus Justification",
      "High-Throughput Partitioning",
      "Failover & Redundancy Mechanics",
      "CAP Theorem Trade-Off Analysis"
    ];
  } else if (isSecurity) {
    defaultActions = [
      "Zero-Trust Access Control",
      "Input Sanitization & Validation",
      "Automated CI/CD Pipeline Scanning",
      "Observability & Audit Logging"
    ];
  }

  if (scenarioText || (constraintsArray && constraintsArray.length > 0) || askText) {
    return {
      scenario: scenarioText || questionText,
      constraints: constraintsArray || [],
      ask: askText || "",
      actions: defaultActions
    };
  }

  if (!questionText) return { scenario: "", constraints: [], ask: "", actions: defaultActions };

  const parts = questionText.split(/(?=\b(?:Constraints|Constraint|The Ask|Walk me through|How would you)\b)/i);
  if (parts.length > 1) {
    const scenario = parts[0].trim();
    const rest = parts.slice(1).join(" ");
    let ask = "";
    let constraints = [];

    const askMatch = rest.match(/(?:The Ask|Walk me through|How would you)[\s\S]*/i);
    if (askMatch) ask = askMatch[0].replace(/^The Ask:?\s*/i, "").trim();

    const constraintMatch = rest.match(/(?:Constraints|Constraint):?\s*([\s\S]*?)(?=(?:The Ask|Walk me through|How would you)|$)/i);
    if (constraintMatch && constraintMatch[1]) {
      constraints = constraintMatch[1].split(/(?:\r?\n|•|-|\*)+/).map(c => c.trim()).filter(c => c.length > 5);
    }

    return { 
      scenario: scenario || questionText, 
      constraints, 
      ask: ask || rest,
      actions: defaultActions
    };
  }

  return { 
    scenario: questionText, 
    constraints: [], 
    ask: "", 
    actions: defaultActions
  };
}

// Explicit color lookup — NEVER build Tailwind class names with template
// literals like `text-${theme}-400`. Tailwind's build-time class scanner
// only sees literal strings in source; runtime-interpolated class names
// are silently dropped from the production CSS bundle. This was the root
// cause of missing colors and the score-ring/text overlap on this page.
const THEME_COLORS = {
  emerald: {
    text: "#34d399", textSoft: "#6ee7b7",
    badgeBg: "rgba(16,185,129,0.1)", badgeBorder: "rgba(16,185,129,0.2)",
    dotBg: "#34d399", glow: "rgba(16,185,129,0.14)",
  },
  amber: {
    text: "#fbbf24", textSoft: "#fcd34d",
    badgeBg: "rgba(245,158,11,0.1)", badgeBorder: "rgba(245,158,11,0.2)",
    dotBg: "#fbbf24", glow: "rgba(245,158,11,0.14)",
  },
  rose: {
    text: "#fb7185", textSoft: "#fda4af",
    badgeBg: "rgba(244,63,94,0.1)", badgeBorder: "rgba(244,63,94,0.2)",
    dotBg: "#fb7185", glow: "rgba(244,63,94,0.14)",
  },
};

export default function ReplayViewer({ sessionId, onExit, onSelectSession }) {
  const [sessionList, setSessionList] = useState(null);
  const [replay, setReplay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);
  const [studyPlanTopic, setStudyPlanTopic] = useState(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState("All");

  useEffect(() => {
    async function fetchSessionList() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await axios.get(`${API_URL}/user/sessions`, { headers: { Authorization: `Bearer ${token}` } });
        setSessionList(res.data.sessions || []);
      } catch (err) {
        console.error("Failed to retrieve session list:", err);
        setSessionList([]);
      }
      setLoading(false);
    }

    async function fetchReplay() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await axios.get(`${API_URL}/replay/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
        setReplay(res.data);
      } catch (err) {
        console.error("Failed to retrieve session replay:", err);
      }
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

  // Cinematic reveal — same staggered fadeUp language as the InterviewRoom
  // debrief screen, so both pages feel like one product.
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.12 } })
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#000000] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <span className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Loading Session Ledger...</span>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    const filteredSessions = (sessionList || []).filter((s) => {
      const q = filterQuery.toLowerCase();
      const matchQuery = !q || (s.company_target || "").toLowerCase().includes(q) || (s.role || "").toLowerCase().includes(q);
      const matchTab = activeFilterTab === "All" || 
        (activeFilterTab === "FAANG" && ["google", "meta", "amazon", "apple", "netflix"].includes((s.company_target || "").toLowerCase())) ||
        (activeFilterTab === "Startup" && (s.company_target || "").toLowerCase() === "startup");
      return matchQuery && matchTab;
    });

    const netElo = filteredSessions.reduce((acc, s) => {
      const delta = s.elo_after ? Math.round(s.elo_after - 1200) : 0;
      return acc + delta;
    }, 0);

    return (
      <div className="min-h-screen w-full bg-[#000000] text-slate-200 font-sans flex flex-col relative overflow-hidden">
        {/* Seamless Lighting */}
        <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-900/15 blur-[150px] pointer-events-none rounded-full z-0" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-900/10 blur-[120px] pointer-events-none rounded-full z-0" />
        <div className="fixed inset-0 z-10 pointer-events-none opacity-[0.03] mix-blend-soft-light" style={{ backgroundImage: noiseSvg }} />

        {/* Global Header */}
        <header className="h-16 border-b border-white/[0.04] bg-[#000000]/60 backdrop-blur-2xl flex items-center justify-between px-6 lg:px-10 z-30">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shadow-[0_0_15px_rgba(99,102,241,0.4)]">IC</div>
            <span className="font-semibold text-white tracking-tight text-sm flex items-center gap-2">
              InterviewCoach <span className="text-slate-600 font-normal">/</span> <span className="text-slate-400">Flight Ledger</span>
            </span>
          </div>
          {onExit && (
            <button onClick={onExit} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors bg-white/[0.02] border border-white/[0.06] px-3.5 py-1.5 rounded-lg hover:bg-white/[0.05]">
              <ChevronLeft size={14} /> Dashboard
            </button>
          )}
        </header>

        <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 lg:p-10 relative z-20 overflow-y-auto">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <ListVideo className="text-indigo-400" size={24} />
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Flight Ledger</h1>
              </div>
              <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                {filteredSessions.length} Sessions
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                <Activity size={14} /> Net ELO {netElo >= 0 ? `+${netElo}` : netElo}
              </div>

              <div className="relative group w-48 sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search company, role..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg py-1.5 pl-9 pr-4 text-xs font-medium text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-slate-600 shadow-inner"
                />
              </div>

              <div className="flex items-center bg-white/[0.02] border border-white/[0.06] p-1 rounded-lg">
                {["All", "FAANG", "Startup"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilterTab(f)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all outline-none ${
                      activeFilterTab === f ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {f === "All" && <Filter size={12} className="inline-block mr-1.5 -mt-0.5" />}
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-sm font-medium text-slate-400 mb-8">Select a session to open the full audit trail and telemetry replay.</p>

          {!filteredSessions || filteredSessions.length === 0 ? (
            <div className="p-16 border border-white/10 border-dashed rounded-2xl text-center text-slate-500 text-sm font-medium bg-white/[0.02]">
              No sessions found matching criteria.
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence>
                {filteredSessions.map((s) => {
                  const eloDelta = s.elo_after ? Math.round(s.elo_after - 1200) : 0; 
                  const companyName = s.company_target ? s.company_target.charAt(0).toUpperCase() + s.company_target.slice(1) : "Company";
                  const roleName = s.role || "Role not set";
                  const init = companyName.charAt(0);
                  
                  const bgColors = { 'G': 'bg-blue-600', 'M': 'bg-blue-600', 'A': 'bg-amber-600', 'S': 'bg-indigo-600' };
                  const iconBg = bgColors[init] || 'bg-slate-600';

                  return (
                    <motion.div
                      key={s.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onSelectSession?.(s.id)}
                      className="relative rounded-2xl bg-[#08080C] border border-white/[0.06] p-6 flex flex-col justify-between h-40 group cursor-pointer overflow-hidden backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]"
                    >
                      <div className="flex justify-between items-start w-full">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-inner ${iconBg}`}>
                            {init}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white tracking-tight mb-0.5 group-hover:text-indigo-300 transition-colors">{companyName}</h3>
                            <p className="text-xs font-medium text-slate-400">{roleName}</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 flex items-center gap-1.5">
                            <Network size={10} /> {s.question_count || 0} Nodes
                          </span>
                          {s.elo_after != null && (
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                              eloDelta >= 0 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                            }`}>
                              {eloDelta >= 0 ? '↑' : '↓'} {Math.abs(eloDelta)} ELO
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-end w-full pt-4 mt-auto border-t border-white/[0.04]">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          SESSION #{s.id} <span className="w-1 h-1 bg-slate-600 rounded-full" /> {s.started_at ? new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                        </span>
                        <div className="text-[10px] font-bold text-indigo-400 opacity-0 group-hover:opacity-100 uppercase tracking-wider transition-opacity flex items-center gap-1">
                          Audit Ledger <ArrowRight size={12} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}

          {/* 1-LINE FOOTER */}
          <footer className="mt-16 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-slate-500">
            <div>© 2026 InterviewCoach AI &middot; Session Replay &amp; Telemetry Ledger</div>
          </footer>

        </main>
      </div>
    );
  }

  if (!replay || replay.error || !replay.questions?.length) {
    return (
      <div className="h-screen w-full bg-[#000000] flex items-center justify-center font-sans">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Session Not Found</h2>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Unable to load data for Session #{sessionId}. Verify network connection or select another record.</p>
          {onExit && (
            <button onClick={onExit} className="mt-4 px-6 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl text-xs font-bold text-white transition-all">
              Return to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  const q = replay.questions[selected] || {};
  const overall = q?.scores ? ((q.scores.score_technical + q.scores.score_communication + q.scores.score_problem_solving + q.scores.score_cultural_fit + q.scores.score_confidence) / 5).toFixed(1) : 0;
  const ovNum = parseFloat(overall || 0);
  const themeKey = ovNum >= 7.5 ? "emerald" : ovNum >= 5.0 ? "amber" : "rose";
  const theme = THEME_COLORS[themeKey];
  const statusLabel = ovNum >= 7.5 ? "STRONG SIGNAL" : ovNum >= 5.0 ? "MODERATE SIGNAL" : "CRITICAL GAP";
  const totalNodes = replay.questions.length;
  const parsedPrompt = parsePromptFallback(q.question, q.scenario, q.constraints, q.ask, replay.role || "", q.category || "");

  const attemptedNodes = replay.questions.filter(qn => qn.scores);
  const trajectoryData = attemptedNodes.map((qn, idx) => {
    const nodeScore = ((qn.scores.score_technical + qn.scores.score_communication + qn.scores.score_problem_solving + qn.scores.score_cultural_fit + qn.scores.score_confidence) / 5).toFixed(1);
    return {
      node: `Node ${idx + 1}`,
      score: parseFloat(nodeScore),
      target: 7.5
    };
  });

  const avgScore = attemptedNodes.length > 0 
    ? (trajectoryData.reduce((acc, curr) => acc + curr.score, 0) / trajectoryData.length).toFixed(2) 
    : "0.00";

  // Real gaps only — no fabricated fallback content. If the backend
  // returned no gaps for this node, we say so honestly instead of
  // inventing plausible-sounding placeholder feedback.
  const realGaps = q.gaps?.length > 0 ? q.gaps.map(gap => ({
    title: gap.gap.replace(/_/g, " "),
    text: gap.prerequisites_to_study_first?.length > 0 
      ? `Prerequisite dependencies detected: ${gap.prerequisites_to_study_first.join(", ")}.`
      : "Trade-off reasoning was underdeveloped for this response.",
  })) : [];

  return (
    <div className="h-screen w-full bg-[#000000] text-slate-100 font-sans flex flex-col overflow-hidden selection:bg-indigo-500/30 relative">
      
      {/* Seamless Lighting */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-900/10 blur-[150px] pointer-events-none rounded-full z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-900/10 blur-[120px] pointer-events-none rounded-full z-0" />
      <div className="fixed inset-0 z-10 pointer-events-none opacity-[0.03] mix-blend-soft-light" style={{ backgroundImage: noiseSvg }} />

      <header className="h-14 border-b border-white/[0.04] bg-[#000000]/60 backdrop-blur-2xl flex items-center justify-between px-6 z-50 flex-shrink-0 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center font-bold text-white text-[10px] shadow-[0_0_15px_rgba(79,70,229,0.4)]">IC</div>
            <span className="text-white text-sm font-semibold tracking-tight hidden sm:block">InterviewCoach</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-200 font-bold uppercase">{replay.company || "Company"}</span>
            <span className="text-slate-600">&gt;</span>
            <span className="text-slate-400 font-medium">{replay.role || "Role"}</span>
            <span className="text-slate-600">&gt;</span>
            <span className="text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] tracking-widest uppercase shadow-sm">
              REPLAY STUDIO
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-500 uppercase tracking-widest font-bold">Node Timeline</span>
            <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded">
              {replay.questions.map((qn, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelected(idx)}
                  className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all outline-none ${selected === idx ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <button onClick={onExit} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors bg-white/[0.04] border border-white/[0.06] px-3.5 py-1.5 rounded-lg hover:bg-white/[0.08] outline-none">
            <ChevronLeft size={14} /> Exit Replay
          </button>
        </div>
      </header>

      <main className="flex-1 w-full flex justify-center overflow-y-auto scrollbar-hide relative z-20 bg-transparent">
        <div className="max-w-[1500px] w-full px-6 lg:px-10 py-8 flex flex-col lg:flex-row items-start gap-8">
          
          <div className="w-full lg:w-[65%] flex flex-col gap-8 shrink-0 pb-32">
            
            <AnimatePresence mode="wait">
              <motion.div key={selected} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3, ease: "easeOut" }} className="space-y-8">

                <style>{`
                  @keyframes replayRingPulse { 0%, 100% { box-shadow: 0 0 20px var(--ring-glow, rgba(52,211,153,0.25)); } 50% { box-shadow: 0 0 38px var(--ring-glow, rgba(52,211,153,0.45)); } }
                `}</style>

                {/* SESSION LABEL — same pattern as the InterviewRoom debrief */}
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} className="flex items-center gap-3">
                  <div className="w-px h-7" style={{ background: `linear-gradient(to bottom, transparent, ${theme.dotBg}99, transparent)` }} />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-500">
                    Session Replay &middot; Node {selected + 1} of {totalNodes}
                  </span>
                </motion.div>

                {/* HERO VERDICT DECK — rebuilt with explicit color lookup and
                    a defined-width ring so it can never overlap the text
                    column, regardless of content length. */}
                <motion.div
                  variants={fadeUp} initial="hidden" animate="show" custom={1}
                  className="rounded-2xl bg-[#08080C] border border-white/[0.08] p-6 md:p-8 relative overflow-hidden backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]"
                >
                  <div
                    className="absolute -top-20 -right-20 w-64 h-64 blur-[100px] pointer-events-none rounded-full"
                    style={{ background: theme.glow }}
                  />
                  <div
                    className="absolute -bottom-16 -left-16 w-48 h-48 blur-[90px] pointer-events-none rounded-full"
                    style={{ background: "rgba(99,102,241,0.08)" }}
                  />

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 relative z-10">
                    <div
                      className="w-24 h-24 shrink-0 rounded-full border-[3px] border-[#111116] flex flex-col items-center justify-center relative bg-black/60"
                      style={{ "--ring-glow": `${theme.text}40`, animation: "replayRingPulse 3s ease-in-out infinite" }}
                    >
                      <span
                        className="text-3xl font-extrabold font-mono tabular-nums z-10 relative"
                        style={{ color: theme.text, filter: `drop-shadow(0 0 15px ${theme.text})` }}
                      >
                        <AnimatedScore value={ovNum} />
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-0.5 z-10 relative">/ 10</span>
                    </div>

                    <div className="flex-1 min-w-0 text-center md:text-left space-y-3">
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                        <span
                          className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded border uppercase tracking-widest"
                          style={{ background: theme.badgeBg, borderColor: theme.badgeBorder, color: theme.text }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.dotBg }} />
                          {statusLabel}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] border border-white/10 px-2.5 py-1 rounded uppercase font-bold">
                          NODE {selected + 1} LOGGED
                        </span>
                      </div>
                      <h2 className="text-base md:text-lg font-bold text-white leading-[1.55] tracking-tight">
                        {q?.scores?.overall_summary || "Diagnostic review complete for this interview node."}
                      </h2>
                    </div>
                  </div>
                </motion.div>

                {/* STAR DECOMPILED PROMPT */}
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2} className="rounded-2xl bg-[#08080C] border border-white/[0.08] p-6 md:p-8 space-y-5 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                    <div className="flex items-center gap-2.5">
                      <Terminal size={16} className="text-indigo-400" />
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">STAR Prompt Specification</h3>
                    </div>
                    <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                      Decomposed
                    </span>
                  </div>

                  {parsedPrompt.scenario && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold font-mono text-indigo-400 uppercase tracking-widest block">S &middot; SITUATION</span>
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">{parsedPrompt.scenario}</p>
                    </div>
                  )}

                  {parsedPrompt.constraints?.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-white/[0.04]">
                      <span className="text-[10px] font-bold font-mono text-blue-400 uppercase tracking-widest block">T &middot; TASK / CONSTRAINTS</span>
                      <ul className="space-y-2">
                        {parsedPrompt.constraints.map((c, idx) => (
                          <li key={idx} className="text-sm text-slate-300 font-medium flex items-start gap-2.5">
                            <span className="text-blue-500 font-mono mt-0.5 select-none">&gt;</span> {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-2.5 pt-3 border-t border-white/[0.04]">
                    <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-widest block">A &middot; ACTION EXPECTED (REQUIRED SIGNALS)</span>
                    <div className="flex flex-wrap gap-2">
                      {parsedPrompt.actions.map((act, idx) => (
                        <span key={idx} className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-md font-medium">
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* CANDIDATE SUBMITTED RESPONSE */}
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="rounded-2xl bg-[#08080C] border border-white/[0.08] p-6 md:p-8 space-y-4 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                    <div className="flex items-center gap-2.5">
                      <MessageSquare size={16} className="text-slate-400" />
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Candidate Submitted Response</h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                      {q.answer ? `${q.answer.length} CHARS` : "NO SIGNAL"}
                    </span>
                  </div>

                  <div className="bg-[#020204] border border-white/[0.05] p-5 rounded-xl font-mono text-sm text-slate-200 leading-[1.8] whitespace-pre-wrap shadow-inner">
                    {q.answer || "[No candidate response recorded for this node]"}
                  </div>
                </motion.div>

                {/* ANNOTATED FEEDBACK — real gaps only, honest empty state */}
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="rounded-2xl bg-[#08080C] border border-white/[0.08] p-6 md:p-8 space-y-5 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2.5">
                      <Sparkles size={16} className="text-indigo-400" /> Annotation Breakdown
                    </h3>
                    {realGaps.length > 0 && (
                      <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest">{realGaps.length} POINTS DIAGNOSED</span>
                    )}
                  </div>

                  {realGaps.length > 0 ? (
                    <div className="space-y-3">
                      {realGaps.map((anno, idx) => (
                        <div key={idx} className="bg-[#0A0A0E] border border-rose-500/20 p-4 rounded-xl space-y-2 relative overflow-hidden group">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500/50" />
                          <div className="flex items-center justify-between pl-2">
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                              <XCircle size={16} className="text-rose-400 shrink-0" /> {anno.title}
                            </span>
                            <span className="text-[9px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Absent</span>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed font-medium pl-8">{anno.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 font-medium">No knowledge gaps were recorded for this node.</div>
                  )}
                </motion.div>

              </motion.div>
            </AnimatePresence>

            {/* 1-LINE FOOTER */}
            <footer className="mt-12 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-slate-500">
              <div>© 2026 InterviewCoach AI &middot; Session Replay &amp; Telemetry Ledger</div>
            </footer>

          </div>

          {/* RIGHT STICKY RAIL */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="w-full lg:w-[35%] flex flex-col gap-6 lg:sticky lg:top-6 pb-32"
          >
            <div className="rounded-2xl bg-[#08080C] border border-white/[0.08] p-5 space-y-3 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Session ELO Trajectory</h3>
                <span className="text-[10px] font-mono text-white font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded">AVG {avgScore}</span>
              </div>
              <div className="w-full h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trajectoryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="node" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis domain={[0, 10]} tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <Tooltip contentStyle={{ backgroundColor: "#0A0A0E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px", color: "#fff" }} itemStyle={{color: '#fff', fontWeight: 'bold'}} />
                    <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#fff", stroke: "#6366f1", strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {q?.scores && (
              <div className="rounded-2xl bg-[#08080C] border border-white/[0.08] p-5 space-y-3 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">5D Skill Morphology</h3>
                  <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest">NODE {selected + 1}</span>
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
                      <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Ranked Gap Fix Queue — real gaps only, hidden entirely if none exist */}
            {realGaps.length > 0 && (
              <div className="rounded-2xl bg-[#08080C] border border-white/[0.08] p-5 space-y-4 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <Target size={14} className="text-amber-500" /> Gap Fix Queue
                  </h3>
                </div>

                <div className="space-y-3">
                  {q.gaps.map((gap, i) => (
                    <motion.div 
                      key={i} 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setStudyPlanTopic(gap.gap)} 
                      className="group bg-white/[0.02] border border-white/[0.06] hover:border-white/20 p-4 rounded-xl cursor-pointer transition-all shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <span className="text-sm font-bold text-slate-200 group-hover:text-white capitalize transition-colors">{gap.gap.replace(/_/g, " ")}</span>
                      </div>
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 mt-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        Launch Study Path <ArrowRight size={12} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        </div>
      </main>

      {/* ANCHORED KEYBOARD DOCK */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#000000]/80 backdrop-blur-2xl border-t border-white/[0.08] flex items-center justify-between px-6 lg:px-10 z-50 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-4">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Audit Progress</span>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-md text-white font-bold font-mono text-sm shadow-inner">
            {selected + 1} <span className="text-slate-600 font-normal">/</span> {totalNodes}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelected(s => Math.max(0, s - 1))}
            disabled={selected === 0}
            className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all outline-none flex items-center gap-2"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <button
            onClick={() => setSelected(s => Math.min(totalNodes - 1, s + 1))}
            disabled={selected === totalNodes - 1}
            className="px-5 py-2.5 rounded-lg bg-white text-black hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all outline-none flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.15)]"
          >
            Next Node <ChevronRight size={14} />
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