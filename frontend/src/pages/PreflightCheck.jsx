import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, ChevronDown, ShieldAlert, ArrowRight, 
  Keyboard, Activity, CheckCircle2, Volume2, Check, Sparkles 
} from "lucide-react";

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

export default function PreflightCheck({ onReady, onSkip }) {
  const [micStatus, setMicStatus] = useState("checking"); // 'checking' | 'granted' | 'denied'
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [decibels, setDecibels] = useState(-100);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const canvasRef = useRef(null);
  const cardRef = useRef(null);

  const noiseSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

  useEffect(() => {
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    checkMicrophone();
    return () => cleanupAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDevice]);

  const cleanupAudio = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
  };

  // Convert raw strings like "default" into polished hardware labels
  const formatDeviceLabel = (label, index) => {
    if (!label || label.trim().toLowerCase() === "default") {
      return "Default - System Microphone";
    }
    const cleanLabel = label.trim();
    return cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);
  };

  async function checkMicrophone() {
    cleanupAudio();
    try {
      const devList = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devList.filter((device) => device.kind === "audioinput");
      
      const options = audioInputs.map((d, i) => ({
        id: d.deviceId || `mic-${i}`,
        label: formatDeviceLabel(d.label, i)
      }));
      setDevices(options);
      
      if (!selectedDevice && options.length > 0) {
        setSelectedDevice(options[0].id);
      }

      const constraints = {
        audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true
      };
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

      // EMA smoothing filter to eliminate digital jitter
      smoothedDb = (smoothedDb * 0.82) + (instantDb * 0.18);

      if (!lastStateUpdate || timestamp - lastStateUpdate > 120) {
        lastStateUpdate = timestamp;
        setDecibels(smoothedDb);
      }

      ctx.clearRect(0, 0, width, height);

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
      
      if (smoothedDb > -38) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#10b981";
      } else {
        ctx.shadowBlur = 0;
      }
      
      ctx.stroke();
      ctx.shadowBlur = 0;
    };
    
    renderLoop(0);
  }

  const cardRect = cardRef.current ? cardRef.current.getBoundingClientRect() : null;
  const isCardHovered = cardRect && 
    mousePos.x >= cardRect.left && mousePos.x <= cardRect.right &&
    mousePos.y >= cardRect.top && mousePos.y <= cardRect.bottom;
  const cursorX = cardRect ? mousePos.x - cardRect.left : 0;
  const cursorY = cardRect ? mousePos.y - cardRect.top : 0;

  const displayDb = decibels <= -99 ? "-80.0" : decibels.toFixed(1);
  const isSignalActive = decibels > -38;

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden flex items-center justify-center p-6 relative">
      
      {/* LAYER 1: Ambient Indigo/Blue Volumetric Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full bg-indigo-600/10 blur-[160px] mix-blend-screen" />
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-blue-600/10 blur-[140px] mix-blend-screen" />
      </div>

      {/* LAYER 2: Microscopic Film Grain */}
      <div 
        className="fixed inset-0 z-10 pointer-events-none opacity-[0.035] mix-blend-soft-light"
        style={{ backgroundImage: noiseSvg }}
      />

      {/* LAYER 3: Unified Single-Surface Glass Console */}
      <div className="relative z-20 w-full max-w-[580px] overflow-hidden">
        
        <div
          ref={cardRef}
          className="relative rounded-2xl bg-[#050508]/90 border border-white/[0.08] p-8 md:p-10 backdrop-blur-3xl overflow-hidden transition-all duration-300"
          style={{
            boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.12), 0 30px 60px -12px rgba(0,0,0,0.9)"
          }}
        >
          {/* Vercel-style cursor spotlight */}
          <div 
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
            style={{
              background: `radial-gradient(400px circle at ${cursorX}px ${cursorY}px, rgba(255,255,255,0.06), transparent 40%)`,
              opacity: isCardHovered ? 1 : 0
            }}
          />

          <div className="relative z-10 space-y-8">
            
            {/* TOP HEADER: Brand & Status Pill */}
            <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded bg-white flex items-center justify-center font-extrabold text-black text-xs shadow-[0_0_15px_rgba(255,255,255,0.3)]">IC</div>
                <span className="font-bold text-white tracking-tight text-base">InterviewCoach</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[10px] font-mono font-bold tracking-widest text-slate-300">
                <Sparkles size={11} className="text-indigo-400" /> ACOUSTIC CALIBRATION
              </div>
            </div>

            {/* ERROR BANNER: Mic Denied State */}
            <AnimatePresence>
              {micStatus === "denied" && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: "auto" }} 
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-300 flex items-start gap-3">
                    <ShieldAlert size={18} className="text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-bold text-white mb-0.5">Microphone Access Denied</span>
                      <span>Click the lock icon in your browser address bar to grant microphone permissions, then reload.</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* INPUT DEVICE SELECTOR */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block">Input Source</label>
                {micStatus === "granted" && (
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5 ${isSignalActive ? "text-emerald-400" : "text-indigo-400"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isSignalActive ? "bg-emerald-400 animate-pulse" : "bg-indigo-400"}`} />
                    {isSignalActive ? "Signal Locked" : "Mic Standby"}
                  </span>
                )}
              </div>
              <HardwareDropdown 
                value={selectedDevice}
                onChange={setSelectedDevice}
                options={devices}
                disabled={micStatus === "checking" || micStatus === "denied"}
              />
            </div>

            {/* ACOUSTIC PROMPT & STAGE */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block ml-1">Acoustic Calibration Test</span>
              <div className="bg-[#08080C] border border-white/10 rounded-xl p-4 shadow-inner">
                <p className="text-xs md:text-sm font-medium text-slate-200 leading-relaxed italic">
                  "Speak naturally: 'The architecture requires a resilient, partitioned data store.'"
                </p>
              </div>
            </div>

            {/* SEPARATED OSCILLATOR & DEDICATED DB TELEMETRY METER */}
            <div className="bg-[#030305] border border-white/[0.08] rounded-xl p-4 space-y-3 overflow-hidden shadow-inner">
              <div className="flex items-center justify-between font-mono">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Activity size={12} className={isSignalActive ? "text-emerald-400" : "text-indigo-400"} />
                  Oscillator Signal
                </span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-base font-extrabold tabular-nums transition-colors ${isSignalActive ? "text-emerald-400" : "text-white"}`}>
                    {displayDb}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">dB</span>
                </div>
              </div>

              {/* Waveform Canvas without text collision */}
              <div className="w-full h-16 relative overflow-hidden rounded-lg bg-black/40 border border-white/[0.04]">
                <canvas ref={canvasRef} className="w-full h-full block" />
              </div>
            </div>

            {/* BOTTOM ACTION DOCK */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-4">
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
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}