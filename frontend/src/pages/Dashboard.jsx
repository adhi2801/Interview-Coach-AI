import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { 
  Rocket, ShieldAlert, Brain, Battery, User, Activity, 
  Terminal, ChevronRight, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Target, Cpu
} from "lucide-react";
import { API_URL } from "../config";
import { siMeta, siApple, siNetflix } from "simple-icons";
import { FaAmazon } from "react-icons/fa";

// ============================================================================
// BRAND VECTOR ASSETS & PROFILES
// ============================================================================
function BrandIcon({ icon, className = "w-4 h-4", forceWhite = false }) {
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
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    )
  },
  { id: "amazon", name: "Amazon", color: "#FF9900", logo: <FaAmazon size={14} color="#FF9900" /> },
  { id: "meta", name: "Meta", color: "#0866FF", logo: <BrandIcon icon={siMeta} className="w-3.5 h-3.5" /> },
  {
    id: "microsoft", name: "Microsoft", color: "#00A4EF",
    logo: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
        <path fill="#F25022" d="M2 2h9v9H2z"/><path fill="#7FBA00" d="M13 2h9v9h-9z"/>
        <path fill="#00A4EF" d="M2 13h9v9H2z"/><path fill="#FFB900" d="M13 13h9v9h-9z"/>
      </svg>
    )
  },
  { id: "apple", name: "Apple", color: "#e2e8f0", logo: <BrandIcon icon={siApple} className="w-3.5 h-3.5" forceWhite /> },
  { id: "netflix", name: "Netflix", color: "#E50914", logo: <BrandIcon icon={siNetflix} className="w-3.5 h-3.5" /> },
  { id: "startup", name: "Startup", color: "#10b981", logo: <Rocket size={14} className="text-emerald-400" /> },
];

// ============================================================================
// 3. INTELLIGENCE DATA (Scenarios, Personas, Playbooks)
// ============================================================================
const ROLES = ["Software Engineer — L3", "Senior Engineer — L4", "Staff Engineer — L5", "ML Engineer", "Systems Architect"];

const PERSONAS = [
  { 
    id: "standard", label: "Standard", icon: User, color: "#3b82f6",
    tagline: "Neutral, evaluative.",
    quote: "Can you walk me through your architecture and trade-offs?"
  },
  { 
    id: "hostile", label: "Hostile", icon: ShieldAlert, color: "#ef4444",
    tagline: "Pressure-test mode.",
    quote: "That won't scale at 100k RPS. Fix memory allocation immediately."
  },
  { 
    id: "socratic", label: "Socratic", icon: Brain, color: "#10b981",
    tagline: "Guided discovery.",
    quote: "Why choose Operational Transformation over CRDTs in this scenario?"
  },
  { 
    id: "exhausted", label: "Exhausted", icon: Battery, color: "#f59e0b",
    tagline: "Low-engagement mode.",
    quote: "Right. Keep going. Tell me what the P99 latency SLA looks like."
  }
];

