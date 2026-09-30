import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../lib/api";
import { codeFor, recallProblem, rememberProblem, saveDraft } from "./coding/drafts";
import { usePreferences } from "../lib/preferences";
import Editor from "@monaco-editor/react";
import { motion } from "motion/react";
import {
  Play, Send, Code2, ArrowLeft, AlertTriangle, Activity,
  Layers, PanelRightClose, PanelRightOpen, RotateCcw,
} from "lucide-react";

import { LANGUAGES, MOD_KEY, diffTier, formatElapsed } from "./coding/constants";
import { CustomDropdown, GlassPanel } from "./coding/ui";
import ProblemPane from "./coding/ProblemPane";
import { OutputTab, Review } from "./coding/Results";
import { defineEditorTheme } from "./coding/editorTheme";

const RIGHT_TABS = [{ id: "output", label: "Output" }, { id: "review", label: "Review" }];

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

  const [activeRightTab, setActiveRightTab] = useState("output");
  // Below the md breakpoint the three panes don't fit side by side; one
  // shows at a time, chosen from the bar under the header.
  const [mobilePane, setMobilePane] = useState("problem");

  const [hintCards, setHintCards] = useState([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState(false);

  const [runState, setRunState] = useState("idle"); // idle | running | error | output
  const [runResults, setRunResults] = useState(null);
  const [runError, setRunError] = useState("");
  const [resultsSource, setResultsSource] = useState(null); // 'run' | 'submit' — the action in flight or last finished
  const [runHistory, setRunHistory] = useState([]); // this problem's run/submit attempts
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [review, setReview] = useState(null); // the last submit's response
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
    defineEditorTheme(monaco);
  };

  // Ctrl/⌘+Enter runs the examples. Inside the editor Monaco claims that
  // chord (insert line below) before the window sees it, so the editor gets
  // its own command; it calls through a ref to always run the latest code.
  const runRef = useRef(null);

  // onMount receives TWO arguments: (editor, monaco) => {}
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.());
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

  // Timer and attempt history belong to the problem, not the language:
  // switching language on the same problem keeps both.
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
        runCode();
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
    setReview(null);
    setHintCards([]);
  };

  const loadProblemBySlug = async (slug) => {
    setRunState("idle"); setRunResults(null);
    setReview(null);
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
    if (!problem || runState === "running") return;
    setActiveRightTab("output");
    setMobilePane("output");
    setResultsSource("run");
    setRunState("running");
    setFocusMode(false);
    try {
      // Judge0 polling can take a while on a cold sandbox — longer than the
      // client's 30s default is fine here, a hung spinner is not.
      const res = await api.post(`/coding/run`, { problem_id: problem.id, code, language }, { timeout: 60000 });
      setRunResults(res.data);
      setRunState("output");
      setRunHistory((prev) => [...prev, { type: "run", at: Date.now(), passed: res.data.passed_count, total: res.data.total }].slice(-10));
    } catch (err) {
      setRunError(err.message || "The sandbox did not return a result.");
      setRunState("error");
    }
  }
  runRef.current = runCode;

  async function submitCode() {
    if (!problem || runState === "running") return;
    setActiveRightTab("output");
    setMobilePane("output");
    setResultsSource("submit");
    setRunState("running");
    setFocusMode(false);
    try {
      const res = await api.post(`/coding/submit`,
        { problem_id: problem.id, code, language, session_id: sessionId || null },
        { timeout: 90000 }); // full test run + AI quality review
      setRunResults(res.data);
      setRunState("output");
      if (typeof res.data.new_elo === "number") {
        setLiveElo(Math.round(res.data.new_elo));
        if (onEloUpdate) onEloUpdate(res.data.new_elo);
      }
      setRunHistory((prev) => [...prev, { type: "submit", at: Date.now(), passed: res.data.tests_passed, total: res.data.tests_total }].slice(-10));
      // Submit's response is the review; show it straight away.
      setReview(res.data);
      setActiveRightTab("review");
    } catch (err) {
      setRunError(err.message || "The submission did not return a result.");
      setRunState("error");
    }
  }

  const onTabKeyDown = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = RIGHT_TABS.findIndex((t) => t.id === activeRightTab);
    const next = RIGHT_TABS[(i + (e.key === "ArrowRight" ? 1 : RIGHT_TABS.length - 1)) % RIGHT_TABS.length];
    setActiveRightTab(next.id);
    document.getElementById(`coding-tab-${next.id}`)?.focus();
  };

  if (problemLoading) {
    return (
      <div role="status" className="h-screen w-full bg-transparent flex flex-col items-center justify-center">
        <div aria-hidden="true" className="w-8 h-8 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin mb-4" />
        <span className="text-slate-400 text-[13px]">Loading the problem…</span>
      </div>
    );
  }

  if (problemError || !problem) {
    return (
      <div className="h-screen w-full bg-transparent flex items-center justify-center font-sans">
        <div role="alert" className="text-center space-y-3 max-w-md px-6">
          <AlertTriangle size={24} aria-hidden="true" className="text-rose-400 mx-auto" />
          <h1 className="text-lg font-semibold text-white">Couldn't load a problem</h1>
          <p className="text-[13.5px] text-slate-400 leading-relaxed">The server didn't return one. Try again, or go back and come in later.</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button type="button" onClick={fetchProblem} className="px-5 py-2 btn-liquid rounded-lg text-[13px] font-semibold flex items-center gap-2">
              <RotateCcw size={13} aria-hidden="true" /> Try again
            </button>
            {onFinish && <button type="button" onClick={onFinish} className="px-5 py-2 bg-white/[0.05] hover:bg-white/[0.1] glass-control rounded-lg text-[13px] font-semibold text-white">Back</button>}
          </div>
        </div>
      </div>
    );
  }

  const running = runState === "running";

  return (
    <div className="flex flex-col h-screen w-full bg-transparent text-slate-100 font-sans selection:bg-blue-500/30 overflow-hidden relative">

      {/* Difficulty-tinted ambient glow */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div animate={{ background: tier.glowA }} transition={{ duration: 1 }}
          className="absolute top-[-15%] left-[-10%] w-[45vw] h-[45vw] rounded-full blur-[130px]" />
        <motion.div animate={{ background: tier.glowB }} transition={{ duration: 1 }}
          className="absolute bottom-[-15%] right-[-8%] w-[35vw] h-[35vw] rounded-full blur-[130px]" />
      </div>

      <header className="nav-glass h-12 flex items-center justify-between px-4 md:px-6 z-50 shrink-0 relative gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div aria-hidden="true" className="w-6 h-6 bg-white flex items-center justify-center text-[10px] font-extrabold text-black">IC</div>
            <span className="text-white text-xs font-bold tracking-tight hidden sm:block">InterviewCoach</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <span className="hidden sm:inline text-[13px] font-medium shrink-0" style={{ color: tier.hue }}>
            {tier.label}{problem.difficulty ? <span className="text-slate-400 font-normal"> · level {problem.difficulty}</span> : null}
          </span>
          <span className="hidden md:flex items-center gap-2 text-[13px]" title="Time since you opened this problem">
            <span className="text-slate-400">On this problem</span>
            <span className="font-mono font-bold text-slate-200 tabular-nums">{formatElapsed(elapsedSeconds)}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          {allProblems.length > 0 && (
            <div className="w-40 sm:w-56">
              <CustomDropdown value={problem.slug} onChange={loadProblemBySlug}
                options={allProblems.map((p) => ({ id: p.slug, title: p.title, difficulty: p.difficulty }))}
                icon={Layers} placeholder="Choose a problem" label="Problem" />
            </div>
          )}

          <button type="button" onClick={() => setFocusMode((p) => !p)} aria-pressed={focusMode}
            title={`Hide the output panel (${MOD_KEY}+B)`}
            className={`hidden md:flex items-center gap-1.5 text-[13px] px-3 py-1 border transition-colors ${focusMode ? "bg-blue-500/10 text-blue-300 border-blue-500/30" : "text-slate-300 border-white/15 hover:text-white hover:bg-white/[0.06]"}`}>
            {focusMode ? <PanelRightOpen size={13} aria-hidden="true" /> : <PanelRightClose size={13} aria-hidden="true" />}
            Focus
          </button>

          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="items-center gap-2 hidden sm:flex text-[13px]">
            <span className="text-slate-400">Rating</span>
            <span className="text-sm font-mono font-bold text-white tabular-nums">{realElo != null ? realElo.toLocaleString() : "—"}</span>
          </div>

          {onFinish && (
            <button type="button" onClick={onFinish}
              className="flex items-center gap-1.5 text-[13px] text-slate-300 hover:text-white glass-control rounded-lg px-3 py-1 hover:bg-white/[0.06] transition-colors">
              <ArrowLeft size={12} aria-hidden="true" /> Exit
            </button>
          )}
        </div>
      </header>

      <nav aria-label="Panes" className="nav-glass md:hidden flex shrink-0 relative z-40">
        {[{ id: "problem", label: "Problem" }, { id: "code", label: "Code" }, { id: "output", label: "Output" }].map((p) => (
          <button key={p.id} type="button" onClick={() => setMobilePane(p.id)} aria-pressed={mobilePane === p.id}
            className={`flex-1 h-10 text-[13px] border-b-2 ${mobilePane === p.id ? "text-white border-blue-500" : "text-slate-400 border-transparent"}`}>
            {p.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 w-full flex overflow-hidden relative z-10">

        {/* LEFT: the problem and hints */}
        <GlassPanel className={`${mobilePane === "problem" ? "flex" : "hidden"} md:flex w-full md:w-[25%] md:min-w-[300px] border-r border-white/[0.08] flex-col h-full overflow-hidden shrink-0`}>
          <ProblemPane problem={problem} hints={{ cards: hintCards, loading: hintLoading, error: hintError }} onHint={generateHint} />
        </GlassPanel>

        {/* CENTER: EDITOR */}
        <div className={`${mobilePane === "code" ? "flex" : "hidden"} md:flex h-full w-full flex-col relative bg-[#0a0a0c] transition-all duration-300 ease-in-out border-r border-white/[0.08] ${focusMode ? "md:w-[75%]" : "md:w-[50%]"}`}>
          <div className="h-10 bg-white/[0.02] flex items-center justify-between px-4 border-b border-white/[0.08] shrink-0 relative z-30">
            <div className="h-full flex items-center gap-2 px-3 text-[13px] font-mono text-white border-t-2 border-t-blue-500 bg-white/[0.03] border-x border-white/[0.08]">
              <Code2 size={13} aria-hidden="true" className="text-blue-400" /> solution.{currentLangObj.ext}
            </div>
            <div className="flex items-center gap-2">
              {code !== (problem?.starter_code?.[language] || "") && (
                <button type="button" onClick={resetToStarter} title="Discard your changes in this language"
                  className="flex items-center gap-1.5 text-[13px] text-slate-300 hover:text-white px-2 py-1 glass-control rounded-lg bg-white/[0.03]">
                  <RotateCcw size={11} aria-hidden="true" /> Reset
                </button>
              )}
              <div className="w-44">
                <CustomDropdown label="Language" value={language} onChange={handleLanguageChange}
                  options={LANGUAGES} icon={Code2} placeholder="Language" />
              </div>
            </div>
          </div>

          <div className="flex-1 relative pt-2">
            <Editor key={`${problem.slug}:${language}:${editorVersion}`} height="100%" language={currentLangObj.monaco}
              beforeMount={handleEditorBeforeMount} onMount={handleEditorDidMount}
              theme={highContrast ? "hc-black" : "oled-dark"} defaultValue={code} onChange={handleCodeChange}
              options={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, lineHeight: 24, padding: { top: 16, bottom: 60 }, overviewRulerBorder: false, hideCursorInOverviewRuler: true, renderLineHighlight: "all", cursorBlinking: "smooth", automaticLayout: true, ariaLabel: `Your ${currentLangObj.label} solution` }} />
          </div>

          <div className="nav-glass absolute bottom-0 left-0 right-0 h-14 flex items-center justify-between px-4 md:px-6 z-20 gap-3">
            <div className="flex items-center gap-3 ml-auto">
              <button type="button" onClick={runCode} disabled={running}
                className="px-4 py-1.5 rounded-md text-[13px] font-semibold bg-white/[0.05] hover:bg-white/10 glass-control text-white flex items-center gap-2 transition-colors disabled:opacity-50">
                {running && resultsSource === "run" ? <Activity size={12} aria-hidden="true" className="animate-spin" /> : <Play size={12} aria-hidden="true" fill="currentColor" />}
                Run
                <kbd className="hidden lg:inline-block font-mono text-[11.5px] bg-black/40 border border-white/10 px-1.5 py-0.5 rounded text-slate-300">{MOD_KEY}+Enter</kbd>
              </button>
              <button type="button" onClick={submitCode} disabled={running}
                className="px-5 py-1.5 rounded-md text-[13px] font-semibold btn-liquid flex items-center gap-2 disabled:opacity-50">
                {running && resultsSource === "submit" ? <Activity size={12} aria-hidden="true" className="animate-spin" /> : <Send size={12} aria-hidden="true" />}
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: output and review */}
        <GlassPanel className={`${mobilePane === "output" ? "flex" : "hidden"} md:flex h-full w-full flex-col shrink-0 transition-all duration-300 ease-in-out ${focusMode ? "md:w-0 md:opacity-0 md:border-none md:invisible" : "md:w-[25%] md:min-w-[300px] md:border-l border-white/[0.08]"}`}>
          <div role="tablist" aria-label="Results" className="h-10 border-b border-white/[0.08] flex items-center px-4 gap-1 shrink-0">
            {RIGHT_TABS.map((tab) => {
              const selected = activeRightTab === tab.id;
              return (
                <button key={tab.id} id={`coding-tab-${tab.id}`} type="button" role="tab" aria-selected={selected}
                  aria-controls="coding-results" tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveRightTab(tab.id)} onKeyDown={onTabKeyDown}
                  className={`px-3 h-full text-[13px] border-b-2 transition-colors ${selected ? "text-white border-blue-500" : "text-slate-400 border-transparent hover:text-slate-200"}`}>
                  {tab.label}{tab.id === "review" && review ? <span aria-hidden="true" className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-blue-400 align-middle" /> : null}
                </button>
              );
            })}
          </div>

          <div id="coding-results" role="tabpanel" tabIndex={0} aria-labelledby={`coding-tab-${activeRightTab}`}
            className="flex-1 p-6 overflow-y-auto text-[13px] text-slate-300 scrollbar-hide outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/20">
            {activeRightTab === "output" ? (
              <OutputTab runState={runState} resultsSource={resultsSource} runError={runError} runResults={runResults}
                runHistory={runHistory} onRetry={resultsSource === "submit" ? submitCode : runCode}
                onGoToLine={focusLineInEditor} onOpenReview={() => setActiveRightTab("review")} />
            ) : (
              <Review review={review} problem={problem} />
            )}
          </div>
        </GlassPanel>

      </main>
    </div>
  );
}
