import { API_URL } from "../config";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { ChevronLeft, ChevronRight, AlertTriangle, Terminal, Briefcase, Activity, Target, ShieldAlert, Lock, ArrowRight, MessageSquare } from "lucide-react";
import StudyPlan from "./StudyPlan";

function AnimatedScore({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => v.toFixed(1));
  const [display, setDisplay] = useState("0.0");

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, count, rounded]);

  return <>{display}</>;
}

// Fallback Parser for Legacy Wall-of-Text Prompts
function parsePromptFallback(questionText, scenarioText, constraintsArray, askText) {
  // If structured data exists, use it
  if (scenarioText || (constraintsArray && constraintsArray.length > 0) || askText) {
    return {
      scenario: scenarioText || questionText,
      constraints: constraintsArray || [],
      ask: askText || ""
    };
  }

  if (!questionText) return { scenario: "", constraints: [], ask: "" };

  // Heuristic parsing for legacy text blocks
  const parts = questionText.split(/(?=\b(?:Constraints|Constraint|The Ask|Walk me through|How would you)\b)/i);
  if (parts.length > 1) {
    const scenario = parts[0].trim();
    const rest = parts.slice(1).join(" ");
    
    let ask = "";
    let constraints = [];

    const askMatch = rest.match(/(?:The Ask|Walk me through|How would you)[\s\S]*/i);
    if (askMatch) {
      ask = askMatch[0].replace(/^The Ask:?\s*/i, "").trim();
    }

    const constraintMatch = rest.match(/(?:Constraints|Constraint):?\s*([\s\S]*?)(?=(?:The Ask|Walk me through|How would you)|$)/i);
    if (constraintMatch && constraintMatch[1]) {
      constraints = constraintMatch[1]
        .split(/(?:\r?\n|•|-|\*)+/)
        .map(c => c.trim())
        .filter(c => c.length > 5);
    }

    return {
      scenario: scenario || questionText,
      constraints,
      ask: ask || rest
    };
  }

  // Absolute fallback
  return {
    scenario: questionText,
    constraints: [],
    ask: ""
  };
}

