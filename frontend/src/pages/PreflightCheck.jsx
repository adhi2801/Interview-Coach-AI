import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, ChevronDown, ArrowRight,
  Keyboard, Activity, Check, RotateCcw, MicOff
} from "lucide-react";
import { COMPANIES } from "../constants/companies";

const PERSONA_ACCENT = {
  standard: "#10b981",
  hostile: "#ef4444",
  socratic: "#818cf8",
  exhausted: "#f59e0b",
};

function HardwareDropdown({ value, onChange, options, disabled }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOpt = options.find((o) => o.id === value) || options[0];

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#08080C] border transition-all text-xs font-semibold shadow-inner outline-none ${
          open
            ? "border-indigo-500/50 ring-1 ring-indigo-500/30 text-white"
            : "border-white/10 hover:border-white/20 text-slate-200"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <Mic size={14} className="text-indigo-400 shrink-0" />
          <span className="truncate">{selectedOpt ? selectedOpt.label : "Detecting Microphones..."}</span>
        </div>
        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-full left-0 w-full mt-2 p-1.5 bg-[#0A0A0C]/95 backdrop-blur-3xl border border-white/10 rounded-xl shadow-[0_25px_50px_rgba(0,0,0,0.9),_inset_0_1px_0_0_rgba(255,255,255,0.1)] z-50 overflow-hidden"
          >
            <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-hide">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { onChange(opt.id); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-all outline-none ${
                    value === opt.id
                      ? "bg-indigo-500/15 text-indigo-300 font-bold border border-indigo-500/30"
                      : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.id && <Check size={14} className="text-indigo-400 shrink-0 ml-2" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GlassPanel({ children, className = "", delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 0.68, 0, 1] }}
      className={`relative rounded-2xl bg-[#050508]/90 border border-white/[0.08] backdrop-blur-2xl overflow-hidden ${className}`}
      style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.08), 0 20px 50px -12px rgba(0,0,0,0.7)" }}
    >
      {children}
    </motion.div>
  );
}

