import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, Send, Terminal, CheckCircle2, XCircle, Code2, 
  ArrowLeft, ChevronDown, Check, Lightbulb, AlertTriangle, 
  Activity, ChevronRight, Hash, Layers, Cpu, Sparkles
} from "lucide-react";
import { API_URL } from "../config";

// ============================================================================
// CUSTOM DROPDOWN (Fixed: Uses fixed positioning to break overflow-y clipping)
// ============================================================================
function CustomDropdown({ value, options, onChange, icon: Icon, placeholder, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updateCoords = () => {
        const rect = buttonRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width
        });
      };
      updateCoords();
      window.addEventListener("resize", updateCoords);
      const interval = setInterval(updateCoords, 100);
      return () => {
        window.removeEventListener("resize", updateCoords);
        clearInterval(interval);
      };
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.id === value || opt.slug === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] rounded-md px-3 py-2 text-xs font-mono font-medium text-slate-300 transition-all outline-none"
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon size={14} className="text-slate-500" />}
          <span className="truncate">{selectedOption ? selectedOption.label || selectedOption.title : placeholder}</span>
        </div>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width }}
            className="z-[9999] bg-[#0A0A0A] border border-white/[0.1] rounded-lg shadow-[0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto p-1 scrollbar-hide">
              {options.map((opt) => (
                <button
                  key={opt.id || opt.slug}
                  disabled={opt.disabled}
                  onClick={() => {
                    onChange(opt.id || opt.slug);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-mono text-left transition-colors ${
                    (opt.id === value || opt.slug === value)
                      ? "bg-blue-500/10 text-blue-400 font-bold"
                      : opt.disabled
                      ? "text-slate-600 cursor-not-allowed"
                      : "text-slate-300 hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="truncate">{opt.label || opt.title} {opt.difficulty ? `(L${opt.difficulty})` : ""}</span>
                  {(opt.id === value || opt.slug === value) && <Check size={14} />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function CodingRoom({ problemSlug = null, sessionId, onFinish }) {
  const [problem, setProblem] = useState(null);
  const [loadingProblem, setLoadingProblem] = useState(true);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");

  const LANGUAGES = [
    { id: "python", label: "Python", monaco: "python" },
    { id: "javascript", label: "JavaScript", monaco: "javascript" },
    { id: "java", label: "Java", monaco: "java" },
    { id: "cpp", label: "C++", monaco: "cpp" },
  ];

  const [hint, setHint] = useState(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [showHintCallout, setShowHintCallout] = useState(false);

  const [runResults, setRunResults] = useState(null);
  const [running, setRunning] = useState(false);

  const [submitResult, setSubmitResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [allProblems, setAllProblems] = useState([]);
  const [submissionHistory, setSubmissionHistory] = useState([]);

  useEffect(() => {
    fetchProblem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemSlug]);

  useEffect(() => {
    fetchAllProblems();
    fetchSubmissionHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function authHeaders() {
    const token = localStorage.getItem("access_token");
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  async function fetchProblem() {
    setLoadingProblem(true);
    setError("");
    try {
      let slugToLoad = problemSlug;

      if (!slugToLoad) {
        const nextRes = await axios.get(`${API_URL}/coding/next`, authHeaders());
        if (nextRes.data.error) {
          setError(nextRes.data.error);
          setLoadingProblem(false);
          return;
        }
        slugToLoad = nextRes.data.slug;
      }

      const res = await axios.get(`${API_URL}/coding/problems/${slugToLoad}`);
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setProblem(res.data);
        setCode(res.data.starter_code?.[language] || "# Write your solution here\n");
      }
    } catch (err) {
      console.error(err);
      setError("Could not load problem — check your connection and try again.");
    }
    setLoadingProblem(false);
  }

  async function fetchAllProblems() {
    try {
      const res = await axios.get(`${API_URL}/coding/problems`);
      setAllProblems(res.data.problems || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchSubmissionHistory() {
    try {
      const res = await axios.get(`${API_URL}/coding/submissions`, authHeaders());
      setSubmissionHistory(res.data.submissions || []);
    } catch (err) {
      console.error(err);
    }
  }

  function handleLanguageChange(newLang) {
    setLanguage(newLang);
    const template = problem?.starter_code?.[newLang];
    setCode(template || `// No starter template for ${newLang} on this problem yet\n`);
    setRunResults(null);
    setSubmitResult(null);
  }

  async function loadProblemBySlug(slug) {
    setSubmitResult(null);
    setRunResults(null);
    setHint(null);
    setShowHintCallout(false);
    setError("");
    setProblem(null);
    setLoadingProblem(true);
    try {
      const res = await axios.get(`${API_URL}/coding/problems/${slug}`);
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setProblem(res.data);
        setCode(res.data.starter_code?.[language] || "# Write your solution here\n");
      }
    } catch (err) {
      console.error(err);
      setError("Could not load that problem.");
    }
    setLoadingProblem(false);
  }

  async function nextProblem() {
    setSubmitResult(null);
    setRunResults(null);
    setHint(null);
    setShowHintCallout(false);
    setError("");
    setProblem(null);
    setLoadingProblem(true);
    try {
      const nextRes = await axios.get(`${API_URL}/coding/next`, authHeaders());
      if (nextRes.data.error) {
        setError(nextRes.data.error);
        setLoadingProblem(false);
        return;
      }
      const res = await axios.get(`${API_URL}/coding/problems/${nextRes.data.slug}`);
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setProblem(res.data);
        setCode(res.data.starter_code?.[language] || "# Write your solution here\n");
      }
    } catch (err) {
      console.error(err);
      setError("Could not load the next problem — check your connection and try again.");
    }
    setLoadingProblem(false);
  }

  async function requestHint() {
    if (hint) {
      setShowHintCallout(true);
      return;
    }
    
    setHintLoading(true);
    setShowHintCallout(true);
    setError("");
    try {
      const res = await axios.post(
        `${API_URL}/coding/hint`,
        { problem: problem?.description || "", current_code: code, language },
        authHeaders()
      );
      setHint(res.data.hint);
    } catch (err) {
      console.error(err);
      setError("Could not get a hint right now — try again in a moment.");
    }
    setHintLoading(false);
  }

  async function runCode() {
    if (!problem) return;
    setRunning(true);
    setError("");
    setSubmitResult(null);
    try {
      const res = await axios.post(
        `${API_URL}/coding/run`,
        { problem_id: problem.id, code, language },
        authHeaders()
      );
      setRunResults(res.data);
    } catch (err) {
      console.error(err);
      setError("Run failed — the sandbox may be temporarily unavailable.");
    }
    setRunning(false);
  }

  async function submitCode() {
    if (!problem) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await axios.post(
        `${API_URL}/coding/submit`,
        { problem_id: problem.id, code, language, session_id: sessionId || null },
        authHeaders()
      );
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setSubmitResult(res.data);
        setRunResults(null);
        fetchSubmissionHistory();
      }
    } catch (err) {
      console.error(err);
      setError("Submit failed — the sandbox may be temporarily unavailable.");
    }
    setSubmitting(false);
  }

  if (loadingProblem) {
    return (
      <div className="h-screen w-full bg-[#000000] flex flex-col items-center justify-center font-mono">
        <div className="w-10 h-10 border-[3px] border-slate-800 border-t-blue-500 rounded-full animate-spin mb-6" />
        <span className="text-slate-500 text-sm animate-pulse tracking-widest uppercase">&gt; Initializing Docker Sandbox...</span>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="h-screen w-full bg-[#000000] flex flex-col items-center justify-center font-mono">
        <AlertTriangle size={32} className="text-rose-500 mb-4" />
        <span className="text-slate-400 text-sm">{error || "> Critical failure. No problem loaded."}</span>
        {onFinish && (
          <button onClick={onFinish} className="mt-6 text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2">
            <ArrowLeft size={14} /> Return to Dashboard
          </button>
        )}
      </div>
    );
  }

  const langExtMap = { python: "py", javascript: "js", java: "java", cpp: "cpp" };
  const fileExt = langExtMap[language] || "txt";

  return (
    <div className="flex flex-col h-screen w-full bg-[#000000] text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30">
      
      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ========================================================================= */}
      {/* HUD HEADER: Razor thin, IDE aesthetics                                    */}
      {/* ========================================================================= */}
      <header className="h-12 border-b border-white/[0.06] bg-[#050505] flex items-center justify-between px-6 z-50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 rounded bg-white flex items-center justify-center font-bold text-black text-[10px]">IC</div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/10 text-blue-300 border border-blue-500/25 px-2.5 py-1 rounded text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
              <Cpu size={12} /> Sandbox 
            </span>
            <span className="text-slate-500 text-xs font-mono font-medium hidden sm:inline">Level {problem.difficulty}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="w-48 hidden md:block">
            {allProblems.length > 0 && (
              <CustomDropdown 
                value={problem.slug} onChange={loadProblemBySlug}
                options={allProblems.map(p => ({ id: p.slug, title: p.title, difficulty: p.difficulty }))}
                icon={Layers} placeholder="Select Problem"
              />
            )}
          </div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          {onFinish && (
            <button onClick={onFinish} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-rose-400 transition-colors">
              <XCircle size={14} /> Abort
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN WORKBENCH: 3-Pane Structure                                        */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full flex overflow-hidden relative">
        
        {/* PANE 1: The Specification Ledger (Left - 30%) */}
        <section className="w-[30%] min-w-[320px] max-w-[450px] border-r border-white/[0.06] bg-[#030303]/90 p-8 overflow-y-auto flex flex-col justify-between z-10 relative">
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] pointer-events-none rounded-full" />

          <div className="space-y-8 relative z-10">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white mb-3 leading-tight">{problem.title}</h1>
              <div className="flex items-center gap-2 mb-8">
                {problem.companies?.map(c => (
                  <span key={c} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2">
                  <Terminal size={12} /> Scenario
                </h3>
                <p className="text-sm text-slate-300 leading-[1.7] font-medium whitespace-pre-line">
                  {problem.description}
                </p>
              </div>

              {problem.constraints && problem.constraints.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <AlertTriangle size={12} /> Constraints
                  </h3>
                  <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-xl shadow-inner">
                    <ul className="space-y-3">
                      {problem.constraints.map((c, i) => (
                        <li key={i} className="text-sm font-medium text-slate-400 flex items-start gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" /> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-8 border-t border-white/[0.06] mt-8 relative z-10">
            {submissionHistory.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                  <Activity size={12} /> Recent Executions
                </h3>
                <div className="space-y-2">
                  {submissionHistory.slice(0, 2).map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-slate-400 truncate pr-2">{sub.problem_title}</span>
                      <span className={`font-mono font-bold ${sub.tests_passed === sub.tests_total ? "text-emerald-400" : "text-amber-400"}`}>
                        {sub.tests_passed}/{sub.tests_total} Passed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* WORKBENCH RIGHT (Editor + Terminal Split) */}
        <section className="flex-1 flex flex-col min-w-0 bg-[#000000] relative">
          
          {/* PANE 2: Monaco Editor Stage (Top - 60%) */}
          <div className="flex-[60] flex flex-col relative min-h-0 border-b border-white/[0.06]">
            
            {/* Fake IDE File Tabs & Language Selector */}
            <div className="h-10 border-b border-white/[0.06] flex bg-[#030303] items-center justify-between pr-4">
              <div className="flex h-full">
                <div className="px-5 border-r border-white/[0.06] border-t-2 border-t-blue-500 flex items-center text-[11px] font-mono font-bold text-white h-full bg-[#000000] shadow-[0_-1px_10px_rgba(0,0,0,0.5)]">
                  solution.{fileExt}
                </div>
                <div className="px-5 border-r border-white/[0.06] flex items-center text-[11px] font-mono font-medium text-slate-600 h-full bg-[#030303] cursor-not-allowed">
                  test_cases.{fileExt}
                </div>
              </div>
              <div className="w-32">
                <CustomDropdown 
                  value={language} onChange={handleLanguageChange}
                  options={LANGUAGES.map(l => ({ ...l, disabled: !problem.starter_code?.[l.id] }))}
                />
              </div>
            </div>

            {/* Editor Area with Floating Socratic Callout */}
            <div className="flex-1 relative pt-4 pb-2 z-10 bg-[#000000]">
              <Editor
                height="100%"
                language={LANGUAGES.find((l) => l.id === language)?.monaco || language}
                theme="vs-dark"
                value={code}
                onChange={(v) => setCode(v || "")}
                options={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineHeight: 24,
                  padding: { top: 8, bottom: 8 },
                  overviewRulerBorder: false,
                  hideCursorInOverviewRuler: true,
                  renderLineHighlight: "all",
                  cursorBlinking: "smooth"
                }}
              />

              {/* Floating Socratic Hint Container */}
              <AnimatePresence>
                {showHintCallout && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    className="absolute top-6 right-6 w-80 bg-[#0A0A0C]/90 backdrop-blur-xl border border-indigo-500/30 p-5 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.6),_inset_0_1px_0_0_rgba(255,255,255,0.1)] z-50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-indigo-400" />
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Socratic Guidance</span>
                      </div>
                      <button onClick={() => setShowHintCallout(false)} className="text-slate-500 hover:text-white transition-colors">
                        <XCircle size={14} />
                      </button>
                    </div>
                    {hintLoading ? (
                      <div className="flex items-center gap-3 py-2">
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-600 border-t-indigo-400 animate-spin" />
                        <span className="text-xs font-mono text-slate-400">Analyzing Abstract Syntax Tree...</span>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-slate-200 leading-relaxed">{hint}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* STICKY ACTION BAR */}
          <div className="h-16 border-b border-white/[0.06] bg-[#030303] flex items-center justify-between px-6 z-20 shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={requestHint}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold hover:bg-indigo-500/20 transition-all active:scale-95"
              >
                <Lightbulb size={14} /> Request Hint
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={runCode}
                disabled={running || submitting}
                className="px-6 py-2.5 rounded-lg text-xs font-bold bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 border border-white/10 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {running ? <Activity size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                Run Code
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={submitCode}
                disabled={running || submitting}
                className="relative overflow-hidden px-8 py-2.5 rounded-lg text-xs font-bold bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] flex items-center gap-2 transition-all disabled:opacity-50 group"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                {submitting ? <Activity size={14} className="animate-spin relative z-10" /> : <Send size={14} className="relative z-10" />}
                <span className="relative z-10">Submit</span>
                <kbd className="hidden sm:inline-flex relative z-10 font-mono text-[10px] bg-black/10 px-1.5 py-0.5 rounded opacity-70">↵</kbd>
              </motion.button>
            </div>
          </div>

          {/* PANE 3: CI/CD Pipeline Terminal (Bottom - 40%) */}
          <div className="flex-[40] bg-[#000000] overflow-y-auto min-h-0 flex flex-col p-6">
            
            {running || submitting ? (
              <div className="flex-1 flex flex-col items-start justify-center pl-6 gap-3 text-emerald-400/80 font-mono text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                  <span>&gt; Provisioning isolated container...</span>
                </div>
                <div className="flex items-center gap-3 opacity-70">
                  <span className="animate-pulse opacity-0">_</span>
                  <span>&gt; Compiling byte-code and executing test suite...</span>
                </div>
              </div>
            ) : submitResult ? (
              
              /* ==========================================
                 POST-SUBMISSION: AI CODE REVIEW TAB
                 ========================================== */
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-4xl">
                
                {/* Pipeline Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full shadow-inner ${submitResult.tests_passed === submitResult.tests_total ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border border-rose-500/30 text-rose-400"}`}>
                      {submitResult.tests_passed === submitResult.tests_total ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg tracking-tight">Execution Pipeline Completed</h3>
                      <p className="text-slate-400 text-xs font-mono mt-0.5">Passed {submitResult.tests_passed} / {submitResult.tests_total} hidden test cases.</p>
                    </div>
                  </div>
                  
                  {submitResult.new_elo != null && (
                    <button onClick={nextProblem} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                      Next Problem <ChevronRight size={14} />
                    </button>
                  )}
                </div>

                {/* AI Review Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#050505] border border-white/[0.06] rounded-xl p-5 shadow-inner">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Complexity</span>
                    <span className="text-xl font-bold text-blue-400 font-mono">{submitResult.complexity_estimate || "O(N)"}</span>
                  </div>
                  <div className="bg-[#050505] border border-white/[0.06] rounded-xl p-5 shadow-inner">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Cleanliness</span>
                    <span className="text-2xl font-bold text-white tabular-nums tracking-tighter">{submitResult.cleanliness_score || 0}<span className="text-xs text-slate-500 ml-1">/10</span></span>
                  </div>
                  <div className="bg-[#050505] border border-white/[0.06] rounded-xl p-5 shadow-inner">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Naming</span>
                    <span className="text-2xl font-bold text-white tabular-nums tracking-tighter">{submitResult.naming_score || 0}<span className="text-xs text-slate-500 ml-1">/10</span></span>
                  </div>
                </div>

                {/* AI Written Feedback */}
                {submitResult.feedback && (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 shadow-inner">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                      <Sparkles size={12} className="text-indigo-400" /> AI Code Review
                    </span>
                    <p className="text-sm font-medium text-slate-300 leading-[1.7]">{submitResult.feedback}</p>
                  </div>
                )}
              </div>

            ) : runResults ? (
              
              /* ==========================================
                 PRE-SUBMISSION: TEST RUNNER OUTPUT
                 ========================================== */
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-4xl">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-6 border-b border-white/[0.06] pb-3">
                  <Hash size={14} className="text-slate-400" /> 
                  Diagnostic Results: {runResults.passed_count} / {runResults.total} Passed
                </div>
                
                <div className="space-y-3">
                  {runResults.results.map((r, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${r.passed ? "bg-emerald-500/[0.02] border-emerald-500/20 shadow-[inset_0_1px_0_0_rgba(16,185,129,0.05)]" : "bg-rose-500/[0.02] border-rose-500/20 shadow-[inset_0_1px_0_0_rgba(244,63,94,0.05)]"}`}>
                      <div className="flex items-center gap-3 mb-3">
                        {r.passed ? <CheckCircle2 size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-rose-500" />}
                        <span className={`text-sm font-bold ${r.passed ? "text-emerald-400" : "text-rose-400"}`}>Test Case {i + 1}</span>
                      </div>
                      
                      <div className="bg-[#000000] border border-white/[0.05] rounded-lg p-4 font-mono text-xs space-y-2">
                        <div className="grid grid-cols-[80px_1fr] gap-2">
                          <span className="text-slate-600 uppercase font-bold tracking-widest text-[9px] mt-0.5">Input</span>
                          <span className="text-slate-300">{r.input || "()"}</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] gap-2">
                          <span className="text-slate-600 uppercase font-bold tracking-widest text-[9px] mt-0.5">Expected</span>
                          <span className="text-slate-300">{r.expected}</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] gap-2 border-t border-white/[0.05] pt-2 mt-2">
                          <span className="text-slate-600 uppercase font-bold tracking-widest text-[9px] mt-0.5">Actual</span>
                          <span className={r.passed ? "text-emerald-400" : "text-rose-400 font-bold"}>{r.actual || "null"}</span>
                        </div>
                      </div>

                      {r.stderr && (
                        <div className="mt-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs font-mono text-rose-400 whitespace-pre-wrap leading-relaxed shadow-inner">
                          {r.stderr}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            ) : (
              /* IDLE STATE */
              <div className="flex-1 flex flex-col items-start justify-start pt-4 pl-2 text-slate-600 font-mono text-xs opacity-60">
                <div className="flex items-center gap-2">
                  <span>$</span> Sandbox initialized. Awaiting execution command.
                </div>
                <div className="w-2 h-4 bg-slate-600 animate-pulse mt-1" />
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}