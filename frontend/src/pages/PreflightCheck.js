import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, ChevronDown, CheckCircle2, ShieldAlert, ArrowRight, Keyboard } from "lucide-react";
import CustomSelect from "../components/ui/CustomSelect"; // Re-using the custom select from your setup

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

  async function checkMicrophone() {
    cleanupAudio();
    try {
      // 1. Enumerate Devices
      const devList = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devList.filter(device => device.kind === 'audioinput');
      
      const options = audioInputs.map((d, i) => ({
        id: d.deviceId || `mic-${i}`,
        label: d.label || `Microphone ${i + 1}`
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

    const renderLoop = () => {
      animationRef.current = requestAnimationFrame(renderLoop);
      
      analyser.getByteTimeDomainData(dataArray);

      // Calculate Decibels for Telemetry
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        let normalized = (dataArray[i] / 128.0) - 1.0;
        sumSquares += normalized * normalized;
      }
      let rms = Math.sqrt(sumSquares / bufferLength);
      let db = 20 * Math.log10(Math.max(rms, 0.0001));
      setDecibels(db);

      // Clear Canvas seamlessly
      ctx.clearRect(0, 0, width, height);

      // Draw Oscillation
      ctx.lineWidth = 2;
      ctx.strokeStyle = db > -35 ? '#10b981' : '#6366f1'; // Emerald if picking up voice, Indigo if quiet
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
      
      // Add subtle glow to the line
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    };
    
    renderLoop();
  }

  // Formatting helper for the telemetry display
  const displayDb = decibels <= -99 ? "-∞" : decibels.toFixed(1);
  const isSignalActive = decibels > -40;

  return (
    <div className="relative min-h-screen bg-[#000000] text-slate-200 font-sans flex flex-col md:flex-row overflow-hidden selection:bg-indigo-500/30">
      
      {/* GLOBAL GRAIN */}
      <div 
        className="fixed inset-0 z-10 pointer-events-none opacity-[0.03] mix-blend-soft-light"
        style={{ backgroundImage: noiseSvg }}
      />

      {/* ========================================================================= */}
      {/* LEFT PANE: Ambient Sound Stage                                            */}
      {/* ========================================================================= */}
      <div className={`w-full md:w-1/2 h-50vh md:h-screen flex flex-col justify-center items-center relative z-20 transition-all duration-700 ${micStatus === 'denied' ? 'blur-md grayscale opacity-50 pointer-events-none' : ''}`}>
        
        {/* Abstract structural grid behind the stage */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

        <div className="text-center space-y-12 w-full max-w-md px-8 relative z-10">
          <div>
            <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-4">Acoustic Calibration</h2>
            <p className="text-2xl md:text-3xl font-medium text-white tracking-tight leading-snug">
              Speak naturally at your normal volume.
            </p>
          </div>
          
          <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-xl relative">
            <div className="absolute -left-px top-1/2 -translate-y-1/2 w-[3px] h-8 bg-indigo-500" />
            <p className="text-sm font-mono text-slate-400">
              "The architecture requires a highly available, partitioned data store."
            </p>
          </div>

          <div className="w-full h-32 relative">
             <canvas 
                ref={canvasRef} 
                className="w-full h-full absolute inset-0 mix-blend-screen"
             />
             {!isSignalActive && micStatus === 'granted' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest animate-pulse">Awaiting Signal...</span>
                </div>
             )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANE: Hardware Console (Deep Glass)                                 */}
      {/* ========================================================================= */}
      <div className="w-full md:w-1/2 h-auto md:h-screen bg-[#050505]/80 backdrop-blur-2xl border-l border-white/[0.06] flex items-center justify-center p-8 md:p-16 relative z-20">
        
        {/* Ambient Console Spotlight */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-900/10 blur-[150px] pointer-events-none z-0 rounded-full mix-blend-screen" />

        <div className="w-full max-w-[420px] relative z-10">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-bold text-xs shadow-[0_0_15px_rgba(255,255,255,0.2)]">IC</div>
               <span className="font-bold text-white tracking-tight text-sm">InterviewCoach</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
               <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400">Preflight Checks</span>
            </div>
          </div>

          {/* Sentry-Grade Error State (The Drawer) */}
          <AnimatePresence>
            {micStatus === 'denied' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="bg-red-500/[0.03] border border-red-500/20 p-6 rounded-2xl mb-8 relative overflow-hidden shadow-[inset_0_1px_0_0_rgba(248,113,113,0.1),_0_20px_40px_rgba(0,0,0,0.5)]"
              >
                <div className="flex items-start gap-4">
                  <ShieldAlert size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-red-100 mb-2">Hardware Access Denied</h3>
                    <p className="text-xs text-red-200/70 font-medium leading-relaxed mb-4">
                      The browser blocked microphone access. To enable live 5D telemetry and speech analysis, click the padlock icon <span className="inline-block bg-white/10 px-1 rounded mx-0.5 border border-white/20">🔒</span> in your URL bar and allow microphone permissions.
                    </p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-xs font-bold text-red-400 transition-colors"
                    >
                      Reload Configuration
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-8">
            
            {/* Input Device Selector */}
            <div>
               <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-3">
                 <Mic size={14} /> Input Source
               </label>
               {micStatus === 'granted' ? (
                 <CustomSelect 
                    value={selectedDevice}
                    onChange={setSelectedDevice}
                    options={devices.map(d => d.id)}
                    displayMapper={(id) => devices.find(d => d.id === id)?.label || "Unknown Device"}
                 />
               ) : (
                 <div className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-4 text-sm font-semibold text-slate-500 cursor-not-allowed flex items-center justify-between">
                   <span>{micStatus === 'checking' ? 'Detecting hardware...' : 'No devices available'}</span>
                   <ChevronDown size={16} />
                 </div>
               )}
            </div>

            {/* Tabular Telemetry */}
            <div className="bg-[#050505] border border-white/[0.05] rounded-xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
               <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">System Telemetry</span>
                  <div className="flex items-center gap-2">
                     {micStatus === 'granted' && isSignalActive ? (
                       <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                         <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                         <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">Signal Locked</span>
                       </div>
                     ) : (
                       <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Standby</span>
                     )}
                  </div>
               </div>
               
               <div className="flex justify-between items-end border-t border-white/[0.05] pt-4">
                  <span className="text-xs font-semibold text-slate-400">Peak Volume</span>
                  <div className="flex items-baseline gap-1">
                     <span className={`text-2xl font-bold font-mono tabular-nums tracking-tighter ${isSignalActive ? 'text-white' : 'text-slate-600'}`}>
                       {displayDb}
                     </span>
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">dB</span>
                  </div>
               </div>
            </div>

            {/* Action Bar */}
            <div className="pt-6 border-t border-white/[0.06] flex items-center gap-4">
               <motion.button 
                  whileTap={{ scale: 0.96 }}
                  onClick={onSkip}
                  className="flex-1 py-3.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] text-slate-300 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
               >
                 <Keyboard size={14} /> Skip (Text Only)
               </motion.button>
               
               <motion.button
                  whileTap={micStatus === 'granted' ? { scale: 0.96 } : {}}
                  onClick={onReady}
                  disabled={micStatus !== 'granted'}
                  className={`flex-[1.5] py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    micStatus === 'granted'
                      ? "bg-white text-black hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
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