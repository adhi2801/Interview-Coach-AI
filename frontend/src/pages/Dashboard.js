import { API_URL } from "../config";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, BrainCircuit, ChevronRight, Activity, ArrowLeft, Rocket } from "lucide-react";
import axios from "axios";
import CustomSelect from "../components/ui/CustomSelect";
import { siGoogle, siMeta, siApple, siNetflix } from "simple-icons";
import { FaAmazon } from "react-icons/fa";

// Authentic Official Vector SVGs
function BrandIcon({ icon, className = "w-6 h-6", forceWhite = false }) {
  return (
    <svg role="img" viewBox="0 0 24 24" className={className} fill={forceWhite ? "#ffffff" : `#${icon.hex}`}>
      <path d={icon.path} />
    </svg>
  );
}

const COMPANIES = [
  {
    id: "google", name: "Google", color: "#4285F4",
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    )
  },
  {
    id: "amazon", name: "Amazon", color: "#FF9900",
    logo: <FaAmazon size={24} color="#FF9900" />
  },
  {
    id: "meta", name: "Meta", color: "#0866FF",
    logo: <BrandIcon icon={siMeta} />
  },
  {
    id: "microsoft", name: "Microsoft", color: "#00A4EF",
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#F25022" d="M1 1h10v10H1z"/>
        <path fill="#7FBA00" d="M13 1h10v10H13z"/>
        <path fill="#00A4EF" d="M1 13h10v10H1z"/>
        <path fill="#FFB900" d="M13 13h10v10H1z"/>
      </svg>
    )
  },
  {
    id: "apple", name: "Apple", color: "#e2e8f0",
    logo: <BrandIcon icon={siApple} forceWhite />
  },
  {
    id: "netflix", name: "Netflix", color: "#E50914",
    logo: <BrandIcon icon={siNetflix} />
  },
  {
    id: "startup", name: "Startup", color: "#10b981",
    logo: <Rocket size={24} className="text-emerald-400" />
  },
];

const PERSONAS = [
  { id: "standard", label: "Standard", desc: "Balanced, professional interviewer" },
  { id: "hostile", label: "Hostile", desc: "Challenges assumptions, strict constraints" },
  { id: "socratic", label: "Socratic", desc: "Guides with questions, never answers" },
  { id: "exhausted", label: "Exhausted", desc: "Bored and terse — earn engagement" },
];

const ROLES = [
  "Software Engineer — L3/IC3",
  "Senior Software Engineer — L4/IC4",
  "Staff Engineer — L5/IC5",
  "ML Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "System Design Engineer",
];

const INSIGHTS = {
  google: "Google interviews focus on algorithms and system design. Think out loud, ask clarifying questions, and always analyze time and space complexity.",
  amazon: "Every Amazon answer should map to one of the 14 Leadership Principles. Prepare 2-3 STAR stories per principle with measurable outcomes.",
  meta: "Meta prioritizes product sense and data-driven decisions. Show you can think at scale, billions of users, and ship fast.",
  microsoft: "Microsoft values growth mindset and collaboration. Demonstrate iterative thinking, openness to feedback, and cross-team awareness.",
  apple: "Apple demands attention to detail and craftsmanship. Every solution should prioritize user experience, privacy, and performance.",
  netflix: "Netflix operates on freedom and responsibility. Show high autonomy, candid communication, and data-driven judgment.",
  startup: "Startups value ownership and adaptability. Demonstrate you can wear multiple hats, move fast, and make decisions with incomplete information.",
};

