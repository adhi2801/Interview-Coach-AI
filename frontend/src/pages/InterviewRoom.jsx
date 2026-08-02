import { API_URL, WS_URL } from "../config";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import StudyPlan from "./StudyPlan";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { Mic, Square, AlertTriangle, Lightbulb, Activity, ShieldAlert, ChevronRight, Target, CheckCircle2, Lock, ArrowRight, ThumbsUp, ThumbsDown, Terminal, MessageSquare, RefreshCw, XCircle } from "lucide-react";

// --- ANIMATED NUMBER TICKER ---
function AnimatedNumber({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => v.toFixed(0));
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
  const [peer, setPeer] = useState(null);
  const [newElo, setNewElo] = useState(null);
  const [currentElo, setCurrentElo] = useState(sessionData?.elo || 1200);
  const [difficulty, setDifficulty] = useState(sessionData?.difficulty || 4);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("answering");
  const [questionNum, setQuestionNum] = useState(1);
  const TIME_LIMIT = 120;
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
  const wsRef = useRef(null);
  const debounceRef = useRef(null);
  const timerRef = useRef(null);
  const autoSubmittedRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);

  const isBehavioral = category?.toLowerCase().includes("behavioral") || category?.toLowerCase().includes("leadership");

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (phase === 'results' && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        goNextQuestion();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, newElo, nextQuestion]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const ws = new WebSocket(`${WS_URL}/ws/coaching/${sessionData?.session_id || 1}?token=${token}`);
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
    setTimeLeft(TIME_LIMIT);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [question]);

  useEffect(() => {
    autoSubmittedRef.current = false;
  }, [question]);

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
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }

  function stopRecording() {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  async function submitAnswer(isTimeExpired = false) {
    const finalAnswer = answer.trim() ? answer : "[No answer submitted before time expired]";
    if (!finalAnswer && !isTimeExpired) return;
    
    setLoading(true);
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
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (startRes.data.error) {
        setScoringError(startRes.data.error);
        setLoading(false);
        return;
      }
      await pollForResult(startRes.data.job_id);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  async function pollForResult(jobId) {
    const maxAttempts = 30;
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
    if (newElo) setCurrentElo(Math.round(newElo));
    if (nextQuestion) setQuestion(nextQuestion);
    if (nextCategory) setCategory(nextCategory);
    setScenario(nextScenario);
    setConstraints(nextConstraints);
    setAsk(nextAsk);
    setAnswer("");
    setScores(null);
    setGaps([]);
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
  const isPass = scaledScore >= 70;
  const verdictLabel = isPass ? "Strong Pass" : "Needs Revision";
  const eloDelta = newElo ? Math.round(newElo - currentElo) : 0;

  // DETECT PROFANITY / POLICY VIOLATION FROM BACKEND EVALUATION
  const hasProfanityFlag = scores?.overall_summary?.toLowerCase().includes("inappropriate language") || 
                          scores?.overall_summary?.toLowerCase().includes("unprofessional language") ||
                          scores?.score_technical === 0;

  return (
    <div className="h-screen w-full bg-[#000000] text-slate-100 font-sans flex flex-col overflow-hidden selection:bg-blue-500/30 relative">
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Pure Black Background */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#000000]" />

      {/* TOP HUD HEADER */}
      <header className="h-14 border-b border-white/[0.08] bg-[#000000] flex items-center justify-between px-6 z-50 flex-shrink-0 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center font-bold text-black text-xs">IC</div>
            <span className="text-white text-xs font-bold tracking-tight hidden sm:block">InterviewCoach</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-bold uppercase tracking-widest bg-white/5 border border-white/10 px-2.5 py-1 rounded flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              {company?.name || "Target"}
            </span>
            <span className="text-slate-300 text-xs font-bold uppercase tracking-widest hidden md:inline">
              &middot; {sessionData?.role || "SWE L4"}
            </span>
            <span className="text-slate-200 text-xs font-bold uppercase tracking-widest bg-white/10 border border-white/10 px-2.5 py-1 rounded ml-1">
              {persona} persona
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {phase === "answering" ? (
            <>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300 hidden sm:block">Time Remaining</span>
                <span className={`text-base font-bold tabular-nums font-mono ${timeLeft <= 20 ? "text-rose-400" : "text-white"}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Node</span>
                <span className="text-sm font-mono font-bold text-white">{questionNum}/5</span>
              </div>
              <div className="w-px h-4 bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-2 hidden sm:flex">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">ELO</span>
                <span className="text-sm font-mono font-bold text-slate-100">{Math.round(currentElo)}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <button onClick={onFinish} className="text-xs font-mono font-bold text-slate-300 hover:text-white uppercase tracking-widest border border-white/10 px-3 py-1 rounded bg-white/5 transition-colors">
                Abort
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Node Logged</span>
              </div>
              <button onClick={onFinish} className="text-slate-200 bg-white/[0.04] border border-white/10 px-4 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5">
                End Session <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* MAIN WORKSPACE SHELL */}
      <main className="flex-1 w-full flex flex-col overflow-hidden relative z-10 bg-[#000000]">
        
        {phase === "answering" ? (
          /* ====================================================================
             ACT 1: THE INTERROGATION CHAMBER (Concept A 3-Pane Split)
             ==================================================================== */
          <div className="w-full h-full flex flex-col md:flex-row transition-opacity duration-500" style={{ opacity: mounted ? 1 : 0 }}>
            
            {/* LEFT PANE: PROMPT INSPECTOR (Upgraded Typography & Contrast) */}
            <div className="w-full md:w-[32%] h-[38vh] md:h-full overflow-y-auto border-b md:border-b-0 md:border-r border-white/[0.08] bg-[#020204] p-6 lg:p-8 flex flex-col">
              <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3.5 mb-6">
                <Terminal size={16} className="text-blue-400 shrink-0" />
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
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ask && (
                    <div className="mt-auto pt-5 border-t border-white/10">
                      <h4 className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-2">The Ask</h4>
                      <p className="text-sm md:text-[15px] font-bold text-white leading-[1.7]">{ask}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm md:text-[15px] text-slate-200 leading-[1.7] font-medium">{question}</p>
              )}
            </div>

            {/* CENTER PANE: ZEN WRITING CANVAS (Clean OLED Black + Upgraded Textarea) */}
            <div className="w-full md:w-[48%] h-[62vh] md:h-full relative bg-[#000000] flex flex-col border-r border-white/[0.08]">
              
              {/* Persona Header Banner */}
              <div className="h-12 border-b border-white/[0.05] bg-black/60 flex items-center px-6 gap-3 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-bold text-white tracking-wide capitalize">{persona} Evaluator</span>
                <span className="text-xs font-mono text-slate-400 italic ml-2">"I'm listening. Walk me through it."</span>
              </div>

              {/* Text Area (Font size boosted to 16px/17px) */}
              <div className="flex-1 relative w-full h-full bg-[#000000]">
                {!answer && (
                  <div className="absolute top-8 left-8 pointer-events-none select-none">
                    <pre className="text-slate-500 text-sm md:text-base font-mono font-medium leading-[1.8] m-0">
                      {isBehavioral ? (
                        <>// 1. Situation & Ownership...<br/><br/>// 2. Key Actions & Stakeholder Alignment...<br/><br/>// 3. Root Cause Analysis...</>
                      ) : (
                        <>// 1. Clarification & Edge Cases...<br/><br/>// 2. Core Architectural Approach...<br/><br/>// 3. Trade-offs & Limits...</>
                      )}
                    </pre>
                  </div>
                )}
                <textarea
                  value={answer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  disabled={timeLeft === 0}
                  spellCheck="false"
                  className="w-full h-full bg-transparent text-slate-100 text-base font-mono leading-[1.8] p-8 pb-32 resize-none outline-none z-10 relative scrollbar-hide"
                />
              </div>

              {/* Action Dock Attached Inside Center Pane */}
              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between z-20 bg-[#08080C] border border-white/10 p-3 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
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
                    Hint <span className="opacity-50">-15 ELO</span>
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 hidden xl:block">{answer.length} chars</span>
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
                      <>Submit Answer <kbd className="font-mono text-[10px] bg-black/10 px-1.5 py-0.5 rounded ml-1 opacity-60">↵</kbd></>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT PANE: SESSION TELEMETRY (Upgraded Micro-Labels to 11px Slate-300) */}
            <div className="w-full md:w-[20%] min-w-[240px] bg-[#020204] p-6 flex flex-col hidden lg:flex">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5 mb-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">Session Telemetry</h3>
                <Activity size={16} className="text-emerald-400" />
              </div>

              <div className="space-y-6 flex-1">
                {/* Confidence Widget */}
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Confidence</span>
                    <span className="text-sm font-bold text-white tabular-nums">{liveCoaching?.confidence_score || '--'}/10</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-emerald-400" animate={{ width: `${(liveCoaching?.confidence_score || 0) * 10}%` }} transition={{ type: "spring", stiffness: 100 }} />
                  </div>
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
                </div>

                {/* Fillers Detected */}
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Fillers Detected</span>
                    <span className={`text-sm font-bold tabular-nums ${(liveCoaching?.fillers_found || 0) > 3 ? 'text-amber-400' : 'text-white'}`}>{liveCoaching?.fillers_found || 0}</span>
                  </div>
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

              {/* Bottom Target ELO */}
              <div className="mt-auto pt-5 border-t border-white/[0.08]">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Target Level</span>
                  <span className="text-sm font-mono font-bold text-white">L{difficulty}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Threshold ELO</span>
                  <span className="text-sm font-mono font-bold text-slate-200">{(difficulty * 100) + 800}</span>
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* ====================================================================
             ACT 2: CONCEPT A DEBRIEF DECK (Exact 65/35 Asymmetrical Match)
             ==================================================================== */
          <div className="w-full flex-1 flex flex-col relative overflow-hidden bg-[#000000]">
            <div className="flex-1 w-full h-full overflow-y-auto scrollbar-hide">
              <div className="max-w-[1500px] mx-auto w-full px-6 py-8 flex flex-col gap-6">
                
                {/* TOP HEADER BREADCRUMB */}
                <div className="flex justify-between items-center border-b border-white/[0.08] pb-3.5 text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{company?.name || "Target"}</span> &gt; <span>{sessionData?.role || "SWE L4"}</span> &gt; <span className="text-blue-400">Node {questionNum} Debrief</span>
                  </div>
                  <span>Node {questionNum} of 5</span>
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

                {/* 2-COLUMN ASYMMETRICAL GRID (65% Left / 35% Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start pb-20">
                  
                  {/* LEFT COLUMN (65% Width) */}
                  <div className="space-y-6">
                    
                    {/* VERDICT DECK */}
                    <div className="bg-[#050507] border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest border ${hasProfanityFlag ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : isPass ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                            {hasProfanityFlag ? "Disqualifying Conduct" : verdictLabel}
                          </span>
                          {newElo && (
                            <span className="text-xs font-mono font-bold text-white bg-white/5 border border-white/10 px-3 py-1 rounded flex items-center gap-1.5">
                              ELO {Math.round(currentElo)} ➔ {Math.round(newElo)} 
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${eloDelta >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {eloDelta >= 0 ? `+${eloDelta}` : eloDelta}
                              </span>
                            </span>
                          )}
                          {peer && peer.percentile != null && !hasProfanityFlag && (
                            <span className="text-xs font-mono text-slate-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded">
                              Top {Math.max(1, 100 - peer.percentile)}% Globally
                            </span>
                          )}
                        </div>

                        {/* Score Number */}
                        <div className="text-right shrink-0">
                          <span className={`text-4xl font-extrabold font-mono tabular-nums ${hasProfanityFlag ? 'text-rose-400' : isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                            <AnimatedNumber value={scaledScore} />
                          </span>
                          <span className="text-xs text-slate-500 font-bold ml-0.5">/100</span>
                        </div>
                      </div>

                      {/* Evaluator Commentary Quote */}
                      <div className="bg-black/50 border border-white/5 p-4 rounded-xl">
                        <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium italic">
                          "{scores?.overall_summary || "Diagnostic review complete for this interview node."}"
                        </p>
                      </div>
                    </div>

                    {/* WHAT YOU COVERED WELL (Hidden if profanity detected) */}
                    {!hasProfanityFlag && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300">What You Covered Well</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <CoverageCard title="Blast Radius Triage" text="Correctly identified hard-blocked vs. inconvenienced teams before communicating." />
                          <CoverageCard title="Stakeholder Sequencing" text="Proposed war room before broad comms — correct prioritization under time pressure." />
                        </div>
                      </div>
                    )}

                    {/* CRITICAL GAP */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-rose-400">Critical Gap — Fix This Next Time</h4>
                      {hasProfanityFlag ? (
                        <div className="bg-[#08080E] border border-rose-500/30 rounded-2xl p-5 space-y-2">
                          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                            <XCircle size={16} /> Unprofessional Communication Boundary
                          </div>
                          <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium">
                            Responses containing vulgarity or casual dismissals automatically disqualify senior engineering candidates. Focus on structured, objective problem-solving language.
                          </p>
                        </div>
                      ) : gaps?.length > 0 ? (
                        <div className="bg-[#08080E] border border-rose-500/20 rounded-2xl p-5 space-y-3">
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
                      ) : (
                        <div className="bg-[#050507] border border-white/[0.08] rounded-2xl p-5 text-xs text-slate-300">
                          No critical knowledge gaps detected for this response.
                        </div>
                      )}
                    </div>

                    {/* ANNOTATED ANSWER TRANSCRIPT */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300">Your Answer — Annotated</h4>
                      <div className="bg-[#030305] border border-white/[0.08] p-5 rounded-2xl space-y-3">
                        <p className="text-xs md:text-sm font-mono text-slate-200 leading-[1.8] whitespace-pre-wrap">
                          {answer || "[No response recorded]"}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                          {hasProfanityFlag ? (
                            <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded text-xs font-mono font-bold">
                              ❌ Disqualifying Language
                            </span>
                          ) : (
                            <>
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded text-xs font-mono">✓ Correct sequencing</span>
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded text-xs font-mono">✓ Impact triage</span>
                              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded text-xs font-mono">⚠️ Gap: rejected alternatives</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT RAIL (35% Width) */}
                  <div className="space-y-6">
                    
                    {/* 5D SCORE BREAKDOWN */}
                    <div className="bg-[#050507] border border-white/[0.08] rounded-2xl p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4">5D Score Breakdown</h4>
                      <ConceptAScoreRow label="Situation Clarity" value={scores?.score_technical ? Math.round(scores.score_technical * 10) : 10} />
                      <ConceptAScoreRow label="Decision Quality" value={scores?.score_problem_solving ? Math.round(scores.score_problem_solving * 10) : 10} />
                      <ConceptAScoreRow label="Trade-off Reasoning" value={scores?.score_communication ? Math.round(scores.score_communication * 10) : 10} />
                      <ConceptAScoreRow label="Stakeholder Framing" value={scores?.score_cultural_fit ? Math.round(scores.score_cultural_fit * 10) : 15} />
                      <ConceptAScoreRow label="Cultural Signal" value={scores?.score_confidence ? Math.round(scores.score_confidence * 10) : 20} />
                    </div>

                    {/* NEXT ACTION DECK */}
                    <div className="bg-[#050507] border border-white/[0.08] rounded-2xl p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-2">Next Action</h4>
                      <button 
                        onClick={goNextQuestion}
                        className="w-full bg-white text-black py-3 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.15)] outline-none"
                      >
                        Continue &middot; Node {questionNum + 1} of 5 <kbd className="font-mono text-[9px] bg-black/10 px-1 py-0.5 rounded text-black/70">↵</kbd>
                      </button>

                      <button 
                        onClick={goNextQuestion}
                        className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between px-4 outline-none"
                      >
                        <span>Drill Trade-off Reasoning</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">+34 ELO potential</span>
                      </button>

                      <button 
                        onClick={() => { setPhase("answering"); setAnswer(""); }}
                        className="w-full text-slate-400 hover:text-slate-200 py-2 text-xs font-mono transition-colors flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw size={12} /> Retry Node {questionNum}
                      </button>
                    </div>

                    {/* PEER BENCHMARK */}
                    <div className="bg-[#050507] border border-white/[0.08] rounded-2xl p-5 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-1">Peer Benchmark</h4>
                      <div className="flex justify-between items-center text-xs text-slate-200 font-bold mb-1">
                        <span>Average Node Score</span>
                        <span className="font-mono">71</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-[71%]" />
                      </div>
                      <span className="text-xs font-mono text-slate-400 block pt-1">
                        {hasProfanityFlag ? "Score: 11/100 · Below Node Benchmark" : `You scored ${scaledScore} — top ${Math.max(1, 100 - (peer?.percentile || 50))}% on this scenario`}
                      </span>
                    </div>

                  </div>

                </div>
              </div>
            </div>

            {/* Overlay Modals */}
            {studyPlanTopic && (
              <StudyPlan topicName={studyPlanTopic} company={company?.name?.toLowerCase()} onClose={() => setStudyPlanTopic(null)} />
            )}

          </div>
        )}
      </main>
    </div>
  );
}

// Helpers
function ConceptAScoreRow({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs font-medium">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono font-bold text-white tabular-nums">{value} / 100</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, Math.max(5, value))}%` }} />
      </div>
    </div>
  );
}

function CoverageCard({ title, text }) {
  return (
    <div className="bg-[#050507] border border-white/[0.08] p-4 rounded-xl space-y-1">
      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
        <CheckCircle2 size={14} /> {title}
      </div>
      <p className="text-xs text-slate-300 leading-relaxed">{text}</p>
    </div>
  );
}