// sessionData: { company, role, persona } — same shape Dashboard.jsx
// already builds. Missing pieces degrade honestly to generic copy.
export default function PreflightCheck({ onReady, onSkip, sessionData }) {
  const [micStatus, setMicStatus] = useState("checking");
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [decibels, setDecibels] = useState(-100);

  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const canvasRef = useRef(null);

  const noiseSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

  const hasContext = Boolean(sessionData?.company && sessionData?.role && sessionData?.persona);
  const activeComp = hasContext ? COMPANIES.find((c) => c.id === sessionData.company?.toLowerCase()) : null;
  const personaKey = hasContext ? sessionData.persona?.toLowerCase() : null;
  const personaAccent = personaKey ? PERSONA_ACCENT[personaKey] || "#818cf8" : "#818cf8";

  useEffect(() => {
    checkMicrophone();
    return () => cleanupAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupAudio = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== "closed") audioContextRef.current.close();
  };

  const formatDeviceLabel = (label) => {
    if (!label || label.trim().toLowerCase() === "default") return "Default - System Microphone";
    const cleanLabel = label.trim();
    return cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);
  };

  async function checkMicrophone(deviceIdOverride) {
    cleanupAudio();
    try {
      const devList = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devList.filter((device) => device.kind === "audioinput");
      const options = audioInputs.map((d, i) => ({ id: d.deviceId || `mic-${i}`, label: formatDeviceLabel(d.label) }));
      setDevices(options);

      const targetDevice = deviceIdOverride || selectedDevice || options[0]?.id || "";
      if (targetDevice !== selectedDevice) setSelectedDevice(targetDevice);

      const constraints = { audio: targetDevice ? { deviceId: { exact: targetDevice } } : true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setMicStatus("granted");

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      drawWaveform();
    } catch (err) {
      console.warn("Microphone permission denied or hardware unavailable:", err);
      setMicStatus("denied");
    }
  }

  function drawWaveform() {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let smoothedDb = -100;
    let lastStateUpdate = 0;

    const renderLoop = (timestamp) => {
      animationRef.current = requestAnimationFrame(renderLoop);
      analyser.getByteTimeDomainData(dataArray);

      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        let normalized = (dataArray[i] / 128.0) - 1.0;
        sumSquares += normalized * normalized;
      }
      let rms = Math.sqrt(sumSquares / bufferLength);
      let instantDb = 20 * Math.log10(Math.max(rms, 0.0001));
      smoothedDb = (smoothedDb * 0.82) + (instantDb * 0.18);

      if (!lastStateUpdate || timestamp - lastStateUpdate > 120) {
        lastStateUpdate = timestamp;
        setDecibels(smoothedDb);
      }

      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      ctx.lineWidth = 2;
      ctx.strokeStyle = smoothedDb > -38 ? "#10b981" : "rgba(99, 102, 241, 0.5)";
      ctx.beginPath();

      const sliceWidth = (width * 1.0) / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * (height / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(width, height / 2);

      if (smoothedDb > -38) { ctx.shadowBlur = 12; ctx.shadowColor = "#10b981"; }
      else { ctx.shadowBlur = 0; }

      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    renderLoop(0);
  }

  const displayDb = decibels <= -99 ? "—" : decibels.toFixed(1);
  const isSignalActive = decibels > -38;

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden flex items-center justify-center p-6 relative">

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full bg-indigo-600/10 blur-[160px] mix-blend-screen" />
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-blue-600/10 blur-[140px] mix-blend-screen" />
      </div>
      <div className="fixed inset-0 z-10 pointer-events-none opacity-[0.035] mix-blend-soft-light" style={{ backgroundImage: noiseSvg }} />

      <div className="relative z-20 w-full max-w-[640px] flex flex-col gap-3.5">

        <GlassPanel delay={0.03} className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
              {hasContext && activeComp ? activeComp.logo : <Mic size={18} className="text-slate-500" />}
            </div>
            <div className="min-w-0">
              {hasContext ? (
                <>
                  <p className="text-[17px] font-extrabold tracking-tight text-white leading-snug">
                    Calibrating for your <span className="text-indigo-300">{activeComp?.name || sessionData.company}</span> ·{" "}
                    <span className="text-indigo-300">{sessionData.role}</span> ·{" "}
                    <span style={{ color: personaAccent }}>{sessionData.persona}</span> interview
                  </p>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">
                    Session context loaded from setup
                  </span>
                </>
              ) : (
                <>
                  <p className="text-[17px] font-extrabold tracking-tight text-slate-400 italic">Audio calibration</p>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-600">
                    No session context available — generic calibration
                  </span>
                </>
              )}
            </div>
          </div>
        </GlassPanel>

        <GlassPanel delay={0.1} className="p-5">
          <div className="flex justify-between items-center mb-2.5 ml-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Input Source</span>
            {micStatus === "granted" && (
              <span className={`text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5 ${isSignalActive ? "text-emerald-400" : "text-indigo-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isSignalActive ? "bg-emerald-400 animate-pulse" : "bg-indigo-400"}`} />
                {isSignalActive ? "Signal Locked" : "Mic Standby"}
              </span>
            )}
            {micStatus === "denied" && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5 text-rose-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Access Denied
              </span>
            )}
          </div>
          <HardwareDropdown
            value={selectedDevice}
            onChange={(id) => checkMicrophone(id)}
            options={devices}
            disabled={micStatus === "checking" || micStatus === "denied"}
          />
        </GlassPanel>

        <GlassPanel delay={0.17} className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Acoustic Calibration Test</span>
            <span className="text-[10px] text-slate-600">Read aloud, naturally</span>
          </div>
          <p className="text-[17px] md:text-[19px] font-bold italic leading-relaxed text-slate-100/90 pl-4 border-l-2 border-indigo-400/40">
            "Speak naturally: 'The architecture requires a resilient, partitioned data store.'"
          </p>
        </GlassPanel>

        <GlassPanel delay={0.24} className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={13} className={isSignalActive ? "text-emerald-400" : "text-indigo-400"} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Live Signal — AnalyserNode</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-base font-extrabold tabular-nums transition-colors ${isSignalActive ? "text-emerald-400" : "text-white"}`}>
                {displayDb}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">dB</span>
            </div>
          </div>
          <div className="w-full h-40 relative overflow-hidden rounded-xl bg-black/40 border border-white/[0.06]">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>
        </GlassPanel>

        <AnimatePresence>
          {micStatus === "denied" && (
            <GlassPanel delay={0} className="p-6 !border-rose-500/20">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <MicOff size={18} className="text-rose-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-rose-400 mb-1">Microphone access denied</p>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Your browser blocked microphone access for this site. You can still take this interview in text-only mode, or grant access and retry.
                  </p>
                  <ol className="space-y-1.5 mb-3.5">
                    {[
                      "Click the lock/site-info icon in your browser's address bar",
                      'Set Microphone permission to "Allow"',
                      "Reload this page and try again",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
                        <span className="font-mono font-bold text-rose-400 text-[10px] mt-0.5 shrink-0">0{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <button
                    onClick={() => checkMicrophone()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-bold hover:bg-rose-500/15 transition-colors"
                  >
                    <RotateCcw size={12} /> Retry Microphone Access
                  </button>
                </div>
              </div>
            </GlassPanel>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.31 }}
          className="flex items-center gap-2.5 pt-1"
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onSkip}
            type="button"
            className="px-5 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-all outline-none flex items-center gap-2"
          >
            <Keyboard size={14} /> Skip (Text Only)
          </motion.button>

          <motion.button
            whileTap={{ scale: micStatus === "granted" ? 0.97 : 1 }}
            onClick={onReady}
            disabled={micStatus !== "granted"}
            type="button"
            className={`relative flex-1 flex items-center justify-center py-3 px-6 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-500 group ${
              micStatus === "granted"
                ? "bg-white text-black hover:bg-slate-200 shadow-[0_0_25px_rgba(255,255,255,0.15)] hover:shadow-[0_0_35px_rgba(255,255,255,0.25)]"
                : "bg-[#111111] border border-white/10 text-slate-600 cursor-not-allowed"
            }`}
          >
            {micStatus === "granted" ? (
              <>
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                Launch Simulator <ArrowRight size={14} className="ml-1 relative z-10" />
              </>
            ) : (
              <span>Awaiting Hardware...</span>
            )}
          </motion.button>
        </motion.div>

      </div>
    </div>
  );
}