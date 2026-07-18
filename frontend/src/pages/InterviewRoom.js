import { API_URL, WS_URL } from "../config";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import StudyPlan from "./StudyPlan";
import GlassCard from "../components/ui/GlassCard";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, AlertTriangle, Lightbulb, Activity, Code2, ShieldAlert } from "lucide-react";

export default function InterviewRoom({ sessionData, onFinish, onEloUpdate }) {
  // All original state variables perfectly preserved
  const [question, setQuestion] = useState(sessionData?.question || "");
  const [category, setCategory] = useState(sessionData?.category || "");
  const [scenario, setScenario] = useState(sessionData?.scenario || "");
  const [constraints, setConstraints] = useState(sessionData?.constraints || []);
  const [ask, setAsk] = useState(sessionData?.ask || "");
  // FIXED: persona now comes from the session-start response (main.py echoes it
  // back) and is stored for the lifetime of this interview, so every follow-up
  // question keeps the same interviewer persona instead of silently resetting
  // to "standard" the moment the first /answer/submit call fires.
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

  // Original lifecycle and effect hooks preserved
  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const ws = new WebSocket(`${WS_URL}/ws/coaching/${sessionData?.session_id || 1}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      console.log("Coaching WebSocket connected");
    };

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
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [question]);

  useEffect(() => {
    autoSubmittedRef.current = false;
  }, [question]);

  useEffect(() => {
    if (timeLeft === 0 && !autoSubmittedRef.current && !loading) {
      autoSubmittedRef.current = true;
      submitAnswer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  function formatTime(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function getTimerColor() {
    if (timeLeft <= 20) return "text-red-400";
    if (timeLeft <= 50) return "text-amber-400";
    return "text-white";
  }

  function getHint() {
    const hints = [
      "Start with the Situation: briefly set the scene before diving into details.",
      "Structure first: state your approach in one sentence before implementation.",
      "Don't forget edge cases — empty input, duplicates, very large inputs.",
      "State the time and space complexity once you have a working approach.",
      "If it's behavioral, use STAR: Situation, Task, Action, Result — with a measurable outcome.",
      "Think out loud. Interviewers want to hear your reasoning, not just the answer.",
    ];
    setHintText(hints[Math.floor(Math.random() * hints.length)]);
    setShowHint(true);
    setTimeout(() => setShowHint(false), 6000);
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

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        const completeBlob = new Blob(chunks, { type: mimeType });
        console.log("Recording finished, total size:", completeBlob.size, "bytes");

        if (completeBlob.size > 2000 && wsRef.current?.readyState === WebSocket.OPEN) {
          completeBlob.arrayBuffer().then((buffer) => {
            wsRef.current.send(buffer);
          });
        } else {
          console.warn("Recording too short or empty — nothing sent");
        }

        stream.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied or unavailable:", err);
      alert("Microphone access is needed for voice input. You can still type your answer.");
    }
  }

  function stopRecording() {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) return;
    setLoading(true);
    clearInterval(timerRef.current);
    try {
      const token = localStorage.getItem("access_token");
      const startRes = await axios.post(
        `${API_URL}/answer/submit`,
        {
          session_id: sessionData.session_id,
          question,
          answer,
          difficulty,
          elo: currentElo,
          company: sessionData?.company_profile?.name?.toLowerCase(),
          category,
          persona,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const jobId = startRes.data.job_id;
      await pollForResult(jobId);
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
          if (res.data.new_elo) {
            onEloUpdate?.(res.data.new_elo);
          }

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
          console.error("Scoring job failed");
          setLoading(false);
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          console.error("Scoring timed out");
          setLoading(false);
          setScoringError("Scoring is taking longer than expected. This usually means the AI service is slow right now — try submitting again.");
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
        setScoringError("Something went wrong while scoring your answer. Please try again.");
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
    } catch (err) {
      console.error(err);
    }
  }

  function goNextQuestion() {
    if (newElo) setCurrentElo(newElo);
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
    const newDiff = Math.min(10, Math.max(1, Math.round((currentElo - 800) / 100)));
    setDifficulty(newDiff);
  }

  const overall = scores
    ? ((scores.score_technical + scores.score_communication +
        scores.score_problem_solving + scores.score_cultural_fit +
        scores.score_confidence) / 5).toFixed(1)
    : null;

  const overallColor = overall >= 7 ? "border-emerald-400 shadow-[0_0_30px_rgba(74,222,128,0.25)]"
    : overall >= 5 ? "border-amber-400 shadow-[0_0_30px_rgba(250,204,21,0.25)]"
    : "border-red-400 shadow-[0_0_30px_rgba(248,113,113,0.25)]";

  const company = sessionData?.company_profile;
  const diffColor = difficulty <= 3 ? "bg-emerald-400" : difficulty <= 6 ? "bg-amber-400" : "bg-red-400";

  // Ambient Color Shifting mapping
  const confidenceScore = liveCoaching?.confidence_score ?? 10;
  const cloudColor = confidenceScore >= 7.5 ? 'rgba(16,185,129,0.06)' : 
                     confidenceScore >= 4.5 ? 'rgba(245,158,11,0.04)' : 'rgba(239,68,68,0.04)';

  return (
    <div className="h-screen w-full bg-[#000000] text-slate-100 font-sans flex flex-col overflow-hidden selection:bg-blue-500/30">
      
      {/* Inline Shimmer Keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* Dynamic Ambient Light Base */}
      {phase === "answering" && (
        <div 
          className="fixed inset-0 z-0 pointer-events-none transition-colors duration-1000 ease-out mix-blend-screen"
          style={{ background: `radial-gradient(circle at 75% 50%, ${cloudColor} 0%, transparent 60%)` }}
        />
      )}

      {/* 1. The Isolated HUD Header */}
      <header className="h-14 border-b border-white/[0.06] bg-[#000000]/80 backdrop-blur-md flex items-center justify-between px-8 z-50 flex-shrink-0 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center text-[10px] font-bold text-black">IC</div>
            <span className="text-zinc-400 text-[13px] font-semibold tracking-tight">InterviewCoach</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-white text-[11px] font-bold uppercase tracking-widest">
              {company?.name || "Interview"}
            </span>
            <span className="text-zinc-600 text-xs font-medium">&middot; {sessionData?.role || ""}</span>
            {persona && persona !== "standard" && (
              <span className="ml-2 bg-white/[0.04] border border-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">
                {persona}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${timeLeft <= 20 ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
            <span className={`text-[15px] font-bold tabular-nums font-mono ${getTimerColor()}`}>
              {formatTime(timeLeft)}
            </span>
            {timeLeft === 0 && (
              <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ml-2">
                Time Expired
              </span>
            )}
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">ELO</span>
            <span className="text-white text-[13px] font-bold tabular-nums font-mono">{currentElo}</span>
          </div>
          <button
            className="text-slate-500 hover:text-red-400 text-[11px] font-bold uppercase tracking-widest transition-colors ml-4"
            onClick={onFinish}
          >
            Abort
          </button>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <main className="flex-1 w-full flex overflow-hidden relative z-10">
        
        {phase === "answering" ? (
          /* ====================================================================
             PHASE 1: ZEN 50/50 SPLIT-PANE
             ==================================================================== */
          <div className="w-full h-full flex transition-opacity duration-500" style={{ opacity: mounted ? 1 : 0 }}>
            
            {/* LEFT PANE: The Editorial Case Study */}
            <div className="w-[45%] h-full overflow-y-auto border-r border-white/[0.06] bg-[#000000] px-12 py-16 flex flex-col">
              
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
                    <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-4">Context</h3>
                    <p className="text-base text-slate-200 leading-[1.7] font-medium">
                      {scenario}
                    </p>
                  </div>

                  {constraints?.length > 0 && (
                    <div className="mb-10">
                      <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-4">Constraints</h3>
                      <ul className="space-y-4">
                        {constraints.map((c, i) => (
                          <li key={i} className="text-[15px] text-slate-400 font-medium flex items-start gap-3 leading-[1.6]">
                            <span className="w-1 h-1 rounded-full bg-blue-500 mt-2.5 flex-shrink-0" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ask && (
                    <div className="mt-auto pt-8">
                      <div className="bg-blue-500/[0.04] border-l-2 border-blue-500/50 p-6 rounded-r-xl">
                        <h3 className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-2">The Ask</h3>
                        <p className="text-base font-bold text-white leading-[1.7]">{ask}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-base text-slate-200 leading-[1.7] font-medium">{question}</p>
              )}
            </div>

            {/* RIGHT PANE: The Zen Writing Canvas */}
            <div className="w-[55%] h-full relative bg-[#000000] flex flex-col">
              
              {/* Invisible Telemetry HUD: Floating Pill */}
              <AnimatePresence>
                {liveCoaching && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="absolute top-8 right-8 bg-black/80 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-full flex gap-5 z-30 shadow-2xl items-center"
                  >
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

              {/* Invisible Telemetry HUD: Intervention Toast */}
              <AnimatePresence>
                {intervention && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="absolute bottom-28 right-8 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl max-w-[300px] z-30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),_0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertTriangle size={14} className="text-amber-500" />
                      <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Coach Intervention</span>
                    </div>
                    <p className="text-xs font-medium text-amber-200/90 leading-relaxed">{intervention}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Invisible Telemetry HUD: Hint Toast */}
              <AnimatePresence>
                {showHint && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-28 left-8 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl max-w-sm z-30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),_0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-start gap-3"
                  >
                    <Lightbulb size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-blue-100 leading-relaxed flex-1">{hintText}</p>
                    <button className="text-slate-500 hover:text-white transition-colors" onClick={() => setShowHint(false)}>×</button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* The Input Canvas */}
              <div className="flex-1 relative w-full h-full">
                {!answer && (
                  <div className="absolute top-12 left-12 pointer-events-none select-none">
                    <pre className="text-zinc-600 text-base font-sans font-medium leading-[1.8] m-0">
                      // 1. Clarification & Edge Cases...<br/>
                      // 2. Core Architectural Approach...<br/>
                      // 3. Trade-offs & Systems Limits...
                    </pre>
                  </div>
                )}
                <textarea
                  value={answer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  disabled={timeLeft === 0}
                  spellCheck="false"
                  className="w-full h-full bg-transparent text-slate-200 text-base font-medium leading-[1.8] p-12 resize-none outline-none z-10 relative"
                />
              </div>

              {/* Action Footer */}
              <div className="absolute bottom-8 left-12 right-12 flex justify-between items-center z-20">
                <div className="flex items-center gap-6">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                      isRecording 
                        ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                        : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {isRecording ? <Square fill="currentColor" size={12}/> : <Mic size={12}/>}
                    {isRecording ? 'Stop Voice' : 'Use Voice'}
                  </button>
                  <button onClick={getHint} className="text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors">
                    Get Hint
                  </button>
                </div>
                
                <div className="flex items-center gap-6">
                  {scoringError && <span className="text-xs text-red-400 font-bold">{scoringError}</span>}
                  <span className="text-[11px] font-mono text-slate-600 font-bold tabular-nums hidden sm:block">{answer.length} chars</span>
                  
                  {/* Shimmer-locked submission */}
                  <button
                    onClick={submitAnswer}
                    disabled={loading}
                    className={`relative overflow-hidden px-6 py-3 rounded-lg text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 ${
                      loading ? "bg-white/10 text-slate-500 cursor-wait" : "bg-white text-black hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                    }`}
                  >
                    {loading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin inline-block" />
                        Scoring Answer...
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full animate-[shimmer_5s_infinite]" />
                        Submit Answer
                        <kbd className="font-mono text-[10px] bg-black/10 px-1.5 py-0.5 rounded ml-2">↵ Enter</kbd>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* ====================================================================
             PHASE 2: RESULTS (Executive Report)
             Preserving all your original charts and components
             ==================================================================== */
          <div className="w-full h-full overflow-y-auto bg-[#000000] p-8 lg:p-12 flex justify-center">
            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
              
              <div className="flex flex-col gap-6 transition-all duration-500">
                <GlassCard className="p-7">
                  <div className="flex gap-5 mb-7">
                    <div className="flex flex-col items-center gap-2.5">
                      <div className={`w-[88px] h-[88px] rounded-full border-2 bg-black flex flex-col items-center justify-center ${overallColor}`}>
                        <span className="text-[28px] font-extrabold tabular-nums font-mono">{overall}</span>
                        <span className="text-[11px] text-zinc-600">/ 10</span>
                      </div>
                      <span className="text-zinc-600 text-[11px] font-semibold uppercase tracking-wide">Overall Score</span>
                    </div>

                    {peer && (
                      <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-md p-4.5">
                        <div className="flex items-start gap-2.5 mb-3.5">
                          <span className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                            peer.tier === "excellent" ? "bg-emerald-400" :
                            peer.tier === "strong" ? "bg-blue-400" :
                            peer.tier === "good" ? "bg-amber-400" :
                            peer.tier === "weak" ? "bg-orange-400" : "bg-red-400"
                          }`} />
                          <div>
                            <p className="text-slate-100 text-[13px] font-semibold mb-1">{peer.context}</p>
                            <p className="text-zinc-600 text-xs">vs {peer.total_attempts} candidates</p>
                          </div>
                        </div>
                        <div className="h-[5px] bg-white/10 rounded-full overflow-hidden mb-2.5">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${peer.percentile >= 75 ? "bg-emerald-400" : peer.percentile >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                            style={{ width: `${peer.percentile}%` }}
                          />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 text-[11px] tabular-nums font-mono">{peer.percentile}th percentile</span>
                          <span className="text-zinc-600 text-[11px] tabular-nums font-mono">Avg: {peer.average_score}/10</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-6 mb-6">
                    <div className="flex-1">
                      <p className="text-zinc-600 text-[11px] font-bold uppercase tracking-wide mb-4">Score Breakdown</p>
                      {[
                        ["Technical", scores.score_technical, scores.technical_feedback],
                        ["Communication", scores.score_communication, scores.communication_feedback],
                        ["Problem Solving", scores.score_problem_solving, scores.problem_solving_feedback],
                        ["Cultural Fit", scores.score_cultural_fit, null],
                        ["Confidence", scores.score_confidence, null],
                      ].map(([label, val, fb]) => (
                        <ScoreRow key={label} label={label} value={val} feedback={fb} />
                      ))}
                    </div>

                    <div className="w-[280px] flex-shrink-0">
                      <p className="text-zinc-600 text-[11px] font-bold uppercase tracking-wide mb-4">Skill Radar</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <RadarChart data={[
                          { dim: "Technical", value: scores.score_technical },
                          { dim: "Comm.", value: scores.score_communication },
                          { dim: "Problem Solv.", value: scores.score_problem_solving },
                          { dim: "Culture", value: scores.score_cultural_fit },
                          { dim: "Confidence", value: scores.score_confidence },
                        ]}>
                          <PolarGrid stroke="#1e293b" />
                          <PolarAngleAxis dataKey="dim" tick={{ fill: "#64748b", fontSize: 11 }} />
                          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                          <Radar dataKey="value" stroke="#60a5fa" fill="#2563eb" fillOpacity={0.35} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {scoreHistory.length > 1 && (
                    <div className="bg-white/[0.02] border border-white/10 rounded-md p-4.5 mb-6">
                      <p className="text-zinc-600 text-[11px] font-bold uppercase tracking-wide mb-4">Progress This Session</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={scoreHistory}>
                          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                          <XAxis dataKey="question" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#1e293b" }} />
                          <YAxis domain={[0, 10]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#1e293b" }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", fontSize: "12px" }} />
                          <Line type="monotone" dataKey="overall" stroke="#60a5fa" strokeWidth={2} dot={{ fill: "#2563eb", r: 4 }} name="Overall" />
                          <Line type="monotone" dataKey="confidence" stroke="#4ade80" strokeWidth={2} dot={{ fill: "#4ade80", r: 4 }} name="Confidence" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {scores.overall_summary && (
                    <div className="bg-white/[0.02] border border-white/10 rounded-md p-4 mb-6">
                      <div className="flex justify-between items-center mb-2.5">
                        <p className="text-zinc-600 text-[11px] font-bold uppercase tracking-wide m-0">AI Feedback</p>
                        {feedbackRating === null ? (
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-600 text-[11px]">Helpful?</span>
                            <button className="bg-transparent text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded text-[11px] font-semibold" onClick={() => rateFeedback(true)}>Yes</button>
                            <button className="bg-transparent text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded text-[11px] font-semibold" onClick={() => rateFeedback(false)}>No</button>
                          </div>
                        ) : (
                          <span className="text-emerald-400 text-[11px] font-semibold">Thanks for the feedback</span>
                        )}
                      </div>
                      <p className="text-zinc-400 text-[13px] leading-relaxed">{scores.overall_summary}</p>
                    </div>
                  )}

                  {newElo && (
                    <div className="flex justify-between items-center bg-white/[0.02] border border-white/10 rounded-md px-4.5 py-3.5 mb-5">
                      <span className="text-zinc-600 text-xs font-semibold uppercase tracking-wide">ELO Rating</span>
                      <div className="flex items-center gap-2.5">
                        <span className="text-zinc-600 text-sm font-semibold tabular-nums font-mono">{currentElo}</span>
                        <span className="text-zinc-700">→</span>
                        <span className={`text-base font-bold tabular-nums font-mono ${newElo > currentElo ? "text-emerald-400" : "text-red-400"}`}>{newElo}</span>
                        <span className={`text-[13px] font-semibold tabular-nums font-mono ${newElo > currentElo ? "text-emerald-400" : "text-red-400"}`}>
                          {newElo > currentElo ? "+" : ""}{(newElo - currentElo).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )}

                  <button className="w-full py-3.5 bg-blue-600 text-white rounded-md text-sm font-bold hover:scale-[1.01] active:scale-[0.99] transition-transform" onClick={goNextQuestion}>
                    Next Question →
                  </button>
                </GlassCard>
              </div>

              {/* RIGHT: coaching / gaps / tips */}
              <div className="flex flex-col gap-4">
                {gaps?.length > 0 && (
                  <GlassCard className="p-5">
                    <p className="text-slate-100 text-[13px] font-bold mb-4">Knowledge Gaps</p>
                    {gaps.map((gap, i) => (
                      <div
                        key={i}
                        className="bg-[#0a0f1e] border border-slate-800 rounded-lg p-3 mb-2 cursor-pointer hover:border-slate-700 transition-colors"
                        onClick={() => setStudyPlanTopic(gap.gap)}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-slate-50 text-[13px] font-semibold">{gap.gap.replace(/_/g, " ")}</span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            gap.urgency === "critical" ? "bg-red-500/15 text-red-300" :
                            gap.urgency === "high" ? "bg-red-400/10 text-red-300" : "bg-yellow-400/10 text-yellow-200"
                          }`}>
                            {gap.urgency}
                          </span>
                        </div>
                        {gap.prerequisites_to_study_first?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {gap.prerequisites_to_study_first.map((p, j) => (
                              <span key={j} className="text-slate-600 text-[11px]">
                                {p}{j < gap.prerequisites_to_study_first.length - 1 ? " →" : ""}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="text-blue-400 text-[11px] font-semibold block mt-1.5">View full study path →</span>
                      </div>
                    ))}
                  </GlassCard>
                )}

                {studyPlanTopic && (
                  <StudyPlan
                    topicName={studyPlanTopic}
                    company={company?.name?.toLowerCase()}
                    onClose={() => setStudyPlanTopic(null)}
                  />
                )}

                <GlassCard className="p-5">
                  <p className="text-slate-100 text-[13px] font-bold mb-4">{company?.name} Interview Tips</p>
                  <div className="mb-3.5">
                    <p className="text-emerald-400 text-[11px] font-bold uppercase tracking-wide mb-2">Do this</p>
                    {company?.green_flags?.map((f) => (
                      <div key={f} className="flex items-start gap-2 mb-1.5">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                        <span className="text-slate-400 text-xs leading-snug">{f}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mb-3.5">
                    <p className="text-red-400 text-[11px] font-bold uppercase tracking-wide mb-2">Avoid this</p>
                    {company?.red_flags?.map((f) => (
                      <div key={f} className="flex items-start gap-2 mb-1.5">
                        <span className="w-1 h-1 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                        <span className="text-slate-400 text-xs leading-snug">{f}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {company?.values?.map((v) => (
                      <span key={v} className="bg-blue-600/[0.08] text-blue-500 border border-blue-600/15 px-2.5 py-1 rounded-md text-[11px] font-semibold">{v}</span>
                    ))}
                  </div>
                </GlassCard>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ScoreRow({ label, value, feedback }) {
  const color = value >= 7 ? "text-emerald-400" : value >= 5 ? "text-amber-400" : "text-red-400";
  const barColor = value >= 7 ? "bg-emerald-400" : value >= 5 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="mb-3.5">
      <div className="flex justify-between mb-1.5">
        <span className="text-zinc-400 text-[13px] font-medium">{label}</span>
        <span className={`text-[13px] font-bold tabular-nums ${color}`}>{value}/10</span>
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${value * 10}%` }} />
      </div>
      {feedback && <p className="text-zinc-600 text-xs mt-1.5 leading-relaxed">{feedback}</p>}
    </div>
  );
}