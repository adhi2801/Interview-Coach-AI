import { API_URL, WS_URL } from "../config";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import StudyPlan from "./StudyPlan";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function InterviewRoom({ sessionData, onFinish }) {
  const [question, setQuestion] = useState(sessionData?.question || "");
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
  const wsRef = useRef(null);
  const debounceRef = useRef(null);
  const timerRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/coaching/${sessionData?.session_id || 1}`);
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
        // Voice transcription arrived — append to the answer text
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

  function formatTime(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function getTimerColor() {
    if (timeLeft <= 20) return "#f87171";
    if (timeLeft <= 50) return "#facc15";
    return "#4ade80";
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
      const res = await axios.post(
        `${API_URL}/answer/submit`,
        {
          session_id: sessionData.session_id,
          question,
          answer,
          difficulty,
          elo: currentElo,
          company: sessionData?.company_profile?.name?.toLowerCase(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setScores(res.data.scores);
      setGaps(res.data.gaps || []);
      setPeer(res.data.peer_comparison);
      setNewElo(res.data.new_elo);
      setNextQuestion(res.data.next_question || "");
      setCurrentAnswerId(res.data.answer_id);
      setFeedbackRating(null);
      setPhase("results");

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
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
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

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logoMini}>
            <div style={s.logoIcon}>AI</div>
            <span style={s.logoText}>InterviewCoach</span>
          </div>
          <div style={s.divider} />
          <div style={s.sessionInfo}>
            <span style={s.companyTag}>{company?.name || "Interview"}</span>
            <span style={s.roleTag}>{sessionData?.role || ""}</span>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={s.timerBox}>
            <span style={{ ...s.timerDot, backgroundColor: getTimerColor() }} />
            <span style={{ ...s.timerText, color: getTimerColor() }}>
              {formatTime(timeLeft)}
            </span>
            {timeLeft === 0 && <span style={s.timeUpTag}>Time's up</span>}
          </div>
          <div style={s.eloBox}>
            <span style={s.eloLabel}>ELO</span>
            <span style={s.eloValue}>{currentElo}</span>
          </div>
          <div style={s.qBox}>Q{questionNum}</div>
          <button style={s.endBtn} onClick={onFinish}>End Session</button>
        </div>
      </header>

      <div style={s.body}>
        <div style={{
          ...s.left,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.5s ease"
        }}>
          <div style={s.diffRow}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...s.diffDot,
                  backgroundColor: i < difficulty
                    ? (difficulty <= 3 ? "#4ade80" : difficulty <= 6 ? "#facc15" : "#f87171")
                    : "#1e293b"
                }}
              />
            ))}
            <span style={s.diffLabel}>Difficulty {difficulty}/10</span>
          </div>

          <div style={s.questionCard}>
            <div style={s.questionHeader}>
              <span style={s.questionNum}>Question {questionNum}</span>
              <span style={s.questionTopic}>
                {company?.focus_areas?.split(" ")[0] || "Technical"}
              </span>
            </div>
            <p style={s.questionText}>{question}</p>
          </div>

          {phase === "answering" && (
            <div style={s.answerCard}>
              <div style={s.answerHeader}>
                <span style={s.answerLabel}>Your Answer</span>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    style={isRecording ? s.micBtnActive : s.micBtn}
                    onClick={isRecording ? stopRecording : startRecording}
                  >
                    <span style={isRecording ? s.micDotPulse : s.micDot} />
                    {isRecording ? "Recording..." : "Speak instead"}
                  </button>
                  <span style={s.charCount}>{answer.length} chars</span>
                </div>
              </div>
              <textarea
                style={s.textarea}
                placeholder="Structure your answer clearly. For technical questions: explain your approach first, then implementation, then complexity. For behavioral: use STAR format."
                value={answer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                rows={10}
              />
              {showHint && (
                <div style={s.hintBanner}>
                  <span style={s.hintIcon}>i</span>
                  <span style={s.hintBannerText}>{hintText}</span>
                  <button style={s.hintClose} onClick={() => setShowHint(false)}>×</button>
                </div>
              )}
              <div style={s.answerFooter}>
                <button style={s.hintBtn} onClick={getHint}>
                  Get a hint
                </button>
                <button
                  style={loading ? s.submitBtnDisabled : s.submitBtn}
                  onClick={submitAnswer}
                  disabled={loading}
                >
                  {loading ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={s.spinner} /> Scoring your answer...
                    </span>
                  ) : (
                    <span>Submit Answer →</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {phase === "results" && scores && (
            <div style={s.resultsCard}>
              <div style={s.resultsTop}>
                <div style={s.overallBox}>
                  <div style={{
                    ...s.overallCircle,
                    borderColor: overall >= 7 ? "#4ade80" : overall >= 5 ? "#facc15" : "#f87171",
                    boxShadow: `0 0 30px ${overall >= 7 ? "#4ade8040" : overall >= 5 ? "#facc1540" : "#f8717140"}`
                  }}>
                    <span style={s.overallNum}>{overall}</span>
                    <span style={s.overallSub}>/ 10</span>
                  </div>
                  <span style={s.overallLabel}>Overall Score</span>
                </div>

                {peer && (
                  <div style={s.peerCard}>
                    <div style={s.peerTop}>
                      <span style={{
                        ...s.peerTierDot,
                        backgroundColor: peer.tier === "excellent" ? "#4ade80" :
                          peer.tier === "strong" ? "#818cf8" :
                          peer.tier === "good" ? "#facc15" :
                          peer.tier === "weak" ? "#fb923c" : "#f87171"
                      }} />
                      <div>
                        <p style={s.peerContext}>{peer.context}</p>
                        <p style={s.peerSub}>vs {peer.total_attempts} candidates</p>
                      </div>
                    </div>
                    <div style={s.peerBar}>
                      <div style={{
                        ...s.peerFill,
                        width: `${peer.percentile}%`,
                        backgroundColor: peer.percentile >= 75 ? "#4ade80" : peer.percentile >= 50 ? "#facc15" : "#f87171"
                      }} />
                    </div>
                    <div style={s.peerStats}>
                      <span style={s.peerStat}>{peer.percentile}th percentile</span>
                      <span style={s.peerStat}>Avg: {peer.average_score}/10</span>
                    </div>
                  </div>
                )}
              </div>

              <div style={s.scoresRow}>
                <div style={s.scoresSection}>
                  <p style={s.sectionTitle}>Score Breakdown</p>
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

                <div style={s.radarBox}>
                  <p style={s.sectionTitle}>Skill Radar</p>
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
                      <Radar dataKey="value" stroke="#818cf8" fill="#6366f1" fillOpacity={0.35} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {scoreHistory.length > 1 && (
                <div style={s.chartBox}>
                  <p style={s.sectionTitle}>Progress This Session</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={scoreHistory}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                      <XAxis dataKey="question" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#1e293b" }} />
                      <YAxis domain={[0, 10]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#1e293b" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", fontSize: "12px" }} />
                      <Line type="monotone" dataKey="overall" stroke="#818cf8" strokeWidth={2} dot={{ fill: "#6366f1", r: 4 }} name="Overall" />
                      <Line type="monotone" dataKey="confidence" stroke="#4ade80" strokeWidth={2} dot={{ fill: "#4ade80", r: 4 }} name="Confidence" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {scores.overall_summary && (
                <div style={s.summaryBox}>
                  <div style={s.summaryHeader}>
                    <p style={s.summaryLabel}>AI Feedback</p>
                    {feedbackRating === null ? (
                      <div style={s.ratingRow}>
                        <span style={s.ratingPrompt}>Helpful?</span>
                        <button style={s.ratingBtn} onClick={() => rateFeedback(true)}>Yes</button>
                        <button style={s.ratingBtn} onClick={() => rateFeedback(false)}>No</button>
                      </div>
                    ) : (
                      <span style={s.ratingThanks}>Thanks for the feedback</span>
                    )}
                  </div>
                  <p style={s.summaryText}>{scores.overall_summary}</p>
                </div>
              )}

              {newElo && (
                <div style={s.eloUpdate}>
                  <span style={s.eloUpdateLabel}>ELO Rating</span>
                  <div style={s.eloUpdateValues}>
                    <span style={s.eloOld}>{currentElo}</span>
                    <span style={s.eloArrow}>→</span>
                    <span style={{
                      ...s.eloNew,
                      color: newElo > currentElo ? "#4ade80" : "#f87171"
                    }}>{newElo}</span>
                    <span style={{
                      ...s.eloDiff,
                      color: newElo > currentElo ? "#4ade80" : "#f87171"
                    }}>
                      {newElo > currentElo ? "+" : ""}{(newElo - currentElo).toFixed(1)}
                    </span>
                  </div>
                </div>
              )}

              <button style={s.nextBtn} onClick={goNextQuestion}>
                Next Question →
              </button>
            </div>
          )}
        </div>

        <div style={{
          ...s.right,
          opacity: mounted ? 1 : 0,
          transition: "all 0.5s ease 0.2s"
        }}>
          {phase === "answering" && (
            <div style={s.panel}>
              <div style={s.liveHeader}>
                <p style={s.panelTitle}>Live Coaching</p>
                <span style={{
                  ...s.liveDot,
                  backgroundColor: wsConnected ? "#4ade80" : "#475569"
                }} />
              </div>

              {liveCoaching ? (
                <>
                  <div style={s.metricsGrid}>
                    <div style={s.metric}>
                      <span style={s.metricVal}>{liveCoaching.confidence_score}/10</span>
                      <span style={s.metricLabel}>Confidence</span>
                    </div>
                    <div style={s.metric}>
                      <span style={s.metricVal}>{liveCoaching.words_per_minute}</span>
                      <span style={s.metricLabel}>WPM</span>
                    </div>
                  </div>
                  {liveCoaching.fillers_found?.length > 0 && (
                    <div style={s.fillerRow}>
                      {liveCoaching.fillers_found.map((f) => (
                        <span key={f} style={s.fillerTag}>{f}</span>
                      ))}
                    </div>
                  )}
                  {liveCoaching.suggestion && (
                    <div style={s.suggestionBox}>
                      <span style={s.suggestionText}>{liveCoaching.suggestion}</span>
                    </div>
                  )}
                </>
              ) : (
                <p style={s.liveEmpty}>Start typing your answer — feedback updates live.</p>
              )}

              {intervention && (
                <div style={s.interventionBox}>
                  <span style={s.interventionText}>{intervention}</span>
                </div>
              )}
            </div>
          )}

          {gaps?.length > 0 && (
            <div style={s.panel}>
              <p style={s.panelTitle}>Knowledge Gaps</p>
              {gaps.map((gap, i) => (
                <div
                  key={i}
                  style={{ ...s.gapItem, cursor: "pointer" }}
                  onClick={() => setStudyPlanTopic(gap.gap)}
                >
                  <div style={s.gapTop}>
                    <span style={s.gapName}>{gap.gap.replace(/_/g, " ")}</span>
                    <span style={
                      gap.urgency === "critical" ? s.urgCritical :
                      gap.urgency === "high" ? s.urgHigh : s.urgMed
                    }>
                      {gap.urgency}
                    </span>
                  </div>
                  {gap.prerequisites_to_study_first?.length > 0 && (
                    <div style={s.gapPath}>
                      {gap.prerequisites_to_study_first.map((p, j) => (
                        <span key={j} style={s.gapStep}>
                          {p}{j < gap.prerequisites_to_study_first.length - 1 ? " →" : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  <span style={s.viewPlanLink}>View full study path →</span>
                </div>
              ))}
            </div>
          )}

          {studyPlanTopic && (
            <StudyPlan
              topicName={studyPlanTopic}
              company={company?.name?.toLowerCase()}
              onClose={() => setStudyPlanTopic(null)}
            />
          )}

          <div style={s.panel}>
            <p style={s.panelTitle}>{company?.name} Interview Tips</p>
            <div style={s.tipsSection}>
              <p style={s.tipsHead}>Do this</p>
              {company?.green_flags?.map((f) => (
                <div key={f} style={s.tipRow}>
                  <span style={s.tipDot} />
                  <span style={s.tipText}>{f}</span>
                </div>
              ))}
            </div>
            <div style={s.tipsSection}>
              <p style={{ ...s.tipsHead, color: "#f87171" }}>Avoid this</p>
              {company?.red_flags?.map((f) => (
                <div key={f} style={s.tipRow}>
                  <span style={{ ...s.tipDot, backgroundColor: "#f87171" }} />
                  <span style={s.tipText}>{f}</span>
                </div>
              ))}
            </div>
            <div style={s.valuesRow}>
              {company?.values?.map((v) => (
                <span key={v} style={s.valuePill}>{v}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, value, feedback }) {
  const color = value >= 7 ? "#4ade80" : value >= 5 ? "#facc15" : "#f87171";
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "500" }}>{label}</span>
        <span style={{ color, fontSize: "13px", fontWeight: "700" }}>{value}/10</span>
      </div>
      <div style={{ height: "4px", backgroundColor: "#1e293b", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${value * 10}%`,
          backgroundColor: color,
          borderRadius: "2px",
          transition: "width 1s ease",
          boxShadow: `0 0 8px ${color}60`
        }} />
      </div>
      {feedback && (
        <p style={{ color: "#475569", fontSize: "12px", marginTop: "5px", lineHeight: "1.4" }}>
          {feedback}
        </p>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", backgroundColor: "#0a0f1e", fontFamily: "'Inter', sans-serif", color: "#f8fafc" },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 28px", backgroundColor: "#0f172a",
    borderBottom: "1px solid #1e293b", position: "sticky", top: 0, zIndex: 100,
    backdropFilter: "blur(10px)"
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "16px" },
  logoMini: { display: "flex", alignItems: "center", gap: "8px" },
  logoIcon: {
    width: "30px", height: "30px", borderRadius: "8px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11px", fontWeight: "800", color: "#fff"
  },
  logoText: { color: "#f8fafc", fontSize: "15px", fontWeight: "700" },
  divider: { width: "1px", height: "20px", backgroundColor: "#1e293b" },
  sessionInfo: { display: "flex", alignItems: "center", gap: "8px" },
  companyTag: {
    backgroundColor: "rgba(99,102,241,0.1)", color: "#818cf8",
    border: "1px solid rgba(99,102,241,0.2)",
    padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600"
  },
  roleTag: { color: "#475569", fontSize: "12px" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  timerBox: {
    display: "flex", alignItems: "center", gap: "6px",
    backgroundColor: "#111827", border: "1px solid #1e293b",
    padding: "6px 12px", borderRadius: "8px"
  },
  timerDot: { width: "6px", height: "6px", borderRadius: "50%" },
  timerText: { fontSize: "13px", fontWeight: "700", fontVariantNumeric: "tabular-nums" },
  timeUpTag: {
    backgroundColor: "rgba(248,113,113,0.15)", color: "#fca5a5",
    padding: "2px 8px", borderRadius: "6px", fontSize: "10px",
    fontWeight: "700", textTransform: "uppercase", marginLeft: "4px"
  },
  eloBox: {
    display: "flex", alignItems: "center", gap: "6px",
    backgroundColor: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
    padding: "6px 12px", borderRadius: "8px"
  },
  eloLabel: { color: "#6366f1", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" },
  eloValue: { color: "#a5b4fc", fontSize: "13px", fontWeight: "700" },
  qBox: {
    backgroundColor: "#111827", border: "1px solid #1e293b",
    color: "#475569", padding: "6px 12px", borderRadius: "8px",
    fontSize: "12px", fontWeight: "600"
  },
  endBtn: {
    backgroundColor: "transparent", color: "#f87171",
    border: "1px solid rgba(248,113,113,0.3)", padding: "6px 14px",
    borderRadius: "8px", fontSize: "12px", fontWeight: "600"
  },
  body: {
    display: "flex", gap: "20px", padding: "24px 28px",
    maxWidth: "1400px", margin: "0 auto", alignItems: "flex-start"
  },
  left: { flex: 1, display: "flex", flexDirection: "column", gap: "16px" },
  right: { width: "300px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "16px" },
  diffRow: { display: "flex", alignItems: "center", gap: "6px" },
  diffDot: { width: "20px", height: "4px", borderRadius: "2px", transition: "background-color 0.3s" },
  diffLabel: { color: "#475569", fontSize: "12px", fontWeight: "500", marginLeft: "6px" },
  questionCard: {
    backgroundColor: "#0f172a", border: "1px solid #1e293b",
    borderRadius: "16px", padding: "24px"
  },
  questionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  questionNum: { color: "#6366f1", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" },
  questionTopic: {
    backgroundColor: "rgba(99,102,241,0.1)", color: "#818cf8",
    border: "1px solid rgba(99,102,241,0.15)",
    padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase"
  },
  questionText: { color: "#f8fafc", fontSize: "17px", lineHeight: "1.75", fontWeight: "400" },
  answerCard: { backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px", padding: "20px" },
  answerHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  answerLabel: { color: "#475569", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" },
  charCount: { color: "#334155", fontSize: "12px" },
  micBtn: {
    display: "flex", alignItems: "center", gap: "6px",
    backgroundColor: "transparent", color: "#94a3b8",
    border: "1px solid #1e293b", padding: "6px 12px",
    borderRadius: "20px", fontSize: "12px", fontWeight: "600"
  },
  micBtnActive: {
    display: "flex", alignItems: "center", gap: "6px",
    backgroundColor: "rgba(248,113,113,0.1)", color: "#fca5a5",
    border: "1px solid rgba(248,113,113,0.3)", padding: "6px 12px",
    borderRadius: "20px", fontSize: "12px", fontWeight: "600"
  },
  micDot: { width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#94a3b8" },
  micDotPulse: {
    width: "6px", height: "6px", borderRadius: "50%",
    backgroundColor: "#f87171", animation: "pulse 1s infinite"
  },
  textarea: {
    width: "100%", backgroundColor: "#0a0f1e", border: "1px solid #1e293b",
    borderRadius: "10px", color: "#f8fafc", fontSize: "15px",
    padding: "16px", resize: "vertical", boxSizing: "border-box",
    lineHeight: "1.65", outline: "none", transition: "border-color 0.2s"
  },
  answerFooter: { display: "flex", gap: "10px", marginTop: "14px", alignItems: "center" },
  hintBtn: {
    backgroundColor: "transparent", color: "#94a3b8",
    border: "1px solid #1e293b", padding: "10px 16px",
    borderRadius: "8px", fontSize: "13px", fontWeight: "600",
    marginRight: "auto"
  },
  hintBanner: {
    display: "flex", alignItems: "flex-start", gap: "10px",
    backgroundColor: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)",
    borderRadius: "10px", padding: "12px 14px", marginTop: "12px"
  },
  hintIcon: {
    width: "18px", height: "18px", borderRadius: "50%",
    backgroundColor: "rgba(99,102,241,0.2)", color: "#a5b4fc",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11px", fontWeight: "700", flexShrink: 0, fontStyle: "italic"
  },
  hintBannerText: { color: "#a5b4fc", fontSize: "13px", lineHeight: "1.5", flex: 1 },
  hintClose: {
    background: "none", border: "none", color: "#475569",
    fontSize: "18px", cursor: "pointer", lineHeight: 1, padding: 0
  },
  submitBtn: {
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff", border: "none", padding: "10px 24px",
    borderRadius: "8px", fontSize: "13px", fontWeight: "600",
    boxShadow: "0 4px 16px rgba(99,102,241,0.3)"
  },
  submitBtnDisabled: {
    backgroundColor: "#1e293b", color: "#334155", border: "none",
    padding: "10px 24px", borderRadius: "8px", fontSize: "13px",
    fontWeight: "600", cursor: "not-allowed"
  },
  spinner: {
    width: "14px", height: "14px", border: "2px solid #334155",
    borderTopColor: "#6366f1", borderRadius: "50%",
    display: "inline-block", animation: "spin 0.8s linear infinite"
  },
  resultsCard: { backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px", padding: "24px" },
  resultsTop: { display: "flex", gap: "16px", marginBottom: "24px" },
  overallBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" },
  overallCircle: {
    width: "90px", height: "90px", borderRadius: "50%",
    border: "3px solid", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#0a0f1e"
  },
  overallNum: { fontSize: "28px", fontWeight: "800", color: "#f8fafc" },
  overallSub: { fontSize: "11px", color: "#475569" },
  overallLabel: { color: "#475569", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" },
  peerCard: { flex: 1, backgroundColor: "#0a0f1e", borderRadius: "12px", padding: "16px", border: "1px solid #1e293b" },
  peerTop: { display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "12px" },
  peerTierDot: { width: "10px", height: "10px", borderRadius: "50%", marginTop: "4px", flexShrink: 0 },
  peerContext: { color: "#f8fafc", fontSize: "13px", fontWeight: "600", marginBottom: "2px" },
  peerSub: { color: "#475569", fontSize: "12px" },
  peerBar: { height: "4px", backgroundColor: "#1e293b", borderRadius: "2px", overflow: "hidden", marginBottom: "8px" },
  peerFill: { height: "100%", borderRadius: "2px", transition: "width 1s ease" },
  peerStats: { display: "flex", justifyContent: "space-between" },
  peerStat: { color: "#475569", fontSize: "11px" },
  scoresRow: { display: "flex", gap: "24px", marginBottom: "20px" },
  scoresSection: { flex: 1 },
  radarBox: { width: "280px", flexShrink: 0 },
  chartBox: {
    backgroundColor: "#0a0f1e", border: "1px solid #1e293b",
    borderRadius: "12px", padding: "16px", marginBottom: "20px"
  },
  sectionTitle: { color: "#475569", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "14px" },
  summaryBox: { backgroundColor: "#0a0f1e", border: "1px solid #1e293b", borderRadius: "10px", padding: "14px", marginBottom: "20px" },
  summaryHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  summaryLabel: { color: "#475569", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", margin: 0 },
  ratingRow: { display: "flex", alignItems: "center", gap: "8px" },
  ratingPrompt: { color: "#475569", fontSize: "11px" },
  ratingBtn: {
    backgroundColor: "transparent", color: "#818cf8",
    border: "1px solid rgba(99,102,241,0.3)", padding: "2px 10px",
    borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer"
  },
  ratingThanks: { color: "#4ade80", fontSize: "11px", fontWeight: "600" },
  summaryText: { color: "#94a3b8", fontSize: "13px", lineHeight: "1.6" },
  eloUpdate: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#0a0f1e", border: "1px solid #1e293b",
    borderRadius: "10px", padding: "12px 16px", marginBottom: "16px"
  },
  eloUpdateLabel: { color: "#475569", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" },
  eloUpdateValues: { display: "flex", alignItems: "center", gap: "8px" },
  eloOld: { color: "#475569", fontSize: "14px", fontWeight: "600" },
  eloArrow: { color: "#334155" },
  eloNew: { fontSize: "16px", fontWeight: "700" },
  eloDiff: { fontSize: "13px", fontWeight: "600" },
  nextBtn: {
    width: "100%", padding: "13px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff", border: "none", borderRadius: "10px",
    fontSize: "14px", fontWeight: "600",
    boxShadow: "0 4px 16px rgba(99,102,241,0.3)"
  },
  panel: { backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "14px", padding: "18px" },
  panelTitle: { color: "#f8fafc", fontSize: "13px", fontWeight: "700", marginBottom: "14px", letterSpacing: "-0.2px" },
  metricsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" },
  metric: {
    backgroundColor: "#0a0f1e", borderRadius: "8px", padding: "12px",
    display: "flex", flexDirection: "column", gap: "2px", border: "1px solid #1e293b"
  },
  metricVal: { color: "#f8fafc", fontSize: "20px", fontWeight: "700" },
  metricLabel: { color: "#475569", fontSize: "11px", fontWeight: "500", textTransform: "uppercase" },
  fillerRow: { display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" },
  fillerTag: {
    backgroundColor: "rgba(248,113,113,0.08)", color: "#fca5a5",
    border: "1px solid rgba(248,113,113,0.15)",
    padding: "3px 10px", borderRadius: "6px", fontSize: "12px"
  },
  suggestionBox: {
    display: "flex", gap: "8px", alignItems: "flex-start",
    backgroundColor: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.1)",
    borderRadius: "8px", padding: "10px 12px"
  },
  liveHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" },
  liveDot: { width: "8px", height: "8px", borderRadius: "50%", transition: "background-color 0.3s" },
  liveEmpty: { color: "#475569", fontSize: "12px", lineHeight: "1.5" },
  interventionBox: {
    backgroundColor: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.15)",
    borderRadius: "8px", padding: "10px 12px", marginTop: "10px"
  },
  interventionText: { color: "#fde047", fontSize: "12px", lineHeight: "1.5", fontWeight: "500" },
  suggestionText: { color: "#64748b", fontSize: "12px", lineHeight: "1.5" },
  gapItem: { backgroundColor: "#0a0f1e", borderRadius: "8px", padding: "12px", marginBottom: "8px", border: "1px solid #1e293b" },
  gapTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" },
  gapName: { color: "#f8fafc", fontSize: "13px", fontWeight: "600" },
  urgHigh: {
    backgroundColor: "rgba(248,113,113,0.1)", color: "#fca5a5",
    padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600"
  },
  urgCritical: {
    backgroundColor: "rgba(239,68,68,0.15)", color: "#fca5a5",
    padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "700"
  },
  viewPlanLink: {
    color: "#818cf8", fontSize: "11px", fontWeight: "600",
    display: "block", marginTop: "6px"
  },
  urgMed: {
    backgroundColor: "rgba(250,204,21,0.1)", color: "#fde047",
    padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600"
  },
  gapPath: { display: "flex", flexWrap: "wrap", gap: "4px" },
  gapStep: { color: "#475569", fontSize: "11px" },
  tipsSection: { marginBottom: "14px" },
  tipsHead: { color: "#4ade80", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" },
  tipRow: { display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "6px" },
  tipDot: { width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#4ade80", marginTop: "5px", flexShrink: 0 },
  tipText: { color: "#475569", fontSize: "12px", lineHeight: "1.4" },
  valuesRow: { display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" },
  valuePill: {
    backgroundColor: "rgba(99,102,241,0.08)", color: "#6366f1",
    border: "1px solid rgba(99,102,241,0.15)",
    padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "600"
  },
};