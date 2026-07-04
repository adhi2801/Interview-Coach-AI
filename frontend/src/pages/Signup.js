import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config";

export default function Signup({ onAuth, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_URL}/auth/signup`, { name, email, password });
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
        <h1 style={s.title}>Create your account</h1>
        <p style={s.subtitle}>Start practicing with AI-powered mock interviews</p>

        <div style={s.field}>
          <label style={s.label}>Full Name</label>
          <input
            style={s.input}
            placeholder="Adhiswauran"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSignup()}
          />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button style={loading ? s.btnDisabled : s.btn} className="bouncy" onClick={handleSignup} disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        <p style={s.switchText}>
          Already have an account?{" "}
          <span style={s.switchLink} onClick={onSwitchToLogin}>Log in</span>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh", backgroundColor: "var(--bg-primary)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font)"
  },
  card: {
    width: "400px", padding: "var(--space-7)",
    backgroundColor: "rgba(13,20,36,0.65)", backdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg)"
  },
  title: { color: "var(--text-primary)", fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", marginBottom: "6px", letterSpacing: "-0.5px" },
  subtitle: { color: "var(--text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-6)" },
  field: { marginBottom: "var(--space-4)" },
  label: { display: "block", color: "var(--text-secondary)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "var(--space-2)" },
  input: {
    width: "100%", padding: "12px 14px", backgroundColor: "#070c18",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)",
    fontSize: "var(--text-base)", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s ease"
  },
  error: { color: "#fca5a5", backgroundColor: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.12)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" },
  btn: {
    width: "100%", padding: "13px", background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
    color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", cursor: "pointer",
    boxShadow: "var(--shadow-glow)"
  },
  btnDisabled: {
    width: "100%", padding: "13px", backgroundColor: "var(--border)",
    color: "var(--text-muted)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)", cursor: "not-allowed"
  },
  switchText: { color: "var(--text-muted)", fontSize: "var(--text-sm)", textAlign: "center", marginTop: "var(--space-5)" },
  switchLink: { color: "var(--accent-light)", cursor: "pointer", fontWeight: "var(--weight-semibold)" }
};