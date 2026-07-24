import React, { useState, useEffect, useRef, Suspense } from "react";
import { 
  motion, useScroll, useSpring, AnimatePresence, useInView, useMotionValue, useTransform, animate
} from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as random from "maath/random/dist/maath-random.esm";
import PremiumLayout, { GlassCard, AnimatedNumber } from "../components/layout/PremiumLayout";
import { 
  ChevronRight, BrainCircuit, Activity, Target, Terminal, 
  Code2, CheckCircle2, AlertTriangle, Lock, Users, BarChart3, 
  Layers, Mic, Sparkles, Play, ExternalLink, Cpu, Check, ShieldCheck, Key
} from "lucide-react";
import "./Landing.css";

function ScrollAnimatedNumber({ to, decimals = 0, suffix = "" }) {
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

  return <span ref={ref}>{display}{suffix}</span>;
}

function Github({ size = 16, className = "" }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      width={size} 
      height={size} 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.26 1.23-.26 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function StarField({ scrollYProgress }) {
  const ref = useRef();
  const [sphere] = useState(() => random.inSphere(new Float32Array(2500), { radius: 12 }));
  const smoothY = useSpring(scrollYProgress, { damping: 50, stiffness: 400 });

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 20;
      ref.current.rotation.y -= delta / 25;
    }
    
    const zPosition = 22 - (smoothY.get() * 12); 
    state.camera.position.z = Math.max(10, Math.min(22, zPosition));

    const fov = 35 + (smoothY.get() * 20); 
    state.camera.fov = Math.max(35, Math.min(55, fov));
    
    state.camera.updateProjectionMatrix();
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
        <PointMaterial 
          transparent 
          color="#818cf8" 
          size={0.048} 
          sizeAttenuation={true} 
          depthWrite={false} 
          opacity={0.55} 
        />
      </Points>
    </group>
  );
}

function SceneCanvas({ scrollYProgress }) {
  return (
    <Canvas camera={{ position: [0, 0, 22], fov: 35 }} className="w-full h-full pointer-events-none" dpr={[1, 2]}>
      <Suspense fallback={null}>
        <StarField scrollYProgress={scrollYProgress} />
      </Suspense>
    </Canvas>
  );
}

