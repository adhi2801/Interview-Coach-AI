import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../config";

export default function StudyPlan({ topicName, company, onClose }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await axios.get(`${API_URL}/study-plan/${topicName}`, {
          params: { company }
        });
        setPlan(res.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    fetchPlan();
  }, [topicName, company]);

  if (loading) {
    return (
      <div style={s.overlay} onClick={onClose}>
        <div style={s.modal} onClick={(e) => e.stopPropagation()}>
          <p style={s.loadingText}>Building your study path...</p>
        </div>
      </div>
    );
  }

  if (!plan || !plan.steps?.length) return null;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <div>
            <p style={s.headerLabel}>Study Path</p>
            <h2 style={s.headerTitle}>{topicName.replace(/_/g, " ")}</h2>
          </div>
          <button style={s.closeBtn} onClick={onClose}>×</button>
        </div>

        <p style={s.subtitle}>
          {plan.steps.length} concepts to master, in the order our knowledge graph
          determined you need them — each step unlocks the next.
        </p>

        <div style={s.timeline}>
          {plan.steps.map((step, i) => {
            const isTarget = i === plan.steps.length - 1;
            const relevanceColor =
              step.company_relevance >= 1.6 ? "#f87171" :
              step.company_relevance >= 1.3 ? "#facc15" :
              step.company_relevance <= 0.6 ? "#475569" : "#6366f1";

            return (
              <div key={step.name} style={s.stepRow}>
                <div style={s.stepLeft}>
                  <div style={{
                    ...s.stepDot,
                    backgroundColor: isTarget ? "#6366f1" : "#1e293b",
                    border: isTarget ? "none" : "2px solid #334155"
                  }}>
                    {i + 1}
                  </div>
                  {i < plan.steps.length - 1 && <div style={s.stepLine} />}
                </div>

                <div style={s.stepContent}>
                  <div style={s.stepTop}>
                    <span style={isTarget ? s.stepNameTarget : s.stepName}>
                      {step.name.replace(/_/g, " ")}
                    </span>
                    <span style={s.diffBadge}>L{step.difficulty}</span>
                    {company && (
                      <span style={{ ...s.relevanceBadge, color: relevanceColor, borderColor: relevanceColor + "40" }}>
                        {step.company_relevance >= 1.6 ? "Critical for " + company :
                         step.company_relevance >= 1.3 ? "Important for " + company :
                         step.company_relevance <= 0.6 ? "Lower priority" : "Standard"}
                      </span>
                    )}
                  </div>
                  <p style={s.stepDesc}>{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: "20px"
  },
  modal: {
    backgroundColor: "#0f172a", border: "1px solid #1e293b",
    borderRadius: "20px", padding: "32px", maxWidth: "560px",
    width: "100%", maxHeight: "80vh", overflowY: "auto",
    fontFamily: "'Inter', sans-serif"
  },
  loadingText: { color: "#94a3b8", fontSize: "14px", textAlign: "center" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" },
  headerLabel: { color: "#6366f1", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px 0" },
  headerTitle: { color: "#f8fafc", fontSize: "22px", fontWeight: "800", margin: 0, textTransform: "capitalize" },
  closeBtn: { background: "none", border: "none", color: "#475569", fontSize: "24px", cursor: "pointer", lineHeight: 1 },
  subtitle: { color: "#64748b", fontSize: "13px", lineHeight: "1.6", marginBottom: "24px" },
  timeline: { display: "flex", flexDirection: "column" },
  stepRow: { display: "flex", gap: "16px" },
  stepLeft: { display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 },
  stepDot: {
    width: "32px", height: "32px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#cbd5e1", fontSize: "13px", fontWeight: "700", flexShrink: 0
  },
  stepLine: { width: "2px", flex: 1, backgroundColor: "#1e293b", minHeight: "24px" },
  stepContent: { paddingBottom: "24px", flex: 1 },
  stepTop: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" },
  stepName: { color: "#e2e8f0", fontSize: "15px", fontWeight: "600", textTransform: "capitalize" },
  stepNameTarget: { color: "#a5b4fc", fontSize: "16px", fontWeight: "800", textTransform: "capitalize" },
  diffBadge: {
    backgroundColor: "#1e293b", color: "#64748b", fontSize: "10px",
    fontWeight: "700", padding: "2px 6px", borderRadius: "4px"
  },
  relevanceBadge: {
    fontSize: "10px", fontWeight: "700", padding: "2px 8px",
    borderRadius: "20px", border: "1px solid", textTransform: "uppercase"
  },
  stepDesc: { color: "#64748b", fontSize: "13px", lineHeight: "1.5", margin: 0 }
};