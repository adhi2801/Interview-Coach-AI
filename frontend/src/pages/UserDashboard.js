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
            <div style={s.statCard} className="hover-lift">
              <span style={s.statValue}>{Math.round(user.elo_rating)}</span>
              <span style={s.statLabel}>Current Rating</span>
            </div>
            <div style={s.statCard} className="hover-lift">
              <span style={s.statValue}>{sessions.length}</span>
              <span style={s.statLabel}>Sessions</span>
            </div>
            <div style={s.statCard} className="hover-lift">
              <span style={s.statValue}>
                {sessions.length > 0
                  ? sessions.reduce((sum, s) => sum + (s.question_count || 0), 0)
                  : 0}
              </span>
              <span style={s.statLabel}>Questions Answered</span>
            </div>
          </div>

          <button style={s.startBtn} className="bouncy" onClick={onStartNew}>
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
  page: { minHeight: "100vh", backgroundColor: "var(--bg-primary)", fontFamily: "var(--font)", color: "var(--text-primary)", position: "relative", overflow: "hidden" },
  bgOrb1: { position: "fixed", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", top: "-200px", left: "-200px", pointerEvents: "none" },
  bgOrb2: { position: "fixed", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", bottom: "-100px", right: "-100px", pointerEvents: "none" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-4) var(--space-6)", borderBottom: "1px solid rgba(255,255,255,0.04)", position: "relative", zIndex: 10 },
  headerLeft: { display: "flex", alignItems: "center", gap: "var(--space-2)" },
  logoIcon: { width: "32px", height: "32px", borderRadius: "var(--radius-sm)", background: "linear-gradient(135deg, var(--accent), #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", color: "#fff" },
  logoText: { color: "var(--text-primary)", fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)" },
  headerRight: { display: "flex", alignItems: "center", gap: "var(--space-4)" },
  userName: { color: "var(--text-secondary)", fontSize: "var(--text-sm)" },
  logoutBtn: { backgroundColor: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", padding: "6px 14px", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", cursor: "pointer" },
  main: { maxWidth: "1000px", margin: "0 auto", padding: "var(--space-7) var(--space-6)", position: "relative", zIndex: 10 },
  hero: { marginBottom: "var(--space-7)" },
  // Bigger jump from body text to headline — this is the single change that
  // does the most for "does this look designed" per line of code changed.
  greeting: { fontSize: "var(--text-3xl)", fontWeight: "var(--weight-bold)", letterSpacing: "-1.5px", color: "var(--text-primary)", marginBottom: "var(--space-2)", lineHeight: 1.1 },
  subgreeting: { color: "var(--text-secondary)", fontSize: "var(--text-lg)", marginBottom: "var(--space-6)", fontWeight: "var(--weight-normal)" },
  statsRow: { display: "flex", gap: "var(--space-4)", marginBottom: "var(--space-6)" },
  statCard: { backgroundColor: "rgba(15,23,42,0.8)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-1)", minWidth: "140px", boxShadow: "var(--shadow-sm)" },
  statValue: { fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", color: "var(--accent)", letterSpacing: "-0.5px" },
  statLabel: { fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "0.5px" },
  startBtn: { padding: "var(--space-4) var(--space-6)", background: "linear-gradient(135deg, var(--accent), #8b5cf6)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", cursor: "pointer", boxShadow: "var(--shadow-glow)" },
  content: { display: "flex", flexDirection: "column", gap: "var(--space-5)" },
  card: { backgroundColor: "rgba(15,23,42,0.8)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "var(--space-5)", boxShadow: "var(--shadow-sm)" },
  cardTitle: { color: "var(--text-primary)", fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", marginBottom: "var(--space-5)", letterSpacing: "-0.3px" },
  emptyState: { padding: "var(--space-5) 0" },
  emptyText: { color: "var(--text-muted)", fontSize: "var(--text-base)" },
  sessionList: { display: "flex", flexDirection: "column", gap: "1px" },
  sessionRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-3) 0", borderBottom: "1px solid var(--border)" },
  sessionLeft: { display: "flex", flexDirection: "column", gap: "2px" },
  sessionCompany: { color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", textTransform: "capitalize" },
  sessionRole: { color: "var(--text-muted)", fontSize: "var(--text-xs)" },
  sessionRight: { display: "flex", alignItems: "center", gap: "var(--space-4)" },
  sessionQuestions: { color: "var(--text-muted)", fontSize: "var(--text-xs)" },
  sessionDate: { color: "var(--text-muted)", fontSize: "var(--text-xs)" },
};