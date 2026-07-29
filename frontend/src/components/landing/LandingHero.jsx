import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { BrainCircuit, Code2, ArrowRight, Layers, Terminal, BarChart3 } from 'lucide-react';

// --- Tabular Slot-Machine Number Animation ---
function AnimatedNumber({ to, decimals = 0, suffix = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Number(v.toFixed(decimals)));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, to, { duration: 2, ease: [0.16, 1, 0.3, 1] });
      const unsub = rounded.on("change", setDisplay);
      return () => { controls.stop(); unsub(); };
    }
  }, [isInView, to, count, rounded]);

  return <span ref={ref} className="tabular-nums font-mono tracking-tighter">{display}{suffix}</span>;
}

// --- Vercel-Style Deep Glass Card ---
function GlassCard({ children, className = "", onClick, active = false }) {
  const [rect, setRect] = useState(null);
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isHovered, setIsHovered] = useState(false);

  const updateRect = () => {
    if (cardRef.current) setRect(cardRef.current.getBoundingClientRect());
  };

  useEffect(() => {
    updateRect();
    window.addEventListener("scroll", updateRect, { passive: true });
    window.addEventListener("resize", updateRect, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateRect);
      window.removeEventListener("resize", updateRect);
    };
  }, []);

  const handleMouseMove = (e) => {
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <motion.div 
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => { updateRect(); setIsHovered(true); }}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -2 }}
      className={`relative rounded-2xl bg-[#08080C]/90 border overflow-hidden backdrop-blur-2xl transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),_0_20px_40px_-10px_rgba(0,0,0,0.6)] ${active ? 'border-blue-500/50' : 'border-white/[0.08] opacity-70 hover:opacity-100'} ${className}`}
    >
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.05), transparent 40%)`,
          opacity: isHovered ? 1 : 0
        }}
      />
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </motion.div>
  );
}

export default function LandingHero({ activeTrack, setActiveTrack, onGetStarted }) {
  const logos = ["Google", "Meta", "Amazon", "Microsoft", "Apple", "Netflix", "Stripe"];

  return (
    <>
      {/* 1. HERO FOLD (FRAME 0) */}
      <section className="relative pt-40 pb-16 w-full z-10 flex flex-col items-center text-center px-6">
        
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-6 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Autonomous Technical Interview Flight Simulator
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-[80px] font-extrabold tracking-tighter text-white leading-[1.05] max-w-5xl mb-6">
          A real interview.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
            Not a practice quiz.
          </span>
        </h1>

        <p className="text-base md:text-xl text-slate-300 max-w-2xl leading-relaxed mb-12 font-medium">
          Adaptive ELO difficulty, real-time speech telemetry, and sandboxed execution. Test drive the exact interview chamber before stepping inside.
        </p>

        {/* Concept B: Dual Track Launch Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl mb-12 relative z-20">
          <GlassCard 
            onClick={() => setActiveTrack("system")}
            active={activeTrack === "system"}
            className="p-5 cursor-pointer text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400"><BrainCircuit size={18} /></div>
              <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Track A</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">System Design & Architecture</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-5">High-throughput scenario prompts, voice streaming VAD, and STAR behavioral rubrics.</p>
            <button onClick={onGetStarted} className="w-full py-2.5 rounded-xl bg-white text-black text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
              Start System Design <ArrowRight size={14} />
            </button>
          </GlassCard>

          <GlassCard 
            onClick={() => setActiveTrack("coding")}
            active={activeTrack === "coding"}
            className="p-5 cursor-pointer text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400"><Code2 size={18} /></div>
              <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Track B</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">Live Coding IDE Sandbox</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-5">Monaco editor, 4 multi-language runtimes, test case execution pipelines, and Socratic hints.</p>
            <button onClick={onGetStarted} className="w-full py-2.5 rounded-xl bg-white text-black text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
              Start Live Coding <ArrowRight size={14} />
            </button>
          </GlassCard>
        </div>
      </section>

      {/* 2. METRIC TICKER & INFINITE MARQUEE */}
      <section className="relative z-20 py-12 border-y border-white/[0.08] bg-[#020203]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-slate-400 text-center mb-8">
            Engineered for FAANG-level technical evaluation standards
          </p>

          <div className="overflow-hidden mask-edges w-full max-w-5xl mx-auto mb-12 marquee-container">
            <div className="flex gap-16 w-max animate-marquee opacity-60">
              {[...logos, ...logos, ...logos].map((logo, i) => (
                <span key={`${logo}-${i}`} className="text-xl font-extrabold text-slate-300 uppercase tracking-tighter cursor-default">{logo}</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x divide-white/[0.08]">
            <MetricColumn value={<AnimatedNumber to={93} />} label="CS Graph Nodes" icon={Layers} color="text-indigo-400" />
            <MetricColumn value={<AnimatedNumber to={4} />} label="IDE Languages" icon={Code2} color="text-amber-400" />
            <MetricColumn value={<AnimatedNumber to={100} suffix="%" />} label="Sandboxed Exec" icon={Terminal} color="text-emerald-400" />
            <MetricColumn value="5D" label="Telemetry Vectors" icon={BarChart3} color="text-blue-400" />
          </div>
        </div>
      </section>
    </>
  );
}

function MetricColumn({ value, label, icon: Icon, color }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter mb-2">{value}</div>
      <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center justify-center gap-1.5">
        <Icon size={12} className={color} /> {label}
      </div>
    </div>
  );
}