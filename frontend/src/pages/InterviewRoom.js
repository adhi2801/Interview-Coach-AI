import { API_URL, WS_URL } from "../config";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import StudyPlan from "./StudyPlan";
import GlassCard from "../components/ui/GlassCard";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { Mic, Square, AlertTriangle, Lightbulb, Activity, Code2, ShieldAlert, ChevronRight, Target, CheckCircle2, Lock, ArrowRight, ThumbsUp, ThumbsDown } from "lucide-react";

export default function InterviewRoom({ sessionData, onFinish, onEloUpdate }) {
  // All original state variables perfectly preserved
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

      if (startRes.data.error) {
        console.error("Answer submit blocked:", startRes.data.error);
        setScoringError(startRes.data.error);
        setLoading(false);
        return;
      }

      const jobId = startRes.data.job_id;
      if (!jobId) {
        console.error("No job_id in response:", startRes.data);
        setScoringError("Unexpected response from server. Please try again.");
        setLoading(false);
        return;
      }

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

  const company = sessionData?.company_profile;
  const confidenceScore = liveCoaching?.confidence_score ?? 10;
  const cloudColor = confidenceScore >= 7.5 ? 'rgba(16,185,129,0.06)' : 
                     confidenceScore >= 4.5 ? 'rgba(245,158,11,0.04)' : 'rgba(239,68,68,0.04)';

  // Theme calculation for Results Phase
  const ovNum = parseFloat(overall || 0);
  const theme = ovNum >= 7 ? "emerald" : ovNum >= 4 ? "amber" : "rose";
  const themeHex = theme === "emerald" ? "#10b981" : theme === "amber" ? "#f59e0b" : "#f43f5e";

  return (
    <div className="h-screen w-full bg-[#000000] text-slate-100 font-sans flex flex-col overflow-hidden selection:bg-blue-500/30">
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Dynamic Ambient Light Base (Answering Phase Only) */}
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
              <span className="ml-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">
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
             PHASE 1: ZEN 50/50 SPLIT-PANE (UNCHANGED)
             ==================================================================== */
          <div className="w-full h-full flex transition-opacity duration-500" style={{ opacity: mounted ? 1 : 0 }}>
            {/* LEFT PANE */}
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

            {/* RIGHT PANE */}
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
             PHASE 2: THE PREMIUM 3-ZONE DIAGNOSTIC COCKPIT
             (Apple/Linear/Vercel Aesthetic)
             ==================================================================== */
          <div className="w-full h-full overflow-y-auto bg-[#000000] relative pb-32 scrollbar-hide">
            
            {/* Volumetric Score Gradient */}
            <div 
              className={`absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] max-w-[1000px] h-[500px] opacity-20 blur-[150px] pointer-events-none transition-colors duration-1000 bg-${theme}-600`}
            />

            <div className="max-w-6xl mx-auto px-6 pt-12 flex flex-col gap-8 relative z-10">

              {/* ZONE 1: THE VERDICT HERO */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                className={`bg-[#08080A] border border-${theme}-500/30 rounded-3xl p-8 md:p-12 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),_0_30px_60px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center gap-12 relative overflow-hidden`}
              >
                {/* Background flourish inside the hero */}
                <div className={`absolute -right-20 -top-20 w-96 h-96 bg-${theme}-500/10 blur-[80px] pointer-events-none rounded-full`} />

                {/* Score Circular Ticker */}
                <div className="flex flex-col items-center justify-center shrink-0 relative z-10">
                  <div className={`w-40 h-40 rounded-full border-4 border-[#111] flex flex-col items-center justify-center relative shadow-[0_0_50px_rgba(0,0,0,0.5)]`}>
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="80" cy="80" r="76" fill="none" stroke="#222" strokeWidth="4" />
                      <motion.circle cx="80" cy="80" r="76" fill="none" stroke={themeHex} strokeWidth="4" strokeDasharray="477" 
                        initial={{ strokeDashoffset: 477 }} 
                        animate={{ strokeDashoffset: 477 - (477 * (ovNum / 10)) }} 
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                    </svg>
                    <span className={`text-6xl font-extrabold tabular-nums font-mono text-${theme}-400 drop-shadow-[0_0_20px_currentColor]`}>
                      <AnimatedNumber value={ovNum} />
                    </span>
                    <span className="text-zinc-600 text-sm font-bold tracking-widest uppercase mt-1">/ 10</span>
                  </div>
                </div>

                {/* Verdict Copy & Meta Pills */}
                <div className="flex-1 flex flex-col relative z-10">
                  <h2 className="text-2xl md:text-3xl font-bold text-white leading-[1.4] tracking-tight mb-6">
                    {scores.overall_summary || "Diagnostic analysis complete."}
                  </h2>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    {peer && (
                      <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 px-4 py-2 rounded-full">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Peer Percentile</span>
                        <span className="text-sm font-bold text-white font-mono">{peer.percentile}th</span>
                        <div className="w-px h-3 bg-white/20 mx-1" />
                        <span className="text-xs text-slate-400">vs {peer.total_attempts}</span>
                      </div>
                    )}
                    {newElo && (
                      <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 px-4 py-2 rounded-full">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ELO Impact</span>
                        <span className="text-sm font-bold text-slate-300 font-mono line-through">{currentElo}</span>
                        <ArrowRight size={12} className="text-slate-500" />
                        <span className={`text-sm font-bold font-mono ${newElo > currentElo ? "text-emerald-400" : "text-rose-400"}`}>{newElo}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* ZONE 2: DIAGNOSTIC MATRIX (65/35 Split) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                
                {/* COLUMN A: Kinetic Score Breakdown & Radar (65%) */}
                <div className="lg:col-span-7 flex flex-col gap-8">
                  
                  {/* Kinetic Expandable Score Rows */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
                    <div className="flex items-center gap-3 mb-4">
                      <Activity size={16} className="text-blue-500" />
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Evaluation Breakdown</h3>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <ExpandableScoreRow label="Technical Accuracy" value={scores.score_technical} feedback={scores.technical_feedback} />
                      <ExpandableScoreRow label="Communication & Clarity" value={scores.score_communication} feedback={scores.communication_feedback} />
                      <ExpandableScoreRow label="Problem Solving" value={scores.score_problem_solving} feedback={scores.problem_solving_feedback} />
                      <ExpandableScoreRow label="Cultural Fit" value={scores.score_cultural_fit} feedback={null} />
                      <ExpandableScoreRow label="Confidence Telemetry" value={scores.score_confidence} feedback={null} />
                    </div>
                  </motion.div>

                  {/* Reimagined Glass Radar Chart */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="bg-[#08080A] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_rgba(0,0,0,0.5)] rounded-3xl p-8 flex flex-col items-center relative overflow-hidden">
                    <div className={`absolute inset-0 bg-blue-500/5 blur-[80px] pointer-events-none`} />
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 w-full text-left mb-6">Skill Morphology</h3>
                    <div className="w-full max-w-[400px] h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={[
                          { dim: "Technical", value: scores.score_technical },
                          { dim: "Comm.", value: scores.score_communication },
                          { dim: "Problem Solv.", value: scores.score_problem_solving },
                          { dim: "Culture", value: scores.score_cultural_fit },
                          { dim: "Confidence", value: scores.score_confidence },
                        ]}>
                          <PolarGrid stroke="#27272a" />
                          <PolarAngleAxis dataKey="dim" tick={{ fill: "#a1a1aa", fontSize: 11, fontWeight: "bold" }} />
                          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                          <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} style={{ filter: 'drop-shadow(0 0 10px rgba(59,130,246,0.5))' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>

                </div>

                {/* COLUMN B: Knowledge Gaps & Playbook (35%) */}
                <div className="lg:col-span-5 flex flex-col gap-8">
                  
                  {/* Knowledge Gaps Spotlight Cards */}
                  {gaps?.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
                      <div className="flex items-center gap-3 mb-4">
                        <Target size={16} className="text-rose-500" />
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Critical Knowledge Gaps</h3>
                      </div>
                      
                      <div className="flex flex-col gap-4">
                        {gaps.map((gap, i) => (
                          <KnowledgeGapCard key={i} gap={gap} onClick={() => setStudyPlanTopic(gap.gap)} />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Company Playbook Interactive Accordion */}
                  {(company?.green_flags?.length > 0 || company?.red_flags?.length > 0) && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
                      <div className="flex items-center gap-3 mb-4 mt-4">
                        <Code2 size={16} className="text-amber-500" />
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{company?.name} Playbook</h3>
                      </div>
                      <div className="bg-[#08080A] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_rgba(0,0,0,0.5)] rounded-2xl p-2">
                        {company?.green_flags?.length > 0 && (
                          <InteractiveAccordion title="DO THIS" color="emerald" items={company.green_flags} defaultOpen={true} />
                        )}
                        {company?.red_flags?.length > 0 && (
                          <InteractiveAccordion title="AVOID THIS" color="rose" items={company.red_flags} defaultOpen={false} />
                        )}
                      </div>
                    </motion.div>
                  )}
                  
                </div>
              </div>

            </div>

            {/* ZONE 3: FLOATING MAC-STYLE DOCK */}
            <motion.div 
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6, type: "spring", damping: 20 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white/[0.05] border border-white/10 backdrop-blur-2xl px-3 py-3 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8),_inset_0_1px_0_0_rgba(255,255,255,0.1)]"
            >
              <div className="flex items-center pr-3 border-r border-white/10 gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Feedback</span>
                <button onClick={() => rateFeedback(true)} className={`p-2 rounded-xl transition-colors ${feedbackRating === true ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:bg-white/10 hover:text-white"}`}>
                  <ThumbsUp size={16} />
                </button>
                <button onClick={() => rateFeedback(false)} className={`p-2 rounded-xl transition-colors ${feedbackRating === false ? "bg-rose-500/20 text-rose-400" : "text-slate-400 hover:bg-white/10 hover:text-white"}`}>
                  <ThumbsDown size={16} />
                </button>
              </div>

              <button
                onClick={goNextQuestion}
                className="relative overflow-hidden px-6 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:scale-[0.98] transition-all flex items-center gap-2"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />
                Next Question
                <kbd className="font-mono text-[10px] bg-black/10 px-1.5 py-0.5 rounded opacity-60">⌘↵</kbd>
              </button>
            </motion.div>

            {/* Overlay Modals */}
            {studyPlanTopic && (
              <StudyPlan
                topicName={studyPlanTopic}
                company={company?.name?.toLowerCase()}
                onClose={() => setStudyPlanTopic(null)}
              />
            )}

          </div>
        )}
      </main>
    </div>
  );
}

/* ============================================================================
   NEW PHASE 2 PREMIUM COMPONENTS
   ============================================================================ */

function AnimatedNumber({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => v.toFixed(1));
  const [display, setDisplay] = useState("0.0");
  
  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: "easeOut" });
    const unsub = rounded.on("change", setDisplay);
    return () => { controls.stop(); unsub(); };
  }, [value, count, rounded]);

  return <>{display}</>;
}

