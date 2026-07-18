import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import { API_URL } from "../config";

export default function CodingRoom({ problemSlug = null, sessionId, onFinish }) {
  const [problem, setProblem] = useState(null);
  const [loadingProblem, setLoadingProblem] = useState(true);
  const [code, setCode] = useState("");
  const [language] = useState("python"); // only python starter code exists in the seed bank right now — extend seed_coding_problems.py before adding a language selector

  const [hint, setHint] = useState(null);
  const [hintLoading, setHintLoading] = useState(false);

  const [runResults, setRunResults] = useState(null);
  const [running, setRunning] = useState(false);

  const [submitResult, setSubmitResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  // Full problem bank, for the manual picker dropdown — separate from the
  // adaptive single-problem fetch below.
  const [allProblems, setAllProblems] = useState([]);

  // Past submissions, most recent first — surfaces CodingSubmission rows
  // that were already being saved but never displayed anywhere.
  const [submissionHistory, setSubmissionHistory] = useState([]);

  useEffect(() => {
    fetchProblem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemSlug]);

  useEffect(() => {
    fetchAllProblems();
    fetchSubmissionHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function authHeaders() {
    const token = localStorage.getItem("access_token");
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  async function fetchProblem() {
    setLoadingProblem(true);
    setError("");
    try {
      let slugToLoad = problemSlug;

      // No specific slug forced — resolve an adaptive one based on the
      // user's real ELO instead of always defaulting to "two_sum".
      if (!slugToLoad) {
        const nextRes = await axios.get(`${API_URL}/coding/next`, authHeaders());
        if (nextRes.data.error) {
          setError(nextRes.data.error);
          setLoadingProblem(false);
          return;
        }
        slugToLoad = nextRes.data.slug;
      }

      const res = await axios.get(`${API_URL}/coding/problems/${slugToLoad}`);
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setProblem(res.data);
        setCode(res.data.starter_code?.[language] || "# Write your solution here\n");
      }
    } catch (err) {
      console.error(err);
      setError("Could not load problem — check your connection and try again.");
    }
    setLoadingProblem(false);
  }

  async function fetchAllProblems() {
    try {
      const res = await axios.get(`${API_URL}/coding/problems`);
      setAllProblems(res.data.problems || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchSubmissionHistory() {
    try {
      const res = await axios.get(`${API_URL}/coding/submissions`, authHeaders());
      setSubmissionHistory(res.data.submissions || []);
    } catch (err) {
      console.error(err);
    }
  }

  // Manual pick from the dropdown — loads a specific problem by slug,
  // independent of the adaptive ELO-based selection nextProblem() uses.
  async function loadProblemBySlug(slug) {
    setSubmitResult(null);
    setRunResults(null);
    setHint(null);
    setError("");
    setProblem(null);
    setLoadingProblem(true);
    try {
      const res = await axios.get(`${API_URL}/coding/problems/${slug}`);
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setProblem(res.data);
        setCode(res.data.starter_code?.[language] || "# Write your solution here\n");
      }
    } catch (err) {
      console.error(err);
      setError("Could not load that problem.");
    }
    setLoadingProblem(false);
  }

  async function nextProblem() {
    setSubmitResult(null);
    setRunResults(null);
    setHint(null);
    setError("");
    setProblem(null);
    setLoadingProblem(true);
    try {
      const nextRes = await axios.get(`${API_URL}/coding/next`, authHeaders());
      if (nextRes.data.error) {
        setError(nextRes.data.error);
        setLoadingProblem(false);
        return;
      }
      const res = await axios.get(`${API_URL}/coding/problems/${nextRes.data.slug}`);
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setProblem(res.data);
        setCode(res.data.starter_code?.[language] || "# Write your solution here\n");
      }
    } catch (err) {
      console.error(err);
      setError("Could not load the next problem — check your connection and try again.");
    }
    setLoadingProblem(false);
  }

  async function requestHint() {
    setHintLoading(true);
    setError("");
    try {
      const res = await axios.post(
        `${API_URL}/coding/hint`,
        { problem: problem?.description || "", current_code: code, language },
        authHeaders()
      );
      setHint(res.data.hint);
    } catch (err) {
      console.error(err);
      setError("Could not get a hint right now — try again in a moment.");
    }
    setHintLoading(false);
  }

  async function runCode() {
    if (!problem) return;
    setRunning(true);
    setError("");
    setSubmitResult(null); // clear stale submit results so old and new feedback never show together
    try {
      const res = await axios.post(
        `${API_URL}/coding/run`,
        { problem_id: problem.id, code, language },
        authHeaders()
      );
      setRunResults(res.data);
    } catch (err) {
      console.error(err);
      setError("Run failed — the sandbox may be temporarily unavailable.");
    }
    setRunning(false);
  }

  async function submitCode() {
    if (!problem) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await axios.post(
        `${API_URL}/coding/submit`,
        { problem_id: problem.id, code, language, session_id: sessionId || null },
        authHeaders()
      );
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setSubmitResult(res.data);
        setRunResults(null); // submit result supersedes the last run's sample-case results
        fetchSubmissionHistory(); // refresh the history list to include this new submission
      }
    } catch (err) {
      console.error(err);
      setError("Submit failed — the sandbox may be temporarily unavailable.");
    }
    setSubmitting(false);
  }

  if (loadingProblem) {
    return <div style={s.loadingPage}>Loading problem...</div>;
  }

  if (!problem) {
    return (
      <div style={s.loadingPage}>
        {error || "No problem loaded."}
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.editorPane}>
        <Editor
          height="100%"
          defaultLanguage={language}
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
          <span style={s.badge}>CODING — L{problem.difficulty}</span>
          {onFinish && (
            <button style={s.endBtn} onClick={onFinish}>
              End Session
            </button>
          )}
        </div>

        {allProblems.length > 0 && (
          <select
            value={problem.slug}
            onChange={(e) => loadProblemBySlug(e.target.value)}
            style={s.picker}
          >
            {allProblems.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title} (L{p.difficulty})
              </option>
            ))}
          </select>
        )}

        <h3 style={s.problemTitle}>{problem.title}</h3>
        <p style={s.problemText}>{problem.description}</p>

        <div style={s.actionRow}>
          <button style={s.runBtn} onClick={runCode} disabled={running}>
            {running ? "Running..." : "Run"}
          </button>
          <button style={s.submitBtn} onClick={submitCode} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>

        <button style={s.hintBtn} onClick={requestHint} disabled={hintLoading}>
          {hintLoading ? "Thinking..." : "Ask for a hint"}
        </button>

        {error && <p style={s.errorText}>{error}</p>}

        {hint && (
          <div style={s.hintBox}>
            <p style={s.hintLabel}>Hint</p>
            <p style={s.hintText}>{hint}</p>
          </div>
        )}

        {/* Run results: sample cases only, self-check before submitting */}
        {runResults && (
          <div style={s.resultsBox}>
            <p style={s.resultsLabel}>
              Sample Cases: {runResults.passed_count}/{runResults.total} passed
            </p>
            {runResults.results.map((r, i) => (
              <div key={i} style={r.passed ? s.caseRowPass : s.caseRowFail}>
                <span style={s.caseStatus}>{r.passed ? "✓" : "✗"}</span>
                <div style={s.caseDetail}>
                  <p style={s.caseLine}>input: {r.input || "(none)"}</p>
                  <p style={s.caseLine}>expected: {r.expected}</p>
                  <p style={s.caseLine}>got: {r.actual || "(no output)"}</p>
                  {r.stderr && <p style={s.caseError}>{r.stderr}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit results: full grading against hidden cases + Claude's quality review */}
        {submitResult && (
          <div style={s.resultsBox}>
            <p style={s.resultsLabel}>
              Submitted: {submitResult.tests_passed}/{submitResult.tests_total} tests passed
            </p>
            {submitResult.complexity_estimate && (
              <p style={s.gradeLine}>Complexity: {submitResult.complexity_estimate}</p>
            )}
            {submitResult.cleanliness_score != null && (
              <p style={s.gradeLine}>Cleanliness: {submitResult.cleanliness_score}/10</p>
            )}
            {submitResult.naming_score != null && (
              <p style={s.gradeLine}>Naming: {submitResult.naming_score}/10</p>
            )}
            {submitResult.feedback && (
              <p style={s.feedbackText}>{submitResult.feedback}</p>
            )}
            {submitResult.new_elo != null && (
              <p style={s.gradeLine}>New ELO: {Math.round(submitResult.new_elo)}</p>
            )}
            <button style={s.nextBtn} onClick={nextProblem}>
              Next Problem →
            </button>
          </div>
        )}

        {/* Recent submission history — surfaces CodingSubmission rows that
            were already being saved to the DB but never shown anywhere. */}
        {submissionHistory.length > 0 && (
          <div style={s.resultsBox}>
            <p style={s.resultsLabel}>Recent Submissions</p>
            {submissionHistory.slice(0, 5).map((sub) => (
              <p key={sub.id} style={s.caseLine}>
                {sub.problem_title} — {sub.tests_passed}/{sub.tests_total} passed
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  loadingPage: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    backgroundColor: "#0A0A0A", color: "#71717a", fontFamily: "'Inter', sans-serif", fontSize: "14px",
  },
  page: {
    display: "flex",
    height: "100vh",
    backgroundColor: "#0A0A0A",
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
  picker: {
    width: "100%",
    padding: "8px 10px",
    backgroundColor: "#0A0A0A",
    color: "#f8fafc",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    fontSize: "12px",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
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
    fontSize: "13px",
    lineHeight: "1.6",
    margin: 0,
    whiteSpace: "pre-line",
  },
  actionRow: {
    display: "flex",
    gap: "8px",
  },
  runBtn: {
    flex: 1,
    padding: "10px",
    background: "transparent",
    color: "#a5b4fc",
    border: "1px solid rgba(165,180,252,0.3)",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
  submitBtn: {
    flex: 1,
    padding: "10px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
  nextBtn: {
    width: "100%",
    padding: "12px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "4px",
  },
  hintBtn: {
    padding: "12px",
    background: "transparent",
    color: "#94a3b8",
    border: "1px solid #1e293b",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "600",
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
  resultsBox: {
    backgroundColor: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "10px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  resultsLabel: {
    fontSize: "13px",
    fontWeight: "700",
    margin: 0,
    color: "#f5f5f5",
  },
  caseRowPass: {
    display: "flex",
    gap: "8px",
    padding: "8px",
    borderRadius: "6px",
    backgroundColor: "rgba(74,222,128,0.06)",
  },
  caseRowFail: {
    display: "flex",
    gap: "8px",
    padding: "8px",
    borderRadius: "6px",
    backgroundColor: "rgba(248,113,113,0.06)",
  },
  caseStatus: {
    fontSize: "13px",
    fontWeight: "700",
    flexShrink: 0,
  },
  caseDetail: {
    flex: 1,
    minWidth: 0,
  },
  caseLine: {
    fontSize: "11px",
    color: "#94a3b8",
    margin: "0 0 2px 0",
    fontFamily: "'JetBrains Mono', monospace",
    wordBreak: "break-all",
  },
  caseError: {
    fontSize: "11px",
    color: "#fca5a5",
    margin: "4px 0 0 0",
    fontFamily: "'JetBrains Mono', monospace",
  },
  gradeLine: {
    fontSize: "13px",
    color: "#cbd5e1",
    margin: 0,
  },
  feedbackText: {
    fontSize: "13px",
    color: "#94a3b8",
    lineHeight: "1.5",
    margin: "6px 0 0 0",
  },
};