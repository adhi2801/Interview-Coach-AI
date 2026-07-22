import React, { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, motion, useMotionValue, animate } from "framer-motion";
import PremiumLayout from "../components/layout/PremiumLayout";
import KnowledgeGraphScene from "../components/scenes/KnowledgeGraphScene";
import Button from "../components/ui/Button";
import { 
  ChevronRight, BrainCircuit, Activity, Target, ShieldAlert, 
  Terminal, Lock, CheckCircle2 
} from "lucide-react";
import "./Landing.css";

/**
 * Interactive ELO Widget for Card 1 (High-Density Sparkline & Rolling Counter)
 */
function InteractiveEloWidget() {
  const count = useMotionValue(1185);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [displayVal, setDisplayValue] = useState(1185);

  useEffect(() => {
    const controls = animate(count, 1420, {
      duration: 3,
      ease: [0.16, 1, 0.3, 1],
      repeat: Infinity,
      repeatType: "reverse",
      repeatDelay: 2
    });
    const unsub = rounded.on("change", (v) => setDisplayValue(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [count, rounded]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-6 relative bg-[#040404]/80 rounded-xl border border-white/10 shadow-inner overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
      
      {/* Decorative chart mesh filling the background */}
      <svg className="absolute bottom-0 w-full h-24 text-indigo-500/15" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path d="M0,100 L0,70 L20,85 L40,50 L60,65 L80,30 L100,45 L100,100 Z" fill="currentColor" />
      </svg>

      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 relative z-10">Adaptive ELO Rating</span>
      <span className="text-5xl font-extrabold tracking-tighter text-indigo-400 tabular-nums leading-none relative z-10">
        {displayVal}
      </span>
      <span className="text-[9px] font-mono text-emerald-400 mt-3 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-0.5 rounded-full relative z-10">
        LEVEL 5 ACTIVE
      </span>
    </div>
  );
}

/**
 * Interactive Company DNA Widget for Card 2
 */
function CompanyDnaWidget() {
  const [activeCompany, setActiveCompany] = useState("google");
  const focusAreas = {
    google: "Algorithms & Scale",
    meta: "Execution & System Tradeoffs",
    amazon: "Leadership Principles & Metrics"
  };

  const vectorStats = {
    google: [85, 60, 40],
    meta: [65, 90, 50],
    amazon: [45, 60, 95]
  };

  return (
    <div className="flex flex-col gap-4 p-5 bg-[#040404]/80 rounded-xl border border-white/10 h-full w-full justify-between">
      <div className="grid grid-cols-3 gap-2 w-full">
        {["google", "meta", "amazon"].map((c) => (
          <button
            key={c}
            onClick={() => setActiveCompany(c)}
            className={`py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all text-center w-full ${
              activeCompany === c 
                ? "bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.15)]" 
                : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex-1 w-full mt-2 flex flex-col justify-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Focus Vector: {focusAreas[activeCompany]}</span>
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

/**
 * Interactive Audio Waveform for Card 3
 */
function AudioWaveformWidget() {
  return (
    <div className="flex flex-col justify-between p-5 bg-[#040404]/80 rounded-xl border border-white/10 h-full w-full">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Telemetry</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>
      <div className="flex items-end justify-between gap-1 h-16 my-2 w-full overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ height: [12, Math.random() * 42 + 10, 12] }}
            transition={{
              duration: 1 + Math.random(),
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2">
        <span className="text-white font-bold">135 WPM</span>
        <span>Confidence: 8.2/10</span>
      </div>
    </div>
  );
}

/**
 * Diagnostic Knowledge Graph Widget for Card 4
 */
function InteractiveGraphWidget() {
  return (
    <div className="flex flex-col p-5 bg-[#040404]/80 rounded-xl border border-white/10 h-full relative overflow-hidden w-full justify-between">
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

export default function Landing({ onGetStarted, onSignIn }) {
  const heroRef = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const [isScrolled, setIsScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // =========================================================================
  // FIXED DOLLY ZOOM & SCROLL TIMELINE:
  // "Know the terrain." dissolves between 0 -> 15% scroll depth.
  // The 3D Knowledge Graph dolly zooms forward and clears blur between 0 -> 40%.
  // "Ace your next technical interview." fades in cleanly between 15% -> 35%.
  // =========================================================================
  const ghostOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const ghostScale = useTransform(scrollYProgress, [0, 0.15], [1, 1.08]);
  
  const graphScale = useTransform(scrollYProgress, [0, 0.4], [0.85, 1.25]);
  const graphBlur = useTransform(scrollYProgress, [0, 0.4], ["blur(12px)", "blur(0px)"]);
  const graphOpacity = useTransform(scrollYProgress, [0, 0.2, 0.4], [0.4, 0.8, 1]);
  
  const realOpacity = useTransform(scrollYProgress, [0.15, 0.35], [0, 1]);
  const realY = useTransform(scrollYProgress, [0.15, 0.35], [40, 0]);
  const realScale = useTransform(scrollYProgress, [0.15, 0.35], [0.95, 1]);

  const logos = ["Google", "Amazon", "Meta", "Microsoft", "Apple", "Netflix"];
  const marqueeLogos = [...logos, ...logos, ...logos];

  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <PremiumLayout
      scene={
        <motion.div 
          className="w-full h-full absolute inset-0"
          style={{ scale: graphScale, filter: graphBlur, opacity: graphOpacity }}
        >
          <KnowledgeGraphScene scrollTargetRef={heroRef} />
        </motion.div>
      }
      ambientColors={["#2563eb", "#7c3aed"]}
    >
      <div className="landing-vignette pointer-events-none" />

      <nav className={`landing-nav ${isScrolled ? "is-scrolled" : ""}`}>
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <div className="landing-brand-mark">IC</div>
            <span>InterviewCoach</span>
          </div>
          <div className="landing-nav-actions">
            <Button variant="ghost" size="sm" onClick={onSignIn}>Sign in</Button>
            <Button size="sm" onClick={onGetStarted}>Get started</Button>
          </div>
        </div>
      </nav>

      {/* Hero Container: 200vh provides scroll track for the dolly zoom animation */}
      <section ref={heroRef} style={{ height: "200vh", position: "relative" }}>
        <div className="landing-hero-sticky">
          
          <motion.h1 
            className="ds-ghost-text absolute w-full text-center" 
            style={{ opacity: ghostOpacity, scale: ghostScale, top: "40%" }}
          >
            Know the terrain.
          </motion.h1>

          <motion.div
            className="landing-hero-real w-full max-w-[800px] mx-auto px-6 text-center flex flex-col items-center"
            style={{ opacity: realOpacity, y: realY, scale: realScale }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              93 CS Topics &middot; Adaptive ELO
            </div>
            <h1 className="landing-headline">
              Ace your next<br />technical interview.
            </h1>
            <p className="landing-subline text-slate-300">
              Adaptive difficulty, real-time coaching, and company-specific
              prep — built on a real knowledge graph of 93 CS topics.
            </p>
            <div className="landing-hero-actions">
              <Button size="lg" onClick={onGetStarted} className="tactile-cta px-8 py-4">
                Start free now →
                <kbd className="cta-shortcut">↵</kbd>
              </Button>
              <Button variant="secondary" size="lg" className="secondary-cta px-8 py-4">
                See how it works
              </Button>
            </div>
          </motion.div>

          <motion.p 
            className="landing-scroll-hint"
            style={{ opacity: ghostOpacity }}
          >
            Scroll to explore the graph ↓
          </motion.p>
        </div>
      </section>

      <section className="landing-proof">
        <p className="landing-proof-label">Trusted by engineers preparing for</p>
        <div className="landing-proof-marquee-wrapper">
          <div className="landing-proof-strip">
            {marqueeLogos.map((c, idx) => (
              <span key={`${c}-${idx}`} className="landing-proof-item">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* HIGH DENSITY BENTO GRID                                                  */}
      {/* ========================================================================= */}
      <section className="landing-bento max-w-6xl mx-auto px-6 py-24 relative z-20">
        <div className="text-center mb-16">
          <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest">Under The Hood</span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter text-white mt-3">Not a wrapper around a chatbot.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Adaptive ELO Engine (Double-Width) */}
          <div className="md:col-span-2 w-full">
            <GlassCard mousePos={mousePos} className="min-h-[280px] flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="flex-1 w-full">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <BrainCircuit size={20} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Adaptive ELO Difficulty</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium max-w-sm">
                  Every answer updates your rating in real-time. System difficulty scales dynamically with your ELO.
                </p>
              </div>
              <div className="w-full md:w-64 h-48 md:h-full flex-shrink-0">
                <InteractiveEloWidget />
              </div>
            </GlassCard>
          </div>

          {/* Card 2: Company Mutation (Single-Width) */}
          <div className="md:col-span-1 w-full">
            <GlassCard mousePos={mousePos} className="min-h-[280px] flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <Target size={20} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Company Specific Mutation</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium mb-4">
                  Mutates questions to align with specific organizational cultures and architectures.
                </p>
              </div>
              <div className="h-36">
                <CompanyDnaWidget />
              </div>
            </GlassCard>
          </div>

          {/* Card 3: Audio Waveform (Single-Width) */}
          <div className="md:col-span-1 w-full">
            <GlassCard mousePos={mousePos} className="min-h-[280px] flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <Activity size={20} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Confidence Telemetry</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium mb-4">
                  Analyzes pace, tone, and filler words continuously.
                </p>
              </div>
              <div className="h-36">
                <AudioWaveformWidget />
              </div>
            </GlassCard>
          </div>

          {/* Card 4: Knowledge Graph (Double-Width) */}
          <div className="md:col-span-2 w-full">
            <GlassCard mousePos={mousePos} className="min-h-[280px] flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="flex-1 w-full">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <Terminal size={20} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">93-Topic Knowledge Graph</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium max-w-sm">
                  Tracks prerequisite chains across computer science. Every gap ties back to specific path dependencies.
                </p>
              </div>
              <div className="w-full md:w-80 h-48 md:h-full flex-shrink-0">
                <InteractiveGraphWidget />
              </div>
            </GlassCard>
          </div>

        </div>
      </section>

      <section className="landing-cta max-w-4xl mx-auto text-center px-6 py-28 relative z-20">
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-white mb-6">
          Ready to know the terrain?
        </h2>
        <p className="text-slate-400 mb-10 text-base max-w-md mx-auto font-medium">
          Free to start. No credit card required. Master technical and behavioral interviews.
        </p>
        <div className="flex justify-center">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onGetStarted}
            className="relative group overflow-hidden bg-white text-black px-10 py-4 rounded-xl text-base font-bold transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_45px_rgba(255,255,255,0.3)] flex items-center gap-2"
          >
            Start free now <ChevronRight size={18} />
          </motion.button>
        </div>
      </section>

    </PremiumLayout>
  );
}

function GlassCard({ children, className = "", mousePos }) {
  const [rect, setRect] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) {
      setRect(cardRef.current.getBoundingClientRect());
    }
  }, []);

  const isHovered = rect && 
    mousePos.x >= rect.left && mousePos.x <= rect.right &&
    mousePos.y >= rect.top && mousePos.y <= rect.bottom;

  const cursorX = rect ? mousePos.x - rect.left : 0;
  const cursorY = rect ? mousePos.y - rect.top : 0;

  return (
    <div 
      ref={cardRef}
      className={`relative rounded-2xl bg-white/[0.03] border border-white/[0.08] p-8 overflow-hidden backdrop-blur-xl ${className}`}
      style={{
        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.15), 0 20px 40px -10px rgba(0,0,0,0.6)'
      }}
    >
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(400px circle at ${cursorX}px ${cursorY}px, rgba(255,255,255,0.06), transparent 40%)`,
          opacity: isHovered ? 1 : 0
        }}
      />
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}