function ExpandableScoreRow({ label, value, feedback }) {
  const [expanded, setExpanded] = useState(false);
  const isHigh = value >= 7;
  const isMid = value >= 4 && value < 7;
  const colorClass = isHigh ? "bg-emerald-500" : isMid ? "bg-amber-500" : "bg-rose-500";
  const textClass = isHigh ? "text-emerald-400" : isMid ? "text-amber-400" : "text-rose-400";

  return (
    <div className="bg-[#08080A] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-2xl overflow-hidden hover:border-white/[0.15] transition-colors">
      <button onClick={() => setExpanded(!expanded)} className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 outline-none">
        <span className="text-sm font-bold text-white tracking-wide">{label}</span>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
          <div className="w-32 h-1.5 bg-black rounded-full overflow-hidden shadow-inner flex-shrink-0">
            <motion.div 
              initial={{ width: 0 }} animate={{ width: `${value * 10}%` }} 
              transition={{ duration: 1, delay: 0.3, ease: "easeOut" }} 
              className={`h-full ${colorClass} shadow-[0_0_10px_currentColor]`} 
            />
          </div>
          <span className={`text-sm font-mono font-bold tabular-nums w-10 text-right ${textClass}`}>{value}/10</span>
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 text-left">
            <div className="pb-5 pt-1 border-t border-white/[0.05] text-[13px] text-slate-400 leading-relaxed font-medium">
              {feedback ? (
                <div className="flex items-start gap-3 mt-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <p>{feedback}</p>
                </div>
              ) : (
                <p className="mt-3 italic opacity-50">No specific diagnostic data recorded for this metric.</p>
              )}
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
    <div onClick={onClick} className="group relative bg-[#08080A] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-2xl p-5 cursor-pointer overflow-hidden transition-all hover:border-white/[0.15] hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      {/* Spotlight Hover Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <span className="text-white text-[15px] font-bold tracking-tight capitalize">{gap.gap.replace(/_/g, " ")}</span>
        <span className={`px-2 py-1 rounded-[6px] text-[9px] font-bold uppercase tracking-widest border flex items-center gap-1.5 ${badgeColor}`}>
          <Icon size={10} /> {gap.urgency}
        </span>
      </div>

      {/* Prerequisite Node Graph */}
      {gap.prerequisites_to_study_first?.length > 0 && (
        <div className="flex items-center flex-wrap gap-2 relative z-10 mb-4 bg-black/50 p-3 rounded-xl border border-white/[0.03]">
          {gap.prerequisites_to_study_first.map((p, j) => (
            <div key={j} className="flex items-center gap-2">
              <span className="text-slate-400 text-[10px] font-mono border border-white/10 px-2 py-0.5 rounded-full bg-white/[0.02]">
                {p}
              </span>
              {j < gap.prerequisites_to_study_first.length - 1 && <ArrowRight size={10} className="text-slate-600" />}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-blue-400 text-[11px] font-bold uppercase tracking-widest group-hover:text-blue-300 transition-colors relative z-10">
        View Full Study Path <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}

function InteractiveAccordion({ title, color, items, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const isEmerald = color === "emerald";
  const titleColor = isEmerald ? "text-emerald-400" : "text-rose-400";
  const dotColor = isEmerald ? "bg-emerald-400" : "bg-rose-400";
  const hoverBg = isEmerald ? "hover:bg-emerald-500/5" : "hover:bg-rose-500/5";

  return (
    <div className="mb-1">
      <button onClick={() => setOpen(!open)} className={`w-full px-4 py-3 flex items-center justify-between rounded-xl transition-colors ${hoverBg} outline-none`}>
        <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${titleColor}`}>{title}</span>
        <ChevronRight size={14} className={`text-slate-500 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-3">
            <div className="flex flex-col gap-2 pt-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-black/40 border border-white/[0.03] p-3 rounded-lg">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${dotColor} shadow-[0_0_8px_currentColor]`} />
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