const INTELLIGENCE = {
  google: {
    scenario: "Design a globally distributed rate limiter capable of handling 100 million RPS burst traffic.",
    sla: { throughput: "100k RPS Global Spike", latency: "< 10ms P99 Latency SLA" },
    rounds: "2x Coding · 1x System Design · 1x Googley",
    do: ["Think out loud constantly", "State time/space complexity explicitly", "Handle edge cases first"],
    avoid: ["Jumping to code without planning", "Ignoring memory boundaries"],
    pillars: [ { name: "Algorithms & Data Structures", val: 85 }, { name: "System Architecture", val: 70 }, { name: "Communication", val: 60 } ]
  },
  amazon: {
    scenario: "Architect a shopping cart service that prioritizes high availability over strict consistency during Prime Day.",
    sla: { throughput: "500k RPS Peak", latency: "< 15ms Response Time" },
    rounds: "1x System Design · 3x Leadership Principles",
    do: ["Use STAR method strictly", "Emphasize Bias for Action", "Focus on customer obsession"],
    avoid: ["Saying 'We' instead of 'I'", "Overcomplicating the MVP"],
    pillars: [ { name: "Leadership Principles", val: 95 }, { name: "System Scalability", val: 80 }, { name: "Data Structures", val: 50 } ]
  },
  meta: {
    scenario: "Design the real-time fanout infrastructure for Instagram Live Video supporting 2B concurrent users.",
    sla: { throughput: "2B Concurrent Conns", latency: "< 50ms Global Sync" },
    rounds: "2x Coding · 1x System Design · 1x Behavioral",
    do: ["Move fast and prototype", "Discuss high-fanout bottlenecks", "Optimize for speed over perfection"],
    avoid: ["Over-engineering edge cases", "Ignoring product sense"],
    pillars: [ { name: "Execution Speed", val: 90 }, { name: "System Architecture", val: 85 }, { name: "Product Sense", val: 75 } ]
  },
  microsoft: {
    scenario: "Design a real-time collaborative document editor like Word Online using Operational Transformation.",
    sla: { throughput: "10M Active Docs", latency: "< 30ms Operational Sync" },
    rounds: "2x Coding · 2x System Design · 1x Hiring Manager",
    do: ["Focus on enterprise compliance", "Discuss cross-team collaboration", "Prioritize API design hygiene"],
    avoid: ["Ignoring backward compatibility", "Rushing requirements gathering"],
    pillars: [ { name: "System Architecture", val: 85 }, { name: "Algorithms & DS", val: 75 }, { name: "Communication", val: 80 } ]
  },
  apple: {
    scenario: "Explain how you would architect secure, zero-trust telemetry sync across millions of on-device enclaves.",
    sla: { throughput: "1B+ Device Syncs", latency: "Zero Latency Jitter" },
    rounds: "3x Technical Deep Dive · 1x Behavioral",
    do: ["Prioritize user privacy above all", "Discuss hardware-level constraints", "Show extreme attention to detail"],
    avoid: ["Relying heavily on cloud processing", "Sloppy memory management"],
    pillars: [ { name: "Low-level Optimization", val: 95 }, { name: "System Architecture", val: 80 }, { name: "Product Craft", val: 85 } ]
  },
  netflix: {
    scenario: "Architect Netflix's multi-region video streaming CDN topology with active-active chaos resiliency.",
    sla: { throughput: "Tbps Global Streaming", latency: "< 5ms CDN Edge" },
    rounds: "1x Core Tech · 2x System Design · 1x Culture",
    do: ["Embrace Chaos Engineering", "Discuss active-active regional failover", "Show extreme autonomy"],
    avoid: ["Requiring micro-management", "Ignoring edge caching strategies"],
    pillars: [ { name: "System Reliability", val: 95 }, { name: "Culture Fit", val: 90 }, { name: "Algorithms", val: 60 } ]
  },
  startup: {
    scenario: "Build a multi-currency payment gateway MVP from scratch in 2 weeks. Justify your technical debt.",
    sla: { throughput: "1k RPS (MVP Scale)", latency: "< 100ms API Response" },
    rounds: "1x Pairing · 1x Architecture · 1x Founder Fit",
    do: ["Show bias for shipping", "Justify pragmatic technical debt", "Demonstrate product ownership"],
    avoid: ["Over-engineering for 10M users", "Needing rigid specifications"],
    pillars: [ { name: "Execution Velocity", val: 95 }, { name: "Product Sense", val: 85 }, { name: "System Architecture", val: 60 } ]
  }
};
const PERSONA_OPENERS = {
  standard: (intel) => `"Walk me through how you'd approach: ${intel.scenario}"`,
  hostile: (intel) => `"${intel.scenario} — and I don't want to hear about happy paths. What breaks first?"`,
  socratic: (intel) => `"Before you answer — why do you think this problem exists in the first place? ${intel.scenario}"`,
  exhausted: (intel) => `"Okay so... ${intel.scenario.charAt(0).toLowerCase() + intel.scenario.slice(1)} Just talk me through it."`
};

