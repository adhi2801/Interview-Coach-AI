import { useState } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import { API_URL } from "../config";

export default function CodingRoom({ problem, onFinish }) {
  const [code, setCode] = useState("# Write your solution here\n");
  const [hint, setHint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestHint() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.post(
        `${API_URL}/coding/hint`,
        {
          problem: problem?.text || "",
          current_code: code,
          language: "python",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHint(res.data.hint);
    } catch (err) {
      console.error(err);
      setError("Could not get a hint right now — try again in a moment.");
    }
    setLoading(false);
  }

  return (
    <div style={s.page}>
      <div style={s.editorPane}>
        <Editor
          height="100%"
          defaultLanguage="python"
          theme="vs-dark"
          value={code}
          onChange={(v) => setCode(v || "")}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
          }}
        />
      </div>

      <div style={s.sidePane}>
        <div style={s.header}>
          <span style={s.badge}>CODING</span>
          {onFinish && (
            <button style={s.endBtn} onClick={onFinish}>
              End Session
            </button>
          )}
        </div>

        <h3 style={s.problemTitle}>{problem?.title || "Problem"}</h3>
        <p style={s.problemText}>
          {problem?.text || "No problem loaded yet — this is a scaffold page, wire a real question bank in next."}
        </p>

        <button style={s.hintBtn} onClick={requestHint} disabled={loading}>
          {loading ? "Thinking..." : "Ask for a hint"}
        </button>

        {error && <p style={s.errorText}>{error}</p>}

        {hint && (
          <div style={s.hintBox}>
            <p style={s.hintLabel}>Hint</p>
            <p style={s.hintText}>{hint}</p>
          </div>
        )}

        <div style={s.noteBox}>
          <p style={s.noteText}>
            This is the Track B scaffold — editor and Socratic hints are live.
            Code execution, hidden test cases, and grading aren't wired up yet.
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    display: "flex",
    height: "100vh",
    backgroundColor: "#0a0f1e",
    fontFamily: "'Inter', sans-serif",
  },
  editorPane: {
    flex: 1,
    borderRight: "1px solid #1e293b",
  },
  sidePane: {
    width: "380px",
    padding: "24px",
    color: "#f8fafc",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#312e81",
    color: "#a5b4fc",
    fontSize: "11px",
    fontWeight: "700",
    padding: "4px 10px",
    borderRadius: "20px",
    letterSpacing: "0.5px",
  },
  endBtn: {
    backgroundColor: "transparent",
    color: "#f87171",
    border: "1px solid #f8717140",
    padding: "6px 14px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  problemTitle: {
    fontSize: "18px",
    fontWeight: "700",
    margin: 0,
  },
  problemText: {
    color: "#94a3b8",
    fontSize: "14px",
    lineHeight: "1.6",
    margin: 0,
  },
  hintBtn: {
    padding: "12px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  errorText: {
    color: "#fca5a5",
    fontSize: "13px",
    margin: 0,
  },
  hintBox: {
    backgroundColor: "rgba(99,102,241,0.08)",
    border: "1px solid rgba(99,102,241,0.2)",
    borderRadius: "10px",
    padding: "14px",
  },
  hintLabel: {
    color: "#a5b4fc",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    margin: "0 0 6px 0",
  },
  hintText: {
    color: "#e2e8f0",
    fontSize: "14px",
    lineHeight: "1.5",
    margin: 0,
  },
  noteBox: {
    marginTop: "auto",
    padding: "12px",
    backgroundColor: "#111827",
    borderRadius: "8px",
    border: "1px solid #1e293b",
  },
  noteText: {
    color: "#64748b",
    fontSize: "12px",
    lineHeight: "1.5",
    margin: 0,
  },
};