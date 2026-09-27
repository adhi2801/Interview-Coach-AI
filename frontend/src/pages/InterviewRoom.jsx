import api from "../lib/api";
import React, { useState, useEffect, useRef } from "react";
import StudyPlan from "./StudyPlan";
import { motion, AnimatePresence } from "motion/react";
import { Mic, Square, AlertTriangle, Lightbulb, ChevronRight, CheckCircle2, Send } from "lucide-react";
import { COMPANIES } from "../constants/companies";
import { TOTAL_NODES, computeTimeLimit, formatTime, getPersonaMeta } from "./interview/constants";
import { useCoachingSocket } from "./interview/useCoachingSocket";
import { useRecorder } from "./interview/useRecorder";
import QuestionPane from "./interview/QuestionPane";
import TelemetryPane from "./interview/TelemetryPane";
import Debrief from "./interview/Debrief";

export default function InterviewRoom({ sessionData, onFinish, onEloUpdate }) {
  const [question, setQuestion] = useState(sessionData?.question || "");
  const [category, setCategory] = useState(sessionData?.category || "");
  const [scenario, setScenario] = useState(sessionData?.scenario || "");
  const [constraints, setConstraints] = useState(sessionData?.constraints || []);
  const [ask, setAsk] = useState(sessionData?.ask || "");
  const [persona] = useState(sessionData?.persona || "standard");
  const [answer, setAnswer] = useState("");
  const [scores, setScores] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [gapAnalysisUnavailable, setGapAnalysisUnavailable] = useState(false);
  const [peer, setPeer] = useState(null);
  const [newElo, setNewElo] = useState(null);
  const [currentElo, setCurrentElo] = useState(sessionData?.elo || 1200);
  const [difficulty, setDifficulty] = useState(sessionData?.difficulty || 4);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("answering");
  const [questionNum, setQuestionNum] = useState(1);
  // Bumped by "Retry this node": restarts the countdown for the same question.
  const [attempt, setAttempt] = useState(0);
  const TIME_LIMIT = computeTimeLimit(sessionData?.scenario, sessionData?.constraints);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [nextQuestion, setNextQuestion] = useState("");
  const [nextCategory, setNextCategory] = useState("");
  const [nextScenario, setNextScenario] = useState("");
  const [nextConstraints, setNextConstraints] = useState([]);
  const [nextAsk, setNextAsk] = useState("");
  const [mounted, setMounted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(null);
  const [currentAnswerId, setCurrentAnswerId] = useState(null);
  const [studyPlanTopic, setStudyPlanTopic] = useState(null);
  const [scoringError, setScoringError] = useState("");
  const [eloBand, setEloBand] = useState(null);
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [sessionElapsed, setSessionElapsed] = useState(0); // real wall-clock time since this session mounted — not a fabricated stat
  // Stops the scoring poll loop from setting state after the candidate
  // navigates away mid-scoring.
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  const debounceRef = useRef(null);
  const timerRef = useRef(null);
  const autoSubmittedRef = useRef(false);

  const isBehavioral = category?.toLowerCase().includes("behavioral") || category?.toLowerCase().includes("leadership");
  const personaMeta = getPersonaMeta(persona);
  const PersonaIcon = personaMeta.icon;
  const isLastNode = questionNum >= TOTAL_NODES;

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  // Real elapsed-session clock — ticks from the moment this room mounted.
  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => setSessionElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(tick);
  }, []);

  // The newest handlers and state, for listeners and timers that are set up
  // once but must never act on a stale render. Declared before the effects
  // that read it, so it is refreshed first on every commit.
  const latest = useRef({});
  useEffect(() => {
    latest.current = { phase, isLastNode, loading, timeLeft, handleFinish, goNextQuestion, submitAnswer };
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      const { phase, isLastNode, loading, timeLeft, handleFinish, goNextQuestion, submitAnswer } = latest.current;
      if (!((e.metaKey || e.ctrlKey) && e.key === 'Enter')) return;
      // Ctrl/Cmd+Enter: submit while answering (the ↵ hint on the Submit
      // button promised this), advance on the results screen.
      if (phase === 'answering' && !loading && timeLeft > 0) {
        e.preventDefault();
        submitAnswer();
      } else if (phase === 'results') {
        e.preventDefault();
        if (isLastNode) handleFinish(); else goNextQuestion();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const coach = useCoachingSocket(sessionData?.session_id, {
    onTranscription: (text) => setAnswer((prev) => (prev + " " + text).trim()),
  });
  const { coaching: liveCoaching, connected: wsConnected, intervention } = coach;
  const recorder = useRecorder({ onRecording: coach.sendAudio });
  const { isRecording, waveLevels, start: startRecording, stop: stopRecording, error: micError } = recorder;

  useEffect(() => {
    clearInterval(timerRef.current);
    const limit = computeTimeLimit(scenario, constraints);
    setTimeLeft(limit);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [question, scenario, constraints, attempt]);

  useEffect(() => {
    autoSubmittedRef.current = false;
  }, [question, attempt]);

  useEffect(() => {
    api.get(`/roles/elo-bands`).then(res => {
      const band = res.data?.[sessionData?.role];
      if (band) setEloBand(band);
    }).catch(() => setEloBand(null));
  }, [sessionData?.role]);

  useEffect(() => {
    if (timeLeft === 0 && !autoSubmittedRef.current && !latest.current.loading) {
      autoSubmittedRef.current = true;
      latest.current.submitAnswer(true);
    }
  }, [timeLeft]);

  // Escape closes the abort dialog.
  useEffect(() => {
    if (!showAbortConfirm) return;
    const onKey = (e) => { if (e.key === "Escape") setShowAbortConfirm(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAbortConfirm]);

  function handleAnswerChange(text) {
    setAnswer(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (text.trim()) coach.sendTyped(text);
    }, 800);
  }

  async function submitAnswer(isTimeExpired = false) {
    const finalAnswer = answer.trim() ? answer : "[No answer submitted before time expired]";
    if (!finalAnswer && !isTimeExpired) return;

    // Never leave the mic hot into the results screen.
    if (isRecording) stopRecording();

    setLoading(true);
    setScoringError("");
    clearInterval(timerRef.current);
    try {
      const startRes = await api.post(
        `/answer/submit`,
        {
          session_id: sessionData.session_id,
          question,
          answer: finalAnswer,
          difficulty,
          elo: currentElo,
          company: sessionData?.company || sessionData?.company_profile?.name?.toLowerCase(),
          role: sessionData?.role,
          category,
          persona,
        },
        { timeout: 15000 }
      );
      await pollForResult(startRes.data.job_id);
    } catch (err) {
      // Real reason from the server (rate limit, daily budget, session
      // ended, validation) or a clear network message from lib/api.
      setScoringError(err.message);
      setLoading(false);
    }
  }

  async function handleFinish() {
    if (isRecording) stopRecording();
    try {
      await api.post(`/replay/${sessionData.session_id}/end`, {}, { timeout: 5000 });
    } catch (err) {
      console.error("Failed to close out replay:", err);
    }
    onFinish();
  }
  async function pollForResult(jobId) {
    // Scoring chains several model calls (score, gap analysis, topic
    // tagging, next question) and can legitimately take over a minute.
    // The server times a job out at 3 minutes and reports "failed", so the
    // client just needs to outlast that; it backs off from 1s to 3s so a
    // long job doesn't hammer the API. A few transient network errors
    // mid-poll are retried rather than abandoning the answer.
    const deadline = Date.now() + 200000;
    let attempts = 0;
    let networkErrors = 0;

    const poll = async () => {
      if (!mountedRef.current) return;
      attempts++;
      const nextDelay = Math.min(1000 + attempts * 100, 3000);
      try {
        const res = await api.get(`/answer/status/${jobId}`, { timeout: 10000 });
        networkErrors = 0;
        if (!mountedRef.current) return;

        if (res.data.status === "done") {
          setScores(res.data.scores);
          setGaps(res.data.gaps || []);
          setGapAnalysisUnavailable(res.data.gap_analysis_unavailable || false);
          setPeer(res.data.peer_comparison);
          setNewElo(res.data.new_elo);
          setNextQuestion(res.data.next_question || "");
          setNextCategory(res.data.next_category || "");
          setNextScenario(res.data.next_scenario || "");
          setNextConstraints(res.data.next_constraints || []);
          setNextAsk(res.data.next_ask || "");
          setCurrentAnswerId(res.data.answer_id);
          setFeedbackRating(null);
          setPhase("results");
          if (res.data.new_elo) onEloUpdate?.(res.data.new_elo);
          setLoading(false);
          return;
        }

        if (res.data.status === "failed") {
          setLoading(false);
          setScoringError(`${res.data.error || "Scoring failed"}. Please try submitting again.`);
          return;
        }

        if (Date.now() < deadline) {
          setTimeout(poll, nextDelay);
        } else {
          setLoading(false);
          setScoringError("Scoring is taking longer than expected. Please try submitting again.");
        }
      } catch (err) {
        if (!mountedRef.current) return;
        networkErrors++;
        if (!err.status && networkErrors <= 3 && Date.now() < deadline) {
          setTimeout(poll, nextDelay * 2);
          return;
        }
        setLoading(false);
        setScoringError(err.message || "Something went wrong while scoring your answer.");
      }
    };
    poll();
  }

  async function rateFeedback(helpful) {
    setFeedbackRating(helpful);
    try {
      await api.post(`/feedback/rate`, { answer_id: currentAnswerId, helpful });
    } catch (err) { console.error(err); }
  }

  function goNextQuestion() {
    if (isLastNode) { handleFinish(); return; } // hard stop — never silently advance past the 5th node
    if (newElo) setCurrentElo(Math.round(newElo));
    if (nextQuestion) setQuestion(nextQuestion);
    if (nextCategory) setCategory(nextCategory);
    setScenario(nextScenario);
    setConstraints(nextConstraints);
    setAsk(nextAsk);
    setAnswer("");
    setScores(null);
    setGaps([]);
    setGapAnalysisUnavailable(false);
    setPeer(null);
    coach.reset(); // pace and fillers are measured per answer
    setNewElo(null);
    setPhase("answering");
    setQuestionNum((n) => n + 1);
    setDifficulty(Math.min(10, Math.max(1, Math.round((currentElo - 800) / 100))));
  }

  // "Retry this node": same question, fresh answer, fresh clock and coach.
  function retryNode() {
    setAnswer("");
    setScores(null);
    setGaps([]);
    setGapAnalysisUnavailable(false);
    setPeer(null);
    setNewElo(null);
    setScoringError("");
    coach.reset();
    setPhase("answering");
    setAttempt((n) => n + 1);
  }

  const company = sessionData?.company_profile;
  const companyMeta = COMPANIES.find(c => c.id === (sessionData?.company || "").toLowerCase());


  // Persona-driven CSS custom properties applied to the room shell.
  // Everything downstream (dots, borders, timer color, ask-card accent)
  // reads these vars instead of hardcoded colors.
  const personaStyleVars = {
    "--accent": personaMeta.accentHex,
    "--accent-rgb": personaMeta.accentRgb,
  };

  return (
    <div
      className="h-screen w-full bg-transparent text-slate-100 font-sans flex flex-col overflow-hidden selection:bg-blue-500/30 relative"
      style={personaStyleVars}
    >

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes evalPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .55; transform: scale(1.3); } }
        @keyframes dockShim { 0% { transform: translateX(-120%) rotate(25deg); } 100% { transform: translateX(260%) rotate(25deg); } }
      `}</style>

      {/* Persona-driven ambient glow. Two layers on desktop for the full
          mockup look; mobile only gets the smaller one, and the global
          blur media query in App.css strips both on small viewports
          regardless, so this never costs mobile GPU. */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-15%] left-[-10%] w-[45vw] h-[45vw] rounded-full blur-[130px] transition-colors duration-700"
          style={{ background: `rgba(var(--accent-rgb), 0.12)` }}
        />
        <div
          className="hidden lg:block absolute bottom-[-15%] right-[-8%] w-[35vw] h-[35vw] rounded-full blur-[130px] transition-colors duration-700"
          style={{ background: `rgba(var(--accent-rgb), 0.08)` }}
        />
      </div>

      {/* TOP HUD HEADER */}
      <header className="h-14 border-b border-white/[0.08] bg-[#000000] flex items-center justify-between px-4 md:px-6 z-50 shrink-0 sticky top-0">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 bg-white flex items-center justify-center font-extrabold text-black text-[10px]">IC</div>
            <span className="text-white text-xs font-bold tracking-tight hidden sm:block">InterviewCoach</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white text-[13.5px] font-medium flex items-center gap-1.5 shrink-0">
              {companyMeta ? <span className="shrink-0">{companyMeta.logo}</span> : <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />}
              {company?.name || "Target"}
            </span>
            <span className="text-slate-400 text-[13.5px] hidden md:inline truncate">
              {sessionData?.role || "Software Engineer"}
            </span>
            <span
              className="text-[13.5px] ml-1 hidden sm:flex items-center gap-1.5 shrink-0"
              style={{ color: "var(--accent)" }}
            >
              <PersonaIcon size={11} />
              {personaMeta.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6 shrink-0">
          {phase === "answering" ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[13px] hidden sm:block">Time left</span>
                <span className={`text-base font-bold tabular-nums font-mono ${timeLeft <= 20 ? "text-rose-400 animate-pulse" : timeLeft <= 60 ? "text-amber-400" : "text-white"}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="w-px h-4 bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-2 hidden sm:flex">
                <span className="text-slate-400 text-[13px]">Question</span>
                <span className="text-sm font-mono font-bold text-white">{questionNum} of {TOTAL_NODES}</span>
              </div>
              <div className="w-px h-4 bg-white/10 hidden xl:block" />
              <div className="items-center gap-2 hidden xl:flex" title="Real time elapsed since this session started">
                <span className="text-slate-400 text-[13px]">Session</span>
                <span className="text-sm font-mono font-bold text-slate-300 tabular-nums">{formatTime(sessionElapsed)}</span>
              </div>
              <div className="w-px h-4 bg-white/10 hidden lg:block" />
              <div className="items-center gap-2 hidden lg:flex">
                <span className="text-slate-400 text-[13px]">Rating</span>
                <span className="text-sm font-mono font-bold text-slate-100 tabular-nums">{Math.round(currentElo)}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <button onClick={() => setShowAbortConfirm(true)} className="text-[13px] text-slate-300 hover:text-white border border-white/15 px-3 py-1 hover:bg-white/[0.06] transition-colors">
                End early
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={16} />
                <span className="text-[13px] hidden sm:inline">Answer scored</span>
              </div>
              <button onClick={handleFinish} className="text-slate-200 bg-white/[0.04] border border-white/10 px-4 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5">
                End Session <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* NODE PROGRESS STRIP */}
      <div className="h-[3px] w-full flex gap-[3px] shrink-0 z-40 bg-black/40">
        {Array.from({ length: TOTAL_NODES }).map((_, i) => (
          <div key={i} className="flex-1 h-full transition-colors duration-500"
            style={{
              background: i < questionNum - 1 ? `rgba(var(--accent-rgb), 0.6)`
                : i === questionNum - 1 ? "var(--accent)"
                : "rgba(255,255,255,0.06)",
              boxShadow: i === questionNum - 1 ? `0 0 6px var(--accent)` : "none"
            }}
          />
        ))}
      </div>

      {/* MAIN WORKSPACE SHELL */}
      <main className="flex-1 w-full flex flex-col overflow-hidden relative z-10 bg-[#000000] min-h-0">

        {phase === "answering" ? (
          /* ====================================================================
             ACT 1: THE INTERROGATION CHAMBER — persona-reactive, mobile-stacked
             ==================================================================== */
          <div
            className="w-full h-full flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden transition-opacity duration-500"
            style={{ opacity: mounted ? 1 : 0 }}
          >

            <QuestionPane
              question={question} category={category} scenario={scenario}
              constraints={constraints} ask={ask} personaMeta={personaMeta}
            />

            {/* CENTER PANE: ZEN WRITING CANVAS */}
            <div className="w-full lg:w-[48%] min-h-[420px] lg:h-full relative bg-[#000000] flex flex-col border-r border-white/[0.08] shrink-0">

              {/* Evaluator identity bar — reflects real session persona */}
              <div className="h-12 border-b border-white/[0.05] bg-black/60 flex items-center px-4 md:px-6 gap-3 shrink-0">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: "var(--accent)", animation: "evalPulse 2s ease-in-out infinite" }}
                />
                <span className="text-sm font-bold text-white tracking-wide truncate">{personaMeta.name}</span>
                <span className="text-xs font-mono text-slate-400 italic ml-2 hidden sm:inline truncate">"{personaMeta.quote}"</span>
                {isRecording && (
                  <div className="ml-auto flex items-end gap-[2px] h-4 shrink-0">
                    {waveLevels.map((h, i) => (
                      <div
                        key={i}
                        className="w-[2px] rounded-full transition-[height] duration-75"
                        style={{ height: `${h}px`, background: "var(--accent)" }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Text Area */}
              <div className="flex-1 relative w-full min-h-[280px] bg-[#000000]">
                {scoringError && (
                  <div role="alert" className="absolute top-2 left-8 right-8 z-20 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs text-rose-300 flex items-center justify-between gap-3">
                    <span>{scoringError}</span>
                    <button onClick={() => setScoringError("")} aria-label="Dismiss error" className="text-rose-400 hover:text-rose-200 shrink-0">✕</button>
                  </div>
                )}
                {micError && !scoringError && (
                  <div role="alert" className="absolute top-2 left-8 right-8 z-20 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200">
                    {micError}
                  </div>
                )}
                {showHint && constraints?.length > 0 && (
                <div className="absolute top-2 left-8 right-8 z-20 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200">
                <strong>Tip:</strong> Make sure your answer directly addresses: "{constraints[0]}"
                </div>
                 )}
                <div
                  className="absolute top-8 left-8 pointer-events-none select-none transition-opacity duration-300"
                  style={{ opacity: answer ? 0 : 1 }}
                >
                  <span className="block text-[9px] font-mono font-bold uppercase tracking-widest text-slate-700 mb-2">
                    Response Template — Generic, Not Personalized
                  </span>
                  <pre className="text-slate-500 text-sm md:text-base font-mono font-medium leading-[1.8] m-0">
                    {isBehavioral ? (
                      <>// 1. Situation & Ownership...<br/><br/>// 2. Key Actions & Stakeholder Alignment...<br/><br/>// 3. Root Cause Analysis...</>
                    ) : (
                      <>// 1. Clarification & Edge Cases...<br/><br/>// 2. Core Architectural Approach...<br/><br/>// 3. Trade-offs & Limits...</>
                    )}
                  </pre>
                </div>
                <textarea
                  value={answer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  disabled={timeLeft === 0}
                  spellCheck="false"
                  aria-label="Your answer"
                  className="w-full h-full bg-transparent text-slate-100 text-base font-mono leading-[1.8] p-8 pb-32 resize-none outline-none z-10 relative scrollbar-hide"
                  style={{ caretColor: "var(--accent)" }}
                />
              </div>

              {/* Action Dock */}
              <div className="lg:absolute lg:bottom-5 lg:left-5 lg:right-5 flex items-center justify-between z-20 bg-[#0a0a10]/90 border border-white/10 p-3 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] m-4 lg:m-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    aria-pressed={isRecording}
                    aria-label={isRecording ? "Stop recording" : "Answer by voice"}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all outline-none ${
                      isRecording ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-white/[0.04] border border-white/10 text-slate-200 hover:text-white'
                    }`}
                  >
                    {isRecording ? <Square fill="currentColor" size={14}/> : <Mic size={14}/>}
                    <span className="hidden sm:inline">{isRecording ? 'Stop Voice' : 'Speak'}</span>
                  </button>
                  <button onClick={() => setShowHint(!showHint)} className="text-xs font-mono font-bold text-slate-300 hover:text-white transition-colors bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl">
                  <Lightbulb size={13} className="inline mr-1" /> Hint
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 hidden xl:block">
                    {answer.trim() ? answer.trim().split(/\s+/).length : 0} words · {answer.length} chars
                  </span>
                  <button
                    onClick={() => submitAnswer()}
                    disabled={loading}
                    className={`relative overflow-hidden px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 outline-none ${
                      loading ? "bg-white/10 text-slate-500 cursor-wait" : "btn-liquid shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                    }`}
                  >
                    {loading ? (
                      <><span className="w-3.5 h-3.5 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin inline-block" /> Evaluating...</>
                    ) : (
                      <><Send size={13} /> Submit Answer <kbd className="font-mono text-[10px] bg-black/10 px-1.5 py-0.5 rounded ml-1 opacity-60">↵</kbd></>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <TelemetryPane
              personaMeta={personaMeta} liveCoaching={liveCoaching} wsConnected={wsConnected}
              intervention={intervention} eloBand={eloBand} currentElo={currentElo}
            />
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col relative overflow-hidden bg-[#000000]">
            <Debrief
              personaMeta={personaMeta} questionNum={questionNum} isLastNode={isLastNode}
              scores={scores} gaps={gaps} gapAnalysisUnavailable={gapAnalysisUnavailable} peer={peer}
              newElo={newElo} currentElo={currentElo} company={company} answer={answer}
              liveCoaching={liveCoaching} currentAnswerId={currentAnswerId} feedbackRating={feedbackRating}
              onRateFeedback={rateFeedback} onOpenStudyPlan={setStudyPlanTopic}
              onRetry={retryNode} onNext={goNextQuestion} onFinish={handleFinish}
            />

            {/* Overlay Modals */}
            <AnimatePresence>
            {studyPlanTopic && (
             <StudyPlan topicName={studyPlanTopic} company={company?.name?.toLowerCase()} onClose={() => setStudyPlanTopic(null)} />
             )}
          </AnimatePresence>

          </div>
        )}
      </main>

      <AnimatePresence>
        {showAbortConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-200 bg-black/70 backdrop-blur-md flex items-center justify-center">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              role="alertdialog" aria-modal="true" aria-labelledby="abort-title" aria-describedby="abort-desc"
              className="bg-[#0a0a10]/90 border border-white/[0.12] rounded-2xl p-8 max-w-[360px] w-[calc(100%-40px)] text-center shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={18} className="text-rose-400" />
              </div>
              <h3 id="abort-title" className="text-base font-extrabold text-white mb-2">Abort this session?</h3>
              <p id="abort-desc" className="text-xs text-slate-400 leading-relaxed mb-5">Your answer to this node will be discarded. Answers you already submitted in this session stay scored.</p>
              <button onClick={handleFinish} className="w-full py-2.5 rounded-lg bg-rose-500/15 border border-rose-500/35 text-rose-400 font-bold text-xs hover:bg-rose-500/25 transition-colors">
                End Session
              </button>
              <button autoFocus onClick={() => setShowAbortConfirm(false)} className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 font-semibold text-xs mt-2 hover:bg-white/10 transition-colors">
                Keep Going
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
