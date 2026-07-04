import { API_URL } from "../config";
import { useState, useEffect } from "react";
import axios from "axios";

const COMPANIES = [
  {
    id: "google", name: "Google", color: "#4285F4",
    logo: (
      <svg viewBox="0 0 48 48" width="22" height="22">
        <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
        <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
        <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34A21.92 21.92 0 0 0 2 24c0 3.57.86 6.94 2.34 9.88l7.35-5.7z"/>
        <path fill="#EA4335" d="M24 11.75c3.31 0 6.28 1.14 8.62 3.36l6.31-6.31C34.91 5.18 29.93 3 24 3 15.4 3 7.96 7.93 4.34 14.82l7.35 5.7c1.73-5.2 6.58-8.77 12.31-8.77z"/>
      </svg>
    )
  },
  {
    id: "amazon", name: "Amazon", color: "#FF9900",
    logo: (
      <svg viewBox="0 0 24 24" width="22" height="22">
        <text x="0" y="16" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="700" fill="#e8eaed">a</text>
        <path fill="#FF9900" d="M1.5 18.5c2.8 2 7.5 3 11.5 3 3.2 0 6.9-.8 9.6-2.5.4-.3.8.2.4.5-2.5 2.1-6.5 3.3-10.5 3.3-5 0-9.2-1.8-12.5-4.8-.3-.2 0-.7.5-.5z"/>
        <path fill="#FF9900" d="M21.5 17c-.5-.6-3-.3-4-.1-.3 0-.4-.3-.1-.5 1.6-1.1 4.3-.8 4.7-.4.4.4-.1 3.1-1.6 4.4-.2.2-.5.1-.4-.2.4-1 1.2-3.2.4-3.2z"/>
      </svg>
    )
  },

  {
    id: "meta", name: "Meta", color: "#0866FF",
    logo: (
      <svg viewBox="0 0 48 48" width="22" height="22">
        <path fill="#0866FF" d="M24 4C12.95 4 4 12.95 4 24c0 9.98 7.31 18.27 16.87 19.74V29.16h-5.1V24h5.1v-3.66c0-5.34 3.27-8.3 7.99-8.3 2.26 0 4.2.17 4.76.24v5.27h-3.26c-2.56 0-3.06 1.22-3.06 3.01V24h5.5l-.72 5.16h-4.78v14.58C36.69 42.27 44 33.98 44 24c0-11.05-8.95-20-20-20z"/>
      </svg>
    )
  },
  {
    id: "microsoft", name: "Microsoft", color: "#00A4EF",
    logo: (
      <svg viewBox="0 0 48 48" width="22" height="22">
        <path fill="#F25022" d="M4 4h19v19H4z"/>
        <path fill="#7FBA00" d="M25 4h19v19H25z"/>
        <path fill="#00A4EF" d="M4 25h19v19H4z"/>
        <path fill="#FFB900" d="M25 25h19v19H25z"/>
      </svg>
    )
  },
  {
    id: "apple", name: "Apple", color: "#a1a1aa",
    logo: (
      <svg viewBox="0 0 48 48" width="22" height="22">
        <path fill="#d4d4d8" d="M36.27 25.45c-.07-3.2 2.62-4.74 2.74-4.81-1.49-2.18-3.81-2.48-4.64-2.51-2.1-.21-4.1 1.24-5.17 1.24-1.08 0-2.74-1.21-4.5-1.18-2.31.03-4.45 1.36-5.63 3.43-2.41 4.18-.62 10.34 1.71 13.73 1.14 1.66 2.51 3.5 4.3 3.43 1.72-.07 2.37-1.12 4.45-1.12 2.07 0 2.66 1.12 4.46 1.08 1.84-.03 3.01-1.66 4.14-3.32 1.31-1.91 1.84-3.76 1.87-3.86-.04-.02-3.57-1.37-3.6-5.42z"/>
        <path fill="#d4d4d8" d="M30.95 14.86c.9-1.09 1.5-2.6 1.34-4.1-1.29.05-2.87.86-3.8 1.94-.84.96-1.57 2.5-1.37 3.97 1.44.11 2.92-.73 3.83-1.81z"/>
      </svg>
    )
  },
    {
    id: "netflix", name: "Netflix", color: "#E50914",
    logo: (
      <svg viewBox="0 0 24 24" width="22" height="22">
        <rect x="6" y="3" width="3.2" height="18" fill="#E50914"/>
        <rect x="14.8" y="3" width="3.2" height="18" fill="#E50914"/>
        <path fill="#B20710" d="M6 3l11 18h-3.2L6 6z"/>
      </svg>
    )
  },

  {
    id: "startup", name: "Startup", color: "#10b981",
    logo: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
      </svg>
    )
  },
];

