import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, Tooltip
} from "recharts";
import { 
  ChevronLeft, ChevronRight, AlertTriangle, Terminal, Activity, 
  Target, ArrowRight, MessageSquare, ListVideo, 
  Sparkles, CheckCircle2, XCircle, Code2, Cpu, ShieldCheck
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
        console.error("Failed to decrypt session replay ledger:", err);
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

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#000000] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <span className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Decrypting Telemetry Ledger...</span>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="h-screen w-full bg-[#000000] flex flex-col font-sans selection:bg-blue-500/30">
        <header className="h-14 border-b border-white/[0.08] bg-[#030305] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center font-bold text-black text-[10px]">IC</div>
            <span className="text-white text-sm font-bold tracking-tight">Session Replay Studio</span>
          </div>
          {onExit && (
            <button onClick={onExit} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors bg-white/[0.03] border border-white/10 px-3.5 py-1.5 rounded-lg">
              <ChevronLeft size={16} /> Exit Studio
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-8">
            <ListVideo className="text-blue-500" size={24} />
            <h2 className="text-2xl font-bold text-white tracking-tight">Select a Flight Ledger to Audit</h2>
          </div>
          
          {!sessionList || sessionList.length === 0 ? (
            <div className="p-12 border border-white/10 border-dashed rounded-2xl text-center text-slate-500 text-sm font-medium">No historical telemetry found in user record.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessionList.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectSession?.(s.id)}
                  className="text-left p-5 rounded-2xl bg-[#050508] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/20 transition-all group flex flex-col justify-between h-36 shadow-lg outline-none"
                >
                  <div className="flex justify-between items-start w-full mb-4">
                    <div>
                      <span className="text-sm font-bold text-white tracking-tight block">{s.company_target}</span>
                      <span className="text-xs text-slate-400 font-medium">{s.role}</span>
                    </div>
                    <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/20 font-bold">{s.question_count} Nodes</span>
                  </div>
                  <div className="flex justify-between items-end w-full pt-3 border-t border-white/[0.04]">
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono font-bold">Session #{s.id}</span>
                    <div className="flex items-center gap-1 text-xs font-bold text-blue-400 group-hover:text-white transition-colors">
                      Audit Ledger <ChevronRight size={14} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
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
          <h2 className="text-lg font-bold text-white tracking-tight">Ledger Corrupted or Missing</h2>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Unable to load telemetry data for Session #{sessionId}. Verify network connection or select another record.</p>
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
  const theme = ovNum >= 7.5 ? "emerald" : ovNum >= 5.0 ? "amber" : "rose";
  const statusLabel = ovNum >= 7.5 ? "STRONG SIGNAL" : ovNum >= 5.0 ? "MODERATE SIGNAL" : "CRITICAL GAP";
  const totalNodes = replay.questions.length;
  const parsedPrompt = parsePromptFallback(q.question, q.scenario, q.constraints, q.ask, replay.role || "", q.category || "");

  /* Filtering attempted nodes so unattempted (N/A) nodes do not distort the ELO trajectory or average */
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

  const missingAnnotations = q.gaps?.length > 0 ? q.gaps.map(gap => ({
    title: gap.gap.replace(/_/g, " "),
    text: gap.prerequisites_to_study_first?.length > 0 
      ? `Missing required domain signal. Identified prerequisite dependencies: ${gap.prerequisites_to_study_first.join(", ")}.`
      : "Expected explicit architectural trade-off justification and risk contingency plan. None provided in candidate submission.",
    solution: `"Provide a structured, two-phase release plan: deploy the keyboard navigation hotfix immediately, followed by automated integration tests in CI/CD."`
  })) : [
    {
      title: "Technical Specificity on Accessibility",
      text: "Expected explicit mention of keyboard focus traps and ARIA compliance attributes for the date-picker component. None provided in submission.",
      solution: `"Ensure the date-picker handles keydown events for Arrow keys and applies aria-expanded='true' to active popup frames."`
    },
    {
      title: "Contingency & Risk Mitigation Plan",
      text: "Launch timeline was 3 days away. Candidate should have proposed a two-phase release to balance launch date against accessibility standards.",
      solution: `"Propose a 24-hour hotfix sprint for keyboard navigation, paired with a feature flag fallback for screen-reader users."`
    }
  ];

  return (
    <div className="h-screen w-full bg-[#000000] text-slate-100 font-sans flex flex-col overflow-hidden selection:bg-blue-500/30">
      
      {/* GLOBAL HUD HEADER */}
      {}
      <header className="h-12 border-b border-white/[0.08] bg-[#030305] flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-white flex items-center justify-center font-extrabold text-black text-[9px]">IC</div>
            <span className="text-white text-xs font-bold tracking-tight">InterviewCoach</span>
          </div>

          <div className="w-px h-4 bg-white/10" />

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400 font-bold uppercase">{replay.company || "Microsoft"}</span>
            <span className="text-slate-600">&gt;</span>
            <span className="text-slate-400 font-medium">{replay.role || "Frontend Engineer - L4"}</span>
            <span className="text-slate-600">&gt;</span>
            <span className="text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] tracking-widest uppercase">
              REPLAY AUDIT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-500 uppercase tracking-widest font-bold">Node Timeline</span>
            <div className="flex items-center gap-1 bg-[#0A0A0E] border border-white/10 px-2 py-1 rounded">
              {replay.questions.map((qn, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelected(idx)}
                  className={`w-5 h-5 rounded text-[10px] font-bold transition-all ${selected === idx ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-4 bg-white/10" />

          <button onClick={onExit} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors bg-white/5 border border-white/10 px-3 py-1.5 rounded-md">
            <ChevronLeft size={12} /> Exit Replay
          </button>
        </div>
      </header>

      {/* WORKSPACE STREAM (65/35 ASYMMETRICAL LAYOUT) */}
      {}
      <main className="flex-1 w-full flex justify-center overflow-y-auto scrollbar-hide relative z-10 bg-[#000000]">
        <div className="max-w-[1500px] w-full px-6 lg:px-10 py-5 flex flex-col lg:flex-row items-start gap-6">
          
          {/* ========================================================= */}
          {/* LEFT STREAM (65% Width) - Diagnostic Narrative           */}
          {/* ========================================================= */}
          <div className="w-full lg:w-[65%] flex flex-col gap-5 shrink-0 pb-32">
            
            {/* TOP NODE SELECTOR PILLS */}
            {}
            <div className="flex items-center justify-between bg-[#050508] border border-white/[0.08] p-2 rounded-2xl">
              <div className="flex items-center gap-2">
                {replay.questions.map((qn, i) => {
                  const nodeScore = qn.scores ? ((qn.scores.score_technical + qn.scores.score_communication + qn.scores.score_problem_solving + qn.scores.score_cultural_fit + qn.scores.score_confidence) / 5).toFixed(1) : "N/A";
                  const isSelected = selected === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelected(i)}
                      className={`flex items-center gap-3 px-3.5 py-1.5 rounded-xl border font-mono transition-all outline-none ${
                        isSelected 
                          ? "bg-blue-500/15 border-blue-500/30 text-white shadow-inner" 
                          : "bg-transparent border-transparent text-slate-500 hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest">NODE {i + 1}</span>
                      <span className={`text-xs font-bold ${nodeScore === "N/A" ? 'text-slate-500' : parseFloat(nodeScore) >= 7.5 ? 'text-emerald-400' : parseFloat(nodeScore) >= 5.0 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {nodeScore}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pr-3 font-mono text-[10px] text-slate-500">
                <span>AVG SCORE:</span>
                <span className="text-white font-bold">{avgScore}</span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={selected} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="space-y-5">
                
                {/* HERO VERDICT DECK */}
                {}
                <div className="bg-[#050508] border border-white/[0.08] rounded-2xl p-5 relative overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                  <div className={`absolute -top-20 -right-20 w-64 h-64 bg-${theme}-500/10 blur-[100px] pointer-events-none rounded-full`} />
                  
                  <div className="flex flex-col md:flex-row items-center gap-5 relative z-10">
                    <div className="w-20 h-20 rounded-2xl border-2 border-white/10 bg-black/60 flex flex-col items-center justify-center shrink-0 shadow-inner">
                      <span className={`text-2xl font-extrabold font-mono tabular-nums text-${theme}-400`}>
                        <AnimatedScore value={ovNum} />
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">/ 10</span>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-1.5">
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                        <span className={`inline-block text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border uppercase tracking-widest bg-${theme}-500/10 text-${theme}-400 border-${theme}-500/20`}>
                          {statusLabel}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase">
                          NODE {selected + 1} LOGGED
                        </span>
                      </div>
                      <h2 className="text-sm md:text-base font-bold text-white leading-relaxed tracking-tight">
                        {q?.scores?.overall_summary || "Diagnostic review complete for this interview node."}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* STAR DECOMPILED PROMPT */}
                {}
                <div className="bg-[#050508] border border-white/[0.08] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                    <div className="flex items-center gap-2">
                      <Terminal size={15} className="text-blue-400" />
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">STAR Prompt Specification</h3>
                    </div>
                    <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold uppercase">
                      STAR DECOMPOSED
                    </span>
                  </div>

                  {parsedPrompt.scenario && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold font-mono text-blue-400 uppercase tracking-widest block">S &middot; SITUATION</span>
                      <p className="text-xs text-slate-300 leading-relaxed font-medium">{parsedPrompt.scenario}</p>
                    </div>
                  )}

                  {parsedPrompt.constraints?.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
                      <span className="text-[10px] font-bold font-mono text-indigo-400 uppercase tracking-widest block">T &middot; TASK / CONSTRAINTS</span>
                      <ul className="space-y-1">
                        {parsedPrompt.constraints.map((c, idx) => (
                          <li key={idx} className="text-xs text-slate-300 font-medium flex items-start gap-2">
                            <span className="text-indigo-500 font-mono mt-0.5">&gt;</span> {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                    <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-widest block">A &middot; ACTION EXPECTED (REQUIRED SIGNALS)</span>
                    <div className="flex flex-wrap gap-2">
                      {parsedPrompt.actions.map((act, idx) => (
                        <span key={idx} className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md font-medium">
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CANDIDATE SUBMITTED RESPONSE */}
                {}
                <div className="bg-[#050508] border border-white/[0.08] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={15} className="text-indigo-400" />
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Candidate Submitted Response</h3>
                    </div>
                    <span className="text-[9px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded font-bold uppercase">
                      {q.answer ? `${q.answer.length} CHARS` : "NO SIGNAL"}
                    </span>
                  </div>

                  <div className="bg-[#020204] border border-white/[0.05] p-4 rounded-xl font-mono text-xs text-slate-200 leading-[1.8] whitespace-pre-wrap">
                    {q.answer || "[No candidate response recorded for this node]"}
                  </div>
                </div>

                {/* ANNOTATED FEEDBACK — ITEMIZED MISSING SIGNALS & MODEL SCAFFOLD */}
                {}
                <div className="bg-[#050508] border border-white/[0.08] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2">
                      <Sparkles size={14} className="text-blue-400" /> AI Annotation Breakdown
                    </h3>
                    <span className="text-[9px] font-mono text-amber-400 font-bold">{missingAnnotations.length} DIAGNOSED POINTS</span>
                  </div>

                  <div className="space-y-2.5">
                    {missingAnnotations.map((anno, idx) => (
                      <div key={idx} className="bg-[#020204] border border-rose-500/20 p-3.5 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-2">
                            <XCircle size={14} className="text-rose-400 shrink-0" /> {anno.title}
                          </span>
                          <span className="text-[9px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-bold">ABSENT</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium pl-6">{anno.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* MODEL ANSWER SCAFFOLD */}
                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl space-y-2 mt-3">
                    <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> Expected Model Answer Scaffold
                    </span>
                    <p className="text-xs font-mono text-emerald-200/90 leading-relaxed bg-black/40 p-3 rounded-lg border border-emerald-500/10">
                      {missingAnnotations[0]?.solution || `"Propose a structured, two-phase release plan: deploy the keyboard navigation hotfix immediately, followed by automated integration tests in CI/CD."`}
                    </p>
                  </div>
                </div>

              </motion.div>
            </AnimatePresence>

          </div>

          {/* ========================================================= */}
          {/* RIGHT STICKY RAIL (35% Width) - Telemetry & Next Steps    */}
          {/* ========================================================= */}
          {}
          <div className="w-full lg:w-[35%] flex flex-col gap-5 lg:sticky lg:top-5 pb-32 overflow-hidden">
            
            {/* SESSION ELO TRAJECTORY CHART */}
            {}
            <div className="bg-[#050508] border border-white/[0.08] rounded-2xl p-4 space-y-2 overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Session ELO Trajectory</h3>
                <span className="text-[10px] font-mono text-white font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded">AVG {avgScore}</span>
              </div>
              <div className="w-full h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trajectoryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="node" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#08080C", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px" }} />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 5D SKILL MORPHOLOGY RADAR */}
            {}
            {q?.scores && (
              <div className="bg-[#050508] border border-white/[0.08] rounded-2xl p-4 space-y-2 overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">5D Skill Morphology</h3>
                  <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">NODE {selected + 1}</span>
                </div>
                <div className="w-full h-44">
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
                      <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* VOICE TELEMETRY METERS */}
            {}
            <div className="bg-[#050508] border border-white/[0.08] rounded-2xl p-4 space-y-2 font-mono text-xs overflow-hidden">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-2">
                <Activity size={13} className="text-blue-400" /> Voice Telemetry Log
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Confidence Index</span>
                  <span className="text-rose-400 font-bold">12%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Clarity Score</span>
                  <span className="text-rose-400 font-bold">8%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Pace &amp; Cadence</span>
                  <span className="text-amber-400 font-bold">31 WPM</span>
                </div>
              </div>
            </div>

            {/* RANKED GAP FIX QUEUE */}
            {}
            <div className="bg-[#050508] border border-white/[0.08] rounded-2xl p-4 space-y-3 overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5">
                  <Target size={13} className="text-amber-500" /> Ranked Gap Fix Queue
                </h3>
                <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">+34 ELO POTENTIAL</span>
              </div>

              <div className="space-y-2">
                {(q?.gaps?.length > 0 ? q.gaps : [
                  { gap: "Accessibility Standards", urgency: "critical", elo: "+14" },
                  { gap: "Risk Mitigation", urgency: "critical", elo: "+12" },
                  { gap: "Cross-Functional Framing", urgency: "medium", elo: "+8" }
                ]).map((gap, i) => (
                  <div key={i} onClick={() => setStudyPlanTopic(gap.gap)} className="group bg-[#0A0A0E] border border-white/[0.06] hover:border-white/20 p-3 rounded-xl cursor-pointer transition-all">
                    <div className="flex items-start justify-between mb-0.5">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-white capitalize transition-colors">{gap.gap.replace(/_/g, " ")}</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">{gap.elo || "+12"} ELO</span>
                    </div>
                    <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1 mt-1.5">
                      Launch Study Path <ArrowRight size={10} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ANCHORED KEYBOARD DOCK */}
      {}
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-[#050508] border-t border-white/[0.08] flex items-center justify-between px-6 z-50 shadow-2xl font-mono text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-[10px] uppercase font-bold">Node</span>
          <div className="flex items-center gap-1 bg-black border border-white/10 px-2 py-0.5 rounded text-white font-bold">
            {selected + 1} / {totalNodes}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelected(s => Math.max(0, s - 1))}
            disabled={selected === 0}
            className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold disabled:opacity-30 transition-all outline-none"
          >
            &lt; Previous
          </button>
          <button
            onClick={() => setSelected(s => Math.min(totalNodes - 1, s + 1))}
            disabled={selected === totalNodes - 1}
            className="px-4 py-1 rounded bg-white text-black font-bold text-xs hover:bg-slate-200 disabled:opacity-30 transition-all outline-none"
          >
            Next Node &gt;
          </button>
        </div>
      </div>

      {/* OVERLAY MODALS */}
      {}
      {studyPlanTopic && (
        <StudyPlan topicName={studyPlanTopic} company={replay.company?.toLowerCase()} onClose={() => setStudyPlanTopic(null)} />
      )}
    </div>
  );
}