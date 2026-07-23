import React, { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, motion, useMotionValue, animate, AnimatePresence } from "framer-motion";
import PremiumLayout from "../components/layout/PremiumLayout";
import KnowledgeGraphScene from "../components/scenes/KnowledgeGraphScene";
import Button from "../components/ui/Button";
import { 
  ChevronRight, BrainCircuit, Activity, Target, ShieldAlert, 
  Terminal, Lock, CheckCircle2, Code2, Mic, Users, BarChart3,
  Layers, Play, Sparkles
} from "lucide-react";
import "./Landing.css";

// =========================================================================
// WIDGET 1: Adaptive ELO Engine
// =========================================================================
function InteractiveEloWidget() {
  const count = useMotionValue(1185);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [displayVal, setDisplayValue] = useState(1185);

  useEffect(() => {
    const controls = animate(count, 1420, { duration: 3, ease: [0.16, 1, 0.3, 1], repeat: Infinity, repeatType: "reverse", repeatDelay: 2 });
    const unsub = rounded.on("change", (v) => setDisplayValue(v));
    return () => { controls.stop(); unsub(); };
  }, [count, rounded]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-6 relative bg-[#040404]/80 rounded-xl border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
      <svg className="absolute bottom-0 w-full h-24 text-indigo-500/15" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path d="M0,100 L0,70 L20,85 L40,50 L60,65 L80,30 L100,45 L100,100 Z" fill="currentColor" />
        <motion.path d="M0,70 L20,85 L40,50 L60,65 L80,30 L100,45" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="200" initial={{ strokeDashoffset: 200 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }} />
      </svg>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 relative z-10">Adaptive ELO Rating</span>
      <span className="text-5xl font-extrabold tracking-tighter text-indigo-400 tabular-nums leading-none relative z-10">{displayVal}</span>
      <span className="text-[9px] font-mono text-emerald-400 mt-3 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-0.5 rounded-full relative z-10">LEVEL 5 ACTIVE</span>
    </div>
  );
}

// =========================================================================
// WIDGET 2: 4 Interviewer Personas (NEW)
// =========================================================================
function InterviewerPersonaWidget() {
  const [active, setActive] = useState("hostile");
  const personas = {
    standard: { label: "Standard", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", quote: "Let's explore your approach to scaling this database." },
    hostile: { label: "Hostile", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", quote: "That complexity won't scale. What happens when we hit 100k RPS?" },
    socratic: { label: "Socratic", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", quote: "Interesting. Why did you choose a Hash Map over a Trie here?" },
    exhausted: { label: "Exhausted", color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20", quote: "...Right. Just walk me through the code, please." }
  };

  return (
    <div className="flex flex-col gap-4 p-5 bg-[#040404]/80 rounded-xl border border-white/10 h-full w-full justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
      <div className="grid grid-cols-2 gap-2 w-full relative z-10">
        {Object.entries(personas).map(([key, p]) => (
          <button
            key={key} onClick={() => setActive(key)}
            className={`py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider border transition-all text-center w-full ${
              active === key ? `bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]` : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex-1 w-full mt-2 flex flex-col justify-end relative z-10">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Simulated Response</span>
        <AnimatePresence mode="wait">
          <motion.div key={active} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className={`p-3 rounded-lg border ${personas[active].bg} ${personas[active].border}`}>
            <p className={`text-xs font-medium leading-relaxed ${personas[active].color}`}>"{personas[active].quote}"</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// =========================================================================
// WIDGET 3: Monaco Coding Sandbox (NEW)
// =========================================================================
function CodingSandboxWidget() {
  const [lang, setLang] = useState("python");
  const codes = {
    python: "def rate_limiter(user_id):\n    # TODO: Implement token bucket\n    pass",
    js: "function rateLimiter(userId) {\n  // TODO: Implement token bucket\n}",
  };

  return (
    <div className="flex flex-col bg-[#040404]/80 rounded-xl border border-white/10 h-full w-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/50">
        <div className="flex gap-4">
          {["python", "js"].map(l => (
            <button key={l} onClick={() => setLang(l)} className={`text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${lang === l ? "text-indigo-400" : "text-slate-500 hover:text-white"}`}>{l}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-rose-500/50" /><div className="w-2 h-2 rounded-full bg-amber-500/50" /><div className="w-2 h-2 rounded-full bg-emerald-500/50" />
        </div>
      </div>
      <div className="flex-1 p-4 relative font-mono text-xs leading-relaxed text-slate-300">
        <div className="absolute left-0 top-0 bottom-0 w-8 border-r border-white/5 bg-black/30 text-right pr-2 pt-4 text-slate-600 select-none">
          1<br/>2<br/>3
        </div>
        <AnimatePresence mode="wait">
          <motion.pre key={lang} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-8 text-indigo-200">
            {codes[lang]}
          </motion.pre>
        </AnimatePresence>
        
        {/* Socratic Hint Pill */}
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute bottom-4 right-4 bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-lg backdrop-blur-md flex items-start gap-2 max-w-[200px]">
          <Sparkles size={12} className="text-indigo-400 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-indigo-200 font-sans font-medium leading-snug">Socratic Hint: How does your approach handle concurrent requests from the same user?</p>
        </motion.div>
      </div>
    </div>
  );
}

// =========================================================================
// WIDGET 4: Audio Waveform
// =========================================================================
function AudioWaveformWidget() {
  return (
    <div className="flex flex-col justify-between p-5 bg-[#040404]/80 rounded-xl border border-white/10 h-full w-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
      <div className="flex justify-between items-center mb-3 relative z-10">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Telemetry</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
      </div>
      <div className="flex items-end justify-between gap-1 h-16 my-2 w-full overflow-hidden relative z-10">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.div
            key={i} animate={{ height: [12, Math.random() * 42 + 10, 12] }}
            transition={{ duration: 1 + Math.random(), repeat: Infinity, ease: "easeInOut" }}
            className="w-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2 relative z-10">
        <span className="text-white font-bold">135 WPM</span>
        <span>Conf: 8.2/10</span>
      </div>
    </div>
  );
}

// =========================================================================
// WIDGET 5: Company DNA
// =========================================================================
function CompanyDnaWidget() {
  const [activeCompany, setActiveCompany] = useState("google");
  const focusAreas = { google: "Algorithms & Scale", meta: "Execution & System Tradeoffs", amazon: "Leadership Principles" };
  const vectorStats = { google: [85, 60, 40], meta: [65, 90, 50], amazon: [45, 60, 95] };

  return (
    <div className="flex flex-col gap-4 p-5 bg-[#040404]/80 rounded-xl border border-white/10 h-full w-full justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
      <div className="grid grid-cols-3 gap-2 w-full relative z-10">
        {["google", "meta", "amazon"].map((c) => (
          <button
            key={c} onClick={() => setActiveCompany(c)}
            className={`py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all text-center w-full ${
              activeCompany === c ? "bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.15)]" : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            {c.substring(0,3)}
          </button>
        ))}
      </div>
      <div className="flex-1 w-full mt-2 flex flex-col justify-center gap-2 relative z-10">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1 truncate">Vector: {focusAreas[activeCompany]}</span>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${vectorStats[activeCompany][0]}%` }} />
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${vectorStats[activeCompany][1]}%` }} />
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${vectorStats[activeCompany][2]}%` }} />
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// WIDGET 6: Session Replay & 5D Radar (NEW)
// =========================================================================
function ReplayReportWidget() {
  return (
    <div className="flex flex-col md:flex-row p-5 bg-[#040404]/80 rounded-xl border border-white/10 h-full w-full justify-between items-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden gap-6">
      <div className="flex-1 w-full">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Session Replay</h3>
        <p className="text-sm font-bold text-white leading-tight mb-4">Post-Flight 5D Diagnostics</p>
        
        {/* Fake Scrubber */}
        <div className="space-y-2">
          <div className="flex justify-between text-[9px] font-mono text-slate-500">
            <span>Node 1</span><span>Node 4</span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full relative">
            <div className="absolute top-0 left-0 h-full w-[60%] bg-blue-500 rounded-full" />
            <div className="absolute top-1/2 -translate-y-1/2 left-[60%] w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
          </div>
        </div>
      </div>

      {/* SVG Radar Chart Approximation */}
      <div className="w-32 h-32 relative flex items-center justify-center flex-shrink-0">
        <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full" />
        <svg viewBox="0 0 100 100" className="w-full h-full opacity-80 z-10">
          <polygon points="50,10 90,35 75,85 25,85 10,35" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <polygon points="50,25 75,43 65,72 35,72 25,43" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <polygon points="50,15 80,45 60,80 30,70 15,40" fill="rgba(59,130,246,0.3)" stroke="#3b82f6" strokeWidth="1.5" />
          <line x1="50" y1="50" x2="50" y2="10" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <line x1="50" y1="50" x2="90" y2="35" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <line x1="50" y1="50" x2="75" y2="85" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <line x1="50" y1="50" x2="25" y2="85" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <line x1="50" y1="50" x2="10" y2="35" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}

// =========================================================================
// WIDGET 7: Knowledge Graph
// =========================================================================
function InteractiveGraphWidget() {
  return (
    <div className="flex flex-col p-5 bg-[#040404]/80 rounded-xl border border-white/10 h-full relative overflow-hidden w-full justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
      <div className="relative z-10 mb-2 flex justify-between items-start w-full">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Diagnostic Path</span>
          <span className="text-sm font-bold text-white leading-tight">Rate Limiter Algorithms</span>
        </div>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-white/10 px-2 py-1 rounded">Knowledge Graph</span>
      </div>
      
      <div className="flex-1 flex flex-col text-[11px] font-mono text-slate-300 gap-2.5 w-full relative z-10 justify-end pt-2">
        <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
          <span className="text-slate-200">Token Bucket</span> <CheckCircle2 size={14} className="text-emerald-400"/>
        </div>
        <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
          <span className="text-slate-200">Leaky Bucket</span> <ShieldAlert size={14} className="text-amber-400 animate-pulse"/>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Sliding Window Log</span> <Lock size={14} className="text-slate-600"/>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// WIDGET 8: Peer Percentile (NEW)
// =========================================================================
function PeerPercentileWidget() {
  return (
    <div className="flex flex-col p-5 bg-[#040404]/80 rounded-xl border border-white/10 h-full relative overflow-hidden w-full justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
      <div className="relative z-10">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Global Percentile</span>
        <span className="text-2xl font-extrabold tracking-tighter text-white">Top 12%</span>
      </div>
      
      {/* SVG Bell Curve */}
      <div className="w-full h-16 relative mt-4">
        <svg viewBox="0 0 100 50" className="w-full h-full absolute inset-0 overflow-visible text-indigo-500/30">
          <path d="M0,50 Q25,50 40,20 T50,5 T60,20 T100,50" fill="currentColor" />
          <path d="M0,50 Q25,50 40,20 T50,5 T60,20 T100,50" fill="none" stroke="#6366f1" strokeWidth="1.5" />
          <circle cx="65" cy="27" r="3" fill="#fff" className="animate-pulse shadow-[0_0_10px_#fff]" />
        </svg>
      </div>
    </div>
  );
}

// =========================================================================
// MAIN LANDING COMPONENT
// =========================================================================
export default function Landing({ onGetStarted, onSignIn }) {
  const heroRef = useRef(null);
  const [track, setTrack] = useState('design'); // 'design' | 'coding'
  const [isScrolled, setIsScrolled] = useState(false);
  
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const ghostOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const ghostScale = useTransform(scrollYProgress, [0, 0.15], [1, 1.08]);
  const graphScale = useTransform(scrollYProgress, [0, 0.4], [0.85, 1.25]);
  const graphBlur = useTransform(scrollYProgress, [0, 0.4], ["blur(12px)", "blur(0px)"]);
  const graphOpacity = useTransform(scrollYProgress, [0, 0.2, 0.4], [0.4, 0.8, 1]);
  const realOpacity = useTransform(scrollYProgress, [0.15, 0.35], [0, 1]);
  const realY = useTransform(scrollYProgress, [0.15, 0.35], [40, 0]);
  const realScale = useTransform(scrollYProgress, [0.15, 0.35], [0.95, 1]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const logos = ["Google", "Amazon", "Meta", "Microsoft", "Apple", "Netflix", "Stripe", "OpenAI"];
  const marqueeLogos = [...logos, ...logos, ...logos];

  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  useEffect(() => {
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Rolling numbers for metrics
  const CountUp = ({ to }) => {
    const count = useMotionValue(0);
    const rounded = useTransform(count, Math.round);
    const [display, setDisplay] = useState(0);
    useEffect(() => {
      const controls = animate(count, to, { duration: 2, ease: "easeOut" });
      const unsub = rounded.on("change", setDisplay);
      return () => { controls.stop(); unsub(); };
    }, [to, count, rounded]);
    return <>{display}</>;
  };

  return (
    <PremiumLayout
      scene={
        <motion.div className="w-full h-full absolute inset-0" style={{ scale: graphScale, filter: graphBlur, opacity: graphOpacity }}>
          <KnowledgeGraphScene scrollTargetRef={heroRef} />
        </motion.div>
      }
      ambientColors={["#2563eb", "#7c3aed"]}
    >
      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 2.5s infinite linear; }
        .mask-edges { mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent); }
        .marquee-scroll { animation: marquee 30s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>

      <div className="landing-vignette pointer-events-none" />

      {/* HEADER */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] flex justify-center transition-all duration-300 ${isScrolled ? "pt-3" : "pt-6"}`}>
        <div className={`flex items-center justify-between px-6 transition-all duration-300 ${isScrolled ? "w-[90%] max-w-5xl h-14 bg-white/[0.02] backdrop-blur-2xl border border-white/[0.08] rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.5),_inset_0_1px_0_0_rgba(255,255,255,0.05)]" : "w-full max-w-7xl h-14 bg-transparent border-transparent"}`}>
          <div className="flex items-center gap-2 font-bold text-sm tracking-tight text-white">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] shadow-[0_0_12px_rgba(37,99,235,0.5)]">IC</div>
            InterviewCoach
          </div>
          <div className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <span className="hover:text-white cursor-pointer transition-colors">Methodology</span>
            <span className="hover:text-white cursor-pointer transition-colors">Sandbox</span>
            <span className="hover:text-white cursor-pointer transition-colors">Personas</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onSignIn}>Sign in</Button>
            <Button size="sm" onClick={onGetStarted} className="shadow-[0_0_15px_rgba(255,255,255,0.2)]">Get started</Button>
          </div>
        </div>
      </nav>

      {/* SECTION 1: HERO & TRACK SWITCHER */}
      <section ref={heroRef} style={{ height: "200vh", position: "relative" }}>
        <div className="landing-hero-sticky flex flex-col items-center justify-center min-h-screen pt-20">
          
          <motion.h1 className="ds-ghost-text absolute w-full text-center" style={{ opacity: ghostOpacity, scale: ghostScale, top: "40%" }}>
            Master the terrain.
          </motion.h1>

          <motion.div className="w-full max-w-[900px] mx-auto px-6 text-center flex flex-col items-center z-20" style={{ opacity: realOpacity, y: realY, scale: realScale }}>
            
            {/* Dual Track Switcher */}
            <div className="flex items-center bg-white/[0.03] border border-white/[0.08] p-1 rounded-full mb-10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] relative">
               <button onClick={() => setTrack('design')} className={`relative px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors z-10 flex items-center gap-2 ${track === 'design' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                 <BrainCircuit size={14} /> System Design
               </button>
               <button onClick={() => setTrack('coding')} className={`relative px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors z-10 flex items-center gap-2 ${track === 'coding' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                 <Code2 size={14} /> Live Coding
               </button>
               {/* Sliding Background */}
               <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/[0.08] border border-white/10 rounded-full transition-transform duration-300 ease-out z-0 ${track === 'coding' ? 'translate-x-full' : 'translate-x-0'}`} />
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white leading-[1.05] mb-6 drop-shadow-2xl">
              Master the technical interview. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Autonomously.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
              {track === 'design' 
                ? "Adaptive difficulty, real-time voice coaching, and company-specific architecture scenarios powered by a 93-node knowledge graph."
                : "Full Monaco IDE, secure multi-language execution, and Socratic hints that guide you to the optimal algorithm without giving away the answer."}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <button onClick={onGetStarted} className="relative group overflow-hidden bg-white text-black px-10 py-4 rounded-xl text-sm font-bold active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_45px_rgba(255,255,255,0.3)] flex items-center gap-3 w-full sm:w-auto justify-center">
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                Start free now
                <kbd className="hidden sm:inline-flex ml-1 items-center justify-center bg-black/10 rounded px-1.5 py-0.5 text-[10px] font-mono text-black/60">↵</kbd>
              </button>
            </div>
          </motion.div>

          <motion.p className="absolute bottom-12 text-[10px] font-bold uppercase tracking-widest text-slate-500" style={{ opacity: ghostOpacity }}>
            Scroll to explore engine ↓
          </motion.p>
        </div>
      </section>

      {/* SECTION 2: PROOF MARQUEE & HIGH-DENSITY METRICS */}
      <section className="relative z-20 py-20 bg-gradient-to-b from-transparent to-black border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-10">
            Engineered to conquer interviews at
          </p>
          <div className="overflow-hidden mask-edges w-full max-w-4xl mx-auto mb-20">
            <div className="flex gap-16 whitespace-nowrap marquee-scroll w-max opacity-40">
              {marqueeLogos.map((c, idx) => (
                <span key={`${c}-${idx}`} className="text-2xl font-bold tracking-tight text-white">{c}</span>
              ))}
            </div>
          </div>

          {/* 4 Live Metrics Counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto text-center divide-x divide-white/[0.05]">
             <div>
               <div className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-2 tabular-nums"><CountUp to={93} /></div>
               <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center justify-center gap-1.5"><Layers size={12} className="text-blue-400"/> CS Graph Nodes</div>
             </div>
             <div>
               <div className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-2 tabular-nums"><CountUp to={4} /></div>
               <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center justify-center gap-1.5"><Code2 size={12} className="text-emerald-400"/> IDE Languages</div>
             </div>
             <div>
               <div className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-2 tabular-nums"><CountUp to={100} />%</div>
               <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center justify-center gap-1.5"><Terminal size={12} className="text-rose-400"/> Sandboxed Exec</div>
             </div>
             <div>
               <div className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-2 tabular-nums">5D</div>
               <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center justify-center gap-1.5"><BarChart3 size={12} className="text-amber-400"/> Telemetry Vectors</div>
             </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: THE HIGH-DENSITY 8-TILE BENTO GRID */}
      <section className="relative z-20 py-32 bg-[#000000]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full mb-4 inline-block">The Engine</span>
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-white">Not a wrapper around a chatbot.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[280px]">
            
            {/* ROW 1 */}
            <div className="md:col-span-2 relative"><GlassCard mousePos={mousePos}><InteractiveEloWidget /></GlassCard></div>
            <div className="md:col-span-1 lg:col-span-1 relative"><GlassCard mousePos={mousePos}><InterviewerPersonaWidget /></GlassCard></div>
            <div className="md:col-span-1 lg:col-span-1 relative"><GlassCard mousePos={mousePos}><AudioWaveformWidget /></GlassCard></div>

            {/* ROW 2 */}
            <div className="md:col-span-2 lg:col-span-2 relative"><GlassCard mousePos={mousePos}><CodingSandboxWidget /></GlassCard></div>
            <div className="md:col-span-1 lg:col-span-1 relative"><GlassCard mousePos={mousePos}><CompanyDnaWidget /></GlassCard></div>
            <div className="md:col-span-1 lg:col-span-1 relative"><GlassCard mousePos={mousePos}><PeerPercentileWidget /></GlassCard></div>

            {/* ROW 3 */}
            <div className="md:col-span-2 lg:col-span-2 relative"><GlassCard mousePos={mousePos}><ReplayReportWidget /></GlassCard></div>
            <div className="md:col-span-2 lg:col-span-2 relative"><GlassCard mousePos={mousePos}><InteractiveGraphWidget /></GlassCard></div>

          </div>
        </div>
      </section>

      {/* SECTION 5: HIGH-CONTRAST CLOSING CTA */}
      <section className="relative z-20 py-40 border-t border-white/[0.05] bg-[#000000] overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center px-6 relative z-10">
          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white mb-6">
            Ready to know the terrain?
          </h2>
          <p className="text-slate-400 mb-12 text-lg font-medium max-w-xl mx-auto leading-relaxed">
            Free to start. No credit card required. Master technical, behavioral, and live coding interviews in a hostile, reactive environment.
          </p>
          <div className="flex justify-center">
            <button onClick={onGetStarted} className="relative group overflow-hidden bg-white text-black px-12 py-5 rounded-2xl text-base font-bold active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] flex items-center gap-3">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
              Start Free Now <ChevronRight size={18} />
              <kbd className="hidden sm:inline-flex ml-2 items-center justify-center bg-black/10 rounded px-2 py-1 text-[11px] font-mono text-black/60">↵ Enter</kbd>
            </button>
          </div>
        </div>
      </section>

    </PremiumLayout>
  );
}

// =========================================================================
// UNIVERSAL GLASS CARD WRAPPER
// =========================================================================
function GlassCard({ children, className = "", mousePos }) {
  const [rect, setRect] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) setRect(cardRef.current.getBoundingClientRect());
  }, []);

  const isHovered = rect && mousePos.x >= rect.left && mousePos.x <= rect.right && mousePos.y >= rect.top && mousePos.y <= rect.bottom;
  const cursorX = rect ? mousePos.x - rect.left : 0;
  const cursorY = rect ? mousePos.y - rect.top : 0;

  return (
    <div 
      ref={cardRef}
      className={`absolute inset-0 rounded-2xl bg-white/[0.02] border border-white/[0.08] overflow-hidden backdrop-blur-xl ${className}`}
      style={{ boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 20px 40px -10px rgba(0,0,0,0.5)' }}
    >
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0" style={{ background: `radial-gradient(400px circle at ${cursorX}px ${cursorY}px, rgba(255,255,255,0.06), transparent 40%)`, opacity: isHovered ? 1 : 0 }} />
      {children}
    </div>
  );
}