import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../lib/api";
import { codeFor, recallProblem, rememberProblem, saveDraft } from "./coding/drafts";
import { usePreferences } from "../lib/preferences";
import Editor from "@monaco-editor/react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play, Send, Terminal, CheckCircle2, XCircle, Code2, ArrowLeft, ChevronDown, Check,
  Lightbulb, AlertTriangle, Activity, Hash, Layers, Gauge, PanelRightClose, PanelRightOpen,
  Mic, Square, FileText, RotateCcw, Sparkles, ShieldCheck
} from "lucide-react";

import { LANGUAGES, diffTier, formatClock, formatElapsed, parseErrorLine, parseMs, staggerContainer, staggerItem } from "./coding/constants";
import { CustomDropdown, GlassPanel } from "./coding/ui";

export default function CodingRoom({ problemSlug = null, sessionId, user, onFinish, onEloUpdate }) {
  const [focusMode, setFocusMode] = useState(false);
  const [problem, setProblem] = useState(null);
  const [problemLoading, setProblemLoading] = useState(true);
  const [problemError, setProblemError] = useState(false);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  // The editor is uncontrolled: Monaco owns its text and reports changes.
  // Feeding `value` back from React state dropped keystrokes whenever a
  // render lagged behind typing (a stale value overwrote newer input). It
  // remounts, keyed on this, only when code changes from outside the editor.
  const [editorVersion, setEditorVersion] = useState(0);
  const { high_contrast_editor: highContrast } = usePreferences();

  const [activeLeftTab, setActiveLeftTab] = useState("spec");
  const [activeRightTab, setActiveRightTab] = useState("terminal");

  const [hintCards, setHintCards] = useState([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState(false);

  const [runState, setRunState] = useState("idle"); // idle | running | error | output
  const [runResults, setRunResults] = useState(null);
  const [runError, setRunError] = useState("");
  const [resultsSource, setResultsSource] = useState(null); // 'run' | 'submit' — which action produced runResults
  const [runHistory, setRunHistory] = useState([]); // real log of this problem's run/submit attempts
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [reviewState, setReviewState] = useState("idle"); // idle | loading | error | content
  const [reviewData, setReviewData] = useState(null);
  const [allProblems, setAllProblems] = useState([]);
  const [liveElo, setLiveElo] = useState(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  // fetchProblem reads the language through a ref: depending on it made
  // every language switch refetch — and, with no fixed slug, pick a new
  // random problem and throw the candidate's code away.
  const languageRef = useRef(language);
  useEffect(() => { languageRef.current = language; }, [language]);
  const saveTimer = useRef(null);

  function handleCodeChange(value) {
    const next = value || "";
    setCode(next);
    if (!problem?.slug) return;
    const { slug } = problem;
    const starter = problem.starter_code?.[language] || "";
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDraft(slug, language, next, starter), 400);
  }

  function resetToStarter() {
    const starter = problem?.starter_code?.[language] || "";
    clearTimeout(saveTimer.current);
    saveDraft(problem.slug, language, starter, starter);
    setCode(starter);
    setEditorVersion((v) => v + 1);
  }

  const currentLangObj = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];
  const tier = diffTier(problem?.difficulty);
  const realElo = liveElo ?? (user?.elo_rating ? Math.round(user.elo_rating) : null);

  // beforeMount receives ONE argument: (monaco) => {}
  const handleEditorBeforeMount = (monaco) => {
    monaco.editor.defineTheme("oled-dark", {
      base: "vs-dark", inherit: true,
      rules: [
        { token: "comment", foreground: "64748b", fontStyle: "italic" },
        { token: "keyword", foreground: "c084fc" },
        { token: "string", foreground: "86efac" },
        { token: "number", foreground: "fb923c" }
      ],
      colors: {
        "editor.background": "#0a0a0c",
        "editor.lineHighlightBackground": "#08080d",
        "editorGutter.background": "#0a0a0c",
        "editor.selectionBackground": "#3b82f640",
        "editorLineNumber.foreground": "#334155",
        "editorLineNumber.activeForeground": "#94a3b8",
      },
    });
    monaco.editor.setTheme("oled-dark");
  };

  // onMount receives TWO arguments: (editor, monaco) => {}
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  const focusLineInEditor = (lineNumber) => {
    if (!editorRef.current || !monacoRef.current) return;
    editorRef.current.revealLineInCenter(lineNumber);
    editorRef.current.setPosition({ lineNumber, column: 1 });
    editorRef.current.focus();
    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, [
      { range: new monacoRef.current.Range(lineNumber, 1, lineNumber, 1), options: { isWholeLine: true, className: "bg-blue-500/20 border-l-2 border-blue-500" } }
    ]);
    setTimeout(() => { if (editorRef.current) decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []); }, 3000);
  };

  const fetchProblem = useCallback(async () => {
    setProblemLoading(true);
    setProblemError(false);
    try {
      // An explicit slug, else the problem this candidate was last on (so a
      // reload doesn't swap it for a new random pick), else an adaptive one.
      let slugToLoad = problemSlug || recallProblem();
      let res = slugToLoad ? await api.get(`/coding/problems/${slugToLoad}`).catch(() => null) : null;
      if (!res?.data) {
        const nextRes = await api.get(`/coding/next`);
        slugToLoad = nextRes?.data?.slug;
        if (!slugToLoad) throw new Error("No problem slug available");
        res = await api.get(`/coding/problems/${slugToLoad}`);
      }
      rememberProblem(res.data.slug);
      setProblem(res.data);
      setCode(codeFor(res.data, languageRef.current));
      setProblemLoading(false);
    } catch (err) {
      console.error("Failed to load problem:", err);
      setProblemError(true);
      setProblemLoading(false);
    }
  }, [problemSlug]);

  const fetchAllProblems = useCallback(async () => {
    try {
      const res = await api.get(`/coding/problems`);
      if (res?.data?.problems?.length) setAllProblems(res.data.problems);
    } catch (err) { console.warn("Could not fetch problem catalog:", err); }
  }, []);

  useEffect(() => { fetchProblem(); fetchAllProblems(); }, [fetchProblem, fetchAllProblems]);

  // Real ticking timer + history reset scoped to the actual problem, not
  // language switches (same problem, different language shouldn't reset it).
  useEffect(() => {
    if (!problem?.slug) return;
    setElapsedSeconds(0);
    setRunHistory([]);
    const start = Date.now();
    const tick = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [problem?.slug]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (runState !== "running") runCode();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "b") { e.preventDefault(); setFocusMode((p) => !p); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, language, problem, runState]);

  const handleLanguageChange = (newLang) => {
    if (problem?.slug) {
      clearTimeout(saveTimer.current);
      saveDraft(problem.slug, language, code, problem.starter_code?.[language] || "");
    }
    setLanguage(newLang);
    setCode(codeFor(problem, newLang));
    setRunState("idle"); setRunResults(null);
    setReviewState("idle"); setReviewData(null);
    setHintCards([]);
  };

  const loadProblemBySlug = async (slug) => {
    setRunState("idle"); setRunResults(null);
    setReviewState("idle"); setReviewData(null);
    setHintCards([]);
    const found = allProblems.find((p) => p.slug === slug);
    if (found?.starter_code) {
      rememberProblem(found.slug);
      setProblem(found);
      setCode(codeFor(found, language));
      return;
    }
    setProblemLoading(true);
    try {
      const res = await api.get(`/coding/problems/${slug}`);
      rememberProblem(res.data.slug);
      setProblem(res.data);
      setCode(codeFor(res.data, language));
      setProblemError(false);
    } catch (err) {
      setProblemError(true);
    }
    setProblemLoading(false);
  };

  async function generateHint() {
    setHintLoading(true);
    setHintError(false);
    try {
      const res = await api.post(`/coding/hint`,
        { problem: problem?.description || "", current_code: code, language });
      if (!res?.data?.hint) throw new Error("No hint returned");
      setHintCards((prev) => [...prev, res.data.hint]);
    } catch (err) {
      setHintError(true);
    }
    setHintLoading(false);
  }

  async function runCode() {
    if (!problem) return;
    setActiveRightTab("terminal");
    setRunState("running");
    if (focusMode) setFocusMode(false);
    try {
      // Judge0 polling can take a while on a cold sandbox — longer than the
      // client's 30s default is fine here, a hung spinner is not.
      const res = await api.post(`/coding/run`, { problem_id: problem.id, code, language }, { timeout: 60000 });
      setRunResults(res.data);
      setRunState("output");
      setResultsSource("run");
      setRunHistory((prev) => [...prev, { type: "run", at: Date.now(), passed: res.data.passed_count, total: res.data.total }].slice(-10));
    } catch (err) {
      setRunError(err.message || "The sandbox did not return a result.");
      setRunState("error");
    }
  }

  async function submitCode() {
    if (!problem) return;
    setActiveRightTab("terminal");
    setRunState("running");
    if (focusMode) setFocusMode(false);
    try {
      const res = await api.post(`/coding/submit`,
        { problem_id: problem.id, code, language, session_id: sessionId || null },
        { timeout: 90000 }); // full test run + AI quality review
      setRunResults(res.data);
      setRunState("output");
      setResultsSource("submit");
      if (typeof res.data.new_elo === "number") {
        setLiveElo(Math.round(res.data.new_elo));
        if (onEloUpdate) onEloUpdate(res.data.new_elo);
      }
      setRunHistory((prev) => [...prev, { type: "submit", at: Date.now(), passed: res.data.tests_passed, total: res.data.tests_total }].slice(-10));
      generateReview(res.data);
    } catch (err) {
      setRunError(err.message || "Submission did not return a result.");
      setRunState("error");
    }
  }

  // Submit's response already contains everything a review needs.
  // No review_only support exists on the backend, so this is now a
  // pure render of data already in hand — zero network calls.
  function generateReview(submitResponse) {
    setActiveRightTab("review");
    if (!submitResponse) {
      setReviewState("error");
      return;
    }
    setReviewData(submitResponse);
    setReviewState("content");
  }

  if (problemLoading) {
    return (
      <div className="h-screen w-full bg-transparent flex flex-col items-center justify-center font-mono">
        <div className="w-10 h-10 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin mb-4" />
        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">&gt; Initializing Sandboxed Runtime Environment...</span>
      </div>
    );
  }

  if (problemError || !problem) {
    return (
      <div className="h-screen w-full bg-transparent flex items-center justify-center font-sans">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto"><AlertTriangle size={24} /></div>
          <h2 className="text-lg font-bold text-white tracking-tight">Couldn't load a problem</h2>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">The adaptive problem-selection engine didn't return a result. No fallback problem is shown — retry below.</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={fetchProblem} className="px-6 py-2.5 btn-liquid rounded-xl text-xs font-bold transition-all flex items-center gap-2">
              <RotateCcw size={13} /> Retry
            </button>
            {onFinish && <button onClick={onFinish} className="px-6 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl text-xs font-bold text-white transition-all">Exit</button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-transparent text-slate-100 font-sans selection:bg-blue-500/30 overflow-hidden relative">

      {/* Difficulty-reactive ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div animate={{ background: tier.glowA }} transition={{ duration: 1 }}
          className="absolute top-[-15%] left-[-10%] w-[45vw] h-[45vw] rounded-full blur-[130px]" />
        <motion.div animate={{ background: tier.glowB }} transition={{ duration: 1 }}
          className="absolute bottom-[-15%] right-[-8%] w-[35vw] h-[35vw] rounded-full blur-[130px]" />
      </div>

      {/* HEADER */}
      <header className="h-12 bg-black/70 backdrop-blur-xl border-b border-white/[0.08] shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)] flex items-center justify-between px-6 z-50 shrink-0 relative">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 bg-white flex items-center justify-center text-[9px] font-extrabold text-black">IC</div>
            <span className="text-white text-xs font-bold tracking-tight hidden sm:block">InterviewCoach</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest transition-colors duration-700 ease-out"
              style={{ background: tier.badgeBg, borderColor: tier.badgeBorder, color: tier.hue, border: "1px solid" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse transition-colors duration-700 ease-out" style={{ background: tier.hue }} /> {tier.label}
            </span>
            <span className="hidden md:flex items-center gap-1.5 bg-white/5 border border-white/10 text-slate-400 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tabular-nums" title="Time on this problem">
              {formatElapsed(elapsedSeconds)}
            </span>
            <span className="bg-white/5 border border-white/10 text-slate-400 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck size={10} /> Sandbox
            </span>
          </div>
        </div>

        <span className="text-white text-sm font-extrabold tracking-tight truncate max-w-[40%]">{problem.title}</span>

        <div className="flex items-center gap-4">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setFocusMode(!focusMode)}
            className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors px-3 py-1.5 rounded-md border ${focusMode ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-white/5 text-slate-400 border-white/10 hover:text-white"}`}
            title="Toggle Focus Mode (⌘B)">
            {focusMode ? <PanelRightOpen size={13} /> : <PanelRightClose size={13} />}
            <span className="hidden sm:inline">Focus</span>
          </motion.button>

          {allProblems.length > 0 && (
            <div className="w-48 sm:w-56">
              <CustomDropdown value={problem.slug} onChange={loadProblemBySlug}
                options={allProblems.map((p) => ({ id: p.slug, title: p.title, difficulty: p.difficulty }))}
                icon={Layers} placeholder="Select Problem" label="Problem" />
            </div>
          )}

          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2 hidden sm:flex font-mono">
            <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">ELO</span>
            <span className="text-white text-xs font-bold tabular-nums">{realElo ?? "—"}</span>
          </div>

          {onFinish && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={onFinish}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors bg-white/5 border border-white/10 px-3 py-1.5 rounded-md">
              <ArrowLeft size={12} /> Exit
            </motion.button>
          )}
        </div>
      </header>

      <main className="flex-1 w-full flex overflow-hidden relative z-10">

        {/* LEFT: SPEC */}
        <GlassPanel className="w-full md:w-[25%] min-w-[300px] border-r border-white/[0.08] flex flex-col h-full overflow-hidden shrink-0">
          <div className="h-10 border-b border-white/[0.08] flex items-center px-4 gap-2 shrink-0">
            {[{ id: "spec", label: "01 Specification", icon: FileText }, { id: "tests", label: "02 Test Suite", icon: Hash }, { id: "targets", label: "03 Complexity", icon: Gauge }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveLeftTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 h-full text-[10px] font-mono font-bold transition-all outline-none border-b-2 ${activeLeftTab === tab.id ? "text-white border-blue-500 bg-white/[0.03]" : "text-slate-500 border-transparent hover:text-slate-300"}`}>
                <tab.icon size={12} className={activeLeftTab === tab.id ? "text-blue-400" : ""} />{tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute top-0 inset-x-0 h-6 bg-linear-to-b from-[#08080A] to-transparent z-10" />
          <div className="h-full overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {activeLeftTab === "spec" && (
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
                <motion.div variants={staggerItem}>
                  <h1 className="text-[22px] font-black tracking-tight text-white mb-3 leading-snug">{problem.title}</h1>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {problem.time_complexity_target ? (
                      <span className="text-[9.5px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-md uppercase tracking-widest">TARGET: {problem.time_complexity_target} TIME</span>
                    ) : (
                      <span className="text-[9.5px] font-mono font-bold text-slate-600 bg-white/[0.03] border border-white/10 px-2.5 py-1 rounded-md uppercase tracking-widest italic">Time target unavailable</span>
                    )}
                    {problem.space_complexity_target ? (
                      <span className="text-[9.5px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-md uppercase tracking-widest">TARGET: {problem.space_complexity_target} SPACE</span>
                    ) : (
                      <span className="text-[9.5px] font-mono font-bold text-slate-600 bg-white/[0.03] border border-white/10 px-2.5 py-1 rounded-md uppercase tracking-widest italic">Space target unavailable</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-[1.7] font-medium whitespace-pre-line border-l-2 border-white/10 pl-3">{problem.description}</p>
                </motion.div>

                {(problem.input_format || problem.output_format) && (
                  <motion.div variants={staggerItem} className="bg-[#0a0a10]/90 border border-white/[0.08] rounded-xl p-4 space-y-3 font-mono text-[11px]">
                    <div><span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">Input Format</span><span className="text-slate-300">{problem.input_format}</span></div>
                    <div className="border-t border-white/[0.06] pt-3"><span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">Output Format</span><span className="text-slate-300">{problem.output_format}</span></div>
                  </motion.div>
                )}

                {problem.constraints?.length > 0 && (
                  <motion.div variants={staggerItem}>
                    <h3 className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-2">Constraints</h3>
                    <ul className="space-y-1.5 bg-[#0a0a10]/90 border border-white/[0.08] p-4 rounded-xl">
                      {problem.constraints.map((c, i) => (
                        <li key={i} className="text-[11px] font-mono text-slate-400 flex items-start gap-2"><span className="text-blue-500 mt-0.5">{">"}</span> {c}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeLeftTab === "tests" && (
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Sample Test Suite</span>
                  <span className="text-[10px] font-mono text-slate-500">{problem.sample_test_cases?.length || 0} Cases</span>
                </div>
                <div className="space-y-3">
                  {(problem.sample_test_cases || []).map((tc, idx) => (
                    <motion.div key={idx} variants={staggerItem} className="bg-[#0a0a10]/90 border border-white/[0.08] p-3.5 rounded-xl space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase"><span>Case 0{idx + 1}</span></div>
                      <div><span className="text-slate-500">Input:</span> <span className="text-white font-bold">{tc.input}</span></div>
                      <div><span className="text-slate-500">Expected:</span> <span className="text-indigo-400 font-bold">{tc.expected_output}</span></div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeLeftTab === "targets" && (
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
                <motion.div variants={staggerItem} className="bg-[#0a0a10]/90 border border-white/[0.08] p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2"><Gauge size={14} className="text-blue-400" /> Complexity Bounds</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Specific to this problem's constraints — not a default applied to every problem.</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Time Target</span>
                      <span className="text-emerald-400 font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">{problem.time_complexity_target || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Space Target</span>
                      <span className="text-indigo-400 font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">{problem.space_complexity_target || "—"}</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Hints */}
            <div className="pt-4 border-t border-white/[0.08] space-y-2">
              {hintCards.length === 0 && !hintLoading && !hintError && (
                <button onClick={generateHint} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-white/[0.14] bg-transparent hover:bg-white/[0.04] text-[11px] font-bold text-slate-400 hover:text-white transition-all outline-none">
                  <Lightbulb size={14} className="text-blue-400" /> Generate first hint
                </button>
              )}
              {hintLoading && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-slate-400">
                  <Activity size={13} className="animate-spin text-amber-400" /> Generating Socratic hint for this problem…
                </div>
              )}
              {hintError && (
                <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5"><AlertTriangle size={12} /> Hint unavailable</p>
                  <p className="text-[11px] text-amber-200/70">The hint service didn't return a result. No generic hint will be substituted.</p>
                  <button onClick={generateHint} className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"><RotateCcw size={11} /> Retry</button>
                </div>
              )}
              {hintCards.map((hint, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs p-3 rounded-lg font-medium leading-relaxed">
                  <span className="block text-[9px] font-bold uppercase tracking-widest text-blue-400 mb-1.5">Hint {i + 1}</span>"{hint}"
                </motion.div>
              ))}
              {hintCards.length > 0 && !hintLoading && (
                <button onClick={generateHint} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-white/[0.14] bg-transparent hover:bg-white/[0.04] text-[10px] font-bold text-slate-500 hover:text-white transition-all">
                  Next hint
                </button>
              )}
            </div>
          </div>
          </div>

          <div className="h-8 border-t border-white/[0.08] flex justify-between items-center px-4 text-[9px] font-mono text-slate-500 shrink-0">
            <span>ISOLATED LINUX SANDBOX</span>
            <span className="text-emerald-400 font-bold">READY</span>
          </div>
        </GlassPanel>

        {/* CENTER: EDITOR */}
        <div className={`h-full flex flex-col relative bg-[#0a0a0c] transition-all duration-300 ease-in-out border-r border-white/[0.08] ${focusMode ? "w-[75%]" : "w-[50%]"}`}>
          <div className="h-10 bg-black/70 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex items-center justify-between px-4 border-b border-white/[0.08] shrink-0 relative z-30">
            <div className="h-full flex items-center gap-2 px-4 text-xs font-mono font-bold border-t-2 border-t-blue-500 text-white bg-white/[0.03] border-x border-white/[0.08]">
              <Code2 size={13} className="text-blue-400" /> solution.{currentLangObj.ext}
            </div>
            <div className="flex items-center gap-2">
            {code !== (problem?.starter_code?.[language] || "") && (
              <button type="button" onClick={resetToStarter} title="Discard your changes for this language"
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white px-2 py-1 rounded-md border border-white/10 bg-white/[0.03]">
                <RotateCcw size={11} aria-hidden="true" /> Reset
              </button>
            )}
            <div className="w-44">
              <CustomDropdown
                label="Language"
                value={language}
                onChange={handleLanguageChange}
                options={LANGUAGES}
                icon={Code2}
                placeholder="Language"
              />
            </div>
            </div>
          </div>

          <div className="flex-1 relative pt-2">
            <Editor key={`${problem.slug}:${language}:${editorVersion}`} height="100%" language={currentLangObj.monaco}
              beforeMount={handleEditorBeforeMount} onMount={handleEditorDidMount}
              theme={highContrast ? "hc-black" : "oled-dark"} defaultValue={code} onChange={handleCodeChange}
              options={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, lineHeight: 24, padding: { top: 16, bottom: 60 }, overviewRulerBorder: false, hideCursorInOverviewRuler: true, renderLineHighlight: "all", cursorBlinking: "smooth" }} />
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-14 bg-black/70 backdrop-blur-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/[0.08] flex items-center justify-between px-6 z-20">
            <div className="flex items-center gap-3">
              <motion.button whileHover={{ scale: 0.99 }} whileTap={{ scale: 0.95 }} onClick={runCode} disabled={runState === "running"}
                className="relative overflow-hidden px-4 py-1.5 rounded-md text-xs font-bold bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white flex items-center gap-2 transition-all outline-none disabled:opacity-40 group">
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 bg-linear-to-r from-transparent via-white/10 to-transparent" />
                {runState === "running" ? <Activity size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                <span className="relative">Run Code</span>
                <kbd className="hidden lg:inline-block font-mono text-[9px] bg-black/40 border border-white/10 px-1.5 py-0.5 rounded text-slate-400 relative">⌘↵</kbd>
              </motion.button>
              <motion.button whileHover={{ scale: 0.99 }} whileTap={{ scale: 0.95 }} onClick={submitCode} disabled={runState === "running"}
                className="relative overflow-hidden px-6 py-1.5 rounded-md text-xs font-bold btn-liquid flex items-center gap-2 transition-all outline-none disabled:opacity-40 group">
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 bg-linear-to-r from-transparent via-black/15 to-transparent" />
                {runState === "running" ? <Activity size={12} className="animate-spin" /> : <Send size={12} />}
                <span className="relative">Submit</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* RIGHT: RESULTS/REVIEW/HINTS */}
        <GlassPanel className={`h-full flex flex-col shrink-0 transition-all duration-300 ease-in-out ${focusMode ? "w-0 opacity-0 border-none" : "w-[25%] opacity-100 min-w-[300px] border-l border-white/[0.08]"}`}>
          <div className="h-10 border-b border-white/[0.08] flex items-center px-4 gap-2 shrink-0">
            {[{ id: "terminal", label: "CI/CD Logs", icon: Terminal }, { id: "review", label: "AI Review", icon: Sparkles }, { id: "hints", label: "Hints", icon: Lightbulb }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveRightTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 h-full text-[10px] font-mono font-bold transition-all outline-none border-b-2 ${activeRightTab === tab.id ? "text-blue-400 border-blue-500 bg-blue-500/5" : "text-slate-500 border-transparent hover:text-slate-300"}`}>
                <tab.icon size={12} />{tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute top-0 inset-x-0 h-6 bg-linear-to-b from-[#08080A] to-transparent z-10" />
          <div className="h-full p-6 overflow-y-auto font-mono text-xs text-slate-300 scrollbar-hide">
            <AnimatePresence mode="wait">
              {activeRightTab === "terminal" && (
                <motion.div key="terminal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
                  {runHistory.length > 0 && (
                    <div className="flex items-center gap-1.5 pb-3 mb-1 border-b border-white/[0.06] overflow-x-auto scrollbar-hide">
                      {runHistory.map((h, i) => (
                        <span key={i} title={`${h.type === "submit" ? "Submit" : "Run"} at ${formatClock(h.at)}`}
                          className={`shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border tabular-nums ${h.passed === h.total ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" : "text-rose-400 border-rose-500/20 bg-rose-500/5"}`}>
                          {h.type === "submit" ? "SUB" : "RUN"} {h.passed}/{h.total}
                        </span>
                      ))}
                    </div>
                  )}
                  {runState === "idle" && (
                    <div className="flex flex-col items-center text-center gap-2 py-10 border border-dashed border-white/[0.08] rounded-xl">
                      <Terminal size={20} className="text-slate-700" />
                      <p className="text-slate-500 text-[11px]">Sandbox initialized. Awaiting execution command.</p>
                    </div>
                  )}
                  {runState === "running" && (
                    <div className="flex items-center gap-2 text-blue-400"><Activity size={14} className="animate-spin" /><span>&gt; Executing pipeline in sandbox...</span></div>
                  )}
                  {runState === "error" && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-3">
                      <div className="flex items-center gap-2 text-rose-400 font-sans font-bold text-[13px]"><XCircle size={16} /> Execution failed</div>
                      <p className="text-[11px] text-rose-200/70 font-sans leading-relaxed">Your code was not evaluated — no fabricated result is shown. Details below.</p>
                      <div className="bg-black/40 border border-white/[0.07] rounded-lg p-3 text-[10.5px] text-rose-300">{runError}</div>
                      <button onClick={runCode} className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 font-sans"><RotateCcw size={11} /> Retry Execution</button>
                    </div>
                  )}
                                   {runState === "output" && runResults && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] text-slate-500">$ {currentLangObj.label} · sandbox execution</div>
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${resultsSource === "submit" ? "text-white bg-white/10 border-white/20" : "text-slate-400 bg-white/[0.03] border-white/10"}`}>
                          {resultsSource === "submit" ? "Submit result" : "Run result"}
                        </span>
                      </div>

                      {resultsSource === "run" ? (
                        (() => {
                          const maxMs = Math.max(1, ...(runResults.results || []).map((r) => parseMs(r.execution_time) || 0));
                          return (
                            <div className="space-y-2">
                              {(runResults.results || []).map((r, idx) => {
                                const ms = parseMs(r.execution_time);
                                return (
                                  <motion.div key={idx} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} whileHover={{ x: 3 }}
                                    className={`p-2.5 rounded-lg border-l-[3px] transition-all ${r.passed ? "bg-emerald-500/[0.06] border-emerald-500 border-y border-r border-emerald-500/20" : "bg-rose-500/[0.06] border-rose-500 border-y border-r border-rose-500/20"}`}>
                                    <div className="flex items-start gap-2.5">
                                      {r.passed ? <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" /> : <XCircle size={12} className="text-rose-500 mt-0.5 shrink-0" />}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className={r.passed ? "text-slate-300" : "text-rose-400"}>Test 0{idx + 1} · Output: {r.actual}</span>
                                          {!r.passed && parseErrorLine(r.stderr) && (
                                            <button
                                              onClick={() => focusLineInEditor(parseErrorLine(r.stderr))}
                                              className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 flex items-center gap-1 font-sans"
                                            >
                                              Jump to Error →
                                            </button>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          {ms !== null ? (
                                            <>
                                              <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden max-w-[100px]">
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(6, (ms / maxMs) * 100)}%` }} transition={{ duration: 0.4 }}
                                                  className={`h-full rounded-full ${r.passed ? "bg-emerald-500/70" : "bg-rose-500/70"}`} />
                                              </div>
                                              <span className="text-[9px] text-slate-500 tabular-nums">{r.execution_time}</span>
                                            </>
                                          ) : (
                                            <span className="text-[9px] text-slate-600 italic">timing unavailable</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          );
                        })()
                      ) : (
                        <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.08] space-y-1">
                          <p className="text-[10px] text-slate-500 leading-relaxed">
                            Hidden test detail isn't returned by design — only the aggregate result is shown.
                          </p>
                        </div>
                      )}

                      <div className="pt-4 mt-4 border-t border-white/[0.08] text-[10px] flex gap-6">
                        {resultsSource === "submit" ? (
                          <span className="text-emerald-400 tabular-nums">{runResults.tests_passed}/{runResults.tests_total} passing</span>
                        ) : (
                          <span className="text-emerald-400 tabular-nums">{runResults.passed_count}/{runResults.total} passing</span>
                        )}
                        {runResults.execution_time && <span className="text-slate-500 tabular-nums">{runResults.execution_time}</span>}
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {activeRightTab === "review" && (
                <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
                  {reviewState === "idle" && (
                    <div className="text-center py-10 font-sans flex flex-col items-center gap-3">
                      <Sparkles size={20} className="text-blue-400/50" />
                      <span className="text-xs font-medium text-slate-500">Submit your code to receive a real review, tied to your actual submission.</span>
                    </div>
                  )}
                  {reviewState === "loading" && (
                    <div className="space-y-2.5 font-sans">
                      <div className="flex items-center gap-2 text-slate-400 mb-2"><Activity size={13} className="animate-spin text-amber-400" /> Generating review for your submission…</div>
                      {[90, 75, 82, 60].map((w, i) => <div key={i} className="h-3 rounded bg-white/[0.06] animate-pulse" style={{ width: `${w}%` }} />)}
                    </div>
                  )}
                  {reviewState === "error" && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 font-sans">
                      <p className="text-[13px] font-bold text-amber-400 flex items-center gap-1.5"><AlertTriangle size={14} /> Review unavailable</p>
                      <p className="text-[11px] text-amber-200/70">No submission has been graded yet, or the last submit didn't return a result.</p>
                    </div>
                  )}
                  {reviewState === "content" && reviewData && (
                    <div className="space-y-4 font-sans">
                      <div className="flex items-center gap-4 pb-3 border-b border-white/[0.06]">
                        <div className="text-center">
                          <p className="text-lg font-extrabold text-white tabular-nums">{reviewData.tests_passed}/{reviewData.tests_total}</p>
                          <p className="text-[8.5px] font-bold uppercase tracking-widest text-slate-500">Tests</p>
                        </div>
                        {typeof reviewData.new_elo === "number" && (
                          <div className="text-center">
                            <p className="text-lg font-extrabold text-indigo-400 tabular-nums">{Math.round(reviewData.new_elo)}</p>
                            <p className="text-[8.5px] font-bold uppercase tracking-widest text-slate-500">New ELO</p>
                          </div>
                        )}
                        {reviewData.cleanliness_score != null && (
                          <div className="text-center">
                            <p className="text-lg font-extrabold text-emerald-400 tabular-nums">{reviewData.cleanliness_score}</p>
                            <p className="text-[8.5px] font-bold uppercase tracking-widest text-slate-500">Cleanliness</p>
                          </div>
                        )}
                        {reviewData.naming_score != null && (
                          <div className="text-center">
                            <p className="text-lg font-extrabold text-emerald-400 tabular-nums">{reviewData.naming_score}</p>
                            <p className="text-[8.5px] font-bold uppercase tracking-widest text-slate-500">Naming</p>
                          </div>
                        )}
                      </div>
                      {reviewData.complexity_estimate && (
                        <div>
                          <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5">Complexity Estimate</p>
                          <p className="text-xs text-slate-300 leading-relaxed font-mono">{reviewData.complexity_estimate}</p>
                        </div>
                      )}
                      {reviewData.feedback && (
                        <div>
                          <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1.5">Feedback</p>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{reviewData.feedback}</p>
                        </div>
                      )}
                      {!reviewData.complexity_estimate && !reviewData.feedback && (
                        <p className="text-xs text-slate-500 italic">This submission was graded, but no qualitative feedback came back for it.</p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {activeRightTab === "hints" && (
                <motion.div key="hints" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="text-center py-10 font-sans">
                  <p className="text-xs text-slate-500">Hints are shown in the left panel — generate one anytime while working.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>
        </GlassPanel>

      </main>
    </div>
  );
}