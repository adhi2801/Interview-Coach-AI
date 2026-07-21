import React, { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import PremiumLayout from "../components/layout/PremiumLayout";
import KnowledgeGraphScene from "../components/scenes/KnowledgeGraphScene";
import Button from "../components/ui/Button";
import { 
  ChevronRight, BrainCircuit, Activity, Target, ShieldAlert, 
  Terminal, Lock, CheckCircle2 
} from "lucide-react";
import "./Landing.css";

/**
 * Interactive ELO Widget for Card 1
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
    <div className="flex flex-col items-center justify-center h-full p-4 relative bg-[#040404]/60 rounded-xl border border-white/5 shadow-inner">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Adaptive ELO</span>
      <span className="text-4xl font-extrabold tracking-tighter text-indigo-400 tabular-nums leading-none">
        {displayVal}
      </span>
      <span className="text-[9px] font-mono text-emerald-400 mt-2 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
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

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#040404]/60 rounded-xl border border-white/5 h-full justify-between">
      <div className="flex gap-2 justify-center">
        {["google", "meta", "amazon"].map((c) => (
          <button
            key={c}
            onClick={() => setActiveCompany(c)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
              activeCompany === c 
                ? "bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.1)]" 
                : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="text-center h-10 flex flex-col justify-center">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Focus Vector</span>
        <span className="text-xs font-semibold text-white leading-tight capitalize truncate">
          {focusAreas[activeCompany]}
        </span>
      </div>
    </div>
  );
}

/**
 * Interactive Audio Waveform for Card 3
 */
function AudioWaveformWidget() {
  return (
    <div className="flex flex-col justify-between p-4 bg-[#040404]/60 rounded-xl border border-white/5 h-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Telemetry</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>
      <div className="flex items-center justify-center gap-1.5 h-12 my-2 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ height: [12, 40, 12] }}
            transition={{
              duration: 1 + Math.random(),
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-1 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
          />
        ))}
      </div>
      <div className="flex justify-between text-[9px] font-mono text-slate-500">
        <span>135 WPM</span>
        <span>Confidence: 8.2</span>
      </div>
    </div>
  );
}

/**
 * Diagnostic Knowledge Graph Widget for Card 4
 */
function InteractiveGraphWidget() {
  return (
    <div className="flex items-center justify-between p-4 bg-[#040404]/60 rounded-xl border border-white/5 h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.04)_0%,transparent_70%)] pointer-events-none" />
      <div className="flex flex-col justify-between h-full relative z-10">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Diagnostic Path</span>
          <span className="text-xs font-bold text-white leading-tight">Rate Limiter Algorithms</span>
        </div>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Knowledge Graph</span>
      </div>
      <div className="flex items-center gap-2 relative z-10">
        <div className="flex flex-col items-center">
          <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center"><CheckCircle2 size={12}/></div>
          <div className="w-px h-3 bg-white/10" />
          <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center animate-pulse"><ShieldAlert size={12}/></div>
        </div>
        <div className="flex flex-col text-[10px] font-mono text-slate-400 gap-6 py-1">
          <span>Token Bucket</span>
          <span>Leaky Bucket</span>
        </div>
      </div>
    </div>
  );
}

