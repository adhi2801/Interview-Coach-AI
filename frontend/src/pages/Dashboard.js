import { API_URL } from "../config";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, BrainCircuit, ChevronRight, Activity, ArrowLeft } from "lucide-react";
import axios from "axios";
import CustomSelect from "../components/ui/CustomSelect";

// Authentic SVGs (Updated with correct Amazon and Meta paths)
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
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <text x="1" y="15" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="700" fill="#e2e8f0">amazon</text>
        <path fill="#FF9900" d="M2.2 17.3c2.5 1.85 6.9 2.8 10.4 2.8 2.9 0 6.2-.7 8.6-2.05.35-.2.65.2.35.45-2.15 1.85-5.85 2.95-9.4 2.95-4.55 0-8.6-1.65-11.65-4.4-.25-.2 0-.5.4-.3z"/>
        <path fill="#FF9900" d="M20.05 15.9c-.4-.5-2.65-.25-3.55-.1-.3.05-.35-.25-.1-.4 1.4-.95 3.75-.7 4.1-.35.35.35-.1 2.65-1.4 3.75-.2.15-.4.1-.35-.15.35-.85.9-2.75.3-2.75z"/>
      </svg>
    )
  },
  {
    id: "meta", name: "Meta", color: "#0866FF",
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#0866FF" d="M6.9 4.5c1.9 0 3.4 1.15 4.7 2.9 1.3-1.75 2.8-2.9 4.7-2.9 3.5 0 6.2 3.6 6.2 8.4 0 2.9-1.2 4.85-3 4.85-1.5 0-2.4-1.05-3.9-3.4l-1.6-2.5-.9 1.5c-1.3 2.15-2.35 3.65-4 3.65C6.4 21 5 18.1 5 14.9c0-4.8 1.5-10.4 1.9-10.4zm5.1 8.15 1.05 1.65c1.3 2.05 1.85 2.6 2.65 2.6.85 0 1.3-.75 1.3-2.7 0-3.6-1.55-6.1-3.4-6.1-1 0-1.85.75-2.9 2.45.35.6.7 1.3 1.3 2.1z"/>
      </svg>
    )
  },
  {
    id: "microsoft", name: "Microsoft", color: "#00A4EF",
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#F25022" d="M2 2h9v9H2z"/><path fill="#7FBA00" d="M13 2h9v9h-9z"/>
        <path fill="#00A4EF" d="M2 13h9v9H2z"/><path fill="#FFB900" d="M13 13h9v9h-9z"/>
      </svg>
    )
  },
  {
    id: "apple", name: "Apple", color: "#e2e8f0",
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#e2e8f0" d="M18.14 12.73c-.04-1.6 1.31-2.37 1.37-2.41-1.12-1.64-2.86-1.86-3.48-1.88-1.58-.16-3.08.93-3.88.93-.81 0-2.06-.91-3.38-.89-1.73.02-3.34 1.02-4.22 2.57-1.81 3.14-.46 7.76 1.28 10.3 .86 1.25 1.88 2.63 3.23 2.57 1.29-.05 1.78-.84 3.34-.84 1.55 0 2 1.1 3.35 1.08 1.38-.02 2.26-1.25 3.11-2.49.98-1.43 1.38-2.82 1.4-2.9-.03-.01-2.68-1.03-2.7-4.06zM15.48 4.79c.68-.82 1.13-1.95 1.01-3.08-.97.04-2.15.65-2.85 1.46-.63.72-1.18 1.88-1.03 2.98 1.08.08 2.19-.55 2.87-1.36z"/>
      </svg>
    )
  },
  {
    id: "netflix", name: "Netflix", color: "#E50914",
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#E50914" d="M6 2v20h3.2V8.6l5.6 13.4H18V2h-3.2v13.4L9.2 2H6z"/>
      </svg>
    )
  },
  {
    id: "startup", name: "Startup", color: "#10b981",
    logo: <Terminal size={24} className="text-emerald-400" />
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
  
  const currentElo = Math.round(user?.elo_rating || 1200);

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  async function handleStart() {
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
      if(onStart) onStart(response.data);
    } catch (err) {
      setError("Cannot connect to server. Ensure backend is running.");
      setLoading(false);
    }
  }

  const selectedCompany = COMPANIES.find((c) => c.id === company);

  // Animation Variants
  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  
  const itemVars = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
  };

  return (
    <div className="relative min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col md:flex-row">
      
      {/* Inline Shimmer Keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
      `}</style>

      {/* AMBIENT LIGHTS & GRAIN */}
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none mix-blend-screen z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none mix-blend-screen z-0" />
      <div 
        className="fixed inset-0 z-10 pointer-events-none opacity-[0.025] mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* RETURN BUTTON */}
      {onGoBack && (
        <button 
          onClick={onGoBack}
          className="absolute top-6 left-6 md:top-8 md:left-8 z-50 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Dashboard
        </button>
      )}

      {/* SPLIT PANE ARCHITECTURE */}
      <div className="relative z-20 w-full flex flex-col md:flex-row min-h-screen">
        
        {/* ========================================================================= */}
        {/* LEFT PANE: Configuration Header & Target DNA                              */}
        {/* ========================================================================= */}
        <div className="w-full md:w-[45%] h-auto md:h-screen border-r border-white/[0.06] bg-[#000000]/40 backdrop-blur-xl flex flex-col pt-24 pb-12 px-8 md:px-12 lg:px-16 overflow-y-auto">
          
          <motion.div initial="hidden" animate="show" variants={containerVars} className="flex flex-col h-full w-full max-w-md mx-auto md:mx-0">
            
            <motion.div variants={itemVars} className="mb-12">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded border border-blue-500/20 bg-blue-500/10 text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> System Ready
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-4">
                Initialize<br/>Simulation
              </h1>
              <p className="text-sm font-medium text-slate-400 leading-relaxed">
                Configure your target environment. The AI will enforce constraints matching a <strong className="text-white">Level {Math.min(7, Math.max(3, Math.round((currentElo - 800) / 100)))}</strong> difficulty bracket based on your ELO.
              </p>
            </motion.div>

            <motion.div variants={itemVars} className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <BrainCircuit size={14} className="text-slate-400" /> 1. Target DNA
                </label>
                <div className="text-[10px] font-mono font-bold text-slate-500">
                  ELO: <span className="text-white tabular-nums tracking-tight text-xs">{currentElo}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {COMPANIES.map((c) => (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    key={c.id}
                    onClick={() => setCompany(c.id)}
                    className={`flex flex-col items-start p-4 rounded-xl border transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-500 ${
                      company === c.id 
                        ? "bg-blue-500/10 border-blue-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),_0_0_15px_rgba(59,130,246,0.2)]" 
                        : "bg-white/[0.02] border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:bg-white/[0.04] hover:border-white/20"
                    }`}
                  >
                    <div className="flex-shrink-0 mb-3">{c.logo}</div>
                    <span className={`text-sm font-bold tracking-tight ${company === c.id ? "text-white" : "text-slate-300"}`}>
                      {c.name}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANE: Scope, Hostility, Preview & Launch                          */}
        {/* ========================================================================= */}
        <div className="w-full md:flex-1 h-auto md:h-screen bg-[#050505]/80 backdrop-blur-2xl flex flex-col pt-12 md:pt-24 pb-12 px-8 md:px-12 lg:px-20 overflow-y-auto">
          
          <motion.div initial="hidden" animate="show" variants={containerVars} className="flex flex-col h-full w-full max-w-xl mx-auto md:mx-0">
            
            <motion.div variants={itemVars} className="space-y-10 flex-1">
              
              {/* Scope Definition */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-4 border-b border-white/[0.06] pb-2">
                  <Terminal size={14} className="text-slate-400" /> 2. Define Scope
                </label>
                <div className="relative z-50">
                  <CustomSelect 
                    value={role}
                    onChange={setRole}
                    options={ROLES}
                  />
                </div>
              </div>

              {/* Hostility Definition */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-4 border-b border-white/[0.06] pb-2">
                  <Activity size={14} className="text-slate-400" /> 3. Interviewer Persona
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PERSONAS.map((p) => (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      key={p.id}
                      onClick={() => setPersona(p.id)}
                      className={`text-left p-4 rounded-xl border transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-500 ${
                        persona === p.id 
                          ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                          : "bg-white/[0.02] border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:bg-white/[0.05] hover:border-white/20"
                      }`}
                    >
                      <span className={`block text-sm font-bold mb-1 tracking-tight ${persona === p.id ? "text-black" : "text-white"}`}>{p.label}</span>
                      <span className={`block text-[11px] font-medium leading-relaxed ${persona === p.id ? "text-slate-700" : "text-slate-500"}`}>{p.desc}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Dynamic Insights / Live Preview Card */}
              <AnimatePresence mode="wait">
                <motion.div 
                  key={company}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard mousePos={mousePos} className="w-full p-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedCompany?.color || '#fff' }} />
                      {selectedCompany?.name} Interview Style
                    </p>
                    <p className="text-sm font-medium text-slate-300 leading-relaxed">
                      {INSIGHTS[company]}
                    </p>
                  </GlassCard>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Launch Action */}
            <motion.div variants={itemVars} className="pt-10 mt-10 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-6">
              {error && (
                <div className="text-xs font-bold text-red-400 bg-red-500/10 px-4 py-2 rounded border border-red-500/20">
                  {error}
                </div>
              )}
              
              <div className="w-full ml-auto">
                <motion.button
                  whileTap={{ scale: loading ? 1 : 0.96 }}
                  onClick={handleStart}
                  disabled={loading}
                  className={`relative w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-sm font-bold transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white ${
                    loading 
                      ? "bg-[#111111] border border-white/10 text-slate-500 cursor-wait" 
                      : "bg-white text-black hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                      <span className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-slate-400 animate-spin" />
                      Booting Simulator...
                    </>
                  ) : (
                    <>
                      Boot Simulator <ChevronRight size={18} />
                      <kbd className="hidden sm:inline-flex ml-2 items-center justify-center bg-black/10 rounded px-1.5 py-0.5 text-[10px] font-mono text-black/60">↵ Enter</kbd>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>

          </motion.div>
        </div>

      </div>
    </div>
  );
}

// ============================================================================
// REUSABLE DEEP GLASS CARD (Inlined to ensure independence)
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