import { API_URL, WS_URL } from "../config";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import StudyPlan from "./StudyPlan";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { Mic, Square, AlertTriangle, Lightbulb, Activity, Code2, ShieldAlert, ChevronRight, Target, CheckCircle2, Lock, ArrowRight, ThumbsUp, ThumbsDown, Terminal, MessageSquare } from "lucide-react";

function AnimatedNumber({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => v.toFixed(1));
  const [display, setDisplay] = useState("0.0");
  
  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on("change", setDisplay);
    return () => { controls.stop(); unsub(); };
  }, [value, count, rounded]);

  return <>{display}</>;
}

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
  const [peer, setPeer] = useState(null);
  const [newElo, setNewElo] = useState(null);
  const [currentElo, setCurrentElo] = useState(1200);
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

  const overall = scores ? ((scores.score_technical + scores.score_communication + scores.score_problem_solving + scores.score_cultural_fit + scores.score_confidence) / 5).toFixed(1) : null;
  const company = sessionData?.company_profile;
  const ovNum = parseFloat(overall || 0);
  const theme = ovNum >= 7.5 ? "emerald" : ovNum >= 5.0 ? "amber" : "rose";
  const themeHex = theme === "emerald" ? "#10b981" : theme === "amber" ? "#f59e0b" : "#f43f5e";
  const statusLabel = ovNum >= 7.5 ? "STRONG SIGNAL" : ovNum >= 5.0 ? "MODERATE" : "CRITICAL GAP";

  return (
    <div className="h-screen w-full bg-[#000000] text-slate-100 font-sans flex flex-col overflow-hidden selection:bg-blue-500/30">
      
      {/* 1. TOP HUD HEADER */}
      <header className="h-14 border-b border-white/[0.08] bg-[#000000]/90 backdrop-blur-2xl flex items-center justify-between px-6 z-50 flex-shrink-0 sticky top-0 shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center text-[10px] font-bold text-black shadow-sm">IC</div>
            <span className="text-slate-200 text-xs font-bold tracking-tight">InterviewCoach</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded text-white text-[10px] font-bold uppercase tracking-widest">
              {company?.name || "Interview"}
            </span>
            {sessionData?.role && (
              <span className="text-slate-400 text-xs font-semibold hidden sm:inline">&middot; {sessionData.role}</span>
            )}
            {persona && persona !== "standard" && (
              <span className="ml-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">
                {persona}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {phase === "answering" ? (
            <>
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${timeLeft <= 20 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
                <span className={`text-sm font-bold tabular-nums font-mono ${timeLeft <= 20 ? "text-rose-400" : "text-white"}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">ELO</span>
                <span className="text-white text-xs font-bold tabular-nums font-mono">{Math.round(currentElo)}</span>
              </div>
              <button onClick={onFinish} className="text-slate-400 hover:text-rose-400 text-[10px] font-bold uppercase tracking-widest transition-colors ml-2">
                Abort
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Session Complete</span>
              </div>
              <button onClick={onFinish} className="text-slate-300 bg-white/[0.04] border border-white/10 px-3.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5">
                Exit Report <ChevronRight size={14} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* 2. MAIN WORKSPACE SHELL */}
      <main className="flex-1 w-full flex flex-col overflow-hidden relative z-10">
        
        {phase === "answering" ? (
          /* ====================================================================
             ANSWERING CANVAS
             ==================================================================== */
          <div className="w-full h-full flex flex-col md:flex-row transition-opacity duration-500" style={{ opacity: mounted ? 1 : 0 }}>
            {/* LEFT PANE: Prompt View */}
            <div className="w-full md:w-[45%] md:h-full overflow-y-auto border-b md:border-b-0 md:border-r border-white/[0.08] bg-[#000000] px-6 md:px-12 py-10 md:py-16 flex flex-col pb-40">
              <div className="flex items-center gap-4 mb-10">
                <span className="bg-white/[0.03] border border-white/[0.08] px-3 py-1 rounded text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                  {category ? category.replace(/_/g, " ") : "Technical"}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Node {questionNum} &middot; Difficulty {difficulty}/10
                </span>
              </div>

              {scenario ? (
                <div className="flex-1 flex flex-col">
                  <div className="mb-10">
                    <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-4">Context</h3>
                    <p className="text-[15px] text-slate-200 leading-[1.7] font-medium">{scenario}</p>
                  </div>

                  {constraints?.length > 0 && (
                    <div className="mb-10">
                      <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-4">Constraints</h3>
                      <ul className="space-y-4">
                        {constraints.map((c, i) => (
                          <li key={i} className="text-[15px] text-slate-300 font-medium flex items-start gap-3 leading-[1.6]">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ask && (
                    <div className="mt-auto pt-8">
                      <div className="bg-blue-500/[0.04] border-l-2 border-blue-500/50 p-6 rounded-r-xl">
                        <h3 className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-2">The Ask</h3>
                        <p className="text-[15px] font-bold text-white leading-[1.7]">{ask}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[15px] text-slate-200 leading-[1.7] font-medium">{question}</p>
              )}
            </div>

            {/* RIGHT PANE: Writing Area */}
            <div className="w-full md:w-[55%] h-[70vh] md:h-full relative bg-[#000000] flex flex-col">
              
              <AnimatePresence>
                {liveCoaching && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-8 right-8 bg-black/80 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-full flex gap-5 z-30 shadow-2xl items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Confidence</span>
                      <span className="text-sm font-bold text-white tabular-nums tracking-tight">{liveCoaching.confidence_score}<span className="text-[10px] text-slate-500">/10</span></span>
                    </div>
                    <div className="w-px h-3 bg-white/20" />
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Pace</span>
                      <span className="text-sm font-bold text-white tabular-nums tracking-tight">{liveCoaching.words_per_minute} <span className="text-[10px] text-slate-500">WPM</span></span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 relative w-full h-full">
                {!answer && (
                  <div className="absolute top-12 left-12 pointer-events-none select-none">
                    <pre className="text-zinc-600 text-base font-sans font-medium leading-[1.8] m-0">
                      {isBehavioral ? (
                        <>// 1. Situation & Ownership...<br/>// 2. Key Actions & Stakeholder Alignment...<br/>// 3. Root Cause Analysis & Preventive Systems...</>
                      ) : (
                        <>// 1. Clarification & Edge Cases...<br/>// 2. Core Architectural Approach...<br/>// 3. Trade-offs & Systems Limits...</>
                      )}
                    </pre>
                  </div>
                )}
                <textarea value={answer} onChange={(e) => handleAnswerChange(e.target.value)} disabled={timeLeft === 0} spellCheck="false" className="w-full h-full bg-transparent text-slate-200 text-base font-medium leading-[1.8] p-12 pb-40 resize-none outline-none z-10 relative" />
              </div>

              {/* Answering Action Dock */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between w-[90%] max-w-2xl bg-white/[0.05] border border-white/10 backdrop-blur-2xl px-4 py-3 rounded-2xl shadow-2xl">
                <div className="flex items-center gap-4">
                  <button onClick={isRecording ? stopRecording : startRecording} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border outline-none ${isRecording ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/10'}`}>
                    {isRecording ? <Square fill="currentColor" size={12}/> : <Mic size={12}/>}
                    {isRecording ? 'Stop Voice' : 'Use Voice'}
                  </button>
                  <button onClick={() => {}} className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors outline-none">
                    Hint
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-mono text-slate-400 font-bold tabular-nums hidden sm:block">{answer.length} chars</span>
                  <button onClick={() => submitAnswer()} disabled={loading} className={`relative overflow-hidden px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 outline-none ${loading ? "bg-white/10 text-slate-500 cursor-wait" : "bg-white text-black hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.15)]"}`}>
                    {loading ? (
                      <><span className="w-3.5 h-3.5 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin inline-block" /> Scoring...</>
                    ) : (
                      <>Submit Answer <kbd className="font-mono text-[10px] bg-black/10 px-1.5 py-0.5 rounded ml-1 opacity-60">↵</kbd></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ====================================================================
             PHASE 2: RESULTS INSPECTOR (Symmetrical Equal-Height Row Layout)
             ==================================================================== */
          <div className="w-full flex-1 flex flex-col relative overflow-hidden bg-[#000000]">
            
            <div className="flex-1 w-full h-full overflow-y-auto scrollbar-hide">
              <div className="max-w-7xl mx-auto w-full px-6 lg:px-8 py-10 flex flex-col gap-8">
                
                {/* ROW 1: 100% WIDTH HERO VERDICT DECK */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-[#050507] border border-white/[0.08] rounded-3xl p-8 relative overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),_0_30px_60px_rgba(0,0,0,0.8)]">
                  <div className={`absolute top-0 right-0 w-80 h-80 bg-${theme}-500/10 blur-[100px] pointer-events-none rounded-full`} />
                  
                  <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    {/* Score Ring */}
                    <div className="w-32 h-32 rounded-full border-[3px] border-[#111116] flex flex-col items-center justify-center relative shadow-[0_0_30px_rgba(0,0,0,0.5)] shrink-0">
                      <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="64" cy="64" r="60" fill="none" stroke="#1a1a24" strokeWidth="4" />
                        <motion.circle cx="64" cy="64" r="60" fill="none" stroke={themeHex} strokeWidth="4" strokeDasharray="377" 
                          initial={{ strokeDashoffset: 377 }} animate={{ strokeDashoffset: 377 - (377 * (ovNum / 10)) }} transition={{ duration: 1.2, ease: "easeOut" }}
                        />
                      </svg>
                      <span className={`text-4xl font-extrabold tabular-nums font-mono text-${theme}-400 drop-shadow-[0_0_15px_currentColor]`}>
                        <AnimatedNumber value={ovNum} />
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">/ 10</span>
                    </div>

                    {/* Summary Headline & Meta Badges */}
                    <div className="flex-1 space-y-3 text-center md:text-left">
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full border uppercase tracking-widest bg-${theme}-500/10 text-${theme}-400 border-${theme}-500/20`}>
                          {statusLabel}
                        </span>
                        {peer && peer.percentile != null && (
                          <span className="text-[10px] font-mono font-bold text-slate-300 bg-white/[0.04] border border-white/10 px-3 py-1 rounded-full tabular-nums">
                            PEER PERCENTILE {peer.percentile}th vs {peer.total_attempts}
                          </span>
                        )}
                        {newElo && (
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full tabular-nums">
                            ELO IMPACT {Math.round(currentElo)} ➔ {Math.round(newElo)}
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl md:text-2xl font-bold text-white leading-[1.6] tracking-tight">
                        {scores.overall_summary || "Diagnostic review complete for this interview node."}
                      </h2>
                    </div>
                  </div>
                </motion.div>

                {/* ROW 2: PROMPT SPECIFICATION & CANDIDATE SUBMITTED RESPONSE (50% / 50% EQUAL HEIGHT PAIR) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  
                  {/* Prompt Spec */}
                  <div className="bg-[#050507] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-3xl p-6 flex flex-col justify-between space-y-4">
                    <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
                      <Terminal size={16} className="text-blue-400" />
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Prompt Specification</h3>
                    </div>

                    {scenario && (
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Context</h4>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium line-clamp-4">{scenario}</p>
                      </div>
                    )}

                    {constraints?.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Constraints</h4>
                        <ul className="space-y-1">
                          {constraints.slice(0, 3).map((c, idx) => (
                            <li key={idx} className="text-xs text-slate-400 font-medium flex items-start gap-2 leading-tight">
                              <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />{c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {ask && (
                      <div className="bg-blue-500/[0.04] border-l-2 border-blue-500/50 p-3 rounded-r-xl">
                        <h4 className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-1">The Ask</h4>
                        <p className="text-xs font-bold text-white leading-snug line-clamp-2">{ask}</p>
                      </div>
                    )}
                  </div>

                  {/* Candidate Submitted Response (Bounded Scroll Box prevents infinite elongation) */}
                  <div className="bg-[#050507] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-3xl p-6 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <div className="flex items-center gap-3">
                        <MessageSquare size={16} className="text-indigo-400" />
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Candidate Submitted Response</h3>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">{answer.length} chars</span>
                    </div>

                    <div className="bg-[#020203] border border-white/[0.05] p-4 rounded-2xl max-h-[220px] overflow-y-auto scrollbar-hide shadow-inner flex-1">
                      <p className="text-xs font-mono text-slate-200 leading-[1.8] whitespace-pre-wrap">{answer || "[No response recorded]"}</p>
                    </div>
                  </div>

                </div>

                {/* ROW 3: EVALUATION BREAKDOWN & SKILL MORPHOLOGY RADAR (50% / 50% EQUAL HEIGHT PAIR) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  
                  {/* Left: 5D Progress Bars */}
                  <div className="bg-[#050507] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-3xl p-6 flex flex-col justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Evaluation Breakdown</h3>
                    <div className="flex flex-col gap-2">
                      <ExpandableScoreRow label="Technical Accuracy" value={scores.score_technical} feedback={scores.technical_feedback} />
                      <ExpandableScoreRow label="Communication & Clarity" value={scores.score_communication} feedback={scores.communication_feedback} />
                      <ExpandableScoreRow label="Problem Solving" value={scores.score_problem_solving} feedback={scores.problem_solving_feedback} />
                      <ExpandableScoreRow label="Cultural Fit" value={scores.score_cultural_fit} feedback={null} />
                      <ExpandableScoreRow label="Confidence Telemetry" value={scores.score_confidence} feedback={null} />
                    </div>
                  </div>

                  {/* Right: Skill Morphology Radar (Exact height match with 5D bars) */}
                  <div className="bg-[#050507] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-3xl p-6 flex flex-col items-center justify-between relative overflow-hidden h-[300px]">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 w-full text-left relative z-10">Skill Morphology</h3>
                    <div className="w-full h-full relative z-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={[
                          { dim: "Tech", value: scores.score_technical },
                          { dim: "Comm", value: scores.score_communication },
                          { dim: "Prob", value: scores.score_problem_solving },
                          { dim: "Cult", value: scores.score_cultural_fit },
                          { dim: "Conf", value: scores.score_confidence },
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

                {/* ROW 4: DIAGNOSED VULNERABILITIES & COMPANY PLAYBOOK (50% / 50% EQUAL HEIGHT PAIR) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  
                  {/* Knowledge Vulnerabilities */}
                  {gaps?.length > 0 ? (
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <Target size={16} className="text-rose-500" />
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Diagnosed Vulnerabilities</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {gaps.map((gap, i) => (
                          <KnowledgeGapCard key={i} gap={gap} onClick={() => setStudyPlanTopic(gap.gap)} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#050507] border border-white/[0.08] rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                      <CheckCircle2 size={24} className="text-emerald-400 mb-2" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-widest">No Critical Gaps Detected</h4>
                      <p className="text-xs text-slate-500 mt-1">Your response satisfied all core requirements for this node.</p>
                    </div>
                  )}

                  {/* Company Playbook */}
                  {(company?.green_flags?.length > 0 || company?.red_flags?.length > 0) && (
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <Code2 size={16} className="text-amber-500" />
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">{company?.name} Playbook</h3>
                      </div>
                      <div className="bg-[#050507] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-3xl p-3 space-y-2">
                        {company?.green_flags?.length > 0 && (
                          <InteractiveAccordion title="DO THIS" color="emerald" items={company.green_flags} defaultOpen={true} />
                        )}
                        {company?.red_flags?.length > 0 && (
                          <InteractiveAccordion title="AVOID THIS" color="rose" items={company.red_flags} defaultOpen={false} />
                        )}
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </div>

            {/* PINNED CONTAINER ACTION FOOTER (Zero Dock Collisions) */}
            <div className="h-16 shrink-0 bg-[#0A0A0E] border-t border-white/10 px-6 flex items-center justify-between z-50">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Feedback</span>
                <button onClick={() => rateFeedback(true)} className={`p-2 rounded-xl transition-colors outline-none ${feedbackRating === true ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:bg-white/10 hover:text-white"}`}>
                  <ThumbsUp size={16} />
                </button>
                <button onClick={() => rateFeedback(false)} className={`p-2 rounded-xl transition-colors outline-none ${feedbackRating === false ? "bg-rose-500/20 text-rose-400" : "text-slate-400 hover:bg-white/10 hover:text-white"}`}>
                  <ThumbsDown size={16} />
                </button>
              </div>

              <button onClick={goNextQuestion} className="relative overflow-hidden px-6 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-slate-200 transition-all flex items-center gap-2 outline-none">
                Next Question <kbd className="font-mono text-[10px] bg-black/10 px-1.5 py-0.5 rounded opacity-60">⌘↵</kbd>
              </button>
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

function InteractiveAccordion({ title, color, items, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const isEmerald = color === "emerald";
  const titleColor = isEmerald ? "text-emerald-400" : "text-rose-400";
  const dotColor = isEmerald ? "bg-emerald-400" : "bg-rose-400";

  return (
    <div className="mb-1">
      <button onClick={() => setOpen(!open)} className="w-full px-3 py-2 flex items-center justify-between rounded-xl transition-colors hover:bg-white/[0.02] outline-none">
        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${titleColor}`}>{title}</span>
        <ChevronRight size={12} className={`text-slate-500 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-3 pb-2">
            <div className="flex flex-col gap-1.5 pt-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 bg-black/40 border border-white/[0.03] p-2.5 rounded-lg">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${dotColor}`} />
                  <span className="text-xs text-slate-300 font-medium leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}