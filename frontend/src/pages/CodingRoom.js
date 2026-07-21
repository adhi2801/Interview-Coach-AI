import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, Send, Terminal, CheckCircle2, XCircle, Code2, 
  ArrowLeft, ChevronDown, Check, Lightbulb, AlertTriangle, 
  Activity, ChevronRight, Hash, Layers
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
      // Close dropdown if click is outside both the button and the fixed menu
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
          top: rect.bottom + 4, // 4px margin below button
          left: rect.left,
          width: rect.width
        });
      };
      updateCoords();
      window.addEventListener("resize", updateCoords);
      // Catch any layout shifts during open state
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
        className="w-full flex items-center justify-between bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition-all outline-none"
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
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
            }}
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-left transition-colors ${
                    (opt.id === value || opt.slug === value)
                      ? "bg-blue-500/10 text-blue-400 font-semibold"
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
    setHintLoading(true);
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
        <div className="w-12 h-12 border-2 border-slate-800 border-t-blue-500 rounded-full animate-spin mb-4" />
        <span className="text-slate-500 text-sm animate-pulse">&gt; Initializing workspace environment..._</span>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="h-screen w-full bg-[#000000] flex flex-col items-center justify-center font-mono">
        <AlertTriangle size={32} className="text-red-500 mb-4" />
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
    <div className="flex h-screen w-full bg-[#000000] text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30">
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ========================================================================= */}
      {/* PANE 1: THE SPECIFICATION (Left - 30%)                                  */}
      {/* ========================================================================= */}
      <div className="w-[30%] min-w-[320px] max-w-[450px] bg-[#050505] border-r border-white/[0.06] flex flex-col h-full overflow-hidden">
        
        {/* Header & Controls (z-50 prevents overlapping issues with the dropdown) */}
        <div className="p-5 border-b border-white/[0.06] space-y-4 shrink-0 relative z-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <Code2 size={14} className="text-blue-500" />
              <span>Sandbox / L{problem.difficulty}</span>
            </div>
            {onFinish && (
              <button onClick={onFinish} className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1">
                Abort <XCircle size={12} />
              </button>
            )}
          </div>
          
          {allProblems.length > 0 && (
            <CustomDropdown 
              value={problem.slug}
              onChange={loadProblemBySlug}
              options={allProblems.map(p => ({ id: p.slug, title: p.title, difficulty: p.difficulty }))}
              icon={Layers}
              placeholder="Select Problem"
            />
          )}
        </div>

        {/* Markdown-style Problem Description */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-4">{problem.title}</h1>
            <div className="prose prose-invert prose-sm prose-p:leading-relaxed prose-p:text-slate-300 max-w-none">
              <p className="whitespace-pre-line">{problem.description}</p>
            </div>
          </div>

          {problem.constraints && problem.constraints.length > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.04] p-5 rounded-xl">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                <AlertTriangle size={12} /> Constraints
              </h3>
              <ul className="space-y-3">
                {problem.constraints.map((c, i) => (
                  <li key={i} className="text-sm font-medium text-slate-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Hint Area */}
          <div className="pt-4 border-t border-white/[0.06]">
            {!hint ? (
              <motion.button 
                whileTap={{ scale: 0.98 }}
                onClick={requestHint}
                disabled={hintLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-xs font-bold text-slate-400 transition-all"
              >
                {hintLoading ? <><Activity size={14} className="animate-spin" /> Analyzing code...</> : <><Lightbulb size={14} /> Request AI Hint</>}
              </motion.button>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-blue-500/10 border-l-2 border-blue-500 p-4 rounded-r-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={12} className="text-blue-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Socratic Hint</span>
                </div>
                <p className="text-xs font-medium text-blue-100/80 leading-relaxed">{hint}</p>
              </motion.div>
            )}
          </div>

          {/* History Snippet */}
          {submissionHistory.length > 0 && (
            <div className="pt-8 border-t border-white/[0.06]">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                <Activity size={12} /> Recent Submissions
              </h3>
              <div className="space-y-2">
                {submissionHistory.slice(0, 3).map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between text-xs p-2 rounded bg-white/[0.02] border border-white/[0.03]">
                    <span className="text-slate-400 truncate pr-2">{sub.problem_title}</span>
                    <span className={`font-mono font-bold ${sub.tests_passed === sub.tests_total ? "text-emerald-400" : "text-amber-400"}`}>
                      {sub.tests_passed}/{sub.tests_total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANE: Editor + Terminal                                           */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full bg-[#000000]">
        
        {/* PANE 2: THE EDITOR (Top Right - 65% Height) */}
        <div className="flex-[65] flex flex-col relative min-h-0 border-b border-white/[0.06]">
          
          {/* Ambient Glow behind editor */}
          <div className="absolute inset-0 bg-blue-500/5 blur-[120px] pointer-events-none z-0" />

          {/* Editor Header (VS Code Style File Tabs) */}
          <div className="h-10 bg-[#050505] flex items-center justify-between px-4 relative z-50">
            <div className="flex h-full">
              <div className="px-5 border-r border-white/[0.06] border-t-2 border-t-blue-500 bg-[#000000] flex items-center text-xs font-mono text-slate-200 shadow-[0_-1px_10px_rgba(0,0,0,0.5)]">
                solution.{fileExt}
              </div>
            </div>
            
            <div className="w-40">
              <CustomDropdown 
                value={language}
                onChange={handleLanguageChange}
                options={LANGUAGES.map(l => ({ ...l, disabled: !problem.starter_code?.[l.id] }))}
                className="text-xs"
              />
            </div>
          </div>

          {/* Monaco Editor Instance */}
          <div className="flex-1 relative z-10 pt-4">
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
                padding: { top: 8 },
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
              }}
            />
          </div>
        </div>

        {/* ACTION BAR (Sticky between Editor & Terminal) */}
        <div className="h-14 bg-[#050505] border-b border-white/[0.06] flex items-center justify-between px-6 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <Terminal size={16} className="text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Standard Output</span>
            {error && <span className="text-xs font-bold text-red-400 flex items-center gap-1"><XCircle size={12}/> Error</span>}
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={runCode}
              disabled={running || submitting}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.05] flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {running ? <Activity size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
              Run Code
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={submitCode}
              disabled={running || submitting}
              className="relative overflow-hidden px-6 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
              {submitting ? <Activity size={14} className="animate-spin relative z-10" /> : <Send size={14} className="relative z-10" />}
              <span className="relative z-10">Submit</span>
            </motion.button>
          </div>
        </div>

        {/* PANE 3: THE TERMINAL (Bottom Right - 35% Height) */}
        <div className="flex-[35] bg-[#000000] p-5 overflow-y-auto font-mono text-sm min-h-0">
          
          {running || submitting ? (
            <div className="flex flex-col items-start gap-2 text-slate-500">
              <div className="flex items-center gap-2">
                <span className="animate-pulse">&gt;</span> Compiling and executing in sandbox...
              </div>
              <div className="w-2 h-4 bg-slate-500 animate-pulse" />
            </div>
          ) : submitResult ? (
            /* CI/CD Style Submit Results */
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${submitResult.tests_passed === submitResult.tests_total ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                  {submitResult.tests_passed === submitResult.tests_total ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Test Pipeline Completed</h3>
                  <p className="text-slate-500 text-xs">Passed {submitResult.tests_passed} of {submitResult.tests_total} hidden test cases.</p>
                </div>
              </div>

              {/* Data Grid for AI Feedback */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#050505] border border-white/[0.05] rounded-xl p-4">
                  <span className="block text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-2">Time/Space</span>
                  <span className="text-sm font-bold text-blue-400">{submitResult.complexity_estimate || "O(N)"}</span>
                </div>
                <div className="bg-[#050505] border border-white/[0.05] rounded-xl p-4">
                  <span className="block text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-2">Cleanliness</span>
                  <span className="text-xl font-bold text-white tabular-nums">{submitResult.cleanliness_score || 0}<span className="text-xs text-slate-500">/10</span></span>
                </div>
                <div className="bg-[#050505] border border-white/[0.05] rounded-xl p-4">
                  <span className="block text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-2">Naming</span>
                  <span className="text-xl font-bold text-white tabular-nums">{submitResult.naming_score || 0}<span className="text-xs text-slate-500">/10</span></span>
                </div>
              </div>

              {submitResult.feedback && (
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5">
                  <span className="block text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-3">AI Code Review</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">{submitResult.feedback}</p>
                </div>
              )}

              {submitResult.new_elo != null && (
                <div className="flex items-center gap-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <Activity size={16} className="text-emerald-500" />
                  <span className="text-sm font-sans font-bold text-emerald-400">ELO Updated: {Math.round(submitResult.new_elo)}</span>
                  <button onClick={nextProblem} className="ml-auto flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-300 font-sans">
                    Next Problem <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          ) : runResults ? (
            /* CI/CD Style Run Results (Sample Cases) */
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="text-slate-400 text-xs flex items-center gap-2 mb-4">
                <Hash size={12} /> Execution Report: {runResults.passed_count}/{runResults.total} Sample Cases Passed
              </div>
              
              <div className="space-y-3">
                {runResults.results.map((r, i) => (
                  <div key={i} className={`p-4 rounded-lg border ${r.passed ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                    <div className="flex items-center gap-3 mb-2">
                      {r.passed ? <CheckCircle2 size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-red-500" />}
                      <span className={`text-sm font-bold ${r.passed ? "text-emerald-400" : "text-red-400"}`}>Test Case {i + 1}</span>
                    </div>
                    <div className="pl-6 space-y-1.5 text-xs text-slate-400">
                      <div><span className="text-slate-500">Input:</span> {r.input || "()"}</div>
                      <div><span className="text-slate-500">Expected:</span> {r.expected}</div>
                      <div><span className="text-slate-500">Actual:</span> <span className={r.passed ? "text-slate-300" : "text-red-300"}>{r.actual || "null"}</span></div>
                      {r.stderr && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 whitespace-pre-wrap">
                          {r.stderr}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-2 text-slate-500 opacity-50">
              <div className="flex items-center gap-2">
                <span>&gt;</span> Sandbox environment initialized. Waiting for execution...
              </div>
              <div className="w-2 h-4 bg-slate-500 animate-pulse" />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}