const BOOT_SEQUENCE = [
  "> Establishing secure WebRTC telemetry socket...",
  "> Injecting targeted Company DNA playbook...",
  "> Calibrating interviewer psychological hostility...",
  "> Preparing 5D evaluation rubric...",
  "SYSTEM ONLINE. ENTERING CHAMBER."
];

// ============================================================================
// 4. REUSABLE COMPONENTS
// ============================================================================
function DeepGlassCard({ children, className = "", mousePos }) {
  const [rect, setRect] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) setRect(cardRef.current.getBoundingClientRect());
  }, []);

  const isHovered = rect && mousePos &&
    mousePos.x >= rect.left && mousePos.x <= rect.right &&
    mousePos.y >= rect.top && mousePos.y <= rect.bottom;

  const cursorX = rect && mousePos ? mousePos.x - rect.left : 0;
  const cursorY = rect && mousePos ? mousePos.y - rect.top : 0;

  return (
    <div 
      ref={cardRef}
      className={`relative rounded-2xl bg-white/[0.02] border border-white/[0.08] overflow-hidden backdrop-blur-2xl transition-all duration-300 ${className}`}
      style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.12), 0 20px 40px -10px rgba(0,0,0,0.5)' }}
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

// Custom dropdown to avoid ugly native <select>
function CinematicSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#08080C] border border-white/10 text-sm font-semibold text-white tracking-wide shadow-inner outline-none hover:border-white/20 transition-colors"
      >
        <span className="truncate">{value}</span>
        <ChevronRight size={14} className={`text-slate-400 transition-transform duration-300 ${open ? "rotate-90" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-full left-0 w-full mt-2 p-1.5 bg-[#0A0A0C]/95 backdrop-blur-3xl border border-white/10 rounded-xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] z-50 overflow-hidden"
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all outline-none ${
                  value === opt 
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                    : "text-slate-300 hover:bg-white/[0.05] hover:text-white border border-transparent"
                }`}
              >
                {opt}
                {value === opt && <CheckCircle2 size={14} className="text-blue-400" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// 5. THE MASTER DASHBOARD (Mission Control 2.0)
// ============================================================================
export default function Dashboard({ onStart, user, onGoBack }) {
  const [company, setCompany] = useState(() => localStorage.getItem("ic_last_company") || "microsoft");
  const [role, setRole] = useState(() => localStorage.getItem("ic_last_role") || ROLES[1]);
  const [persona, setPersona] = useState(() => localStorage.getItem("ic_last_persona") || "hostile");
  const [isBooting, setIsBooting] = useState(false);
  const [bootStep, setBootStep] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const currentElo = Math.round(user?.elo_rating || 1188);
  const l4Target = 1050;
  const l5Target = 1400;

  const activeComp = COMPANIES.find(c => c.id === company);
  const activePers = PERSONAS.find(p => p.id === persona);
  const activeIntel = INTELLIGENCE[company];

  // Global mouse tracking for Deep Glass
  useEffect(() => {
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);
  // Persist selections so returning users don't have to reconfigure every time
  useEffect(() => {
    localStorage.setItem("ic_last_company", company);
    localStorage.setItem("ic_last_role", role);
    localStorage.setItem("ic_last_persona", persona);
  }, [company, role, persona]);

  const handleLaunch = async () => {
    if (isBooting) return; // prevent double-submission from a fast double-click
    setIsBooting(true);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setBootStep(step);
    }, 600);

    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.post(
        `${API_URL}/session/start`,
        {
          user_name: user?.name || "Candidate",
          company,
          role,
          elo: currentElo,
          persona,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      clearInterval(interval);
      setBootStep(BOOT_SEQUENCE.length);

      setTimeout(() => {
        if (onStart) onStart({ ...res.data, company, role, persona, elo: currentElo });
      }, 500);
    } catch (err) {
      clearInterval(interval);
      console.error("Failed to start session:", err);
      setIsBooting(false);
      alert("Couldn't start the interview session. Check the console for details.");
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden flex flex-col relative">
      
      {/* --- LAYER 1: ATMOSPHERIC ENGINE (Dynamic Volumetric Light) --- */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-1000">
        <motion.div
          key={activeComp.id + "1"}
          initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} transition={{ duration: 1 }}
          className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[160px] mix-blend-screen"
          style={{ backgroundColor: activeComp.color }}
        />
        <motion.div
          key={activeComp.id + "2"}
          initial={{ opacity: 0 }} animate={{ opacity: 0.1 }} transition={{ duration: 1, delay: 0.2 }}
          className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full blur-[140px] mix-blend-screen"
          style={{ backgroundColor: activeComp.color }}
        />
        {/* Film Grain */}
        <div 
          className="absolute inset-0 opacity-[0.03] mix-blend-soft-light"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
        />
      </div>

      {/* --- LAYER 2: THE PASS-THROUGH DIMMER --- */}
      <AnimatePresence>
        {isBooting && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center pointer-events-auto"
          >
            <div className="w-[500px] bg-[#0A0A0C] border border-white/10 p-6 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] font-mono text-sm">
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <Terminal size={18} className="text-blue-400" />
                <span className="text-white font-bold">SYSTEM BOOT SEQUENCE</span>
              </div>
              <div className="space-y-3 text-slate-400">
                {BOOT_SEQUENCE.slice(0, bootStep + 1).map((step, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                    {i === BOOT_SEQUENCE.length - 1 ? <span className="text-emerald-400 font-bold">{step}</span> : step}
                  </motion.div>
                ))}
                {bootStep < BOOT_SEQUENCE.length - 1 && (
                  <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-2 h-4 bg-slate-400 mt-2" />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- LAYER 3: TOP HUD NAVIGATION --- */}
      <header className="relative z-30 h-16 border-b border-white/[0.06] bg-black/40 backdrop-blur-md flex items-center justify-between px-6 lg:px-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onGoBack} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors bg-white/[0.03] border border-white/[0.08] px-3 py-1.5 rounded-full">
            <ArrowLeft size={14} /> Dashboard
          </button>
          <div className="w-px h-5 bg-white/10 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center font-bold text-black text-[10px] shadow-[0_0_15px_rgba(255,255,255,0.2)]">IC</div>
            <span className="font-semibold text-white tracking-tight text-sm">InterviewCoach</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-bold tracking-widest text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Engine Ready
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-[10px] font-mono font-bold tracking-widest text-white">
            <Target size={12} className="text-slate-400" /> ELO BOUND: {currentElo}
          </div>
        </div>
      </header>

      {/* --- LAYER 4: 3-COLUMN MISSION CONTROL --- */}
      <main className="relative z-20 flex-1 w-full max-w-[1600px] mx-auto p-6 lg:p-8 flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        {/* COLUMN 1: TARGET & PERSONA (Left Rail) */}
        <div className="w-full lg:w-[320px] flex flex-col gap-6 shrink-0">
          
          {/* Target Company */}
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 ml-1">Target Company</h2>
            <div className="grid grid-cols-2 gap-2">
              {COMPANIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCompany(c.id)}
                  className={`flex flex-col items-center justify-center gap-2.5 p-3.5 rounded-xl border transition-all duration-200 outline-none ${
                    company === c.id ? "bg-white/[0.06] border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]" : "bg-white/[0.01] border-white/[0.05] hover:bg-white/[0.03]"
                  }`}
                >
                  <div className={`transition-all ${company === c.id ? "grayscale-0 scale-110" : "grayscale opacity-50"}`}>
                    {c.logo}
                  </div>
                  <span className={`text-[11px] font-bold tracking-widest uppercase ${company === c.id ? "text-white" : "text-slate-500"}`}>{c.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Interviewer Persona (Tactile Avatars) */}
          <section className="flex-1 flex flex-col">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 ml-1">Interviewer Persona</h2>
            <div className="flex flex-col gap-2">
              {PERSONAS.map((p) => {
                const isActive = persona === p.id;
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPersona(p.id)}
                    className={`relative p-3.5 rounded-xl border text-left transition-all duration-200 outline-none group ${
                      isActive ? "bg-white/[0.04] border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]" : "bg-white/[0.01] border-white/[0.05] hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${isActive ? "bg-[#0A0A0C] border-white/20" : "bg-white/5 border-white/10 group-hover:border-white/20"}`}>
                        <Icon size={18} color={isActive ? p.color : "#94a3b8"} />
                      </div>
                      <div>
                        <span className={`block text-sm font-bold tracking-tight mb-0.5 ${isActive ? "text-white" : "text-slate-400"}`}>{p.label}</span>
                        <span className="block text-[10px] text-slate-500 font-medium">{p.tagline}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Quote Callout */}
            <AnimatePresence mode="wait">
              <motion.div
                key={persona}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-4 rounded-xl border border-l-[3px] bg-[#0A0A0C] shadow-inner"
                style={{ borderLeftColor: activePers.color, borderTopColor: 'rgba(255,255,255,0.05)', borderRightColor: 'rgba(255,255,255,0.05)', borderBottomColor: 'rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Activity size={12} color={activePers.color} />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Opening Line Preview</span>
                </div>
                <p className="text-xs text-slate-300 font-medium italic leading-relaxed">"{activePers.quote}"</p>
              </motion.div>
            </AnimatePresence>
          </section>

        </div>

        {/* COLUMN 2: THE CLASSIFIED BRIEFING (Center Stage) */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Scope & Bracket */}
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 ml-1">Scope & Bracket</h2>
            <div className="w-full xl:w-72">
              <CinematicSelect value={role} onChange={setRole} options={ROLES} />
            </div>
          </section>

          {/* Confidential Briefing Card */}
          <DeepGlassCard mousePos={mousePos} className="flex-1 p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <Cpu size={16} className="text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Confidential // Session Briefing</span>
                </div>
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-widest">
                  Rag Retrieved
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Opening Line &middot; {activePers.label} Persona
                  </span>
                  <p className="text-2xl font-bold text-white leading-snug tracking-tight">
                    {PERSONA_OPENERS[persona](activeIntel)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-lg p-3 pr-8 shadow-inner">
                    <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Throughput Scale</span>
                    <span className="text-sm font-bold text-white">{activeIntel.sla.throughput}</span>
                  </div>
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-lg p-3 pr-8 shadow-inner">
                    <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Target Latency SLA</span>
                    <span className="text-sm font-bold text-emerald-400">{activeIntel.sla.latency}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-white/[0.06]">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Core Evaluation Pillars</span>
              <div className="space-y-4">
                {activeIntel.pillars.map((pillar, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-xs font-bold text-slate-300">{pillar.name}</span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">{pillar.val}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} animate={{ width: `${pillar.val}%` }} transition={{ duration: 1, delay: i * 0.1 }}
                        className="h-full bg-white/80 rounded-full" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DeepGlassCard>

        </div>

        {/* COLUMN 3: READINESS & INTELLIGENCE (Right Rail) */}
        <div className="w-full lg:w-[340px] flex flex-col gap-6 shrink-0">
          
          {/* Readiness Signal (ELO & Benchmark) */}
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 ml-1">Readiness Signal</h2>
            <DeepGlassCard mousePos={mousePos} className="p-6">
              
              {/* Circular Gauge */}
              <div className="flex justify-center mb-8 relative">
                <div className="relative w-36 h-36">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                    <motion.circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round"
                      strokeDasharray="282.7" strokeDashoffset={282.7 - (282.7 * (currentElo / 2000))}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold font-mono tabular-nums text-white tracking-tighter leading-none">{currentElo}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-1">Your ELO</span>
                  </div>
                </div>
              </div>

              {/* Horizontal Benchmark Bar */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"/> Your ELO</span>
                  <span className="text-xs font-mono font-bold text-white tabular-nums">{currentElo}</span>
                </div>
                <div className="flex justify-between items-end opacity-60">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-500"/> L4 Target</span>
                  <span className="text-xs font-mono font-bold text-slate-400 tabular-nums">{l4Target}</span>
                </div>
                <div className="flex justify-between items-end opacity-60">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-500"/> L5 Target</span>
                  <span className="text-xs font-mono font-bold text-slate-400 tabular-nums">{l5Target}</span>
                </div>
              </div>

              {/* Dynamic Status Badge */}
              <div className="bg-[#0A0A0C] border border-white/5 rounded-lg p-3 shadow-inner">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-emerald-400 mb-1">Above L4 Range</span>
                <p className="text-[10px] font-medium text-slate-400 leading-snug">Selecting L4 will feel comfortable. Try L5 to challenge your ceiling.</p>
              </div>

            </DeepGlassCard>
          </section>

          {/* Company Intelligence Playbook */}
          <section className="flex-1 flex flex-col">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 ml-1">Company Intelligence</h2>
            <DeepGlassCard mousePos={mousePos} className="flex-1 p-6 flex flex-col justify-between">
              
              <div className="mb-6">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Typical Round Structure</span>
                <div className="bg-[#0A0A0C] border border-white/5 rounded-lg px-3 py-2.5 shadow-inner">
                  <span className="text-xs font-bold text-slate-200">{activeIntel.rounds}</span>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                <div>
                  <span className="block text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-2">DO THIS</span>
                  <ul className="space-y-1.5">
                    {activeIntel.do.map((item, i) => (
                      <li key={i} className="text-[11px] font-medium text-slate-300 flex items-start gap-2">
                        <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-red-500 uppercase tracking-widest mb-2">AVOID THIS</span>
                  <ul className="space-y-1.5">
                    {activeIntel.avoid.map((item, i) => (
                      <li key={i} className="text-[11px] font-medium text-slate-400 flex items-start gap-2">
                        <XCircle size={12} className="text-red-500/70 mt-0.5 shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </DeepGlassCard>
          </section>

        </div>

      </main>

      {/* --- LAYER 5: FLAGSHIP MULTI-COLUMN ACTION DOCK & ARCHITECTURE SUMMARY FOOTER --- */}
      <footer className="relative z-30 border-t border-white/[0.08] bg-[#050508]/90 backdrop-blur-2xl px-6 lg:px-10 py-4 shrink-0 font-mono text-xs">
        <div className="max-w-[1600px] mx-auto flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6">
          
          {/* Summary Matrix Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 flex-1 pr-0 xl:pr-8 xl:border-r border-white/10">
            
            {/* Column 1: Viewport & System Architecture */}
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] block">Viewport Architecture</span>
              <p className="text-[11px] font-bold text-white tracking-tight">Single-Viewport Cockpit</p>
              <p className="text-[10px] text-slate-400">Everything above the fold · Zero scroll overhead</p>
            </div>

            {/* Column 2: Information Hierarchy & Target */}
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] block">Active Configuration</span>
              <p className="text-[11px] font-bold text-indigo-400 tracking-tight">{activeComp.name} &middot; {role}</p>
              <p className="text-[10px] text-slate-400">Scenario auto-compiled via Company DNA RAG</p>
            </div>

            {/* Column 3: Interaction & Demeanor */}
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] block">Interviewer Dynamics</span>
              <p className="text-[11px] font-bold text-emerald-400 tracking-tight">{activePers.label} Demeanor &middot; {currentElo} ELO</p>
              <p className="text-[10px] text-slate-400">Pressure telemetry &amp; live interruptions active</p>
            </div>

          </div>

          {/* Primary Execution Trigger */}
          <div className="w-full xl:w-80 shrink-0 flex items-center justify-center">
            <motion.button 
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleLaunch}
              disabled={isBooting}
              className="w-full h-12 rounded-xl bg-white text-black text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] transition-shadow outline-none relative overflow-hidden group"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              Cross Threshold <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>

        </div>
      </footer>

      {/* Global CSS for Animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}