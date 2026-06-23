import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config";

export default function Login({ onAuth, onSwitchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      if (res.data.error) {
        setError(res.data.error);
      } else {
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        onAuth(res.data.user);
      }
    } catch (err) {
      setError("Cannot connect to server");
    }
    setLoading(false);
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Welcome back</h1>
        <p style={s.subtitle}>Log in to continue your interview prep</p>

        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button style={loading ? s.btnDisabled : s.btn} onClick={handleLogin} disabled={loading}>
          {loading ? "Logging in..." : "Log In"}
        </button>

        <p style={s.switchText}>
          Don't have an account?{" "}
          <span style={s.switchLink} onClick={onSwitchToSignup}>Sign up</span>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh", backgroundColor: "#0a0f1e",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Inter', sans-serif"
  },
  card: {
    width: "400px", padding: "40px",
    backgroundColor: "rgba(13,20,36,0.65)", backdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
  },
  title: { color: "#f8fafc", fontSize: "24px", fontWeight: "700", marginBottom: "6px" },
  subtitle: { color: "#94a3b8", fontSize: "14px", marginBottom: "28px" },
  field: { marginBottom: "18px" },
  label: { display: "block", color: "#94a3b8", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px" },
  input: {
    width: "100%", padding: "12px 14px", backgroundColor: "#070c18",
    border: "1px solid #1e293b", borderRadius: "10px", color: "#f1f5f9",
    fontSize: "14px", outline: "none", boxSizing: "border-box"
  },
  error: { color: "#fca5a5", backgroundColor: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.12)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", marginBottom: "16px" },
  btn: {
    width: "100%", padding: "13px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer"
  },
  btnDisabled: {
    width: "100%", padding: "13px", backgroundColor: "#1e293b",
    color: "#475569", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "not-allowed"
  },
  switchText: { color: "#64748b", fontSize: "13px", textAlign: "center", marginTop: "20px" },
  switchLink: { color: "#818cf8", cursor: "pointer", fontWeight: "600" }
};