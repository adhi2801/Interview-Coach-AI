import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { API_URL } from "../config";
import { ChevronRight, Mail, Lock, Activity, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";

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

export default function Login({ onAuth, onSwitchToSignup, onBackToHome }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const noiseSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

  async function handleLogin(e) {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      if (res.data.error) {
        setError(res.data.error);
      } else {
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        onAuth(res.data.user);
      }
    } catch (err) {
      setError("Cannot connect to authentication server.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 font-sans selection:bg-blue-500/30 overflow-hidden relative flex flex-col md:flex-row">
      
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* LAYER 1: Ambient Spotlights (z-0) */}
      <div className="fixed top-[-10%] left-[-10%] w-[45vw] h-[55vh] bg-indigo-900/20 blur-[140px] pointer-events-none rounded-full mix-blend-screen z-0" />
      <div className="fixed bottom-[-10%] right-1/4 w-[50vw] h-[60vh] bg-blue-900/15 blur-[160px] pointer-events-none rounded-full mix-blend-screen z-0" />

      {/* LAYER 2: The Film Grain Overlay (z-10) */}
      <div className="fixed inset-0 z-10 pointer-events-none opacity-[0.035] mix-blend-soft-light" style={{ backgroundImage: noiseSvg }} />

      {/* LAYER 3: Main Layout Stream (z-20) */}
      <div className="relative z-20 flex flex-col md:flex-row w-full min-h-screen">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN (Brand & Live Diagnostic Anchor)               */}
        {/* ========================================================= */}
        <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 lg:p-16 border-r border-white/[0.06] relative bg-[#000000] overflow-hidden">
          
          {/* Isolated Ambient Light */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/10 blur-[140px] rounded-full pointer-events-none" />

          {/* Top Brand & Headline */}
          <div className={`transition-all duration-1000 ease-out transform z-10 relative max-w-md ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-3 mb-16">
              <div className="w-7 h-7 rounded bg-white flex items-center justify-center font-bold text-black text-xs shadow-[0_0_20px_rgba(255,255,255,0.3)]">IC</div>
              <span className="font-bold text-white tracking-tight text-lg">InterviewCoach</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-[-0.035em] text-white leading-[1.15] max-w-md mb-6 drop-shadow-lg">
              Measure your depth.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-slate-400">
                Master the interview.
              </span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-md leading-relaxed font-normal mb-8">
              Resume your adaptive technical simulations, review diagnostic skill gaps, and track your ELO trajectory in real time.
            </p>
          </div>

          {/* Structured Live Skill Assessment Card */}
          <div className={`transition-all duration-1000 delay-200 z-10 w-full max-w-[420px] ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <div className="bg-[#050508] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),_0_20px_40px_-10px_rgba(0,0,0,0.8)]">
              
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/[0.06]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-slate-400">Live Skill Assessment</span>
                <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  1188 ELO &middot; Level 4
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs font-bold text-slate-200">System Architecture</span>
                    <span className="text-[10px] font-mono font-bold text-blue-400">84%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 w-[84%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs font-bold text-slate-200">Algorithms &amp; DSA</span>
                    <span className="text-[10px] font-mono font-bold text-indigo-400">71%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-[71%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs font-bold text-slate-200">Communication &amp; Leadership</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400">91%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 w-[91%]" />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>CALIBRATED FROM 14 SESSIONS</span>
                <span className="text-emerald-400 font-bold">TOP 15% GLOBALLY</span>
              </div>

            </div>
          </div>

          {/* Bottom Security Badges */}
          <div className={`transition-all duration-1000 delay-150 ease-out transform z-10 relative ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-3">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Enterprise Grade Security</span>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div className="border-l border-white/10 pl-3">
                <span className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" /> Authentication
                </span>
                <span className="text-xs font-semibold text-white">JWT + bcrypt Hashing</span>
              </div>
              <div className="border-l border-white/10 pl-3">
                <span className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" /> Data Privacy
                </span>
                <span className="text-xs font-semibold text-white">Zero 3rd-Party Training</span>
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN (Frictionless Glass Vault Card)                */}
        {/* ========================================================= */}
        <div className="w-full lg:w-[55%] flex items-center justify-center p-6 lg:p-16 relative">
          
          <div className={`w-full max-w-[420px] transition-all duration-700 ease-out transform ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
            
            <GlassCard mousePos={mousePos}>
              
              <div className="flex items-center justify-between gap-3 mb-8 pb-6 border-b border-white/10">
                <div className="flex items-center gap-3 lg:hidden">
                  <div className="w-6 h-6 rounded bg-white flex items-center justify-center font-bold text-black text-[10px] shadow-[0_0_15px_rgba(255,255,255,0.3)]">IC</div>
                  <span className="font-bold text-white tracking-tight">InterviewCoach</span>
                </div>
                {onBackToHome && (
                  <button 
                    onClick={onBackToHome} 
                    className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 ml-auto outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded"
                  >
                    <ArrowLeft size={14} /> Back to Home
                  </button>
                )}
              </div>

              <div className="mb-8 relative z-10">
                <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">Welcome back</h2>
                <p className="text-xs text-slate-300 font-medium">Log in to resume your active training.</p>
              </div>

              {/* 1-Click Developer SSO Integration */}
              <div className="space-y-3 mb-6 relative z-10">
                <motion.button 
                  whileTap={{ scale: 0.97 }} 
                  className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-xs font-bold bg-[#141418] hover:bg-[#1a1a20] border border-white/10 text-white transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                >
                  <GithubIcon size={16} /> Continue with GitHub
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.97 }} 
                  className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-xs font-bold bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-white transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                >
                  <GoogleIcon size={16} /> Continue with Google
                </motion.button>
              </div>

              <div className="flex items-center my-6 relative z-10">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="px-4 text-[10px] uppercase tracking-widest font-mono font-bold text-slate-500">Or use email</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>

              {/* Auth Form */}
              <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block ml-1">Work Email</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                      <Mail size={16} />
                    </div>
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#08080C] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner font-medium"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block">Password</label>
                    <button type="button" className="text-[10px] font-mono font-bold text-slate-400 hover:text-white transition-colors outline-none focus-visible:underline">
                      Forgot?
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                      <Lock size={16} />
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#08080C] border border-white/10 rounded-xl py-3 pl-12 pr-12 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner font-medium"
                      placeholder="••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <div className="p-3 mt-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400 flex items-center gap-2">
                        <Activity size={14} className="flex-shrink-0" /> {error}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="pt-3">
                  <motion.button
                    whileTap={{ scale: loading ? 1 : 0.97 }}
                    disabled={loading}
                    type="submit"
                    className={`relative w-full flex items-center justify-center py-3 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-500 group ${
                      loading 
                        ? "bg-[#111111] border border-white/10 text-slate-500 cursor-wait" 
                        : "bg-white text-black hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]"
                    }`}
                  >
                    {loading ? (
                      <>
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                         <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-600 border-t-black animate-spin mr-2" />
                         Authenticating...
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                        Log In <ChevronRight size={16} className="ml-1 relative z-10" />
                      </>
                    )}
                  </motion.button>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t border-white/[0.06] relative z-10 text-center">
                <p className="text-xs font-medium text-slate-400">
                  Don't have an account?{" "}
                  <button 
                    onClick={onSwitchToSignup} 
                    className="text-white hover:text-blue-400 transition-colors font-bold ml-1 border-b border-white/20 hover:border-blue-400 pb-0.5 outline-none focus-visible:text-blue-400"
                  >
                    Sign up
                  </button>
                </p>
              </div>

            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      className={`relative rounded-2xl bg-[#050508] border border-white/[0.08] p-8 md:p-10 overflow-hidden backdrop-blur-2xl transition-all duration-300 ${className}`}
      style={{
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.12), 0 25px 50px -12px rgba(0,0,0,0.9)'
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