export default function Landing({ onGetStarted, onSignIn }) {
  const heroRef = useRef(null);
  
  const { scrollY, scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // Track absolute scroll to handle the Morphing Header Pill threshold
  const [isScrolled, setIsScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fold 1 (0% - 30%): Ghost text dissolves
  const ghostOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const ghostScale = useTransform(scrollYProgress, [0, 0.3], [1, 1.05]);

  // The Descent (0% - 60%): Background graph flies forward and unblurs
  // FIXED: was `["12px", "0px"]` fed through `filter: \`blur(${graphBlur.get()})\`` —
  // .get() reads the value once at render time and freezes it into a plain
  // string, so Framer Motion never saw a live value to animate and the
  // graph never actually un-blurred while scrolling. Now the transform
  // itself outputs the full filter string, and it's passed directly into
  // style.filter as a live MotionValue — same pattern as graphScale/graphOpacity
  // right next to it, which were already correct.
  const graphScale = useTransform(scrollYProgress, [0, 0.6], [0.85, 1.1]);
  const graphBlur = useTransform(scrollYProgress, [0, 0.6], ["blur(12px)", "blur(0px)"]);
  const graphOpacity = useTransform(scrollYProgress, [0, 0.3, 0.6], [0.4, 0.8, 1]);

  // Fold 2 (60% - 85%): Main CTA fades in perfectly clear
  const realOpacity = useTransform(scrollYProgress, [0.6, 0.85], [0, 1]);
  const realY = useTransform(scrollYProgress, [0.6, 0.85], [40, 0]);
  const realScale = useTransform(scrollYProgress, [0.6, 0.85], [0.95, 1]);

  const logos = ["Google", "Amazon", "Meta", "Microsoft", "Apple", "Netflix"];
  const marqueeLogos = [...logos, ...logos, ...logos]; // Duplicated for seamless loop

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
      // We wrap the scene to inject the scroll-linked Z-axis fly-through
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
      
      {/* Blueprint Feature 4: Radial Vignette Masking */}
      {/* Forces nodes behind text to stay dim, while outer nodes remain bright */}
      <div className="landing-vignette pointer-events-none" />

      {/* Blueprint Feature 2: Morphing Header Pill */}
      <nav className={`landing-nav ${isScrolled ? "is-scrolled" : ""}`}>
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <div className="landing-brand-mark">AI</div>
            <span>InterviewCoach</span>
          </div>
          <div className="landing-nav-actions">
            <Button variant="ghost" size="sm" onClick={onSignIn}>Sign in</Button>
            <Button size="sm" onClick={onGetStarted}>Get started</Button>
          </div>
        </div>
      </nav>

      {/* Hero — 200vh so there's real scroll distance for the dolly/crossfade to play out */}
      <section ref={heroRef} style={{ height: "200vh", position: "relative" }}>
        <div className="landing-hero-sticky">
          
          <motion.h1 
            className="ds-ghost-text absolute w-full text-center" 
            style={{ opacity: ghostOpacity, scale: ghostScale, top: "40%" }}
          >
            Know the terrain.
          </motion.h1>

          <motion.div
            className="landing-hero-real"
            style={{ opacity: realOpacity, y: realY, scale: realScale }}
          >
            <h1 className="landing-headline">
              Ace your next<br />technical interview.
            </h1>
            <p className="landing-subline">
              Adaptive difficulty, real-time coaching, and company-specific
              prep — built on a real knowledge graph of 93 CS topics.
            </p>
            <div className="landing-hero-actions">
              {/* High-contrast tactile CTA */}
              <Button size="lg" onClick={onGetStarted} className="tactile-cta">
                Start free →
                <kbd className="cta-shortcut">↵</kbd>
              </Button>
              <Button variant="secondary" size="lg" className="secondary-cta">
                See how it works
              </Button>
            </div>
          </motion.div>

          <motion.p 
            className="landing-scroll-hint"
            style={{ opacity: ghostOpacity }} // Fades out as you scroll down
          >
            Scroll to explore the graph ↓
          </motion.p>
        </div>
      </section>

      {/* Blueprint Feature 5: Infinite Sliding Logo Marquee */}
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
      {/* BENTO GRID SPECIFICATION                                                  */}
      {/* ========================================================================= */}
      <section className="landing-bento max-w-6xl mx-auto px-6 py-32 relative z-20">
        <div className="text-center mb-16">
          <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest">Under The Hood</span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter text-white mt-3">Not a wrapper around a chatbot.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Double Width - ELO Engine */}
          <div className="md:col-span-2">
            <GlassCard mousePos={mousePos} className="h-72 flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="flex-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <BrainCircuit size={18} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Adaptive ELO Difficulty</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium max-w-sm">
                  Every answer updates your rating in real-time. System difficulty scales dynamically with your ELO.
                </p>
              </div>
              <div className="w-full md:w-44 h-44 flex-shrink-0">
                <InteractiveEloWidget />
              </div>
            </GlassCard>
          </div>

          {/* Card 2: Single Width - Company Mutation */}
          <div className="md:col-span-1">
            <GlassCard mousePos={mousePos} className="h-72 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <Target size={18} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Company Specific Mutation</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  Mutates questions to align with specific organizational cultures and architectures.
                </p>
              </div>
              <CompanyDnaWidget />
            </GlassCard>
          </div>

          {/* Card 3: Single Width - Audio Waveform */}
          <div className="md:col-span-1">
            <GlassCard mousePos={mousePos} className="h-72 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <Activity size={18} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Confidence Telemetry</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  Analyzes pace, tone, and filler words continuously.
                </p>
              </div>
              <AudioWaveformWidget />
            </GlassCard>
          </div>

          {/* Card 4: Double Width - Knowledge Graph */}
          <div className="md:col-span-2">
            <GlassCard mousePos={mousePos} className="h-72 flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="flex-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <Terminal size={18} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">93-Topic Knowledge Graph</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium max-w-sm">
                  Tracks prerequisite chains across computer science. Every gap ties back to specific path dependencies.
                </p>
              </div>
              <div className="w-full md:w-64 h-44 flex-shrink-0">
                <InteractiveGraphWidget />
              </div>
            </GlassCard>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* TACTILE SHIMMER CTA ANCHOR                                                */}
      {/* ========================================================================= */}
      <section className="landing-cta max-w-4xl mx-auto text-center px-6 py-32 relative z-20">
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
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            Start free now <ChevronRight size={16} />
            <kbd className="hidden sm:inline-flex items-center justify-center bg-black/10 rounded px-1.5 py-0.5 text-[10px] font-mono text-black/60 ml-2">↵ Enter</kbd>
          </motion.button>
        </div>
      </section>

    </PremiumLayout>
  );
}

// Inlined Glass Card with cursor-spotlight to avoid dependency issues
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
      className={`relative rounded-2xl bg-white/[0.02] border border-white/[0.05] p-8 overflow-hidden backdrop-blur-xl ${className}`}
      style={{
        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08), 0 20px 40px -10px rgba(0,0,0,0.5)'
      }}
    >
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(400px circle at ${cursorX}px ${cursorY}px, rgba(255,255,255,0.04), transparent 40%)`,
          opacity: isHovered ? 1 : 0
        }}
      />
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}