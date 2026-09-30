import api from "../lib/api";
import React, { useState, useEffect, useRef } from "react";
import StudyPlan from "./StudyPlan";
import { AnimatePresence } from "motion/react";
import { COMPANIES } from "../constants/companies";
import { TOTAL_NODES, computeTimeLimit, getPersonaMeta } from "./interview/constants";
import { useCoachingSocket } from "./interview/useCoachingSocket";
import { useRecorder } from "./interview/useRecorder";
import { usePreferences } from "../lib/preferences";
import QuestionPane from "./interview/QuestionPane";
import TelemetryPane from "./interview/TelemetryPane";
import Debrief from "./interview/Debrief";
import InterviewHeader from "./interview/InterviewHeader";
import AnswerCanvas from "./interview/AnswerCanvas";
import EndEarlyDialog from "./interview/EndEarlyDialog";

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
  const TIME_LIMIT = computeTimeLimit(sessionData?.scenario, sessionData?.constraints, sessionData?.category);
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

  const prefs = usePreferences();
  const coach = useCoachingSocket(sessionData?.session_id, {
    onTranscription: (text) => setAnswer((prev) => (prev + " " + text).trim()),
  });
  const { coaching: liveCoaching, connected: wsConnected, intervention } = coach;
  const recorder = useRecorder({ onRecording: coach.sendAudio });
  const { isRecording, waveLevels, start: startRecording, stop: stopRecording, error: micError } = recorder;

  useEffect(() => {
    clearInterval(timerRef.current);
    const limit = computeTimeLimit(scenario, constraints, category);
    setTimeLeft(limit);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [question, scenario, constraints, category, attempt]);

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

      <InterviewHeader
        company={company} companyMeta={companyMeta} role={sessionData?.role} personaMeta={personaMeta} phase={phase}
        timeLeft={timeLeft} questionNum={questionNum} sessionElapsed={sessionElapsed} currentElo={currentElo}
        onEndEarly={() => setShowAbortConfirm(true)}
      />

      {/* MAIN WORKSPACE SHELL */}
      <main className="flex-1 w-full flex flex-col overflow-hidden relative z-10 min-h-0">

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

            <AnswerCanvas
              personaMeta={personaMeta} answer={answer} onAnswerChange={handleAnswerChange} timeUp={timeLeft === 0}
              isBehavioral={isBehavioral} constraints={constraints}
              isRecording={isRecording} waveLevels={waveLevels} onStartRecording={startRecording} onStopRecording={stopRecording} micError={micError}
              scoringError={scoringError} onDismissError={() => setScoringError("")}
              showHint={showHint} onToggleHint={() => setShowHint((v) => !v)} loading={loading} onSubmit={() => submitAnswer()}
            />

            <TelemetryPane
              personaMeta={personaMeta} liveCoaching={liveCoaching} wsConnected={wsConnected}
              wordCount={answer.trim() ? answer.trim().split(/\s+/).length : 0}
              intervention={intervention} eloBand={eloBand} currentElo={currentElo}
              showCoaching={prefs.live_coaching_telemetry !== false}
            />
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col relative overflow-hidden">
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

      <EndEarlyDialog open={showAbortConfirm} onConfirm={handleFinish} onCancel={() => setShowAbortConfirm(false)} />
    </div>
  );
}
