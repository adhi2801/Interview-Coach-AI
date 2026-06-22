import { API_URL } from "../config";
import { useState, useEffect } from "react";
import axios from "axios";

export default function ReplayViewer({ sessionId }) {
  const [replay, setReplay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    async function fetchReplay() {
      try {
        const res = await axios.get(`${API_URL}/replay/${sessionId || 1}`);
        setReplay(res.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    fetchReplay();
  }, [sessionId]);

  if (loading) return <div style={s.loading}>Loading replay...</div>;
  if (!replay || replay.error) return <div style={s.loading}>No replay found.</div>;

  const q = replay.questions[selected];

  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.logo}>InterviewCoach AI</span>
        <span style={s.headerTitle}>Session Replay</span>
        <div style={s.headerMeta}>
          <span style={s.metaPill}>{replay.company}</span>
          <span style={s.metaPill}>{replay.role}</span>
          <span style={s.metaPill}>{replay.total_questions} Questions</span>
        </div>
      </div>

      <div style={s.body}>
        {/* Timeline sidebar */}
        <div style={s.sidebar}>
          <p style={s.sidebarTitle}>Questions</p>
          {replay.questions.map((q, i) => {
            const overall = q.scores
              ? ((q.scores.score_technical + q.scores.score_communication +
                  q.scores.score_problem_solving + q.scores.score_cultural_fit +
                  q.scores.score_confidence) / 5).toFixed(1)
              : null;
            return (
              <div
                key={i}
                style={selected === i ? s.timelineItemActive : s.timelineItem}
                onClick={() => setSelected(i)}
              >
                <div style={s.timelineNum}>Q{i + 1}</div>
                <div style={s.timelineInfo}>
                  <p style={s.timelineQ}>{q.question?.slice(0, 50)}...</p>
                  {overall && (
                    <span style={{
                      ...s.timelineScore,
                      color: overall >= 7 ? "#4ade80" : overall >= 5 ? "#facc15" : "#f87171"
                    }}>
                      {overall}/10
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main replay view */}
        <div style={s.main}>
          <div style={s.questionBox}>
            <p style={s.questionLabel}>Question {selected + 1}</p>
            <p style={s.questionText}>{q?.question}</p>
          </div>

          {q?.answer && (
            <div style={s.answerBox}>
              <p style={s.boxLabel}>Your Answer</p>
              <p style={s.answerText}>{q.answer}</p>
            </div>
          )}

          {q?.scores && (
            <div style={s.scoresBox}>
              <p style={s.boxLabel}>Score Breakdown</p>
              <div style={s.scoresGrid}>
                {[
                  ["Technical", q.scores.score_technical],
                  ["Communication", q.scores.score_communication],
                  ["Problem Solving", q.scores.score_problem_solving],
                  ["Cultural Fit", q.scores.score_cultural_fit],
                  ["Confidence", q.scores.score_confidence],
                ].map(([label, val]) => (
                  <div key={label} style={s.scoreRow}>
                    <span style={s.scoreLabel}>{label}</span>
                    <div style={s.scoreTrack}>
                      <div style={{
                        ...s.scoreFill,
                        width: `${(val || 0) * 10}%`,
                        backgroundColor: val >= 7 ? "#4ade80" : val >= 5 ? "#facc15" : "#f87171"
                      }} />
                    </div>
                    <span style={{
                      ...s.scoreVal,
                      color: val >= 7 ? "#4ade80" : val >= 5 ? "#facc15" : "#f87171"
                    }}>{val}/10</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {q?.gaps?.length > 0 && (
            <div style={s.gapsBox}>
              <p style={s.boxLabel}>Knowledge Gaps Identified</p>
              {q.gaps.map((gap, i) => (
                <div key={i} style={s.gapItem}>
                  <span style={s.gapName}>{gap.gap}</span>
                  {gap.prerequisites_to_study_first?.length > 0 && (
                    <span style={s.gapPrereq}>
                      Study: {gap.prerequisites_to_study_first.join(" → ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {q?.coaching_moments?.length > 0 && (
            <div style={s.coachBox}>
              <p style={s.boxLabel}>Coaching Moments</p>
              {q.coaching_moments.map((m, i) => (
                <div key={i} style={s.coachItem}>
                  💡 {m.suggestion} — {m.wpm} WPM, Confidence {m.confidence}/10
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", backgroundColor: "#0a0f1e", fontFamily: "sans-serif", color: "#f8fafc" },
  loading: { color: "#94a3b8", padding: "48px", textAlign: "center", fontSize: "16px" },
  header: {
    display: "flex", alignItems: "center", gap: "16px",
    padding: "16px 32px", backgroundColor: "#0f172a",
    borderBottom: "1px solid #1e293b"
  },
  logo: { color: "#6366f1", fontWeight: "700", fontSize: "18px" },
  headerTitle: { color: "#f8fafc", fontWeight: "600", fontSize: "16px", flex: 1 },
  headerMeta: { display: "flex", gap: "8px" },
  metaPill: {
    backgroundColor: "#1e293b", color: "#94a3b8",
    padding: "4px 12px", borderRadius: "20px", fontSize: "12px"
  },
  body: { display: "flex", height: "calc(100vh - 65px)" },
  sidebar: {
    width: "280px", backgroundColor: "#0f172a",
    borderRight: "1px solid #1e293b", padding: "20px",
    overflowY: "auto"
  },
  sidebarTitle: { color: "#64748b", fontSize: "12px", fontWeight: "600", margin: "0 0 16px 0", textTransform: "uppercase" },
  timelineItem: {
    display: "flex", gap: "12px", padding: "12px",
    borderRadius: "10px", cursor: "pointer", marginBottom: "8px",
    border: "1px solid transparent"
  },
  timelineItemActive: {
    display: "flex", gap: "12px", padding: "12px",
    borderRadius: "10px", cursor: "pointer", marginBottom: "8px",
    backgroundColor: "#1e293b", border: "1px solid #334155"
  },
  timelineNum: {
    width: "28px", height: "28px", backgroundColor: "#312e81",
    borderRadius: "50%", display: "flex", alignItems: "center",
    justifyContent: "center", color: "#a5b4fc", fontSize: "11px",
    fontWeight: "700", flexShrink: 0
  },
  timelineInfo: { flex: 1 },
  timelineQ: { color: "#94a3b8", fontSize: "12px", margin: "0 0 4px 0", lineHeight: "1.4" },
  timelineScore: { fontSize: "12px", fontWeight: "600" },
  main: { flex: 1, padding: "32px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" },
  questionBox: {
    backgroundColor: "#0f172a", border: "1px solid #1e293b",
    borderRadius: "16px", padding: "24px"
  },
  questionLabel: { color: "#6366f1", fontSize: "12px", fontWeight: "600", margin: "0 0 12px 0" },
  questionText: { color: "#f8fafc", fontSize: "18px", lineHeight: "1.7", margin: 0 },
  answerBox: {
    backgroundColor: "#0f172a", border: "1px solid #1e293b",
    borderRadius: "16px", padding: "24px"
  },
  boxLabel: { color: "#64748b", fontSize: "12px", fontWeight: "600", margin: "0 0 12px 0", textTransform: "uppercase" },
  answerText: { color: "#94a3b8", fontSize: "15px", lineHeight: "1.7", margin: 0 },
  scoresBox: {
    backgroundColor: "#0f172a", border: "1px solid #1e293b",
    borderRadius: "16px", padding: "24px"
  },
  scoresGrid: { display: "flex", flexDirection: "column", gap: "12px" },
  scoreRow: { display: "flex", alignItems: "center", gap: "12px" },
  scoreLabel: { color: "#94a3b8", fontSize: "13px", width: "140px", flexShrink: 0 },
  scoreTrack: { flex: 1, height: "6px", backgroundColor: "#1e293b", borderRadius: "3px", overflow: "hidden" },
  scoreFill: { height: "100%", borderRadius: "3px", transition: "width 0.8s ease" },
  scoreVal: { fontSize: "13px", fontWeight: "600", width: "40px", textAlign: "right" },
  gapsBox: {
    backgroundColor: "#0f172a", border: "1px solid #1e293b",
    borderRadius: "16px", padding: "24px"
  },
  gapItem: {
    backgroundColor: "#1e293b", borderRadius: "8px",
    padding: "12px", marginBottom: "8px",
    display: "flex", flexDirection: "column", gap: "4px"
  },
  gapName: { color: "#f8fafc", fontSize: "13px", fontWeight: "600" },
  gapPrereq: { color: "#64748b", fontSize: "12px" },
  coachBox: {
    backgroundColor: "#0f172a", border: "1px solid #1e293b",
    borderRadius: "16px", padding: "24px"
  },
  coachItem: {
    backgroundColor: "#1e293b", borderRadius: "8px",
    padding: "12px", marginBottom: "8px",
    color: "#94a3b8", fontSize: "13px", lineHeight: "1.5"
  }
};