export default function ReplayViewer({ sessionId, onExit, onSelectSession }) {
  const [sessionList, setSessionList] = useState(null);
  const [replay, setReplay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);
  const [studyPlanTopic, setStudyPlanTopic] = useState(null);

  useEffect(() => {
    async function fetchSessionList() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await axios.get(`${API_URL}/user/sessions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSessionList(res.data.sessions || []);
      } catch (err) {
        console.error("Failed to load session list:", err);
        setSessionList([]);
      }
      setLoading(false);
    }

    async function fetchReplay() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await axios.get(`${API_URL}/replay/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReplay(res.data);
      } catch (err) {
        console.error("Failed to load session replay ledger:", err);
      }
      setLoading(false);
    }

    if (sessionId) {
      fetchReplay();
    } else {
      fetchSessionList();
    }
  }, [sessionId]);

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!replay?.questions) return;
      const total = replay.questions.length;
      
      if (e.key === 'ArrowRight' || ((e.metaKey || e.ctrlKey) && e.key === 'Enter')) {
        e.preventDefault();
        setSelected(s => Math.min(total - 1, s + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelected(s => Math.max(0, s - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [replay]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#000000] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <span className="w-8 h-8 border-2 border-slate-700 border-t-white rounded-full animate-spin" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
            Decrypting Session Telemetry Ledger...
          </span>
        </div>
      </div>
    );
  }
  if (!sessionId) {
    return (
      <div className="h-screen w-full bg-[#000000] flex items-center justify-center font-sans">
        <div className="w-full max-w-lg px-6">
          <h2 className="text-lg font-bold text-white tracking-tight mb-6 text-center">Select a Session to Replay</h2>
          {!sessionList || sessionList.length === 0 ? (
            <p className="text-xs text-slate-400 text-center">No past sessions found yet.</p>
          ) : (
            <div className="space-y-3">
              {sessionList.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectSession?.(s.id)}
                  className="w-full text-left p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-white">{s.company_target} — {s.role}</span>
                    <span className="text-xs text-slate-400">{s.question_count} questions</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {onExit && (
            <button onClick={onExit} className="mt-6 w-full px-6 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl text-xs font-bold text-white transition-all">
              Return to Dashboard
            </button>
          )}
        </div>
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
          <h2 className="text-lg font-bold text-white tracking-tight">Replay Ledger Corrupted or Missing</h2>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            Could not retrieve historical telemetry logs for Session #{sessionId}.
          </p>
          {onExit && (
            <button
              onClick={onExit}
              className="mt-4 px-6 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl text-xs font-bold text-white transition-all outline-none"
            >
              Return to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  const q = replay.questions[selected] || {};
  
  const overall = q?.scores
    ? ((q.scores.score_technical + q.scores.score_communication +
        q.scores.score_problem_solving + q.scores.score_cultural_fit +
        q.scores.score_confidence) / 5).toFixed(1)
    : 0;

  const ovNum = parseFloat(overall || 0);
  const theme = ovNum >= 7.5 ? "emerald" : ovNum >= 5.0 ? "amber" : "rose";
  const themeHex = theme === "emerald" ? "#10b981" : theme === "amber" ? "#f59e0b" : "#f43f5e";
  const statusLabel = ovNum >= 7.5 ? "STRONG SIGNAL" : ovNum >= 5.0 ? "MODERATE" : "CRITICAL GAP";
  const totalNodes = replay.questions.length;

  const parsedPrompt = parsePromptFallback(q.question, q.scenario, q.constraints, q.ask);

  return (
    <div className="h-screen w-full bg-[#000000] text-slate-100 font-sans flex flex-col overflow-hidden selection:bg-blue-500/30">
      
      {/* 1. TOP HUD HEADER */}
      <header className="h-14 border-b border-white/[0.08] bg-[#000000]/90 backdrop-blur-2xl flex items-center justify-between px-6 md:px-8 z-50 flex-shrink-0 sticky top-0 shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center font-bold text-black text-[10px]">
              IC
            </div>
            <span className="text-slate-300 text-[13px] font-semibold tracking-tight hidden sm:block">
              InterviewCoach
            </span>
          </div>

          <div className="w-px h-4 bg-white/10" />

          <div className="flex items-center gap-2.5">
            <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-white text-[10px] font-bold uppercase tracking-widest">
              {replay.company || "Google"}
            </span>
            {replay.role && (
              <span className="text-slate-400 text-xs font-semibold hidden md:inline">
                &middot; {replay.role}
              </span>
            )}
            <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ml-1 hidden sm:inline">
              REPLAY STUDIO
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <span className="text-xs font-mono font-bold text-slate-400 bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-lg tabular-nums">
            {totalNodes} {totalNodes === 1 ? "Node Logged" : "Nodes Logged"}
          </span>

          <button
            onClick={onExit}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-colors bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 px-3.5 py-1.5 rounded-lg outline-none"
          >
            <ChevronLeft size={16} /> Exit Replay
          </button>
        </div>
      </header>

      {/* 2. STUDIO WORKSPACE */}
      <main className="flex-1 w-full flex overflow-hidden relative z-10">
        
        {/* LEFT RAIL: TIMELINE LEDGER INDEX */}
        <aside className="w-[280px] lg:w-[320px] flex-shrink-0 border-r border-white/[0.08] bg-[#000000] overflow-y-auto hidden md:flex flex-col justify-between p-6 z-20">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <Activity size={14} className="text-blue-500" /> Timeline Nodes
              </span>
              <span className="text-[10px] font-mono text-slate-500 font-bold">{selected + 1} / {totalNodes}</span>
            </div>

            <div className="space-y-2.5">
              {replay.questions.map((qn, i) => {
                const nodeScore = qn.scores
                  ? ((qn.scores.score_technical + qn.scores.score_communication + qn.scores.score_problem_solving + qn.scores.score_cultural_fit + qn.scores.score_confidence) / 5).toFixed(1)
                  : null;

                const isSelected = selected === i;
                const scoreColor = !nodeScore ? "text-slate-500 bg-white/5 border-white/10" 
                  : nodeScore >= 7.5 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : nodeScore >= 5.0 ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                  : "text-rose-400 bg-rose-500/10 border-rose-500/20";

                return (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 relative overflow-hidden group outline-none ${
                      isSelected 
                        ? "bg-white/[0.08] border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),_0_10px_20px_rgba(0,0,0,0.5)]" 
                        : "bg-white/[0.015] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10"
                    }`}
                  >
                    {isSelected && (
                      <motion.div 
                        layoutId="activeReplayNodeIndicator"
                        className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                      />
                    )}

                    <div className="flex items-center justify-between mb-1.5 pl-1">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isSelected ? "text-blue-400" : "text-slate-500"}`}>
                        Node {i + 1}
                      </span>
                      {nodeScore && (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border tabular-nums ${scoreColor}`}>
                          {nodeScore} / 10
                        </span>
                      )}
                    </div>

                    <p className={`text-xs font-semibold leading-snug line-clamp-2 pl-1 ${isSelected ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`}>
                      {qn.question || qn.scenario || "Historical Interview Question"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.06] text-[10px] font-mono text-slate-500 flex justify-between items-center">
            <span>AUDIT TRAIL</span>
            <span className="text-emerald-400 font-bold">VERIFIED LOG</span>
          </div>
        </aside>

        {/* CENTER MAIN STAGE: PINNED FLEX SHELL */}
        <div className="flex-1 w-full flex flex-col relative overflow-hidden bg-[#000000]">
          
          {/* SCROLLABLE INNER CANVAS */}
          <div className="flex-1 w-full h-full overflow-y-auto scrollbar-hide">
            <div className="max-w-7xl mx-auto w-full px-6 lg:px-8 py-10 flex flex-col gap-8">
              
              <AnimatePresence mode="wait">
                <motion.div key={selected} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.35, ease: "easeOut" }} className="space-y-8">
                  
                  {/* ROW 1: 100% WIDTH HERO VERDICT DECK */}
                  <div className="bg-[#050507] border border-white/[0.08] rounded-3xl p-8 relative overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),_0_30px_60px_rgba(0,0,0,0.8)]">
                    <div className={`absolute top-0 right-0 w-80 h-80 bg-${theme}-500/10 blur-[100px] pointer-events-none rounded-full`} />
                    
                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                      {/* Score Circle */}
                      <div className="w-32 h-32 rounded-full border-[3px] border-[#111116] flex flex-col items-center justify-center relative shadow-[0_0_30px_rgba(0,0,0,0.5)] shrink-0">
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                          <circle cx="64" cy="64" r="60" fill="none" stroke="#1a1a24" strokeWidth="4" />
                          <motion.circle cx="64" cy="64" r="60" fill="none" stroke={themeHex} strokeWidth="4" strokeDasharray="377" 
                            initial={{ strokeDashoffset: 377 }} animate={{ strokeDashoffset: 377 - (377 * (ovNum / 10)) }} transition={{ duration: 1.2, ease: "easeOut" }}
                          />
                        </svg>
                        <span className={`text-4xl font-extrabold tabular-nums font-mono text-${theme}-400 drop-shadow-[0_0_15px_currentColor]`}>
                          <AnimatedScore value={ovNum} />
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">/ 10</span>
                      </div>

                      {/* Summary Text & Status Badge */}
                      <div className="flex-1 space-y-3 text-center md:text-left">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                          <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full border uppercase tracking-widest bg-${theme}-500/10 text-${theme}-400 border-${theme}-500/20`}>
                            {statusLabel}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/[0.04] border border-white/10 px-3 py-1 rounded-full">
                            NODE {selected + 1} LOGGED
                          </span>
                        </div>

                        <h2 className="text-xl md:text-2xl font-bold text-white leading-[1.6] tracking-tight">
                          {q?.scores?.overall_summary || "Diagnostic review complete for this interview node."}
                        </h2>
                      </div>
                    </div>
                  </div>

                  {/* ROW 2: PROMPT SPECIFICATION & CANDIDATE SUBMITTED RESPONSE (50% / 50% EQUAL HEIGHT PAIR) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                    
                    {/* PROMPT SPECIFICATION */}
                    <div className="bg-[#050507] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-3xl p-6 flex flex-col justify-between space-y-4">
                      <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
                        <Terminal size={16} className="text-blue-400" />
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Prompt Specification</h3>
                      </div>
                      
                      {parsedPrompt.scenario && (
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Context</h4>
                          <p className="text-xs text-slate-300 leading-relaxed font-medium line-clamp-4">{parsedPrompt.scenario}</p>
                        </div>
                      )}

                      {parsedPrompt.constraints?.length > 0 && (
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Constraints</h4>
                          <ul className="space-y-1">
                            {parsedPrompt.constraints.slice(0, 3).map((c, idx) => (
                              <li key={idx} className="text-xs text-slate-400 font-medium flex items-start gap-2 leading-tight">
                                <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />{c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {parsedPrompt.ask && (
                        <div className="bg-blue-500/[0.04] border-l-2 border-blue-500/50 p-3 rounded-r-xl">
                          <h4 className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-1">The Ask</h4>
                          <p className="text-xs font-bold text-white leading-snug line-clamp-2">{parsedPrompt.ask}</p>
                        </div>
                      )}
                    </div>

                    {/* CANDIDATE SUBMITTED RESPONSE (Bounded Scroll Box prevents infinite elongation) */}
                    <div className="bg-[#050507] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-3xl p-6 flex flex-col justify-between space-y-4">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                        <div className="flex items-center gap-3">
                          <MessageSquare size={16} className="text-indigo-400" />
                          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Candidate Submitted Response</h3>
                        </div>
                        {q.answer && <span className="text-[10px] font-mono text-slate-500 font-bold">{q.answer.length} chars</span>}
                      </div>

                      <div className="bg-[#020203] border border-white/[0.05] p-4 rounded-2xl max-h-[220px] overflow-y-auto scrollbar-hide shadow-inner flex-1">
                        {q.answer ? (
                          <p className="text-xs font-mono text-slate-200 leading-[1.8] whitespace-pre-wrap">{q.answer}</p>
                        ) : (
                          <p className="text-xs text-slate-500 italic py-4">No text answer logged for this node.</p>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* ROW 3: EVALUATION BREAKDOWN & SKILL MORPHOLOGY RADAR (50% / 50% EQUAL HEIGHT PAIR) */}
                  {q?.scores && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                      
                      {/* Left: 5D Score Metric Bars */}
                      <div className="bg-[#050507] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-3xl p-6 flex flex-col justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Vector Breakdown</h3>
                        <div className="flex flex-col gap-2">
                          <ExpandableScoreRow label="Technical Accuracy" value={q.scores.score_technical} feedback={q.scores.technical_feedback} />
                          <ExpandableScoreRow label="Communication & Clarity" value={q.scores.score_communication} feedback={q.scores.communication_feedback} />
                          <ExpandableScoreRow label="Problem Solving" value={q.scores.score_problem_solving} feedback={q.scores.problem_solving_feedback} />
                          <ExpandableScoreRow label="Cultural Fit" value={q.scores.score_cultural_fit} feedback={null} />
                          <ExpandableScoreRow label="Confidence Telemetry" value={q.scores.score_confidence} feedback={null} />
                        </div>
                      </div>

                      {/* Right: Skill Morphology Radar (Exact height match with 5D bars) */}
                      <div className="bg-[#050507] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-3xl p-6 flex flex-col items-center justify-between relative overflow-hidden h-[300px]">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 w-full text-left relative z-10">Skill Morphology</h3>
                        <div className="w-full h-full relative z-10">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={[
                              { dim: "Tech", value: q.scores.score_technical },
                              { dim: "Comm", value: q.scores.score_communication },
                              { dim: "Prob", value: q.scores.score_problem_solving },
                              { dim: "Cult", value: q.scores.score_cultural_fit },
                              { dim: "Conf", value: q.scores.score_confidence },
                            ]}>
                              <PolarGrid stroke="#27272a" />
                              <PolarAngleAxis dataKey="dim" tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }} />
                              <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                              <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* ROW 4: DIAGNOSED VULNERABILITIES & EXECUTION TELEMETRY (50% / 50% EQUAL HEIGHT PAIR) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                    
                    {/* Diagnosed Knowledge Vulnerabilities */}
                    {q?.gaps?.length > 0 ? (
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <Target size={16} className="text-rose-500" />
                          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Diagnosed Vulnerabilities</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {q.gaps.map((gap, i) => (
                            <KnowledgeGapCard key={i} gap={gap} onClick={() => setStudyPlanTopic(gap.gap)} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#050507] border border-white/[0.08] rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                        <Activity size={24} className="text-emerald-400 mb-2" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-widest">No Critical Gaps Logged</h4>
                        <p className="text-xs text-slate-500 mt-1">This node passed all core evaluation parameters.</p>
                      </div>
                    )}

                    {/* Execution Telemetry */}
                    {q?.coaching_moments?.length > 0 ? (
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <Briefcase size={16} className="text-amber-500" />
                          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Execution Telemetry</h3>
                        </div>
                        <div className="space-y-3">
                          {q.coaching_moments.map((m, idx) => (
                            <div key={idx} className="bg-[#050507] border border-white/[0.08] p-4 rounded-2xl space-y-2">
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">"{m.suggestion}"</p>
                              <div className="flex items-center gap-4 border-t border-white/[0.04] pt-2 font-mono text-[11px]">
                                <div><span className="text-slate-500">Pace:</span> <span className="text-white font-bold">{m.wpm} WPM</span></div>
                                <div className="w-px h-3 bg-white/10" />
                                <div><span className="text-slate-500">Conf:</span> <span className="text-emerald-400 font-bold">{m.confidence}/10</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#050507] border border-white/[0.08] rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                        <Activity size={24} className="text-blue-400 mb-2" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-widest">Optimal Voice Telemetry</h4>
                        <p className="text-xs text-slate-500 mt-1">Pace and confidence scores remained stable throughout recording.</p>
                      </div>
                    )}

                  </div>

                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* PINNED CONTAINER FOOTER (Zero Dock Collisions) */}
          <div className="h-16 shrink-0 bg-[#0A0A0E] border-t border-white/10 px-6 flex items-center justify-center z-50">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelected(Math.max(0, selected - 1))}
                disabled={selected === 0}
                className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 text-white text-xs font-bold transition-colors flex items-center gap-1.5 outline-none"
              >
                <ChevronLeft size={16} /> Previous
              </button>

              <div className="flex items-center gap-2 px-3">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">TIMELINE</span>
                <span className="text-xs font-mono font-bold text-white tabular-nums bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                  Node {selected + 1} / {totalNodes}
                </span>
              </div>

              <button
                onClick={() => setSelected(Math.min(totalNodes - 1, selected + 1))}
                disabled={selected === totalNodes - 1}
                className="px-3.5 py-2 rounded-xl bg-white text-black hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-colors flex items-center gap-1.5 outline-none"
              >
                Next Node <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Overlay Modals */}
          {studyPlanTopic && (
            <StudyPlan topicName={studyPlanTopic} company={replay.company?.toLowerCase()} onClose={() => setStudyPlanTopic(null)} />
          )}

        </div>

      </main>

    </div>
  );
}

function ExpandableScoreRow({ label, value, feedback }) {
  const [expanded, setExpanded] = useState(false);
  const isHigh = value >= 7.5;
  const isMid = value >= 5.0 && value < 7.5;
  const colorClass = isHigh ? "bg-emerald-500 text-emerald-400" : isMid ? "bg-amber-500 text-amber-400" : "bg-rose-500 text-rose-400";

  return (
    <div className="bg-[#020203] border border-white/[0.05] rounded-xl overflow-hidden hover:border-white/15 transition-colors">
      <button onClick={() => setExpanded(!expanded)} className="w-full px-4 py-2.5 flex items-center justify-between gap-4 outline-none">
        <span className="text-xs font-bold text-white tracking-wide text-left">{label}</span>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-20 h-1.5 bg-black rounded-full overflow-hidden border border-white/5">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(value || 0) * 10}%` }} transition={{ duration: 1, ease: "easeOut" }} className={`h-full ${colorClass.split(" ")[0]}`} />
          </div>
          <span className={`text-xs font-mono font-bold tabular-nums w-8 text-right ${colorClass.split(" ")[1]}`}>{value ? value.toFixed(1) : "0.0"}</span>
        </div>
      </button>
      <AnimatePresence>
        {expanded && feedback && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 text-left text-xs text-slate-300 font-medium leading-relaxed">
            <div className="pb-3 pt-1 border-t border-white/[0.04]">
              <div className="flex items-start gap-2.5 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <p>{feedback}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KnowledgeGapCard({ gap, onClick }) {
  const isCritical = gap.urgency === "critical";
  const badgeColor = isCritical ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20";
  const Icon = isCritical ? ShieldAlert : Lock;

  return (
    <div onClick={onClick} className="group relative bg-[#050507] border border-white/[0.08] rounded-2xl p-4 cursor-pointer overflow-hidden transition-all hover:border-white/[0.15]">
      <div className="flex justify-between items-start mb-2 relative z-10">
        <span className="text-white text-xs font-bold tracking-tight capitalize pr-2">{gap.gap.replace(/_/g, " ")}</span>
        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border shrink-0 flex items-center gap-1.5 ${badgeColor}`}>
          <Icon size={10} /> {gap.urgency}
        </span>
      </div>
      {gap.prerequisites_to_study_first?.length > 0 && (
        <div className="flex items-center flex-wrap gap-1.5 relative z-10 mb-2 bg-black/40 p-2 rounded-xl border border-white/[0.03]">
          {gap.prerequisites_to_study_first.map((p, j) => (
            <div key={j} className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[9px] font-mono border border-white/10 px-1.5 py-0.5 rounded bg-white/[0.02]">{p}</span>
              {j < gap.prerequisites_to_study_first.length - 1 && <ArrowRight size={10} className="text-slate-600" />}
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1 text-blue-400 text-[9px] font-bold uppercase tracking-widest group-hover:text-blue-300 transition-colors relative z-10">
        Study Path <ChevronRight size={10} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}