export default function Landing({ onGetStarted, onSignIn }) {
  const [activeTrack, setActiveTrack] = useState("system"); // 'system' | 'coding'
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const containerRef = useRef(null);
  
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });

  useEffect(() => {
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const logos = ["Google", "Meta", "Amazon", "Microsoft", "Apple", "Netflix"];

  return (
    <PremiumLayout
      scene={<SceneCanvas scrollYProgress={scrollYProgress} />}
      ambientColors={activeTrack === 'system' ? ["#2563eb", "#6366f1"] : ["#d97706", "#2563eb"]}
    >
      
      {/* FLOATING CONTROL CAPSULE (Fixed Z-index & backdrop bounds) */}
      <nav className="fixed top-5 left-0 right-0 z-[80] flex justify-center px-4 pointer-events-auto">
        <motion.div 
          initial={{ y: -20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-center justify-between w-full max-w-5xl bg-[#0A0A0C]/90 backdrop-blur-2xl border border-white/[0.08] px-4 py-2 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.9),_inset_0_1px_0_0_rgba(255,255,255,0.1)]"
        >
          {/* Brand Mark */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center font-extrabold text-white text-[10px] shadow-[0_0_15px_rgba(37,99,235,0.6)]">
              IC
            </div>
            <span className="font-bold text-white tracking-tight text-sm hidden sm:block">InterviewCoach</span>
            <span className="text-[9px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full hidden md:inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> DEMO READY
            </span>
          </div>

          {/* Track Switcher */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-full border border-white/[0.05] relative">
            <button 
              onClick={() => setActiveTrack("system")} 
              className={`relative px-4 py-1.5 rounded-full text-xs font-bold transition-all z-10 outline-none flex items-center gap-1.5 ${activeTrack === 'system' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <BrainCircuit size={13} />
              <span>System Design</span>
            </button>
            <button 
              onClick={() => setActiveTrack("coding")} 
              className={`relative px-4 py-1.5 rounded-full text-xs font-bold transition-all z-10 outline-none flex items-center gap-1.5 ${activeTrack === 'coding' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Code2 size={13} />
              <span>Live Coding</span>
            </button>
            <motion.div 
              className="absolute top-1 bottom-1 bg-white/[0.12] border border-white/20 rounded-full z-0"
              initial={false}
              animate={{ 
                left: activeTrack === "system" ? "4px" : "50%", 
                width: "calc(50% - 4px)" 
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          </div>

          {/* Action Pair */}
          <div className="flex items-center gap-3">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer" 
              className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors px-2.5 py-1.5"
            >
              <Github size={14} />
              <span>Source</span>
            </a>
            <button onClick={onSignIn} className="text-xs font-bold text-slate-300 hover:text-white transition-colors px-3 py-1.5 outline-none">
              Sign In
            </button>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={onGetStarted} 
              className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] outline-none flex items-center gap-1"
            >
              <span>Try Demo</span>
              <ChevronRight size={14} />
            </motion.button>
          </div>
        </motion.div>
      </nav>

      {/* HERO SECTION */}
      <section ref={containerRef} className="relative pt-32 pb-20 w-full z-10">
        <div className="w-full max-w-6xl mx-auto px-6 flex flex-col items-center text-center">
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTrack}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              {/* Category Pill */}
              <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest mb-6 ${
                activeTrack === 'system' 
                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300 shadow-[inset_0_1px_0_0_rgba(99,102,241,0.2)]' 
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-300 shadow-[inset_0_1px_0_0_rgba(245,158,11,0.2)]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeTrack === 'system' ? 'bg-indigo-400' : 'bg-amber-400'}`} />
                {activeTrack === 'system' ? '93 CS Topics · Adaptive ELO Engine' : 'Sandboxed Execution · 4 Languages'}
              </div>

              {/* Dynamic Headline */}
              <h1 className="text-4xl md:text-6xl lg:text-[72px] font-extrabold tracking-tighter text-white leading-[1.08] mb-6 drop-shadow-2xl max-w-4xl">
                {activeTrack === 'system' ? (
                  <>
                    Practice technical interviews<br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-indigo-500">that actually adapt to you.</span>
                  </>
                ) : (
                  <>
                    Master live algorithms<br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-amber-500">with sandboxed execution.</span>
                  </>
                )}
              </h1>

              {/* Subheadline */}
              <p className="text-base md:text-xl text-slate-300 max-w-2xl leading-relaxed mb-8 font-medium">
                {activeTrack === 'system' 
                  ? "Adaptive difficulty, real-time voice telemetry, and company-specific architecture simulations — built on a diagnostic computer science knowledge graph."
                  : "Isolated multi-language subprocess execution, automated test case pipelines, and Socratic hints that guide you without revealing the answer."}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-16">
            <motion.button 
              whileTap={{ scale: 0.96 }}
              onClick={onGetStarted} 
              className="relative group overflow-hidden bg-white text-black px-8 py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-3 w-full sm:w-auto shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_45px_rgba(255,255,255,0.4)] outline-none"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
              Start Free Demo <ChevronRight size={16} className="relative z-10" />
              <kbd className="hidden sm:inline-block ml-1 font-mono text-[10px] bg-black/10 px-1.5 py-0.5 rounded text-black/60 relative z-10 border border-black/10">↵ Enter</kbd>
            </motion.button>
            
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer"
              className="px-6 py-4 rounded-xl text-sm font-bold text-slate-300 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:text-white transition-colors outline-none backdrop-blur-md flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <Github size={16} /> View GitHub Repo <ExternalLink size={12} className="text-slate-500" />
            </a>
          </div>

          {/* HERO COCKPIT PREVIEW */}
          <div className="w-full max-w-4xl relative">
            <GlassCard mousePos={mousePos} className="p-0 text-left border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.9)]">
              <AnimatePresence mode="wait">
                {activeTrack === 'system' ? (
                  <HeroSystemDesignPreview key="sys-preview" />
                ) : (
                  <HeroLiveCodingPreview key="code-preview" />
                )}
              </AnimatePresence>
            </GlassCard>
          </div>

        </div>
      </section>

      {/* METRICS & LOGOS */}
      <section className="relative z-30 py-16 bg-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 text-center mb-8">
            Engineered for FAANG-level technical evaluation standards
          </p>
          
          <div className="overflow-hidden mask-edges w-full max-w-5xl mx-auto mb-16">
            <div className="flex gap-16 w-max animate-marquee opacity-60">
              {[...logos, ...logos, ...logos].map((logo, i) => (
                <span key={`${logo}-${i}`} className="text-2xl font-extrabold text-slate-400 uppercase tracking-tighter hover:text-white transition-colors cursor-default">{logo}</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-white/[0.05]">
            <MetricColumn value={<ScrollAnimatedNumber to={93} />} label="CS Graph Nodes" icon={Layers} color="text-indigo-400" />
            <MetricColumn value={<ScrollAnimatedNumber to={4} />} label="IDE Languages" icon={Code2} color="text-emerald-400" />
            <MetricColumn value={<ScrollAnimatedNumber to={100} suffix="%" />} label="Sandboxed Exec" icon={Terminal} color="text-rose-400" />
            <MetricColumn value="5D" label="Telemetry Vectors" icon={BarChart3} color="text-amber-400" />
          </div>
        </div>
      </section>

      {/* TRACK B SHOWCASE */}
      <section className="relative z-30 py-24 bg-transparent">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                <Code2 size={12} /> Track B: Live IDE Engine
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tighter text-white leading-tight">
                A real code editor.<br />
                Not a static text box.
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-medium">
                Practice Data Structures & Algorithms in Python, JavaScript, C++, or Java. Your code executes inside an isolated Linux sandbox with live test case suites and automated complexity estimations.
              </p>

              <div className="space-y-4 pt-2">
                <FeatureCheck title="Sandboxed Multiprocess Execution" desc="Subsecond execution with stdout, stderr, and memory limits." />
                <FeatureCheck title="Socratic AI Debugging" desc="Never gives away answers. Guides you toward optimal Big-O bounds." />
                <FeatureCheck title="Automated Test Pipelines" desc="Evaluates edge cases, large inputs, and memory constraints." />
              </div>
            </div>

            <div className="lg:col-span-7">
              <GlassCard mousePos={mousePos} className="p-0 overflow-hidden border-amber-500/20 shadow-2xl">
                <InteractiveMonacoShowcase />
              </GlassCard>
            </div>

          </div>
        </div>
      </section>

      {/* BENTO GRID MATRIX WITH REAL EVALUATION REPORT SHOWCASE */}
      <section className="relative z-30 py-28 bg-transparent">
        <div className="max-w-[1200px] mx-auto px-6">
          
          <div className="text-center mb-20">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">Under The Hood</span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white mt-6">Not a wrapper around a chatbot.</h2>
            <p className="text-slate-300 mt-4 max-w-2xl mx-auto font-medium text-lg">An architecture built on localized execution, active telemetry, and adaptive mathematics.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-fr">
            
            {/* ROW 1 */}
            <div className="md:col-span-2 relative"><GlassCard mousePos={mousePos} className="h-full"><InteractiveEloWidget /></GlassCard></div>
            <div className="md:col-span-1 relative"><GlassCard mousePos={mousePos} className="h-full"><InterviewerPersonaWidget /></GlassCard></div>
            <div className="md:col-span-1 relative"><GlassCard mousePos={mousePos} className="h-full"><AudioWaveformWidget /></GlassCard></div>

            {/* ROW 2 */}
            <div className="md:col-span-2 relative"><GlassCard mousePos={mousePos} className="h-full p-0"><SocraticEngineWidget /></GlassCard></div>
            <div className="md:col-span-1 relative"><GlassCard mousePos={mousePos} className="h-full"><CompanyDnaWidget /></GlassCard></div>
            <div className="md:col-span-1 relative"><GlassCard mousePos={mousePos} className="h-full"><PeerPercentileWidget /></GlassCard></div>

            {/* ROW 3: REPLAY & SCORING PAYOFF PREVIEW */}
            <div className="md:col-span-2 relative"><GlassCard mousePos={mousePos} className="h-full"><ScoringAndResultsWidget /></GlassCard></div>
            <div className="md:col-span-2 relative"><GlassCard mousePos={mousePos} className="h-full"><InteractiveGraphWidget /></GlassCard></div>

          </div>
        </div>
      </section>

      {/* RECRUITER & ENGINEERING ARCHITECTURE SECTION */}
      <section className="relative z-30 py-20 bg-transparent">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-6">
            <Cpu size={12} /> Engineering Architecture
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter text-white mb-4">
            Built from scratch for production scale.
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto font-medium mb-12">
            No generic templates. Built with FastAPI, PostgreSQL, WebSockets, JWT + bcrypt, Claude 3.5 Sonnet, and Framer Motion.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <TechBadge label="Backend API" val="FastAPI / Python 3.11" />
            <TechBadge label="Vector DB" val="PostgreSQL (cosine similarity)" />
            <TechBadge label="AI Scorer" val="Claude 3.5 Sonnet" />
            <TechBadge label="Live Voice" val="Whisper VAD Websockets" />
            <TechBadge label="Auth & Security" val="JWT + bcrypt" />
            <TechBadge label="Frontend" val="React 18 / Tailwind" />
            <TechBadge label="Cache Layer" val="Redis TTL Budget" />
            <TechBadge label="Monitoring" val="Sentry + Structlog" />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-30 pt-16 pb-28 px-6 text-center bg-transparent">
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-white mb-6 leading-tight">
            Ready to test your skill?
          </h2>
          <p className="text-slate-300 text-base md:text-lg font-medium mb-10 max-w-lg mx-auto leading-relaxed">
            Free portfolio demo. No credit card required. Master technical, behavioral, and live coding interviews natively.
          </p>
          <div className="flex justify-center">
            <motion.button 
              whileTap={{ scale: 0.96 }}
              onClick={onGetStarted} 
              className="relative group overflow-hidden bg-white text-black px-10 py-4 rounded-xl text-sm font-bold transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] flex items-center gap-3 outline-none"
            >
               <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
               Start Free Demo <ChevronRight size={16} className="relative z-10" />
               <kbd className="hidden sm:inline-block ml-2 font-mono text-[10px] bg-black/10 px-1.5 py-0.5 rounded text-black/60 relative z-10 border border-black/10">↵ Enter</kbd>
            </motion.button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-30 py-8 text-center bg-transparent">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
            © 2026 InterviewCoach. <span className="text-slate-300 ml-1">Designed & Engineered by Adhiswauran.</span>
          </p>
          <div className="flex items-center gap-6 text-xs font-bold text-slate-400">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
              <Github size={14} /> GitHub
            </a>
            <span className="text-slate-600">&middot;</span>
            <span className="text-slate-500">Portfolio Build</span>
          </div>
        </div>
      </footer>

    </PremiumLayout>
  );
}


function HeroSystemDesignPreview() {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="p-6 md:p-8 bg-[#08080C]/90 backdrop-blur-2xl rounded-2xl border border-white/10"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="text-xs font-mono font-bold text-slate-400 ml-2">system_design_session.md</span>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Meta L5 System Active</span>
        </div>
      </div>

      <div className="space-y-4 font-mono text-xs md:text-sm">
        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
          <span className="text-[10px] font-sans font-bold text-indigo-400 uppercase tracking-widest block mb-1">Interviewer Prompt (Hostile Persona)</span>
          <p className="text-slate-200 font-sans font-medium">"Your rate limiter uses a fixed window log. How does it handle 100k RPS spike traffic without overwhelming memory?"</p>
        </div>

        <div className="bg-black/60 border border-white/10 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 pr-2">
            <span className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest block mb-1">Candidate Response (Voice Input)</span>
            <p className="text-slate-200 font-mono text-xs leading-relaxed">"I would transition to a Redis Sorted Set Sliding Window with an In-Memory Token Bucket..."</p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 rounded text-[10px] font-sans font-bold text-indigo-300 self-start sm:self-auto">
            <Mic size={12} className="animate-pulse text-indigo-400" />
            <span>138 WPM &middot; Conf 8.8/10</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function HeroLiveCodingPreview() {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="p-6 md:p-8 bg-[#08080C]/90 backdrop-blur-2xl rounded-2xl border border-white/10"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="text-xs font-mono font-bold text-amber-400 ml-2">solution.py</span>
        </div>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Sandboxed Python 3.11</span>
        </div>
      </div>

      <div className="bg-[#040406] p-4 rounded-xl font-mono text-xs text-indigo-200 leading-relaxed relative">
        <pre>{`def length_of_longest_substring(s: str) -> int:
    char_map = {}
    left = max_len = 0
    for right, char in enumerate(s):
        if char in char_map and char_map[char] >= left:
            left = char_map[char] + 1
        char_map[char] = right
        max_len = max(max_len, right - left + 1)
    return max_len`}</pre>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
            <CheckCircle2 size={13} /> 12/12 Test Cases Passed (0.8ms)
          </span>
          <span className="text-[10px] font-mono text-slate-300">Time: O(N) | Space: O(min(N, M))</span>
        </div>
      </div>
    </motion.div>
  );
}

function InteractiveMonacoShowcase() {
  const [lang, setLang] = useState("python");
  const snippets = {
    python: `def rate_limiter(user_id: str, limit: int = 100) -> bool:
    # Token Bucket in Redis with Atomic Lua Script
    pipe = redis.pipeline()
    pipe.zadd(f"rate:{user_id}", {now: now})
    pipe.zremrangebyscore(f"rate:{user_id}", 0, now - 60)
    return len(pipe.execute()) <= limit`,
    javascript: `async function rateLimiter(userId, limit = 100) {
  // Token Bucket in Redis
  const key = \`rate:\${userId}\`;
  const now = Date.now();
  await redis.zadd(key, now, now);
  return (await redis.zcard(key)) <= limit;
}`,
    cpp: `bool rate_limiter(const std::string& user_id, int limit) {
    // Sliding Window Log
    auto now = std::chrono::system_clock::now();
    clean_expired_tokens(user_id, now);
    return get_window_count(user_id) <= limit;
}`,
    java: `public boolean rateLimiter(String userId, int limit) {
    long now = System.currentTimeMillis();
    redis.zadd("rate:" + userId, now, String.valueOf(now));
    return redis.zcard("rate:" + userId) <= limit;
}`
  };

  return (
    <div className="flex flex-col bg-[#050508] font-mono text-xs">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/60">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-amber-400" />
          <span className="text-xs font-bold text-white font-sans">Monaco IDE Sandbox</span>
        </div>
        <div className="flex gap-1.5">
          {["python", "javascript", "cpp", "java"].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                lang === l 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {l.substring(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 text-indigo-200 leading-relaxed overflow-x-auto min-h-[160px]">
        <AnimatePresence mode="wait">
          <motion.pre key={lang} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {snippets[lang]}
          </motion.pre>
        </AnimatePresence>
      </div>

      <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between text-[11px] font-sans">
        <div className="flex items-center gap-2 text-emerald-400 font-bold">
          <CheckCircle2 size={14} /> <span>12/12 Hidden Test Cases Passed</span>
        </div>
        <span className="text-slate-300 font-mono">Exec Time: 1.2ms</span>
      </div>
    </div>
  );
}

function MetricColumn({ value, label, icon: Icon, color }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter mb-3 font-mono tabular-nums">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center justify-center gap-1.5">
        <Icon size={14} className={color} /> {label}
      </div>
    </div>
  );
}

function FeatureCheck({ title, desc }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mt-0.5 flex-shrink-0">
        <Check size={12} />
      </div>
      <div>
        <h4 className="text-xs font-bold text-white">{title}</h4>
        <p className="text-xs text-slate-300 font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function TechBadge({ label, val }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 p-4 rounded-xl shadow-sm">
      <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-300 block mb-1">{label}</span>
      <span className="text-xs font-bold text-white font-mono">{val}</span>
    </div>
  );
}

// BENTO TILE 1: ELO Engine
function InteractiveEloWidget() {
  return (
    <div className="flex flex-col justify-between h-full w-full min-h-[280px]">
      <div>
        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
          <BrainCircuit size={20} className="text-indigo-400" />
        </div>
        <h3 className="text-xl font-bold text-white tracking-tight mb-2">Adaptive ELO Difficulty</h3>
        <p className="text-sm font-medium text-slate-300 max-w-sm leading-relaxed">
          Every answer updates your rating in real-time. Difficulty scales to enforce a state of flow.
        </p>
      </div>
      <div className="mt-8 flex items-end justify-between relative h-32">
        <div className="z-10 relative">
          <span className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Current Rating</span>
          <div className="text-6xl font-extrabold text-white font-mono tabular-nums tracking-tighter leading-none"><AnimatedNumber to={1416} /></div>
          <span className="inline-block mt-3 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded">Level 5 Active</span>
        </div>
        <svg className="absolute bottom-0 right-0 w-[80%] h-full text-indigo-500/40 overflow-visible" viewBox="0 0 200 100" preserveAspectRatio="none">
          <path d="M0,80 Q50,80 100,50 T200,20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="hover:text-indigo-400 transition-colors" />
          <circle cx="200" cy="20" r="5" fill="#818cf8" className="animate-pulse shadow-[0_0_15px_#818cf8]" />
        </svg>
      </div>
    </div>
  );
}

// BENTO TILE 2: Personas
function InterviewerPersonaWidget() {
  const [active, setActive] = useState("hostile");
  const personas = {
    standard: { label: "Std", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", quote: "Explore your approach to scaling." },
    hostile: { label: "Hostile", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", quote: "That won't scale at 100k RPS. Fix it." },
    socratic: { label: "Socratic", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", quote: "Why a Hash Map over a Trie?" }
  };

  return (
    <div className="flex flex-col h-full w-full justify-between min-h-[280px]">
      <div>
        <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2 mb-4">
          <Users size={16} className="text-rose-400"/> Personas
        </h3>
        <div className="flex gap-2 w-full">
          {Object.entries(personas).map(([key, p]) => (
            <button
              key={key} onClick={() => setActive(key)}
              className={`py-2 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all text-center w-full outline-none ${
                active === key ? `bg-white/[0.12] text-white border-white/20 shadow-sm` : "bg-transparent border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex-1 flex flex-col justify-end">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Simulated Response</span>
        <AnimatePresence mode="wait">
          <motion.div key={active} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className={`p-3 rounded-lg border ${personas[active].bg} ${personas[active].border}`}>
            <p className={`text-xs font-medium leading-relaxed ${personas[active].color}`}>"{personas[active].quote}"</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// BENTO TILE 3: Socratic AI Engine
function SocraticEngineWidget() {
  return (
    <div className="flex flex-col h-full w-full min-h-[280px]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-black/40">
        <div className="flex items-center gap-3">
          <Sparkles size={16} className="text-indigo-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">Socratic AI Debugger</h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
          Active Tutor
        </span>
      </div>
      <div className="flex-1 bg-[#050505] p-5 flex flex-col justify-between relative overflow-hidden">
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-slate-300">
            <span className="text-indigo-400 font-bold block mb-1">User Attempt:</span>
            "I will loop through the array and use a nested loop to check for duplicates."
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-200">
            <span className="text-amber-400 font-bold block mb-1">Socratic Guidance:</span>
            "Nested loops result in O(N²) time. Can you trade O(N) space memory to bring time complexity down to O(N)?"
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-sans text-slate-400">
          <span>Guided Learning Mode</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Zero Answer Spoilers</span>
        </div>
      </div>
    </div>
  );
}

// BENTO TILE 4: Voice Telemetry
function AudioWaveformWidget() {
  return (
    <div className="flex flex-col justify-between h-full w-full min-h-[280px]">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Mic size={16} className="text-emerald-400"/> Voice Telemetry
        </h3>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
      </div>
      <div className="mt-auto">
        <div className="flex items-end gap-1.5 h-16 mb-4 w-full overflow-hidden">
          {Array.from({length: 16}).map((_, i) => (
            <motion.div key={i} className="flex-1 bg-emerald-400/80 rounded-t-sm" animate={{ height: [6, Math.random() * 50 + 10, 6] }} transition={{ duration: 0.8 + Math.random(), repeat: Infinity, ease: "easeInOut" }} />
          ))}
        </div>
        <div className="flex justify-between items-center text-[11px] font-mono font-bold text-slate-300 border-t border-white/10 pt-3">
          <span className="text-white">135 WPM</span>
          <span className="text-emerald-400">Conf: 8.6/10</span>
        </div>
      </div>
    </div>
  );
}

// BENTO TILE 5: Company DNA
function CompanyDnaWidget() {
  const [activeCompany, setActiveCompany] = useState("google");
  const vectorStats = { google: [85, 60], meta: [65, 90], amazon: [45, 95] };

  return (
    <div className="flex flex-col justify-between h-full w-full min-h-[280px]">
      <div>
        <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2 mb-5">
          <Target size={16} className="text-blue-400" /> Company DNA
        </h3>
        <div className="flex gap-2 w-full">
          {["google", "meta", "amazon"].map(c => (
            <button key={c} onClick={() => setActiveCompany(c)} className={`py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all text-center w-full outline-none ${activeCompany === c ? 'bg-white/[0.12] text-white border-white/20' : 'bg-transparent border-white/10 text-slate-400 hover:text-white'}`}>
              {c.substring(0,4)}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-4 mt-6">
        <div>
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5"><span>Scale</span><span className="text-white font-mono">85%</span></div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${vectorStats[activeCompany][0]}%` }} /></div>
        </div>
        <div>
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5"><span>Tradeoffs</span><span className="text-emerald-400 font-mono">60%</span></div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${vectorStats[activeCompany][1]}%` }} /></div>
        </div>
      </div>
    </div>
  );
}

// BENTO TILE 6: 5D Evaluation & Scoring Payoff Widget (NEW PAYOFF PREVIEW)
function ScoringAndResultsWidget() {
  return (
    <div className="flex flex-col justify-between h-full w-full min-h-[280px] p-1">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-emerald-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">5D Evaluation & Scoring Engine</h3>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
          Payoff Report
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center flex-1">
        {/* Score Circle & ELO Delta */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center bg-black/50 border border-white/5 p-4 rounded-xl text-center">
          <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 block mb-1">Overall Evaluation</span>
          <div className="text-5xl font-black text-white font-mono tabular-nums tracking-tighter">8.8<span className="text-sm text-slate-500">/10</span></div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
            <span>ELO 1200 ➔ 1224</span>
            <span className="text-emerald-400 font-extrabold">↑ +24</span>
          </div>
        </div>

        {/* 5D Skill Radar Polygon */}
        <div className="sm:col-span-7 flex flex-col items-center justify-center relative">
          <div className="w-full h-32 relative flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full opacity-85 overflow-visible">
              <polygon points="50,10 90,35 75,85 25,85 10,35" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <polygon points="50,22 82,40 68,78 32,78 18,40" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="1.5" />
            </svg>
            <span className="absolute top-1 text-[8px] font-mono font-bold text-slate-400 uppercase">Technical (9.2)</span>
            <span className="absolute bottom-1 text-[8px] font-mono font-bold text-slate-400 uppercase">Comm (8.4)</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium text-center mt-1">Multi-dimensional scoring across 5 skill vectors</p>
        </div>
      </div>
    </div>
  );
}

// BENTO TILE 7: Knowledge Graph
function InteractiveGraphWidget() {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between h-full w-full min-h-[280px]">
       <div className="w-full sm:w-1/2 pr-6 sm:border-r border-white/[0.06]">
         <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
           <Layers size={20} className="text-amber-400" />
         </div>
         <h3 className="text-lg font-bold text-white tracking-tight mb-2">93-Node Curriculum</h3>
         <p className="text-sm font-medium text-slate-300 leading-relaxed">Diagnostic trees track dependencies. Never fail a systems question due to a hidden foundation gap.</p>
       </div>
       <div className="w-full sm:w-1/2 flex flex-col gap-3 font-mono text-[11px] text-slate-300 sm:pl-6 mt-6 sm:mt-0">
         <div className="flex items-center gap-3 bg-white/[0.03] p-2.5 rounded border border-white/10"><CheckCircle2 size={16} className="text-emerald-400"/> Token Bucket</div>
         <div className="flex items-center gap-3 bg-amber-500/10 p-2.5 rounded border border-amber-500/30 text-amber-200"><AlertTriangle size={16} className="text-amber-400 animate-pulse"/> Leaky Bucket</div>
         <div className="flex items-center gap-3 opacity-50 p-2.5"><Lock size={16} className="text-slate-400"/> Sliding Window</div>
       </div>
    </div>
  );
}

// BENTO TILE 8: Peer Percentile
function PeerPercentileWidget() {
  return (
    <div className="flex flex-col justify-between items-center text-center h-full w-full min-h-[280px]">
      <Activity size={28} className="text-emerald-400 mt-4" />
      <div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Global Rank</span>
        <div className="text-4xl font-extrabold text-white tracking-tighter tabular-nums mb-2 font-mono">Top 12%</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded inline-block font-mono">1,240 Peers</div>
      </div>
    </div>
  );
}