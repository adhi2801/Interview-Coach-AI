import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, ChevronDown, ShieldAlert, ArrowRight, Keyboard, Activity } from "lucide-react";
import CustomSelect from "../components/ui/CustomSelect";

export default function PreflightCheck({ onReady, onSkip }) {
  const [micStatus, setMicStatus] = useState("checking"); // checking | granted | denied
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [decibels, setDecibels] = useState(-100);
  
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const canvasRef = useRef(null);

  // Microscopic film grain overlay
  const noiseSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

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
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  // Human-friendly device label formatting
  const formatDeviceLabel = (label, index) => {
    if (!label || label.trim().toLowerCase() === "default") {
      return `Default - System Microphone`;
    }
    const cleanLabel = label.trim();
    return cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);
  };

  async function checkMicrophone() {
    cleanupAudio();
    try {
      // 1. Enumerate Devices
      const devList = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devList.filter(device => device.kind === 'audioinput');
      
      const options = audioInputs.map((d, i) => ({
        id: d.deviceId || `mic-${i}`,
        label: formatDeviceLabel(d.label, i)
      }));
      setDevices(options);
      
      if (!selectedDevice && options.length > 0) {
        setSelectedDevice(options[0].id);
      }

      // 2. Request Stream
      const constraints = {
        audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setMicStatus("granted");

      // 3. Audio Routing & DSP Setup
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048; // High resolution for smooth waveform
      analyser.smoothingTimeConstant = 0.8;
      
      source.connect(analyser);
      analyserRef.current = analyser;

      drawWaveform();
      
    } catch (err) {
      console.error(err);
      setMicStatus("denied");
    }
  }

  function drawWaveform() {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    
    // Support high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Damping / Throttle variables for smooth telemetry
    let smoothedDb = -100;
    let lastStateUpdate = 0;

    const renderLoop = (timestamp) => {
      animationRef.current = requestAnimationFrame(renderLoop);
      
      analyser.getByteTimeDomainData(dataArray);

      // Calculate Instantaneous Decibels
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        let normalized = (dataArray[i] / 128.0) - 1.0;
        sumSquares += normalized * normalized;
      }
      let rms = Math.sqrt(sumSquares / bufferLength);
      let instantDb = 20 * Math.log10(Math.max(rms, 0.0001));

      // 1. Exponential Moving Average (EMA) smoothing filter
      smoothedDb = (smoothedDb * 0.82) + (instantDb * 0.18);

      // 2. Throttle React state re-renders to every ~120ms to eliminate visual digit jitter
      if (!lastStateUpdate || timestamp - lastStateUpdate > 120) {
        lastStateUpdate = timestamp;
        setDecibels(smoothedDb);
      }

      // Clear Canvas seamlessly
      ctx.clearRect(0, 0, width, height);

      // Draw Oscillation
      ctx.lineWidth = 2;
      ctx.strokeStyle = smoothedDb > -35 ? '#10b981' : 'rgba(99, 102, 241, 0.4)'; // Emerald if voice active, Indigo if quiet
      ctx.beginPath();

      const sliceWidth = width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // 0 to 2
        const y = v * (height / 2);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      
      // Add subtle glow to active signal line
      if (smoothedDb > -35) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = ctx.strokeStyle;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };
    
    renderLoop(0);
  }

  // Formatting helper for the telemetry display
  const displayDb = decibels <= -99 ? "-∞" : decibels.toFixed(1);
  const isSignalActive = decibels > -40;

  return (
    <div className="relative min-h-screen bg-[#000000] text-slate-200 font-sans flex flex-col md:flex-row overflow-hidden selection:bg-indigo-500/30">
      
      {/* GLOBAL UNIFIED AMBIENT LIGHT MESH */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#000000]">
        <div className="absolute top-[-15%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[160px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[10%] w-[45vw] h-[45vw] rounded-full bg-indigo-600/10 blur-[150px] mix-blend-screen" />
      </div>

      {/* GLOBAL GRAIN */}
      <div 
        className="fixed inset-0 z-10 pointer-events-none opacity-[0.03] mix-blend-soft-light"
        style={{ backgroundImage: noiseSvg }}
      />

      {/* ========================================================================= */}
      {/* LEFT PANE: Ambient Sound Stage                                            */}
      {/* ========================================================================= */}
      <div className={`w-full md:w-1/2 h-50vh md:h-screen flex flex-col justify-center items-center relative z-20 transition-all duration-700 bg-transparent ${micStatus === 'denied' ? 'blur-md grayscale opacity-50 pointer-events-none' : ''}`}>
        
        {/* Abstract structural grid behind the stage */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

        <div className="text-center space-y-8 w-full max-w-md px-8 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> Acoustic Calibration
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug">
              Speak naturally at your normal volume.
            </h2>
          </div>
          
          <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl p-6 rounded-2xl relative shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
            <div className="absolute -left-px top-1/2 -translate-y-1/2 w-[3px] h-8 bg-indigo-500 rounded-r-full" />
            <p className="text-sm font-mono text-slate-300 leading-relaxed">
              "The architecture requires a highly available, partitioned data store."
            </p>
          </div>

          {/* Waveform Canvas Box with Separated Status Header */}
          <div className="w-full h-32 relative bg-black/40 border border-white/[0.05] rounded-2xl p-4 overflow-hidden shadow-inner flex flex-col justify-between">
             
             {/* TOP STATUS ROW */}
             <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 relative z-20">
               <span className="flex items-center gap-1.5">
                 <Activity size={12} className={isSignalActive ? "text-emerald-400" : "text-indigo-400"} />
                 Oscillator Baseline
               </span>
               {!isSignalActive && micStatus === 'granted' ? (
                 <span className="text-indigo-400 animate-pulse uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                   Awaiting Signal...
                 </span>
               ) : (
                 <span className="text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                   Signal Detected
                 </span>
               )}
             </div>

             {/* Waveform Canvas */}
             <canvas 
                ref={canvasRef} 
                className="w-full h-20 absolute inset-x-0 bottom-0 pointer-events-none"
             />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANE: Hardware Console                                              */}
      {/* ========================================================================= */}
      <div className="w-full md:w-1/2 h-auto md:h-screen bg-white/[0.015] backdrop-blur-2xl border-l border-white/[0.08] flex items-center justify-center p-8 md:p-16 relative z-20 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
        
        <div className="w-full max-w-[420px] relative z-10">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-bold text-xs shadow-[0_0_20px_rgba(255,255,255,0.3)]">IC</div>
               <span className="font-bold text-white tracking-tight text-sm">InterviewCoach</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Preflight Check</span>
            </div>
          </div>

          {/* Sentry-Grade Error State */}
          <AnimatePresence>
            {micStatus === 'denied' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="bg-red-500/[0.04] border border-red-500/20 p-6 rounded-2xl mb-8 relative overflow-hidden shadow-[inset_0_1px_0_0_rgba(248,113,113,0.1)]"
              >
                <div className="flex items-start gap-4">
                  <ShieldAlert size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-red-100 mb-2">Hardware Access Denied</h3>
                    <p className="text-xs text-red-200/70 font-medium leading-relaxed mb-4">
                      The browser blocked microphone access. To enable live voice telemetry and speech analysis, click the padlock icon <span className="inline-block bg-white/10 px-1.5 py-0.5 rounded mx-0.5 border border-white/20">🔒</span> in your URL bar and grant microphone permission.
                    </p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-xs font-bold text-red-400 transition-colors"
                    >
                      Reload Hardware Config
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-6">
            
            {/* Input Device Selector */}
            <div>
               <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2 mb-3">
                 <Mic size={14} className="text-blue-500" /> Input Source
               </label>
               {micStatus === 'granted' ? (
                 <CustomSelect 
                    value={selectedDevice}
                    onChange={setSelectedDevice}
                    options={devices.map(d => d.id)}
                    displayMapper={(id) => devices.find(d => d.id === id)?.label || "Default - System Microphone"}
                 />
               ) : (
                 <div className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl p-4 text-sm font-semibold text-slate-500 cursor-not-allowed flex items-center justify-between shadow-inner">
                   <span>{micStatus === 'checking' ? 'Detecting audio hardware...' : 'No devices available'}</span>
                   <ChevronDown size={16} />
                 </div>
               )}
            </div>

            {/* Tabular Telemetry Box */}
            <div className="bg-[#050507]/80 border border-white/[0.08] rounded-2xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
               <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">System Telemetry</span>
                  <div className="flex items-center gap-2">
                     {micStatus === 'granted' && isSignalActive ? (
                       <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                         <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                         <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-400">Signal Locked</span>
                       </div>
                     ) : (
                       <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded">Standby</span>
                     )}
                  </div>
               </div>
               
               <div className="flex justify-between items-end border-t border-white/[0.06] pt-4">
                  <span className="text-xs font-semibold text-slate-300">Peak Volume Level</span>
                  <div className="flex items-baseline gap-1.5">
                     <span className={`text-3xl font-extrabold font-mono tabular-nums tracking-tighter ${isSignalActive ? 'text-white' : 'text-slate-500'}`}>
                       {displayDb}
                     </span>
                     <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">dB</span>
                  </div>
               </div>
            </div>

            {/* Action Bar */}
            <div className="pt-6 border-t border-white/[0.08] flex items-center gap-4">
               <motion.button 
                  whileTap={{ scale: 0.96 }}
                  onClick={onSkip}
                  className="flex-1 py-3.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-slate-300 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
               >
                 <Keyboard size={14} /> Skip (Text Only)
               </motion.button>
               
               <motion.button
                  whileTap={micStatus === 'granted' ? { scale: 0.96 } : {}}
                  onClick={onReady}
                  disabled={micStatus !== 'granted'}
                  className={`flex-[1.5] py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    micStatus === 'granted'
                      ? "bg-white text-black hover:bg-slate-200 shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_45px_rgba(255,255,255,0.25)]"
                      : "bg-[#111111] border border-white/10 text-slate-600 cursor-not-allowed"
                  }`}
               >
                 {micStatus === 'checking' ? 'Initializing...' : 'Launch Simulator'} 
                 {micStatus === 'granted' && <ArrowRight size={16} />}
               </motion.button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}