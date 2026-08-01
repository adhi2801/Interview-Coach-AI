import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { API_URL } from "../config";
import { ChevronRight, Mail, Lock, User, Activity, ShieldCheck, ArrowLeft } from "lucide-react";

// Inline SVG for GitHub
function GithubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size || 16} height={props.size || 16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.26 1.23-.26 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

// Inline SVG for Google
function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size || 16} height={props.size || 16} fill="currentColor" {...props}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Signup({ onAuth, onSwitchToLogin, onBackToHome }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  // Password Strength Engine
  const getPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length > 5) score += 1;
    if (pass.length > 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9!@#$%^&*]/.test(pass)) score += 1;
    return score;
  };
  const strength = getPasswordStrength(password);

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const noiseSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

  async function handleSignup(e) {
    if (e) e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_URL}/auth/signup`, { name, email, password });
      if (res.data.error) {
        setError(res.data.error);
      } else {
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        onAuth(res.data.user);
      }
    } catch (err) {
      setError("Cannot connect to server");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden relative flex flex-col md:flex-row">
      
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* LAYER 1: Ambient Spotlights + Film Grain */}
      <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[50vh] bg-indigo-900/15 blur-[120px] pointer-events-none rounded-full mix-blend-screen z-0" />
      <div className="fixed bottom-[-10%] right-1/4 w-[50vw] h-[60vh] bg-blue-900/10 blur-[150px] pointer-events-none rounded-full mix-blend-screen z-0" />
      <div className="fixed inset-0 z-10 pointer-events-none opacity-[0.03] mix-blend-soft-light" style={{ backgroundImage: noiseSvg }} />

      {/* LAYER 2: The Core Workspace (z-20) */}
      <div className="relative z-20 flex flex-col md:flex-row w-full min-h-screen">
        
        {/* LEFT DECK (Brand & High-Trust Anchor) */}
        <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 lg:p-16 border-r border-white/[0.05] relative bg-[#000000] overflow-hidden">
          
          {/* Volumetric Ambient Light isolated specifically for the radar */}
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/20 blur-[140px] rounded-full pointer-events-none" />

          {/* Top Text Content */}
          <div className={`transition-all duration-1000 ease-out transform z-10 relative max-w-md ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-3 mb-16">
              <div className="w-7 h-7 rounded bg-white flex items-center justify-center font-bold text-black text-xs shadow-[0_0_15px_rgba(255,255,255,0.3)]">IC</div>
              <span className="font-semibold text-white tracking-tight text-lg">InterviewCoach</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-[-0.035em] text-white leading-tight max-w-md mb-6 drop-shadow-lg">
              Measure your skill.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-400 to-slate-600">Master the interview.</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-md leading-relaxed font-medium">
              Initialize your base ELO rating to begin running adaptive technical simulations.
            </p>
          </div>

          {/* Generative Radar Graphic (Shifted entirely to the right to PREVENT COLLISIONS) */}
          <div className={`absolute top-1/2 -right-16 -translate-y-1/2 w-[500px] aspect-square transition-all duration-1000 delay-300 pointer-events-none ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <BreathingRadar />
          </div>

          {/* Bottom Security Badges */}
          <div className={`transition-all duration-1000 delay-150 ease-out transform z-10 relative ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-emerald-500 mb-4">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Enterprise Grade Security</span>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div className="border-l border-white/10 pl-3">
                <span className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Authentication
                </span>
                <span className="text-sm font-semibold text-white">JWT + bcrypt Hashing</span>
              </div>
              <div className="border-l border-white/10 pl-3">
                <span className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Data Privacy
                </span>
                <span className="text-sm font-semibold text-white">Zero 3rd-Party Training</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT DECK (Frictionless Glass Vault Card) */}
        <div className="w-full lg:w-[55%] flex items-center justify-center p-6 lg:p-16 relative">
          
          <div className={`w-full max-w-[420px] transition-all duration-700 ease-out transform ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
            
            <GlassCard mousePos={mousePos}>
              
              <div className="flex items-center justify-between gap-3 mb-8 pb-8 border-b border-white/10">
                <div className="flex items-center gap-3 lg:hidden">
                  <div className="w-6 h-6 rounded bg-white flex items-center justify-center font-bold text-black text-[10px] shadow-[0_0_15px_rgba(255,255,255,0.3)]">IC</div>
                  <span className="font-semibold text-white tracking-tight">InterviewCoach</span>
                </div>
                {onBackToHome && (
                  <button onClick={onBackToHome} className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 ml-auto outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded">
                    <ArrowLeft size={14} /> Back to Home
                  </button>
                )}
              </div>

              <div className="mb-8 relative z-10">
                <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Create account</h2>
                <p className="text-sm text-slate-400 font-medium">Join and calibrate your ELO.</p>
              </div>

              {/* 1-Click Developer SSO Integration */}
              <div className="space-y-3 mb-6 relative z-10">
                <motion.button whileTap={{ scale: 0.97 }} className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm font-bold bg-[#171717] hover:bg-[#202020] border border-white/10 text-white transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50">
                  <GithubIcon size={18} /> Sign up with GitHub
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm font-bold bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-white transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50">
                  <GoogleIcon size={18} /> Sign up with Google
                </motion.button>
              </div>

              <div className="flex items-center my-6 relative z-10">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="px-4 text-[10px] uppercase tracking-widest font-bold text-slate-600">Or use email</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              <form onSubmit={handleSignup} className="space-y-4 relative z-10">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 block ml-1">Full Name</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                      <User size={16} />
                    </div>
                    <input 
                      type="text" 
                      required 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner placeholder-slate-600" 
                      placeholder="Jane Doe" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 block ml-1">Work Email</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                      <Mail size={16} />
                    </div>
                    <input 
                      type="email" 
                      required 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner placeholder-slate-600" 
                      placeholder="jane@company.com" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 block ml-1">Password</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                      <Lock size={16} />
                    </div>
                    <input 
                      type="password" 
                      required 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner placeholder-slate-600" 
                      placeholder="••••••••" 
                    />
                  </div>
                  
                  {/* Password Strength Meter */}
                  {password.length > 0 && (
                    <div className="flex gap-1 pt-1 px-1">
                      <div className={`h-1 flex-1 rounded-full transition-colors ${strength >= 1 ? 'bg-red-400' : 'bg-white/10'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${strength >= 2 ? 'bg-amber-400' : 'bg-white/10'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${strength >= 3 ? 'bg-emerald-400' : 'bg-white/10'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${strength >= 4 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <div className="p-3 mt-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 flex items-center gap-2">
                        <Activity size={14} className="flex-shrink-0" /> {error}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="pt-4">
                  <motion.button
                    whileTap={{ scale: loading ? 1 : 0.97 }}
                    disabled={loading}
                    type="submit"
                    className={`relative w-full flex items-center justify-center py-3 rounded-xl text-sm font-bold transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-500 group ${
                      loading 
                        ? "bg-[#111111] border border-white/10 text-slate-500 cursor-wait" 
                        : "bg-white text-black hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]"
                    }`}
                  >
                    {loading ? (
                      <>
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                         <span className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-black animate-spin mr-2" />
                         Initializing...
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                        Create Account <ChevronRight size={16} className="ml-1 relative z-10" />
                      </>
                    )}
                  </motion.button>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t border-white/[0.06] relative z-10">
                <p className="text-center text-xs font-medium text-slate-500">
                  Already have an account? <button onClick={onSwitchToLogin} className="text-white hover:text-blue-400 transition-colors cursor-pointer font-bold ml-1 border-b border-transparent hover:border-blue-400 pb-0.5 outline-none focus-visible:text-blue-400">Log in</button>
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}

// Generative Breathing Radar Graphic
function BreathingRadar() {
  const points = [
    { label: "Technical", x: 50, y: 10 },
    { label: "Communication", x: 95, y: 40 },
    { label: "Problem Solving", x: 80, y: 90 },
    { label: "Cultural Fit", x: 20, y: 90 },
    { label: "Confidence", x: 5, y: 40 },
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none select-none">
      <svg viewBox="0 0 100 100" className="w-full h-full opacity-40 drop-shadow-[0_0_20px_rgba(79,70,229,0.3)] overflow-visible">
        <polygon points="50,10 95,40 80,90 20,90 5,40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        <polygon points="50,25 80,45 68,75 32,75 20,45" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        
        <motion.polygon
          initial={{ points: "50,50 50,50 50,50 50,50 50,50" }}
          animate={{ points: "50,15 85,45 70,80 30,80 15,45" }}
          transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
          fill="rgba(79,70,229,0.15)"
          stroke="rgba(79,70,229,0.8)"
          strokeWidth="1"
        />

        {points.map((p, i) => (
          <line key={i} x1="50" y1="50" x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="1,2" />
        ))}
      </svg>
      
      <div className="absolute inset-0">
        <span className="absolute top-[0%] left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.2em] font-bold text-slate-500">Technical</span>
        <span className="absolute top-[40%] right-[-10%] text-[9px] uppercase tracking-[0.2em] font-bold text-slate-500">Comm</span>
        <span className="absolute bottom-[-5%] right-[10%] text-[9px] uppercase tracking-[0.2em] font-bold text-slate-500">Problem Solving</span>
        <span className="absolute bottom-[-5%] left-[10%] text-[9px] uppercase tracking-[0.2em] font-bold text-slate-500">Culture</span>
        <span className="absolute top-[40%] left-[-10%] text-[9px] uppercase tracking-[0.2em] font-bold text-slate-500">Confidence</span>
      </div>
    </div>
  );
}

// Reusable Deep Glass Card
function GlassCard({ children, className = "", mousePos }) {
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
      className={`relative rounded-2xl bg-[#0A0A0C]/90 border border-white/[0.08] p-8 md:p-10 overflow-hidden backdrop-blur-2xl transition-all duration-300 ${className}`}
      style={{
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.12), 0 20px 40px -10px rgba(0,0,0,0.5)'
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