const PERSONAS = [
  { id: "standard", label: "Standard", desc: "Balanced, professional interviewer" },
  { id: "hostile", label: "Hostile", desc: "Challenges assumptions, adds hard constraints" },
  { id: "socratic", label: "Socratic", desc: "Guides with questions, never gives answers" },
  { id: "exhausted", label: "Exhausted", desc: "Bored and terse — you must earn engagement" },
];

const ROLES = [
  "Software Engineer — L3/IC3",
  "Senior Software Engineer — L4/IC4",
  "Staff Engineer — L5/IC5",
  "ML Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Data Scientist",
  "System Design Engineer",
];

const FEATURES = [
  { label: "Adaptive Difficulty", desc: "Questions scale with your skill level in real time" },
  { label: "5-Dimension Scoring", desc: "Technical, Communication, Problem Solving, Culture, Confidence" },
  { label: "Knowledge Gap Graph", desc: "See exactly what to study next and in what order" },
  { label: "Confidence Coaching", desc: "Filler word detection, pace analysis, tone feedback" },
  { label: "Peer Benchmarking", desc: "See where you rank against other candidates" },
  { label: "Session Replay", desc: "Review every answer with annotated AI feedback" },
];

const INSIGHTS = {
  google: "Google interviews focus on algorithms and system design. Think out loud, ask clarifying questions, and always analyze time and space complexity.",
  amazon: "Every Amazon answer should map to one of the 14 Leadership Principles. Prepare 2-3 STAR stories per principle with measurable outcomes.",
  meta: "Meta prioritizes product sense and data-driven decisions. Show you can think at scale, billions of users, and ship fast.",
  microsoft: "Microsoft values growth mindset and collaboration. Demonstrate iterative thinking, openness to feedback, and cross-team awareness.",
  apple: "Apple demands attention to detail and craftsmanship. Every solution should prioritize user experience, privacy, and performance.",
  netflix: "Netflix operates on freedom and responsibility. Show high autonomy, candid communication, and data-driven judgment.",
  startup: "Startups value ownership and adaptability. Demonstrate you can wear multiple hats, move fast, and make decisions with incomplete information.",
};

