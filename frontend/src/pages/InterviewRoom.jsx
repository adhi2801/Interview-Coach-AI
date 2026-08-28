import { API_URL, WS_URL } from "../config";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import StudyPlan from "./StudyPlan";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import {
  Mic, Square, AlertTriangle, Lightbulb, Activity, ShieldAlert, ChevronRight,
  Target, CheckCircle2, Lock, ArrowRight, ThumbsUp, ThumbsDown, Terminal,
  MessageSquare, RefreshCw, XCircle, UserCheck, Flame, Search, Coffee, Send
} from "lucide-react";
import { COMPANIES } from "../constants/companies";

// --- ANIMATED NUMBER TICKER ---
function AnimatedNumber({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => v.toFixed(1));
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on("change", setDisplay);
    return () => { controls.stop(); unsub(); };
  }, [value, count, rounded]);

  return <>{display}</>;
}

// Maps raw backend category codes to clean, human-readable labels
const CATEGORY_LABELS = {
  algorithms: "Algorithms",
  data_structures: "Data Structures",
  system_design: "System Design",
  distributed_systems: "Distributed Systems",
  databases: "Databases",
  behavioral: "Behavioral",
  leadership: "Leadership",
  communication: "Communication",
  machine_learning: "Machine Learning",
  concurrency: "Concurrency",
  security: "Security",
  networking: "Networking",
  oop: "OOP Design",
  binary_search: "Algorithms",
};

