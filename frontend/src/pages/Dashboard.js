import { API_URL } from "../config";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, BrainCircuit, ChevronRight, Activity, ArrowLeft } from "lucide-react";
import axios from "axios";
import CustomSelect from "../components/ui/CustomSelect";

// Authentic Official Vector SVGs
const COMPANIES = [
  {
    id: "google", name: "Google", color: "#4285F4",
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3h3.88c2.28-2.1 3.665-5.2 3.665-9.12z"/>
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.1 0-5.73-2.1-6.67-4.93H1.29v3.08C3.26 21.3 7.37 24 12 24z"/>
        <path fill="#FBBC05" d="M5.33 14.32c-.24-.72-.38-1.49-.38-2.32s.14-1.6.38-2.32V6.6H1.29C.47 8.23 0 10.06 0 12s.47 3.77 1.29 5.4l4.04-3.08z"/>
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.29 6.6l4.04 3.08c.94-2.83 3.57-4.93 6.67-4.93z"/>
      </svg>
    )
  },
  {
    id: "amazon", name: "Amazon", color: "#FF9900",
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#FF9900" d="M13.958 10.023c0 1.292-.093 2.147-.82 3.033-.497.604-1.222.953-2.02.953-1.144 0-1.803-.76-1.803-1.895 0-1.57.994-2.228 2.775-2.228h1.868v.137zm1.61 6.33c-.347-.288-.415-.497-.282-.907.397-1.192 1.303-4.223 1.303-4.223 0-.083.023-.153-.06-.188-.135-.046-.388.083-.54.162-1.02.535-2.083.82-3.19.82-2.19 0-3.483-1.09-3.483-3.14 0-2.368 1.83-3.882 4.608-3.882 1.05 0 2.22.183 3.03.542.48.21.61.533.61 1.077v5.278c0 .943.342 1.318 1.01 1.318.34 0 .72-.093 1.07-.27.136-.07.21-.023.25.07.082.186.25.688.33.876.04.116.02.21-.09.28-.73.498-1.7.756-2.61.756-1.39 0-2.06-.63-2.06-2.072zm6.235 3.535c-3.18 2.34-7.79 3.57-11.75 3.57-5.55 0-10.51-2.05-14.33-5.48-.31-.28-.03-.66.35-.45 4.1 2.3 9.17 3.68 14.33 3.68 3.51 0 7.37-.82 10.61-2.52.48-.25.88.27.39.65z"/>
        <path fill="#FF9900" d="M22.84 18.23c-.41-.53-2.71-.25-3.64-.13-.28.04-.33-.2-.08-.38 1.63-1.18 4.31-.83 4.68-.37.37.46-.22 3.12-1.74 4.41-.23.2-.44.09-.34-.17.34-.87 1.25-2.83.12-3.36z"/>
      </svg>
    )
  },
  {
    id: "meta", name: "Meta", color: "#0866FF",
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#0866FF" d="M16.812 3.834c-1.928 0-3.585.99-4.812 2.637-1.227-1.647-2.884-2.637-4.812-2.637-3.666 0-6.688 3.256-6.688 8.017 0 4.108 2.28 7.149 5.48 7.149 2.054 0 3.513-1.071 4.793-3.111l1.227-1.972 1.227 1.972c1.28 2.04 2.739 3.111 4.793 3.111 3.2 0 5.48-3.041 5.48-7.149 0-4.761-3.022-8.017-6.688-8.017zm-9.624 12.3c-1.666 0-3.088-1.782-3.088-4.283 0-2.842 1.341-4.782 3.088-4.782 1.239 0 2.456 1.055 3.353 2.766l-1.39 2.235c-.887 1.428-1.579 2.064-1.963 2.064zm9.624 0c-.384 0-1.076-.636-1.963-2.064l-1.39-2.235c.897-1.711 2.114-2.766 3.353-2.766 1.747 0 3.088 1.94 3.088 4.782 0 2.501-1.422 4.283-3.088 4.283z"/>
      </svg>
    )
  },
  {
    id: "microsoft", name: "Microsoft", color: "#00A4EF",
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#F25022" d="M1 1h10v10H1z"/>
        <path fill="#7FBA00" d="M13 1h10v10H13z"/>
        <path fill="#00A4EF" d="M1 13h10v10H1z"/>
        <path fill="#FFB900" d="M13 13h10v10H13z"/>
      </svg>
    )
  },
  {
    id: "apple", name: "Apple", color: "#e2e8f0",
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#e2e8f0" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.06 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97.01c.02.04.04.09.04.13 0 1.56-.8 3.12-1.8 3.99-.95.83-2.45 1.43-3.69 1.34-.14-.02-.27-.06-.39-.12.02-.04-.04-.09-.04-.13 0-1.59.83-3.12 1.83-3.97C12.91.42 14.52-.16 15.97.01z"/>
      </svg>
    )
  },
  {
    id: "netflix", name: "Netflix", color: "#E50914",
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#E50914" d="M5.398 0v24h4.103V10.355L14.73 24h3.872V0h-4.103v13.645L9.27 0H5.398z"/>
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
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  
  const itemVars = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 28 } }
  };

  return (
    <div className="relative min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden flex flex-col items-center">
      
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

      {/* AMBIENT LIGHTS & GRAIN (Company Color Synced) */}
      <div 
        className="fixed top-[-20%] left-[20%] w-[50vw] h-[50vw] rounded-full blur-[150px] pointer-events-none mix-blend-screen z-0 transition-colors duration-700" 
        style={{ backgroundColor: `${selectedCompany?.color || '#3b82f6'}15` }}
      />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none mix-blend-screen z-0" />
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
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors outline-none"
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

      {/* ATMOSPHERIC SPLIT-PANE CONTAINER */}
      <main className="relative z-20 w-full max-w-7xl min-h-screen pt-32 pb-24 px-6 md:px-10 flex items-center justify-center">
        
        <motion.div initial="hidden" animate={mounted ? "show" : "hidden"} variants={containerVars} className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* ========================================================================= */}
          {/* LEFT PANE (40% - STICKY CONTEXT & DYNAMIC INSIGHTS)                       */}
          {/* ========================================================================= */}
          <motion.div variants={itemVars} className="lg:col-span-5 flex flex-col justify-between gap-8">
            
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/10 text-[10px] font-bold uppercase tracking-widest text-blue-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> System Ready
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white leading-[1.05]">
                Initialize<br/>Simulation
              </h1>
              <p className="text-sm font-medium text-slate-400 leading-relaxed">
                Configure your target environment. The AI will enforce constraints matching a <strong className="text-white">Level {Math.min(7, Math.max(3, Math.round((currentElo - 800) / 100)))}</strong> difficulty bracket based on your ELO.
              </p>
            </div>

            {/* Dynamic Company Insights Card (Crossfades on Change) */}
            <div className="mt-auto">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={company}
                  initial={{ opacity: 0, y: 10, filter: "blur(8px)" }} 
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} 
                  exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard mousePos={mousePos} className="w-full p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 blur-[50px] pointer-events-none rounded-full" style={{ backgroundColor: `${selectedCompany?.color || '#3b82f6'}20` }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2 relative z-10">
                      <span className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: selectedCompany?.color || '#fff' }} />
                      {selectedCompany?.name} Interview Style
                    </p>
                    <p className="text-sm font-medium text-slate-300 leading-relaxed relative z-10">
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
          <motion.div variants={itemVars} className="lg:col-span-7 bg-[#08080A]/80 backdrop-blur-3xl border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),_0_30px_60px_rgba(0,0,0,0.8)] rounded-[2rem] p-8 md:p-10 flex flex-col justify-between gap-8 relative overflow-hidden">
            
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

            <div className="space-y-8 relative z-10">
              
              {/* 1. Target DNA */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 block mb-4">
                  1. Target Company DNA
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {COMPANIES.map((c) => (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      key={c.id}
                      onClick={() => setCompany(c.id)}
                      className={`flex flex-col items-start p-3.5 rounded-xl border transition-all duration-200 outline-none relative overflow-hidden ${
                        company === c.id 
                          ? "bg-white/[0.06] border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),_0_10px_25px_rgba(0,0,0,0.5)]" 
                          : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10"
                      }`}
                    >
                      {company === c.id && (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent pointer-events-none" />
                      )}
                      <div className="flex-shrink-0 mb-2 relative z-10">{c.logo}</div>
                      <span className={`text-xs font-bold tracking-tight relative z-10 ${company === c.id ? "text-white" : "text-slate-300"}`}>
                        {c.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* 2. Define Scope */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 block mb-3">
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

              {/* 3. Interviewer Persona */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 block mb-4">
                  3. Interviewer Persona
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PERSONAS.map((p) => (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      key={p.id}
                      onClick={() => setPersona(p.id)}
                      className={`text-left p-3.5 rounded-xl border transition-all duration-200 outline-none relative overflow-hidden ${
                        persona === p.id 
                          ? "bg-white/[0.06] border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),_0_10px_25px_rgba(0,0,0,0.5)]" 
                          : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10"
                      }`}
                    >
                      {persona === p.id && (
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
                      )}
                      <span className={`block text-xs font-bold mb-1 tracking-tight relative z-10 ${persona === p.id ? "text-white" : "text-slate-300"}`}>{p.label}</span>
                      <span className={`block text-[10px] font-medium leading-relaxed relative z-10 ${persona === p.id ? "text-slate-300" : "text-slate-500"}`}>{p.desc}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

            </div>

            {/* Launch Action Footer */}
            <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
              {error ? (
                <div className="text-xs font-bold text-red-400 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
                  {error}
                </div>
              ) : (
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest hidden sm:inline">
                  Ready to initialize ELO tracking
                </span>
              )}
              
              <div className="w-full sm:w-auto ml-auto">
                <motion.button
                  whileTap={{ scale: loading ? 1 : 0.96 }}
                  onClick={handleStart}
                  disabled={loading}
                  className={`relative group overflow-hidden w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-sm font-bold transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_45px_rgba(255,255,255,0.25)] ${
                    loading 
                      ? "bg-[#111111] border border-white/10 text-slate-500 cursor-wait" 
                      : "bg-white text-black hover:bg-slate-200"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                      <span className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-black animate-spin" />
                      Booting Simulator...
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