export default function Dashboard({ onStart, user, onLogout }) {
  const [company, setCompany] = useState("google");
  const [role, setRole] = useState("Software Engineer — L3/IC3");
  const [persona, setPersona] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  async function handleStart() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}/session/start`,
        {
          user_name: user?.name || "Candidate",
          company,
          role,
          elo: user?.elo_rating || 1200.0,
          persona,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onStart(response.data);
    } catch (err) {
      setError("Cannot connect to server. Make sure the backend is running.");
    }
    setLoading(false);
  }

  const selectedCompany = COMPANIES.find((c) => c.id === company);

  return (
    <div style={s.page}>
      <div style={s.bgOrb1} />
      <div style={s.bgOrb2} />
      <div style={s.bgOrb3} />

      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logo}>
            <div style={s.logoIcon}>AI</div>
            <span style={s.logoText}>InterviewCoach</span>
            <span style={s.logoDivider} />
            <span style={s.logoSub}>by Claude</span>
          </div>
          <div style={s.headerRight}>
            {user && (
              <span style={s.userPill}>{user.name}</span>
            )}
            <span style={s.betaBadge}>Beta</span>
            <button style={s.logoutBtn} onClick={onLogout}>Log out</button>
          </div>
        </div>
      </header>

      <main style={s.main}>
        <div style={{
          ...s.hero,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(24px)",
          transition: "all 0.6s ease"
        }}>
          <div style={s.heroBadge}>
            <span style={s.heroBadgeDot} />
            AI-Powered Interview Training
          </div>

          <h1 style={s.heroTitle}>
            Land your next<br />
            <span className="gradient-text">tech role faster.</span>
          </h1>

          <p style={s.heroSubtitle}>
            Adaptive difficulty, real-time confidence coaching, and
            company-specific preparation, engineered to get you hired.
          </p>

          <div style={s.statsRow}>
            {[
              { value: "20+", label: "Companies" },
              { value: "5", label: "Score dimensions" },
              { value: "L3-L5", label: "All levels" },
              { value: "Live", label: "AI coaching" },
            ].map((stat) => (
              <div key={stat.label} style={s.statItem}>
                <span style={s.statValue}>{stat.value}</span>
                <span style={s.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>

          <div style={s.featureList}>
            {FEATURES.map((f) => (
              <div key={f.label} style={s.featureItem}>
                <div style={s.featureCheck}>✓</div>
                <div>
                  <span style={s.featureLabel}>{f.label}</span>
                  <span style={s.featureDesc}> — {f.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          ...s.formWrap,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(32px)",
          transition: "all 0.6s ease 0.15s"
        }}>
          <div style={s.formCard} className="gradient-border">
            <h2 style={s.formTitle}>Start your session</h2>
            <p style={s.formSubtitle}>Configure your mock interview below</p>


            <div style={s.field}>
              <label style={s.label}>Target company</label>
              <div style={s.companyGrid}>
                {COMPANIES.map((c) => (
                  <button
                    key={c.id}
                    className="hover-lift"
                    style={{
                      ...s.companyBtn,
                      ...(company === c.id ? {
                        borderColor: c.color + "60",
                        backgroundColor: c.color + "10",
                        boxShadow: `0 0 16px ${c.color}20`,
                      } : {})
                    }}
                    onClick={() => setCompany(c.id)}
                  >
                    <div style={s.companyLogoWrap}>{c.logo}</div>
                    <span style={{
                      ...s.companyName,
                      color: company === c.id ? "#e2e8f0" : "#64748b"
                    }}>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Target role and level</label>
              <select
                style={s.select}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div style={s.field}>
              <label style={s.label}>Interviewer style</label>
              <div style={s.personaGrid}>
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    style={{
                      ...s.personaBtn,
                      ...(persona === p.id ? s.personaBtnActive : {})
                    }}
                    onClick={() => setPersona(p.id)}
                  >
                    <span style={s.personaLabel}>{p.label}</span>
                    <span style={s.personaDesc}>{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              ...s.insight,
              borderLeftColor: selectedCompany?.color || "#6366f1"
            }}>
              <p style={s.insightLabel}>{selectedCompany?.name} interview style</p>
              <p style={s.insightText}>{INSIGHTS[company]}</p>
            </div>

            {error && (
              <div style={s.error}>⚠ {error}</div>
            )}

            <button
              className="bouncy"
              style={loading ? s.btnDisabled : s.btn}
              onClick={handleStart}
              disabled={loading}
            >
              {loading ? (
                <span style={s.btnInner}>
                  <span style={s.spinner} />
                  Preparing your session...
                </span>
              ) : (
                <span style={s.btnInner}>
                  Start Interview
                  <span style={s.btnArrow}>→</span>
                </span>
              )}
            </button>

            <p style={s.disclaimer}>
              Powered by Claude Sonnet · Questions adapt to your level in real time
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0a0f1e",
    fontFamily: "'Inter', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  bgOrb1: {
    position: "fixed", width: "700px", height: "700px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)",
    top: "-300px", left: "-200px", pointerEvents: "none",
  },
  bgOrb2: {
    position: "fixed", width: "500px", height: "500px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)",
    bottom: "-100px", right: "-100px", pointerEvents: "none",
  },
  bgOrb3: {
    position: "fixed", width: "400px", height: "400px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)",
    top: "40%", right: "30%", pointerEvents: "none",
  },
  header: {
    width: "100%", padding: "18px 40px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    position: "relative", zIndex: 10,
  },
  headerInner: {
    maxWidth: "1200px", margin: "0 auto",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  logo: { display: "flex", alignItems: "center", gap: "10px" },
  logoIcon: {
    width: "34px", height: "34px", borderRadius: "9px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "12px", fontWeight: "800", color: "#fff",
  },
  logoText: { color: "#f1f5f9", fontSize: "17px", fontWeight: "700", letterSpacing: "-0.3px" },
  logoDivider: {
    width: "1px", height: "14px", backgroundColor: "#1e293b", display: "inline-block"
  },
  logoSub: { color: "#475569", fontSize: "13px", fontWeight: "500" },
  headerRight: {},
  betaBadge: {
    backgroundColor: "rgba(99,102,241,0.1)", color: "#818cf8",
    border: "1px solid rgba(99,102,241,0.2)",
    padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "700",
    textTransform: "uppercase", letterSpacing: "0.5px",
  },

  userPill: {
    color: "#94a3b8", fontSize: "13px", fontWeight: "600",
  },
  logoutBtn: {
    backgroundColor: "transparent", color: "#64748b",
    border: "1px solid #1e293b", padding: "6px 14px",
    borderRadius: "20px", fontSize: "12px", fontWeight: "600", cursor: "pointer"
  },

  main: {
    maxWidth: "1200px", margin: "0 auto",
    padding: "60px 40px",
    display: "flex", gap: "80px", alignItems: "flex-start",
    position: "relative", zIndex: 10,
  },
  hero: { flex: 1, paddingTop: "8px" },
  heroBadge: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    backgroundColor: "rgba(99,102,241,0.08)",
    border: "1px solid rgba(99,102,241,0.15)",
    color: "#a5b4fc", padding: "6px 14px", borderRadius: "20px",
    fontSize: "12px", fontWeight: "600", marginBottom: "28px",
    letterSpacing: "0.2px",
  },
  heroBadgeDot: {
    width: "6px", height: "6px", borderRadius: "50%",
    backgroundColor: "#6366f1", display: "inline-block",
    animation: "pulse 2s infinite",
  },
  heroTitle: {
    fontSize: "54px", fontWeight: "800", lineHeight: "1.1",
    letterSpacing: "-2px", color: "#f8fafc", marginBottom: "20px",
  },
  heroSubtitle: {
    fontSize: "17px", color: "#cbd5e1", lineHeight: "1.75",
    marginBottom: "40px", maxWidth: "440px", fontWeight: "400",
  },
  statsRow: {
    display: "flex", gap: "36px", marginBottom: "48px",
    paddingBottom: "40px", borderBottom: "1px solid #1e293b",
  },
  statItem: { display: "flex", flexDirection: "column", gap: "3px" },
  statValue: { fontSize: "22px", fontWeight: "800", color: "#818cf8", letterSpacing: "-0.5px" },
  statLabel: { fontSize: "12px", color: "#64748b", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.3px" },
  featureList: { display: "flex", flexDirection: "column", gap: "14px" },
  featureItem: { display: "flex", alignItems: "flex-start", gap: "12px" },
  featureCheck: {
    width: "18px", height: "18px", borderRadius: "5px",
    backgroundColor: "rgba(99,102,241,0.15)", color: "#a5b4fc",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11px", fontWeight: "800", flexShrink: 0, marginTop: "1px",
  },
  featureLabel: { color: "#e2e8f0", fontSize: "14px", fontWeight: "600" },
  featureDesc: { color: "#94a3b8", fontSize: "14px", fontWeight: "400" },
  formWrap: { width: "440px", flexShrink: 0 },
  formCard: {
    padding: "36px",
    backgroundColor: "rgba(13, 20, 36, 0.65)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
  },
  formTitle: {
    fontSize: "20px", fontWeight: "700", color: "#f8fafc",
    letterSpacing: "-0.4px", marginBottom: "4px",
  },
  formSubtitle: {
    fontSize: "13px", color: "#94a3b8", marginBottom: "28px",
  },
  field: { marginBottom: "22px" },
  label: {
    display: "block", color: "#94a3b8", fontSize: "11px",
    fontWeight: "700", textTransform: "uppercase",
    letterSpacing: "0.6px", marginBottom: "10px",
  },
  input: {
    width: "100%", padding: "12px 14px",
    backgroundColor: "#070c18", border: "1px solid #1e293b",
    borderRadius: "10px", color: "#f1f5f9", fontSize: "14px",
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  companyGrid: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px",
  },
  companyBtn: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
    padding: "10px 6px", backgroundColor: "rgba(7,12,24,0.6)",
    backdropFilter: "blur(8px)",
    border: "1px solid #1e293b", borderRadius: "10px",
    cursor: "pointer", transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  companyLogoWrap: {
    width: "32px", height: "32px",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  companyName: {
    fontSize: "10px", fontWeight: "600",
    transition: "color 0.2s",
  },
  select: {
    width: "100%", padding: "12px 14px",
    backgroundColor: "#070c18", border: "1px solid #1e293b",
    borderRadius: "10px", color: "#f1f5f9", fontSize: "14px",
    outline: "none", cursor: "pointer", boxSizing: "border-box",
  },
  personaGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px",
  },
  personaBtn: {
    display: "flex", flexDirection: "column", alignItems: "flex-start",
    gap: "2px", padding: "10px 12px",
    backgroundColor: "#070c18", border: "1px solid #1e293b",
    borderRadius: "10px", cursor: "pointer", transition: "all 0.2s ease",
    textAlign: "left"
  },
  personaBtnActive: {
    borderColor: "rgba(99,102,241,0.6)",
    backgroundColor: "rgba(99,102,241,0.08)",
    boxShadow: "0 0 12px rgba(99,102,241,0.15)"
  },
  personaLabel: {
    color: "#e2e8f0", fontSize: "13px", fontWeight: "700"
  },
  personaDesc: {
    color: "#475569", fontSize: "11px", lineHeight: "1.4"
  },
  insight: {
    borderLeft: "2px solid #6366f1",
    paddingLeft: "14px", marginBottom: "22px",
  },
  insightLabel: {
    color: "#94a3b8", fontSize: "11px", fontWeight: "700",
    textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px",
  },
  insightText: {
    color: "#cbd5e1", fontSize: "13px", lineHeight: "1.6",
  },
  error: {
    color: "#fca5a5", backgroundColor: "rgba(248,113,113,0.06)",
    border: "1px solid rgba(248,113,113,0.12)",
    borderRadius: "8px", padding: "10px 14px",
    fontSize: "13px", marginBottom: "16px",
  },
  btn: {
    width: "100%", padding: "14px",
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#fff", border: "none", borderRadius: "10px",
    fontSize: "15px", fontWeight: "700", cursor: "pointer",
    boxShadow: "0 4px 24px rgba(99,102,241,0.35)",
    transition: "all 0.2s ease", letterSpacing: "-0.2px",
  },
  btnDisabled: {
    width: "100%", padding: "14px",
    backgroundColor: "#111827", color: "#475569",
    border: "1px solid #1e293b", borderRadius: "10px",
    fontSize: "15px", fontWeight: "700", cursor: "not-allowed",
  },
  btnInner: {
    display: "flex", alignItems: "center",
    justifyContent: "center", gap: "8px",
  },
  btnArrow: { fontSize: "16px" },
  spinner: {
    width: "15px", height: "15px",
    border: "2px solid #334155", borderTopColor: "#818cf8",
    borderRadius: "50%", display: "inline-block",
    animation: "spin 0.8s linear infinite",
  },
  disclaimer: {
    color: "#64748b", fontSize: "12px",
    textAlign: "center", marginTop: "14px", lineHeight: "1.5",
  },
};