function formatCategory(category) {
  if (!category) return "Technical";
  return CATEGORY_LABELS[category] || category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Persona-reactive visual identity. Drives accent color, ambient glow,
// evaluator copy, and framing language across the answering phase.
// Persona is set once per session (chosen in Dashboard) — this is not
// a live switcher, just a styling lookup keyed off sessionData.persona.
const PERSONA_META = {
  standard: {
    label: "Standard",
    name: "Standard Evaluator",
    quote: "I'm listening. Walk me through it.",
    moodDesc: "Balanced — receptive to evidence",
    icon: UserCheck,
    accentRgb: "16,185,129",
    accentHex: "#10b981",
    askLabel: "THE ASK",
  },
  hostile: {
    label: "Hostile",
    name: "Hostile Interrogator",
    quote: "That answer won't hold. Defend it.",
    moodDesc: "Aggressive — challenges everything",
    icon: Flame,
    accentRgb: "239,68,68",
    accentHex: "#ef4444",
    askLabel: "DEFEND THIS",
  },
  socratic: {
    label: "Socratic",
    name: "Socratic Prober",
    quote: "Interesting. But why that approach specifically?",
    moodDesc: "First-principles — questions back",
    icon: Search,
    accentRgb: "99,102,241",
    accentHex: "#818cf8",
    askLabel: "THE DEEPER QUESTION",
  },
  exhausted: {
    label: "Exhausted",
    name: "Exhausted Interviewer",
    quote: "Just give me the one-sentence version.",
    moodDesc: "Low energy — wants tight clarity",
    icon: Coffee,
    accentRgb: "245,158,11",
    accentHex: "#f59e0b",
    askLabel: "BE CONCISE",
  },
};

function getPersonaMeta(persona) {
  return PERSONA_META[persona?.toLowerCase()] || PERSONA_META.standard;
}

export default function InterviewRoom({ sessionData, onFinish, onEloUpdate }) {
  // 100% Logic Preservation
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
  // Base 90s + ~9s per 100 characters of context, plus 15s per constraint —
  // a longer/denser question genuinely needs more reading+thinking time.
  // Floor 90s, cap 240s so it never runs away on an unusually long scenario.
  function computeTimeLimit(scenarioText, constraintList) {
    const base = 90;
    const readingTime = Math.round((scenarioText?.length || 0) / 100) * 9;
    const constraintTime = (constraintList?.length || 0) * 15;
    return Math.min(240, Math.max(90, base + readingTime + constraintTime));
  }
  const TIME_LIMIT = computeTimeLimit(sessionData?.scenario, sessionData?.constraints);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [nextQuestion, setNextQuestion] = useState("");
  const [nextCategory, setNextCategory] = useState("");
  const [nextScenario, setNextScenario] = useState("");
  const [nextConstraints, setNextConstraints] = useState([]);
  const [nextAsk, setNextAsk] = useState("");
  const [mounted, setMounted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState("");
  const [scoreHistory, setScoreHistory] = useState([]);
  const [feedbackRating, setFeedbackRating] = useState(null);
  const [currentAnswerId, setCurrentAnswerId] = useState(null);
  const [studyPlanTopic, setStudyPlanTopic] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveCoaching, setLiveCoaching] = useState(null);
  const [intervention, setIntervention] = useState(null);
  const [scoringError, setScoringError] = useState("");
  const [eloBand, setEloBand] = useState(null);
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [sessionElapsed, setSessionElapsed] = useState(0); // real wall-clock time since this session mounted — not a fabricated stat
  const wsRef = useRef(null);
  const debounceRef = useRef(null);
  const timerRef = useRef(null);
  const autoSubmittedRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  // Real waveform — driven by an AnalyserNode on the actual mic stream,
  // only ever animates while isRecording is true. No fake/simulated bars.
  const [waveLevels, setWaveLevels] = useState(Array(16).fill(2));
  const waveAudioCtxRef = useRef(null);
  const waveAnalyserRef = useRef(null);
  const waveAnimRef = useRef(null);

  const isBehavioral = category?.toLowerCase().includes("behavioral") || category?.toLowerCase().includes("leadership");
  const personaMeta = getPersonaMeta(persona);
  const PersonaIcon = personaMeta.icon;
  const TOTAL_NODES = 5;
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (phase === 'results' && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isLastNode) handleFinish(); else goNextQuestion();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, newElo, nextQuestion, isLastNode]);

  useEffect(() => {
    // No real session yet — don't fall back to connecting on someone
    // else's/an arbitrary session's coaching channel.
    if (!sessionData?.session_id) return;
    const token = localStorage.getItem("access_token");
    const ws = new WebSocket(`${WS_URL}/ws/coaching/${sessionData.session_id}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "coaching_update") {
        setLiveCoaching(data);
        if (data.intervention) {
          setIntervention(data.intervention);
          setTimeout(() => setIntervention(null), 6000);
        }
      } else if (data.type === "transcription") {
        setAnswer((prev) => (prev + " " + data.text).trim());
        setLiveCoaching(data);
      }
    };

    ws.onclose = () => setWsConnected(false);
    ws.onerror = (e) => console.error("WebSocket error", e);

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 20000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, [sessionData?.session_id]);

  useEffect(() => {
    clearInterval(timerRef.current);
    const limit = computeTimeLimit(scenario, constraints);
    setTimeLeft(limit);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [question, scenario, constraints]);

  useEffect(() => {
    autoSubmittedRef.current = false;
  }, [question]);

  useEffect(() => {
    axios.get(`${API_URL}/roles/elo-bands`).then(res => {
      const band = res.data?.[sessionData?.role];
      if (band) setEloBand(band);
    }).catch(() => setEloBand(null));
  }, [sessionData?.role]);

  useEffect(() => {
    return () => {
      if (waveAnimRef.current) cancelAnimationFrame(waveAnimRef.current);
      if (waveAudioCtxRef.current && waveAudioCtxRef.current.state !== "closed") {
        waveAudioCtxRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !autoSubmittedRef.current && !loading) {
      autoSubmittedRef.current = true;
      submitAnswer(true);
    }
  }, [timeLeft]);

  function formatTime(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function handleAnswerChange(text) {
    setAnswer(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && text.trim()) {
        wsRef.current.send(JSON.stringify({
          type: "text_chunk",
          text: text,
          pause_detected: true
        }));
      }
    }, 800);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        const completeBlob = new Blob(chunks, { type: mimeType });
        if (completeBlob.size > 2000 && wsRef.current?.readyState === WebSocket.OPEN) {
          completeBlob.arrayBuffer().then((buffer) => wsRef.current.send(buffer));
        }
        stream.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);

      // Real waveform: analyse the actual mic stream, not a fake loop
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      waveAudioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      waveAnalyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const barCount = 16;

      const renderWave = () => {
        analyser.getByteFrequencyData(dataArray);
        const step = Math.floor(bufferLength / barCount) || 1;
        const levels = Array.from({ length: barCount }, (_, i) => {
          const v = dataArray[i * step] || 0;
          return Math.max(2, Math.min(20, (v / 255) * 20));
        });
        setWaveLevels(levels);
        waveAnimRef.current = requestAnimationFrame(renderWave);
      };
      renderWave();
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }

  function stopRecording() {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (waveAnimRef.current) cancelAnimationFrame(waveAnimRef.current);
    if (waveAudioCtxRef.current && waveAudioCtxRef.current.state !== "closed") {
      waveAudioCtxRef.current.close();
    }
    setWaveLevels(Array(16).fill(2));
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
      const token = localStorage.getItem("access_token");
      const startRes = await axios.post(
        `${API_URL}/answer/submit`,
        {
          session_id: sessionData.session_id,
          question,
          answer: finalAnswer,
          difficulty,
          elo: currentElo,
          company: sessionData?.company_profile?.name?.toLowerCase(),
          role: sessionData?.role,
          category,
          persona,
        },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
      );

      if (startRes.data.error) {
        setScoringError(startRes.data.error);
        setLoading(false);
        return;
      }
      await pollForResult(startRes.data.job_id);
    } catch (err) {
      console.error(err);
      setScoringError("Couldn't reach the scoring service. Check your connection and try again.");
      setLoading(false);
    }
  }

 async function handleFinish() {
  try {
    const token = localStorage.getItem("access_token");
    await axios.post(
      `${API_URL}/replay/${sessionData.session_id}/end`,
      {},
      { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
    );
  } catch (err) {
    console.error("Failed to close out replay:", err);
  }
  onFinish();
}
 
  async function pollForResult(jobId) {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      attempts++;
      try {
        const pollToken = localStorage.getItem("access_token");
        const res = await axios.get(`${API_URL}/answer/status/${jobId}`, {
          headers: { Authorization: `Bearer ${pollToken}` }
        });

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

          const overallScore = (
            res.data.scores.score_technical + res.data.scores.score_communication +
            res.data.scores.score_problem_solving + res.data.scores.score_cultural_fit +
            res.data.scores.score_confidence
          ) / 5;
          setScoreHistory((prev) => [...prev, {
            question: `Q${prev.length + 1}`,
            overall: Number(overallScore.toFixed(1)),
            technical: res.data.scores.score_technical,
            confidence: res.data.scores.score_confidence,
          }]);
          setLoading(false);
          return;
        }

        if (res.data.status === "failed") {
          setLoading(false);
          setScoringError("Scoring failed. Please try submitting again.");
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setLoading(false);
          setScoringError("Scoring is taking longer than expected. Please try submitting again.");
        }
      } catch (err) {
        setLoading(false);
        setScoringError("Something went wrong while scoring your answer.");
      }
    };
    poll();
  }

  async function rateFeedback(helpful) {
    setFeedbackRating(helpful);
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `${API_URL}/feedback/rate`,
        { answer_id: currentAnswerId, helpful },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
    setLiveCoaching(null);
    setNewElo(null);
    setPhase("answering");
    setQuestionNum((n) => n + 1);
    setDifficulty(Math.min(10, Math.max(1, Math.round((currentElo - 800) / 100))));
  }

  const rawOverall = scores ? (scores.score_technical + scores.score_communication + scores.score_problem_solving + scores.score_cultural_fit + scores.score_confidence) / 5 : 0;
  const scaledScore = Math.round(rawOverall * 10);
  const company = sessionData?.company_profile;
  const companyMeta = COMPANIES.find(c => c.id === (sessionData?.company || "").toLowerCase());
  const isPass = scaledScore >= 70;
  const verdictLabel = isPass ? "Strong Pass" : "Needs Revision";
  const eloDelta = newElo ? Math.round(newElo - currentElo) : 0;

  // DETECT PROFANITY / POLICY VIOLATION FROM BACKEND EVALUATION
const hasProfanityFlag = scores?.overall_summary?.toLowerCase().includes("inappropriate language") ||
                        scores?.overall_summary?.toLowerCase().includes("unprofessional language");

  // Persona-driven CSS custom properties applied to the room shell.
  // Everything downstream (dots, borders, timer color, ask-card accent)
  // reads these vars instead of hardcoded colors.
  const personaStyleVars = {
    "--accent": personaMeta.accentHex,
    "--accent-rgb": personaMeta.accentRgb,
  };

  return (
    <div
      className="h-screen w-full bg-[#000000] text-slate-100 font-sans flex flex-col overflow-hidden selection:bg-blue-500/30 relative"
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
          className="absolute -top-[15%] -left-[10%] w-[45vw] h-[45vw] rounded-full blur-[130px] transition-colors duration-700"
          style={{ background: `rgba(var(--accent-rgb), 0.12)` }}
        />
        <div
          className="hidden lg:block absolute -bottom-[15%] -right-[8%] w-[35vw] h-[35vw] rounded-full blur-[130px] transition-colors duration-700"
          style={{ background: `rgba(var(--accent-rgb), 0.08)` }}
        />
      </div>

      {/* TOP HUD HEADER */}
      <header className="h-14 border-b border-white/[0.08] bg-[#000000] flex items-center justify-between px-4 md:px-6 z-50 flex-shrink-0 sticky top-0">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center font-bold text-black text-xs">IC</div>
            <span className="text-white text-xs font-bold tracking-tight hidden sm:block">InterviewCoach</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white text-xs font-bold uppercase tracking-widest bg-white/5 border border-white/10 px-2.5 py-1 rounded flex items-center gap-1.5 shrink-0">
              {companyMeta ? <span className="shrink-0">{companyMeta.logo}</span> : <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />}
              {company?.name || "Target"}
            </span>
            <span className="text-slate-300 text-xs font-bold uppercase tracking-widest hidden md:inline truncate">
              &middot; {sessionData?.role || "SWE L4"}
            </span>
            <span
              className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded ml-1 border hidden sm:flex items-center gap-1.5 shrink-0"
              style={{ background: `rgba(var(--accent-rgb), 0.1)`, borderColor: `rgba(var(--accent-rgb), 0.25)`, color: "var(--accent)" }}
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
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300 hidden sm:block">Time</span>
                <span className={`text-base font-bold tabular-nums font-mono ${timeLeft <= 20 ? "text-rose-400 animate-pulse" : timeLeft <= 60 ? "text-amber-400" : "text-white"}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="w-px h-4 bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-2 hidden sm:flex">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Node</span>
                <span className="text-sm font-mono font-bold text-white">{questionNum}/{TOTAL_NODES}</span>
              </div>
              <div className="w-px h-4 bg-white/10 hidden xl:block" />
              <div className="items-center gap-2 hidden xl:flex" title="Real time elapsed since this session started">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Session</span>
                <span className="text-sm font-mono font-bold text-slate-300 tabular-nums">{formatTime(sessionElapsed)}</span>
              </div>
              <div className="w-px h-4 bg-white/10 hidden lg:block" />
              <div className="items-center gap-2 hidden lg:flex">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">ELO</span>
                <span className="text-sm font-mono font-bold text-slate-100 tabular-nums">{Math.round(currentElo)}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <button onClick={() => setShowAbortConfirm(true)} className="text-xs font-mono font-bold text-slate-300 hover:text-white uppercase tracking-widest border border-white/10 px-3 py-1 rounded bg-white/5 transition-colors">
                Abort
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={16} />
                <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Node Logged</span>
              </div>
              <button onClick={handleFinish} className="text-slate-200 bg-white/[0.04] border border-white/10 px-4 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5">
                End Session <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* NODE PROGRESS STRIP */}
      <div className="h-[3px] w-full flex gap-[3px] flex-shrink-0 z-40 bg-black/40">
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

            {/* LEFT PANE: PROMPT INSPECTOR */}
            <div className="w-full lg:w-[30%] lg:h-full overflow-y-auto border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#020204] p-6 lg:p-8 flex flex-col shrink-0">
              <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3.5 mb-6">
                <Terminal size={16} className="shrink-0" style={{ color: "var(--accent)" }} />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">The Question</h3>
                <span className="ml-auto bg-white/5 border border-white/10 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest text-slate-300">
                  {formatCategory(category)}
                </span>
              </div>

              {scenario ? (
                <div className="flex-1 flex flex-col space-y-7">
                  <div>
                    <h4 className="text-[10px] font-bold tracking-widest text-slate-300 uppercase mb-2.5">Context</h4>
                    <p className="text-sm text-slate-200 leading-[1.7] font-medium">{scenario}</p>
                  </div>

                  {constraints?.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold tracking-widest text-slate-300 uppercase mb-2.5">Constraints</h4>
                      <ul className="space-y-3">
                        {constraints.map((c, i) => (
                          <li key={i} className="text-sm text-slate-200 font-medium flex items-start gap-2.5 leading-[1.6]">
                            <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: "var(--accent)" }} />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ask && (
                    <div
                      className="mt-auto pt-5 border-t rounded-xl p-4 -mx-1"
                      style={{ borderColor: "transparent", background: `rgba(var(--accent-rgb), 0.06)` }}
                    >
                      <h4 className="text-[10px] font-bold tracking-widest uppercase mb-2 px-1" style={{ color: "var(--accent)" }}>
                        {personaMeta.askLabel}
                      </h4>
                      <p className="text-sm md:text-[15px] font-bold text-white leading-[1.7] px-1">{ask}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm md:text-[15px] text-slate-200 leading-[1.7] font-medium">{question}</p>
              )}
            </div>

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
                  <div className="absolute top-2 left-8 right-8 z-20 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs text-rose-300 flex items-center justify-between gap-3">
                    <span>{scoringError}</span>
                    <button onClick={() => setScoringError("")} className="text-rose-400 hover:text-rose-200 shrink-0">✕</button>
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
                  className="w-full h-full bg-transparent text-slate-100 text-base font-mono leading-[1.8] p-8 pb-32 resize-none outline-none z-10 relative scrollbar-hide"
                  style={{ caretColor: "var(--accent)" }}
                />
              </div>

              {/* Action Dock */}
              <div className="lg:absolute lg:bottom-5 lg:left-5 lg:right-5 flex items-center justify-between z-20 bg-[#08080C] border border-white/10 p-3 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] m-4 lg:m-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all outline-none ${
                      isRecording ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-white/[0.04] border border-white/10 text-slate-200 hover:text-white'
                    }`}
                  >
                    {isRecording ? <Square fill="currentColor" size={14}/> : <Mic size={14}/>}
                    <span className="hidden sm:inline">{isRecording ? 'Stop Voice' : 'Hold to Speak'}</span>
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
                      loading ? "bg-white/10 text-slate-500 cursor-wait" : "bg-white text-black hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
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

            {/* RIGHT PANE: SESSION TELEMETRY — real data only, no simulated scores */}
            <div className="w-full lg:w-[22%] lg:min-w-[240px] bg-[#020204] p-6 flex flex-col shrink-0">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5 mb-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">Session Telemetry</h3>
                <Activity size={16} style={{ color: "var(--accent)" }} />
              </div>

              <div className="space-y-6">
                {/* Room mood — reflects real persona, not a live-changeable state */}
                <div className="flex items-center gap-3 pb-5 border-b border-white/[0.06]">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center border shrink-0"
                    style={{ background: `rgba(var(--accent-rgb), 0.12)`, borderColor: `rgba(var(--accent-rgb), 0.25)` }}
                  >
                    <PersonaIcon size={16} style={{ color: "var(--accent)" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{personaMeta.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">{personaMeta.moodDesc}</div>
                  </div>
                </div>

                {/* Confidence Widget */}
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Confidence</span>
                    <span className="text-sm font-bold text-white tabular-nums">{liveCoaching?.confidence_score || '--'}/10</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div className="h-full" style={{ background: "var(--accent)" }} animate={{ width: `${(liveCoaching?.confidence_score || 0) * 10}%` }} transition={{ type: "spring", stiffness: 100 }} />
                  </div>
                  <p className="text-[9.5px] text-slate-600 mt-1">
                    {isRecording ? "Measuring from audio signal…" : "Measured from voice input · not yet active"}
                  </p>
                </div>

                {/* Pace Widget */}
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Pace (WPM)</span>
                    <span className="text-sm font-bold text-white tabular-nums">{liveCoaching?.words_per_minute || '--'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-blue-400" animate={{ width: `${Math.min((liveCoaching?.words_per_minute || 0) / 2, 100)}%` }} transition={{ type: "spring", stiffness: 100 }} />
                  </div>
                  <p className="text-[9.5px] text-slate-600 mt-1">
                    {liveCoaching?.words_per_minute ? "Live from typed/spoken input" : "Measured as you type or speak"}
                  </p>
                </div>

                {/* Fillers Detected */}
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Fillers Detected</span>
                    <span className={`text-sm font-bold tabular-nums ${(liveCoaching?.fillers_found || 0) > 3 ? 'text-amber-400' : 'text-white'}`}>{liveCoaching?.fillers_found || 0}</span>
                  </div>
                  <p className="text-[9.5px] text-slate-600">"um", "uh", "like", "basically", "actually"</p>
                </div>

                {/* Intervention Toast */}
                <AnimatePresence>
                  {intervention && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <AlertTriangle size={14} className="text-amber-400" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Coach Probe</span>
                      </div>
                      <p className="text-xs md:text-sm font-medium text-amber-200/90 leading-relaxed">{intervention}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Score Preview — labels shown for visual parity with the
                  design, but every value stays "Pending" until scoring
                  actually returns real numbers. No simulated/fake scores. */}
              <div className="mt-6 pt-5 border-t border-white/[0.06]">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300 block mb-3">Score Preview</span>
                <div className="space-y-2.5">
                  {["Technical Accuracy", "Problem Solving", "Communication", "Culture Fit", "Confidence"].map((label) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">{label}</span>
                      <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider">Pending</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-600 italic mt-3">Scores are computed after you submit — not simulated live.</p>
              </div>

              {/* Bottom Target ELO — same real /roles/elo-bands source as
                  Session Setup. Omitted entirely if no real band exists for
                  this role, rather than showing an invented threshold. */}
              {eloBand && (
                <div className="mt-6 lg:mt-auto pt-5 border-t border-white/[0.08]">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">{eloBand.label}</span>
                    <span className="text-sm font-mono font-bold text-white">{eloBand.low}–{eloBand.high}</span>
                  </div>
                  <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                      style={{ width: `${Math.max(0, Math.min(100, ((currentElo - eloBand.low) / (eloBand.high - eloBand.low)) * 100))}%` }} />
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : (
          /* ====================================================================
             ACT 2: DEBRIEF — real data only. Per-dimension commentary,
             "what you covered well" cards, and hardcoded peer benchmarks
             from the old version were fabricated (not backed by any
             backend field) and have been removed rather than reused.
             ==================================================================== */
          <div className="w-full flex-1 flex flex-col relative overflow-hidden bg-[#000000]">
            <div className="flex-1 w-full h-full overflow-y-auto scrollbar-hide">
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-[1080px] mx-auto w-full px-6 py-10 flex flex-col gap-7"
              >

                {/* SECTION LABEL */}
                <div className="flex items-center gap-3">
                  <div className="w-px h-7" style={{ background: `linear-gradient(to bottom, transparent, rgba(var(--accent-rgb),0.6), transparent)` }} />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-500">
                    Session Debrief &middot; {personaMeta.name} &middot; Node {questionNum} of {TOTAL_NODES}
                  </span>
                </div>

                {/* PROFANITY / POLICY VIOLATION BANNER */}
                {hasProfanityFlag && (
                  <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-rose-400">
                      <ShieldAlert size={20} className="shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest">Policy Violation Detected</h4>
                        <p className="text-xs text-rose-200/80 font-medium">Unprofessional or inappropriate language was flagged in your answer. Score penalized across technical dimensions.</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-md uppercase tracking-wider shrink-0">
                      Non-Compliant
                    </span>
                  </div>
                )}

                {/* VERDICT CARD */}
                <div
                  className="relative overflow-hidden rounded-3xl border p-6 md:p-9"
                  style={{
                    borderColor: hasProfanityFlag ? "rgba(239,68,68,0.25)" : isPass ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                    background: hasProfanityFlag ? "rgba(16,8,8,0.95)" : isPass ? "rgba(8,16,12,0.95)" : "rgba(16,8,8,0.95)",
                    boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.55)"
                  }}
                >
                  <div
                    className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none blur-[70px]"
                    style={{ background: hasProfanityFlag || !isPass ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.14)" }}
                  />
                  <div
                    className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full pointer-events-none blur-[70px]"
                    style={{ background: `rgba(var(--accent-rgb), 0.08)` }}
                  />

                  <div className="relative z-10 flex items-start gap-7 flex-wrap">
                    {/* Score ring — real rawOverall, animated once on mount */}
                    <div className="relative w-[110px] h-[110px] shrink-0">
                      <svg width="110" height="110" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                        <defs>
                          <linearGradient id="debriefRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor={isPass && !hasProfanityFlag ? "#10b981" : "#ef4444"} />
                          </linearGradient>
                        </defs>
                        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                        <motion.circle
                          cx="60" cy="60" r="52" fill="none" stroke="url(#debriefRingGrad)" strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 52}
                          initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - Math.min(10, rawOverall) / 10) }}
                          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[26px] font-black font-mono tracking-tight text-white leading-none">
                          <AnimatedNumber value={Math.round(rawOverall * 10) / 10} />
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">/10</span>
                      </div>
                    </div>

                    {/* Verdict text */}
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
                        <span
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border"
                          style={{
                            background: hasProfanityFlag ? "rgba(239,68,68,0.14)" : isPass ? "rgba(16,185,129,0.14)" : "rgba(239,68,68,0.12)",
                            borderColor: hasProfanityFlag ? "rgba(239,68,68,0.3)" : isPass ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.25)",
                            color: hasProfanityFlag || !isPass ? "#fca5a5" : "#6ee7b7"
                          }}
                        >
                          {hasProfanityFlag ? "Disqualifying Conduct" : verdictLabel}
                        </span>
                        {newElo && (
                          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-sm font-extrabold font-mono bg-white/5 border border-white/10 text-white">
                            {eloDelta >= 0 ? <ArrowRight size={13} className="-rotate-90 text-emerald-400" /> : <ArrowRight size={13} className="rotate-90 text-rose-400" />}
                            {eloDelta >= 0 ? `+${eloDelta}` : eloDelta} ELO
                          </span>
                        )}
                        {newElo && (
                          <span className="text-xs font-mono text-slate-500">
                            {Math.round(currentElo)} <ArrowRight size={11} className="inline -mt-0.5 mx-1" /> <span className="text-slate-200 font-bold">{Math.round(newElo)}</span>
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl md:text-[26px] font-extrabold tracking-tight text-white leading-[1.15] mb-3">
                        {hasProfanityFlag ? "Response flagged for conduct." : isPass ? "Strong pass on this node." : "This one needs another pass."}
                      </h2>

                      <div className="bg-black/50 border border-white/5 p-4 rounded-xl mt-2">
                        <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium italic">
                          "{scores?.overall_summary || "Diagnostic review complete for this interview node."}"
                        </p>
                        <p className="text-[10px] font-mono text-slate-500 mt-2 not-italic">
                          — {personaMeta.name} &middot; scored across 5 dimensions
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5D SCORE BREAKDOWN — real scores only, no fabricated per-dimension commentary */}
                {scores && (
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-500 block mb-3.5">5-Dimension Score Breakdown</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {[
                        { label: "Technical Accuracy", subtitle: "Correctness of approach", value: scores.score_technical, feedback: scores.technical_feedback, colorFrom: "#6366f1", colorTo: "#8b5cf6", badgeBg: "rgba(99,102,241,0.14)", badgeBorder: "rgba(99,102,241,0.28)", badgeColor: "#a5b4fc" },
                        { label: "Problem Solving", subtitle: "Trade-off & structural thinking", value: scores.score_problem_solving, feedback: scores.problem_solving_feedback, colorFrom: "#10b981", colorTo: "#6366f1", badgeBg: "rgba(16,185,129,0.12)", badgeBorder: "rgba(16,185,129,0.25)", badgeColor: "#6ee7b7" },
                        { label: "Communication", subtitle: "Clarity of explanation", value: scores.score_communication, feedback: scores.communication_feedback, colorFrom: "#f59e0b", colorTo: "#10b981", badgeBg: "rgba(245,158,11,0.12)", badgeBorder: "rgba(245,158,11,0.25)", badgeColor: "#fbbf24" },
                        { label: "Culture Fit", subtitle: `${company?.name || "Company"}-specific behaviours`, value: scores.score_cultural_fit, colorFrom: "#ec4899", colorTo: "#8b5cf6", badgeBg: "rgba(236,72,153,0.1)", badgeBorder: "rgba(236,72,153,0.22)", badgeColor: "#f9a8d4" },                      ].map((d, i) => (
                        <motion.div key={d.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                          <DimCard {...d} />
                        </motion.div>
                      ))}

                      {/* Confidence + real voice telemetry — from actual liveCoaching captured
                          during this node, not simulated. Falls back honestly if no data. */}
                      <div className="sm:col-span-2 bg-[#050507] border border-white/[0.08] rounded-2xl p-5">
                        <div className="flex items-start gap-6 flex-wrap">
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center justify-between mb-3.5">
                              <div>
                                <div className="text-[13px] font-bold text-slate-200">Confidence Signal</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">Voice &amp; speech telemetry</div>
                              </div>
                              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold" style={{ background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.22)", color: "#7dd3fc" }}>
                                {scores.score_confidence ? scores.score_confidence.toFixed(1) : "—"}
                              </span>
                            </div>
                            <div className="h-[5px] w-full bg-white/[0.06] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.max(4, Math.min(100, Math.round((scores.score_confidence || 0) * 10)))}%`, background: "linear-gradient(90deg, #0ea5e9, #6366f1)" }} />
                            </div>
                          </div>
                          <div className="flex gap-3 flex-wrap shrink-0">
                            <VoiceStat label="WPM" value={liveCoaching?.words_per_minute ?? "—"} color="#7dd3fc" />
                            <VoiceStat label="Fillers" value={liveCoaching?.fillers_found ?? "—"} color="#6ee7b7" />
                          </div>
                        </div>
                        {!liveCoaching && (
                          <p className="text-[10px] text-slate-600 italic mt-3">No live voice telemetry was captured for this answer.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* CRITICAL GAP — real gaps/prerequisites only */}
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-rose-400/80 block mb-3.5">Critical Gap</span>
                  {hasProfanityFlag ? (
                    <div className="bg-[#0c0606] border border-rose-500/30 rounded-2xl p-5 space-y-2">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                        <XCircle size={16} /> Unprofessional Communication Boundary
                      </div>
                      <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium">
                        Responses containing vulgarity or casual dismissals automatically disqualify senior engineering candidates. Focus on structured, objective problem-solving language.
                      </p>
                    </div>
                  ) : gaps?.length > 0 ? (
                    <div className="bg-[#0c0606] border border-rose-500/20 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-2 text-rose-400">
                        <ShieldAlert size={16} />
                        <h4 className="text-sm font-bold tracking-tight capitalize">{gaps[0].gap.replace(/_/g, " ")}</h4>
                      </div>
                      <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium">
                        {gaps[0].prerequisites_to_study_first?.length > 0
                          ? `Prerequisite dependencies detected: ${gaps[0].prerequisites_to_study_first.join(", ")}.`
                          : "Trade-off reasoning was underdeveloped — you named constraints but did not show rejected alternatives."
                        }
                      </p>
                      <button onClick={() => setStudyPlanTopic(gaps[0].gap)} className="text-xs font-mono font-bold text-blue-400 hover:underline flex items-center gap-1 pt-1">
                        Study Path Graph →
                      </button>
                    </div>
                  ) : gapAnalysisUnavailable ? (
                    <div className="bg-[#0c0906] border border-amber-500/20 rounded-2xl p-5 space-y-2">
                      <div className="flex items-center gap-2 text-amber-400">
                        <AlertTriangle size={16} />
                        <h4 className="text-sm font-bold tracking-tight">Gap analysis unavailable</h4>
                      </div>
                      <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
                        The gap-detection service didn't return a result for this answer. This is not the same as a clean pass — it means gap detection genuinely failed and no analysis was possible.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-[#050507] border border-white/[0.08] rounded-2xl p-5 text-xs text-slate-300">
                      No critical knowledge gaps detected for this response.
                    </div>
                  )}
                </div>

                {/* ANNOTATED ANSWER TRANSCRIPT — raw answer only, no fabricated tags */}
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-500 block mb-3.5">Your Answer</span>
                  <div className="bg-[#030305] border border-white/[0.08] p-5 rounded-2xl space-y-3">
                    <p className="text-xs md:text-sm font-mono text-slate-200 leading-[1.8] whitespace-pre-wrap">
                      {answer || "[No response recorded]"}
                    </p>
                    {hasProfanityFlag && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded text-xs font-mono font-bold">
                          Disqualifying Language Flagged
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* NEXT ACTIONS — real, functional */}
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-500 block mb-3.5">Next Actions</span>
                  <div className={`grid grid-cols-1 ${gaps?.length > 0 && !hasProfanityFlag ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3`}>
                    {gaps?.length > 0 && !hasProfanityFlag && (
                      <NextActionCard
                        icon={Target}
                        color="#fbbf24"
                        bg="rgba(245,158,11,0.1)"
                        border="rgba(245,158,11,0.22)"
                        title="Patch the Gap"
                        body={`Study ${gaps[0].gap.replace(/_/g, " ")} in your knowledge graph before the next attempt.`}
                        cta="Open Knowledge Graph"
                        onClick={() => setStudyPlanTopic(gaps[0].gap)}
                      />
                    )}
                    <NextActionCard
                      icon={RefreshCw}
                      color="var(--accent)"
                      bg="rgba(var(--accent-rgb),0.12)"
                      border="rgba(var(--accent-rgb),0.25)"
                      title={`Retry Node ${questionNum}`}
                      body="Same node, same company. Take another pass with what you just learned."
                      cta="Retry Now"
                      onClick={() => { setPhase("answering"); setAnswer(""); }}
                    />
                    <NextActionCard
                      icon={isLastNode ? CheckCircle2 : ArrowRight}
                      color="#6ee7b7"
                      bg="rgba(16,185,129,0.1)"
                      border="rgba(16,185,129,0.22)"
                      title={isLastNode ? "Finish Session" : `Advance to Node ${questionNum + 1}`}
                      body={isLastNode ? "You've completed all 5 nodes — wrap up and close out this session." : "Move on to the next node in this session."}
                      cta={isLastNode ? "Finish" : "Continue"}
                      onClick={isLastNode ? handleFinish : goNextQuestion}
                    />
                  </div>
                </div>

                {/* PEER BENCHMARK — only shown when real peer data exists */}
                {peer && peer.percentile != null && !hasProfanityFlag && (
                  <div className="bg-[#050507] border border-white/[0.08] rounded-2xl p-5 space-y-2 max-w-md">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-500 block mb-1">Peer Benchmark</span>
                    <span className="text-xs font-mono text-slate-300 block">
                      You scored top {Math.max(1, 100 - peer.percentile)}% globally on this scenario type.
                    </span>
                  </div>
                )}

                {/* BOTTOM CTA ROW */}
                <div className="flex items-center gap-3 flex-wrap pt-2 pb-8">
                  {isLastNode ? (
                    <button
                      onClick={handleFinish}
                      className="bg-white text-black px-6 py-3 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.15)] outline-none"
                    >
                      Finish Session <CheckCircle2 size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={goNextQuestion}
                      className="bg-white text-black px-6 py-3 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.15)] outline-none"
                    >
                      Next Node <kbd className="font-mono text-[9px] bg-black/10 px-1 py-0.5 rounded text-black/70">↵</kbd>
                    </button>
                  )}
                  <button
                    onClick={() => { setPhase("answering"); setAnswer(""); }}
                    className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 outline-none"
                  >
                    <RefreshCw size={13} /> Retry This Node
                  </button>
                  {currentAnswerId && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 hidden sm:inline">Was this feedback helpful?</span>
                      <button onClick={() => rateFeedback(true)} className={`p-2 rounded-lg border ${feedbackRating === true ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                        <ThumbsUp size={14} />
                      </button>
                      <button onClick={() => rateFeedback(false)} className={`p-2 rounded-lg border ${feedbackRating === false ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                        <ThumbsDown size={14} />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={handleFinish}
                    className="ml-auto bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white px-5 py-3 rounded-xl text-xs font-bold transition-all outline-none"
                  >
                    End Session
                  </button>
                </div>

              </motion.div>
            </div>

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
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0A0A12] border border-white/[0.12] rounded-2xl p-8 max-w-[360px] w-[calc(100%-40px)] text-center shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={18} className="text-rose-400" />
              </div>
              <h3 className="text-base font-extrabold text-white mb-2">Abort this session?</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-5">Progress on this node will not be saved. Your ELO will not be affected by incomplete sessions.</p>
              <button onClick={handleFinish} className="w-full py-2.5 rounded-lg bg-rose-500/15 border border-rose-500/35 text-rose-400 font-bold text-xs hover:bg-rose-500/25 transition-colors">
                End Session
              </button>
              <button onClick={() => setShowAbortConfirm(false)} className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 font-semibold text-xs mt-2 hover:bg-white/10 transition-colors">
                Keep Going
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helpers
function DimCard({ label, subtitle, value, feedback, colorFrom, colorTo, badgeBg, badgeBorder, badgeColor }) {
  const pct = Math.max(4, Math.min(100, Math.round((value || 0) * 10)));
  return (
    <div className="bg-[#050507] border border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <div className="text-[13px] font-bold text-slate-200">{label}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{subtitle}</div>
        </div>
        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold tabular-nums" style={{ background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor }}>
          {value ? value.toFixed(1) : "—"}
        </span>
      </div>
      <div className="h-[5px] w-full bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${colorFrom}, ${colorTo})` }} />
      </div>
      {feedback && (
        <p className="text-[11px] text-slate-400 leading-relaxed mt-3 pt-3 border-t border-white/[0.05]">{feedback}</p>
      )}
    </div>
  );
}

function VoiceStat({ label, value, color }) {
  return (
    <div className="text-center px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07] min-w-[80px]">
      <div className="text-2xl font-extrabold font-mono tracking-tight tabular-nums" style={{ color }}>{value}</div>
      <div className="text-[9px] text-slate-500 font-mono mt-0.5 tracking-widest">{label.toUpperCase()}</div>
    </div>
  );
}

function NextActionCard({ icon: Icon, color, bg, border, title, body, cta, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-[#050507] border border-white/[0.08] hover:border-white/20 rounded-2xl p-5 transition-all hover:-translate-y-0.5"
    >
      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-3 border" style={{ background: bg, borderColor: border }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div className="text-[13.5px] font-bold text-slate-200 mb-1">{title}</div>
      <p className="text-xs text-slate-500 leading-relaxed mb-3">{body}</p>
      <span className="text-xs font-mono font-bold" style={{ color }}>{cta} →</span>
    </button>
  );
}