export default function Dashboard({ onStart, user, onGoBack }) {
  const [company, setCompany] = useState("google");
  const [role, setRole] = useState("Software Engineer — L3/IC3");
  const [persona, setPersona] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [mounted, setMounted] = useState(false);
  const [bootText, setBootText] = useState("");
  
  const currentElo = Math.round(user?.elo_rating || 1200);
  const selectedCompany = COMPANIES.find((c) => c.id === company);

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Premium Feature: Subsecond Terminal Boot Sequence
  const bootSequence = [
    `> Injecting ${selectedCompany?.name} DNA...`, 
    `> Calibrating Hostility...`, 
    `> Establishing WebRTC...`, 
    `> Simulation Ready`
  ];

  useEffect(() => {
    if (loading) {
      let i = 0;
      setBootText(bootSequence[0]);
      const interval = setInterval(() => {
        i++;
        if (i < bootSequence.length) setBootText(bootSequence[i]);
      }, 350);
      return () => clearInterval(interval);
    }
  }, [loading, selectedCompany]);

  const handleStart = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}/session/start`,
        {
          user_name: user?.name || "Candidate",
          company,
          role,
          elo: user?.elo_rating || 1200.0,
          persona,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Slight delay to allow terminal boot animation to complete
      setTimeout(() => {
        if(onStart) onStart(response.data);
      }, 1400);
    } catch (err) {
      setError("Cannot connect to server. Ensure backend is running.");
      setLoading(false);
    }
  }, [loading, company, role, persona, user, onStart]);

  // Premium Feature: Global Keyboard Shortcut (Enter key)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStart]);

  // Animation Variants
  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  
  const itemVars = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 28 } }
  };

  return (
    <div className="relative min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden flex flex-col items-center justify-center">
      
      {/* Inline Shimmer Keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2.5s infinite linear;
        }
      `}</style>

      {/* AMBIENT LIGHTS & GRAIN (Brand Color Synced with Edge Safeguards) */}
      <div 
        className="fixed top-[-15%] left-[25%] w-[45vw] h-[45vw] max-w-[700px] max-h-[700px] rounded-full blur-[160px] pointer-events-none mix-blend-screen z-0 transition-colors duration-1000" 
        style={{ backgroundColor: selectedCompany?.color || '#3b82f6', opacity: 0.14 }}
      />
      <div className="fixed bottom-[-10%] right-[-5%] w-[35vw] h-[35vw] max-w-[600px] max-h-[600px] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none mix-blend-screen z-0" />
      <div 
        className="fixed inset-0 z-10 pointer-events-none opacity-[0.03] mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* FLOATING HEADER BAR */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-7xl h-14 border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.5),_inset_0_1px_0_0_rgba(255,255,255,0.05)] flex items-center justify-between px-6">
        {onGoBack ? (
          <button 
            onClick={onGoBack}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors outline-none focus:outline-none"
          >
            <ArrowLeft size={16} /> Dashboard
          </button>
        ) : (
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-white">
            <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-[10px]">IC</div>
            InterviewCoach
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-black/40 border border-white/5 px-3 py-1 rounded-full">
            ELO: <span className="text-white">{currentElo}</span>
          </span>
        </div>
      </header>

      {/* ATMOSPHERIC SPLIT-PANE CONTAINER (Tightened vertical padding to eliminate bottom viewport clipping) */}
      <main className="relative z-20 w-full max-w-7xl min-h-screen pt-16 lg:pt-20 pb-8 px-6 md:px-10 flex items-center justify-center">
        
        <motion.div initial="hidden" animate={mounted ? "show" : "hidden"} variants={containerVars} className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch my-auto">
          
          {/* ========================================================================= */}
          {/* LEFT PANE (40% - STICKY CONTEXT & DYNAMIC INSIGHTS)                       */}
          {/* ========================================================================= */}
          <motion.div variants={itemVars} className="lg:col-span-5 flex flex-col justify-between h-full gap-5">
            
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/10 text-[10px] font-bold uppercase tracking-widest text-blue-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> System Ready
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white leading-[1.05]">
                Initialize<br/>Simulation
              </h1>
              <p className="text-sm font-medium text-slate-300 leading-relaxed">
                Configure your target environment. The AI will enforce constraints matching a <strong className="text-white">Level {Math.min(7, Math.max(3, Math.round((currentElo - 800) / 100)))}</strong> difficulty bracket based on your ELO.
              </p>
            </div>

            {/* Dynamic Company Insights Card */}
            <div className="mt-2 lg:mt-auto">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={company}
                  initial={{ opacity: 0, y: 10, filter: "blur(8px)" }} 
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} 
                  exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard mousePos={mousePos} className="w-full p-5 md:p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 blur-[50px] pointer-events-none rounded-full" style={{ backgroundColor: `${selectedCompany?.color || '#3b82f6'}20` }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2 relative z-10">
                      <span className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: selectedCompany?.color || '#fff' }} />
                      {selectedCompany?.name} Interview Style
                    </p>
                    <p className="text-xs md:text-sm font-medium text-slate-200 leading-relaxed relative z-10">
                      {INSIGHTS[company]}
                    </p>
                  </GlassCard>
                </motion.div>
              </AnimatePresence>
            </div>

          </motion.div>

          {/* ========================================================================= */}
          {/* RIGHT PANE (60% - CONTROL BOARD: TARGET DNA, SCOPE, PERSONA)              */}
          {/* ========================================================================= */}
          <motion.div variants={itemVars} className="lg:col-span-7 bg-[#08080A]/80 backdrop-blur-3xl border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),_0_30px_60px_rgba(0,0,0,0.8)] rounded-[2rem] p-6 md:p-8 flex flex-col justify-between gap-6 relative overflow-hidden">
            
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

            <div className="space-y-6 relative z-10">
              
              {/* 1. Target DNA */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2.5">
                  1. Target Company DNA
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {COMPANIES.map((c) => (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      key={c.id}
                      onClick={() => setCompany(c.id)}
                      className={`flex flex-col items-start p-3 rounded-xl border transition-all duration-200 outline-none relative overflow-hidden ${
                        company === c.id 
                          ? "bg-white/[0.06] border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),_0_10px_25px_rgba(0,0,0,0.5)]" 
                          : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10"
                      }`}
                    >
                      {company === c.id && (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent pointer-events-none" />
                      )}
                      <div className="flex-shrink-0 mb-1.5 relative z-10 w-6 h-6 flex items-center justify-center grayscale-0 opacity-90 overflow-visible">
                        {c.logo}
                      </div>
                      <span className={`text-xs font-bold tracking-tight relative z-10 ${company === c.id ? "text-white" : "text-slate-300"}`}>
                        {c.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* 2. Define Scope */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2">
                  2. Define Scope & Level
                </label>
                <div className="relative z-50">
                  <CustomSelect 
                    value={role}
                    onChange={setRole}
                    options={ROLES}
                  />
                </div>
              </div>

              {/* 3. Interviewer Persona (WCAG AAA High Contrast) */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-2.5">
                  3. Interviewer Persona
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PERSONAS.map((p) => (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      key={p.id}
                      onClick={() => setPersona(p.id)}
                      className={`text-left p-3 rounded-xl border transition-all duration-200 outline-none relative overflow-hidden ${
                        persona === p.id 
                          ? "bg-white/[0.06] border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),_0_10px_25px_rgba(0,0,0,0.5)]" 
                          : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10"
                      }`}
                    >
                      {persona === p.id && (
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
                      )}
                      <span className={`block text-xs font-bold mb-0.5 tracking-tight relative z-10 ${persona === p.id ? "text-white" : "text-slate-200"}`}>{p.label}</span>
                      <span className={`block text-[10px] font-medium leading-relaxed relative z-10 ${persona === p.id ? "text-slate-300" : "text-slate-300"}`}>{p.desc}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

            </div>

            {/* Launch Action Footer */}
            <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
              {error ? (
                <div className="text-xs font-bold text-red-400 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
                  {error}
                </div>
              ) : (
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest hidden sm:inline">
                  Ready to initialize ELO tracking
                </span>
              )}
              
              <div className="w-full sm:w-auto ml-auto">
                <motion.button
                  whileTap={{ scale: loading ? 1 : 0.96 }}
                  onClick={handleStart}
                  disabled={loading}
                  className={`relative group overflow-hidden w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_45px_rgba(255,255,255,0.25)] ${
                    loading 
                      ? "bg-white/10 border border-white/10 text-white cursor-wait min-w-[200px]" 
                      : "bg-white text-black hover:bg-slate-200"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                      <span className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-white animate-spin flex-shrink-0" />
                      <span className="font-mono text-xs">{bootText}</span>
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                      Boot Simulator <ChevronRight size={16} />
                      <kbd className="hidden sm:inline-flex ml-2 items-center justify-center bg-black/10 rounded px-1.5 py-0.5 text-[10px] font-mono text-black/60">↵</kbd>
                    </>
                  )}
                </motion.button>
              </div>
            </div>

          </motion.div>

        </motion.div>
      </main>
    </div>
  );
}

// ============================================================================
// REUSABLE DEEP GLASS CARD
// ============================================================================
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
      className={`relative rounded-2xl bg-[#080808]/80 border border-white/[0.06] overflow-hidden backdrop-blur-2xl ${className}`}
      style={{
        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08), 0 20px 40px -10px rgba(0,0,0,0.8)'
      }}
    >
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(400px circle at ${cursorX}px ${cursorY}px, rgba(255,255,255,0.04), transparent 40%)`,
          opacity: isHovered ? 1 : 0
        }}
      />
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}