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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                backgroundColor: audioLevel > 60 ? "#facc15" : "#2563eb"
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
    minHeight: "100vh", backgroundColor: "#0A0A0A",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Inter', sans-serif", padding: "20px"
  },
  card: {
    width: "460px", padding: "40px",
    backgroundColor: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px",
    boxShadow: "0 30px 60px rgba(0,0,0,0.5)"
  },
  label: {
    color: "#2563eb", fontSize: "11px", fontWeight: "700",
    textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px 0"
  },
  title: { color: "#f5f5f5", fontSize: "24px", fontWeight: "700", margin: "0 0 6px 0", letterSpacing: "-0.02em" },
  subtitle: { color: "#a1a1aa", fontSize: "14px", marginBottom: "28px", lineHeight: "1.5" },
  checkRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.07)"
  },
  checkLeft: { display: "flex", alignItems: "center", gap: "10px" },
  statusDot: { width: "8px", height: "8px", borderRadius: "50%" },
  checkLabel: { color: "#e4e4e7", fontSize: "14px", fontWeight: "600" },
  checkStatus: { color: "#71717a", fontSize: "13px" },
  levelMeter: { marginTop: "16px", marginBottom: "8px" },
  levelLabel: { color: "#71717a", fontSize: "12px", marginBottom: "8px" },
  levelTrack: { height: "6px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" },
  levelFill: { height: "100%", borderRadius: "3px", transition: "width 0.1s ease" },
  warningBox: {
    backgroundColor: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)",
    borderRadius: "8px", padding: "12px 14px", marginTop: "16px"
  },
  warningText: { color: "#fca5a5", fontSize: "13px", lineHeight: "1.5", margin: 0 },
  actions: { display: "flex", gap: "12px", marginTop: "28px" },
  skipBtn: {
    flex: 1, padding: "12px", backgroundColor: "transparent",
    color: "#71717a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
    fontSize: "13px", fontWeight: "600", cursor: "pointer",
    transition: "transform 0.12s cubic-bezier(0.34,1.56,0.64,1)"
  },
  continueBtn: {
    flex: 1.5, padding: "12px", background: "#2563eb",
    color: "#fff", border: "none", borderRadius: "10px",
    fontSize: "14px", fontWeight: "700", cursor: "pointer",
    transition: "transform 0.12s cubic-bezier(0.34,1.56,0.64,1)"
  },
  continueBtnDisabled: {
    flex: 1.5, padding: "12px", backgroundColor: "rgba(255,255,255,0.06)",
    color: "#52525b", border: "none", borderRadius: "10px",
    fontSize: "14px", fontWeight: "700", cursor: "not-allowed"
  }
};