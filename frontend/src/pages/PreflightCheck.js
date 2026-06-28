import { useState, useRef, useEffect } from "react";

export default function PreflightCheck({ onReady, onSkip }) {
  const [micStatus, setMicStatus] = useState("checking"); // checking | granted | denied
  const [audioLevel, setAudioLevel] = useState(0);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    checkMicrophone();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  async function checkMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicStatus("granted");

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      monitorLevel();
    } catch (err) {
      setMicStatus("denied");
    }
  }

  function monitorLevel() {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function update() {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(Math.min(100, (average / 128) * 100));
      animationRef.current = requestAnimationFrame(update);
    }
    update();
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <p style={s.label}>Before you begin</p>
        <h1 style={s.title}>Let's check your setup</h1>
        <p style={s.subtitle}>
          A quick check ensures your interview session runs smoothly.
        </p>

        <div style={s.checkRow}>
          <div style={s.checkLeft}>
            <span style={{
              ...s.statusDot,
              backgroundColor: micStatus === "granted" ? "#4ade80" :
                micStatus === "denied" ? "#f87171" : "#facc15"
            }} />
            <span style={s.checkLabel}>Microphone</span>
          </div>
          <span style={s.checkStatus}>
            {micStatus === "checking" && "Requesting access..."}
            {micStatus === "granted" && "Connected"}
            {micStatus === "denied" && "Access denied"}
          </span>
        </div>

        {micStatus === "granted" && (
          <div style={s.levelMeter}>
            <p style={s.levelLabel}>Speak normally to test your input level</p>
            <div style={s.levelTrack}>
              <div style={{
                ...s.levelFill,
                width: `${audioLevel}%`,
                backgroundColor: audioLevel > 60 ? "#facc15" : "#6366f1"
              }} />
            </div>
          </div>
        )}

        {micStatus === "denied" && (
          <div style={s.warningBox}>
            <p style={s.warningText}>
              Microphone access was not granted. You can still type your answers,
              or enable microphone access in your browser settings and refresh.
            </p>
          </div>
        )}

        <div style={s.actions}>
          <button style={s.skipBtn} onClick={onSkip}>
            Skip and type answers
          </button>
          <button
            style={micStatus === "granted" ? s.continueBtn : s.continueBtnDisabled}
            onClick={onReady}
            disabled={micStatus === "checking"}
          >
            Continue to interview →
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh", backgroundColor: "#0a0f1e",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Inter', sans-serif", padding: "20px"
  },
  card: {
    width: "460px", padding: "40px",
    backgroundColor: "rgba(13,20,36,0.65)", backdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
  },
  label: {
    color: "#6366f1", fontSize: "11px", fontWeight: "700",
    textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px 0"
  },
  title: { color: "#f8fafc", fontSize: "24px", fontWeight: "700", margin: "0 0 6px 0" },
  subtitle: { color: "#94a3b8", fontSize: "14px", marginBottom: "28px", lineHeight: "1.5" },
  checkRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 0", borderBottom: "1px solid #1e293b"
  },
  checkLeft: { display: "flex", alignItems: "center", gap: "10px" },
  statusDot: { width: "8px", height: "8px", borderRadius: "50%" },
  checkLabel: { color: "#e2e8f0", fontSize: "14px", fontWeight: "600" },
  checkStatus: { color: "#64748b", fontSize: "13px" },
  levelMeter: { marginTop: "16px", marginBottom: "8px" },
  levelLabel: { color: "#64748b", fontSize: "12px", marginBottom: "8px" },
  levelTrack: { height: "6px", backgroundColor: "#1e293b", borderRadius: "3px", overflow: "hidden" },
  levelFill: { height: "100%", borderRadius: "3px", transition: "width 0.1s ease" },
  warningBox: {
    backgroundColor: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.12)",
    borderRadius: "8px", padding: "12px 14px", marginTop: "16px"
  },
  warningText: { color: "#fca5a5", fontSize: "13px", lineHeight: "1.5", margin: 0 },
  actions: { display: "flex", gap: "12px", marginTop: "28px" },
  skipBtn: {
    flex: 1, padding: "12px", backgroundColor: "transparent",
    color: "#64748b", border: "1px solid #1e293b", borderRadius: "10px",
    fontSize: "13px", fontWeight: "600", cursor: "pointer"
  },
  continueBtn: {
    flex: 1.5, padding: "12px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff", border: "none", borderRadius: "10px",
    fontSize: "14px", fontWeight: "700", cursor: "pointer"
  },
  continueBtnDisabled: {
    flex: 1.5, padding: "12px", backgroundColor: "#1e293b",
    color: "#475569", border: "none", borderRadius: "10px",
    fontSize: "14px", fontWeight: "700", cursor: "not-allowed"
  }
};