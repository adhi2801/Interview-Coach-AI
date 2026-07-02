import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function UserDashboard({ user, onStartNew, onLogout }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
    fetchSessions();
  }, []);

  async function fetchSessions() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`${API_URL}/user/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const eloHistory = sessions.map((s, i) => ({
    session: `S${i + 1}`,
    elo: s.elo_after || user.elo_rating,
    company: s.company_target
  }));

  return (
    <div style={s.page}>
      <div style={s.bgOrb1} />
      <div style={s.bgOrb2} />

      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logoIcon}>AI</div>
          <span style={s.logoText}>InterviewCoach</span>
        </div>
        <div style={s.headerRight}>
          <span style={s.userName}>{user.name}</span>
          <button style={s.logoutBtn} onClick={onLogout}>Log out</button>
        </div>
      </header>

      <main style={s.main}>
        <div style={{
          ...s.hero,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.5s ease"
        }}>
          <h1 style={s.greeting}>Welcome back, {user.name.split(" ")[0]}.</h1>
          <p style={s.subgreeting}>Ready to practice? Your current rating is {Math.round(user.elo_rating)}.</p>

          <div style={s.statsRow}>
            <div style={s.statCard}>
              <span style={s.statValue}>{Math.round(user.elo_rating)}</span>
              <span style={s.statLabel}>Current Rating</span>
            </div>
            <div style={s.statCard}>
              <span style={s.statValue}>{sessions.length}</span>
              <span style={s.statLabel}>Sessions</span>
            </div>
            <div style={s.statCard}>
              <span style={s.statValue}>
                {sessions.length > 0
                  ? sessions.reduce((sum, s) => sum + (s.question_count || 0), 0)
                  : 0}
              </span>
              <span style={s.statLabel}>Questions Answered</span>
            </div>
          </div>

          <button style={s.startBtn} onClick={onStartNew}>
            Start New Interview →
          </button>
        </div>

        <div style={{
          ...s.content,
          opacity: mounted ? 1 : 0,
          transition: "all 0.5s ease 0.2s"
        }}>
          {eloHistory.length > 1 && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>Rating History</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={eloHistory}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis dataKey="session" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#1e293b" }} />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#1e293b" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="elo" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 4 }} name="Rating" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={s.card}>
            <h2 style={s.cardTitle}>Recent Sessions</h2>
            {loading ? (
              <p style={s.emptyText}>Loading your sessions...</p>
            ) : sessions.length === 0 ? (
              <div style={s.emptyState}>
                <p style={s.emptyText}>No sessions yet — start your first mock interview above.</p>
              </div>
            ) : (
              <div style={s.sessionList}>
                {sessions.slice(0, 10).map((session, i) => (
                  <div key={i} style={s.sessionRow}>
                    <div style={s.sessionLeft}>
                      <span style={s.sessionCompany}>{session.company_target || "Unknown"}</span>
                      <span style={s.sessionRole}>{session.role || ""}</span>
                    </div>
                    <div style={s.sessionRight}>
                      <span style={s.sessionQuestions}>{session.question_count || 0} questions</span>
                      <span style={s.sessionDate}>
                        {new Date(session.started_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short"
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", backgroundColor: "#0a0f1e", fontFamily: "'Inter', sans-serif", color: "#f8fafc", position: "relative", overflow: "hidden" },
  bgOrb1: { position: "fixed", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", top: "-200px", left: "-200px", pointerEvents: "none" },
  bgOrb2: { position: "fixed", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", bottom: "-100px", right: "-100px", pointerEvents: "none" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 40px", borderBottom: "1px solid rgba(255,255,255,0.04)", position: "relative", zIndex: 10 },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
  logoIcon: { width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800", color: "#fff" },
  logoText: { color: "#f1f5f9", fontSize: "16px", fontWeight: "700" },
  headerRight: { display: "flex", alignItems: "center", gap: "16px" },
  userName: { color: "#94a3b8", fontSize: "13px" },
  logoutBtn: { backgroundColor: "transparent", color: "#64748b", border: "1px solid #1e293b", padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" },
  main: { maxWidth: "1000px", margin: "0 auto", padding: "48px 40px", position: "relative", zIndex: 10 },
  hero: { marginBottom: "48px" },
  greeting: { fontSize: "36px", fontWeight: "800", letterSpacing: "-1px", color: "#f8fafc", marginBottom: "8px" },
  subgreeting: { color: "#94a3b8", fontSize: "16px", marginBottom: "32px" },
  statsRow: { display: "flex", gap: "16px", marginBottom: "32px" },
  statCard: { backgroundColor: "rgba(15,23,42,0.8)", border: "1px solid #1e293b", borderRadius: "12px", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "4px", minWidth: "140px" },
  statValue: { fontSize: "28px", fontWeight: "800", color: "#6366f1", letterSpacing: "-0.5px" },
  statLabel: { fontSize: "12px", color: "#475569", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.3px" },
  startBtn: { padding: "14px 32px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 24px rgba(99,102,241,0.3)" },
  content: { display: "flex", flexDirection: "column", gap: "20px" },
  card: { backgroundColor: "rgba(15,23,42,0.8)", border: "1px solid #1e293b", borderRadius: "16px", padding: "24px" },
  cardTitle: { color: "#f8fafc", fontSize: "16px", fontWeight: "700", marginBottom: "20px", letterSpacing: "-0.3px" },
  emptyState: { padding: "24px 0" },
  emptyText: { color: "#475569", fontSize: "14px" },
  sessionList: { display: "flex", flexDirection: "column", gap: "1px" },
  sessionRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #1e293b" },
  sessionLeft: { display: "flex", flexDirection: "column", gap: "2px" },
  sessionCompany: { color: "#e2e8f0", fontSize: "14px", fontWeight: "600", textTransform: "capitalize" },
  sessionRole: { color: "#475569", fontSize: "12px" },
  sessionRight: { display: "flex", alignItems: "center", gap: "16px" },
  sessionQuestions: { color: "#64748b", fontSize: "12px" },
  sessionDate: { color: "#475569", fontSize: "12px" },
};