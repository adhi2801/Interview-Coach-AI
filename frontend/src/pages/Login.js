import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { API_URL } from "../config";
import { ChevronRight, Mail, Lock, Activity } from "lucide-react";

export default function Login({ onAuth, onSwitchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Microscopic film grain overlay
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
      setError("Cannot connect to server");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden relative flex">
      
      {/* LAYER 1: Ambient Spotlights (z-0) */}
      <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[50vh] bg-indigo-900/15 blur-[120px] pointer-events-none rounded-full mix-blend-screen z-0" />
      <div className="fixed bottom-[-10%] right-1/4 w-[50vw] h-[60vh] bg-blue-900/10 blur-[150px] pointer-events-none rounded-full mix-blend-screen z-0" />

      {/* LAYER 2: The Film Grain Overlay (z-10) */}
      <div 
        className="fixed inset-0 z-10 pointer-events-none opacity-[0.03] mix-blend-soft-light"
        style={{ backgroundImage: noiseSvg }}
      />

      {/* LAYER 3: The Tailwind UI (z-20) */}
      <div className="relative z-20 flex w-full min-h-screen">
        
        {/* Left Column: The Value Intro & Generative Radar */}
        <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 lg:p-16 border-r border-white/[0.05] relative">
          
          <div className={`transition-all duration-1000 ease-out transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-3 mb-16">
              <div className="w-7 h-7 rounded bg-white flex items-center justify-center font-bold text-black text-xs">
                IC
              </div>
              <span className="font-semibold text-white tracking-tight">InterviewCoach</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tighter text-white leading-tight max-w-md mb-6">
              Resume your training.<br />
              <span className="text-slate-500">Master the interview.</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-md leading-relaxed font-medium">
              Log in to access your ELO progression, review your knowledge gaps, and initialize your next hostile simulation.
            </p>
          </div>

          {/* Generative Breathing Radar Graphic */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[400px] aspect-square transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <BreathingRadar />
          </div>

          <div className={`transition-all duration-1000 delay-150 ease-out transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              <Activity size={14} />
              <span>System Status</span>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div className="border-l border-white/10 pl-3">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Knowledge Graph</span>
                <span className="text-sm font-semibold text-white">93 Nodes Online</span>
              </div>
              <div className="border-l border-white/10 pl-3">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Latency</span>
                <span className="text-sm font-semibold text-emerald-400 tabular-nums">16ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: The Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-16">
          
          <div className={`w-full max-w-[400px] transition-all duration-700 ease-out transform ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
            
            {/* The Deep Glass Card Container */}
            <div className="relative rounded-2xl bg-[#080808]/80 border border-white/[0.05] p-8 overflow-hidden backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),_0_30px_60px_rgba(0,0,0,0.8)]">
              
              {/* Subtle top-light inside the card */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Welcome back</h2>
                <p className="text-sm text-slate-400 font-medium">Log in to continue your interview prep.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block">Work Email</label>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                      <Mail size={16} />
                    </div>
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block">Password</label>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                      <Lock size={16} />
                    </div>
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="pt-4">
                  <motion.button
                    whileTap={{ scale: loading ? 1 : 0.96 }}
                    disabled={loading}
                    type="submit"
                    className={`relative w-full flex items-center justify-center py-3 rounded-lg text-sm font-bold transition-all overflow-hidden ${
                      loading 
                        ? "bg-white/10 text-white/40 cursor-wait" 
                        : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
                    }`}
                  >
                    {loading ? (
                      <>
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                         Authenticating...
                      </>
                    ) : (
                      <>Log In <ChevronRight size={16} className="ml-1" /></>
                    )}
                  </motion.button>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-white/[0.05]">
                <p className="text-center text-xs font-medium text-slate-500">
                  Don't have an account? <span onClick={onSwitchToSignup} className="text-white hover:text-indigo-400 transition-colors cursor-pointer font-semibold">Sign up to initialize</span>
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Generative Breathing Radar Graphic (Framer Motion)
function BreathingRadar() {
  // Simulating the 5-axis scoring radar with a generative feel
  const points = [
    { label: "Technical", x: 50, y: 10 },
    { label: "Communication", x: 95, y: 40 },
    { label: "Problem Solving", x: 80, y: 90 },
    { label: "Cultural Fit", x: 20, y: 90 },
    { label: "Confidence", x: 5, y: 40 },
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none select-none">
      <svg viewBox="0 0 100 100" className="w-full h-full opacity-30 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)] overflow-visible">
        {/* Background Web */}
        <polygon points="50,10 95,40 80,90 20,90 5,40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        <polygon points="50,25 80,45 68,75 32,75 20,45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        
        {/* Breathing Polygon (The User's "Potential" Score) */}
        <motion.polygon
          initial={{ points: "50,50 50,50 50,50 50,50 50,50" }}
          animate={{ points: "50,15 85,45 70,80 30,80 15,45" }}
          transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
          fill="rgba(99,102,241,0.15)"
          stroke="rgba(99,102,241,0.8)"
          strokeWidth="1"
        />

        {/* Axis Lines */}
        {points.map((p, i) => (
          <line key={i} x1="50" y1="50" x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="1,2" />
        ))}
      </svg>
      
      {/* 5D Axis Labels */}
      <div className="absolute inset-0">
        <span className="absolute top-[0%] left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-widest font-bold text-slate-500">Technical</span>
        <span className="absolute top-[40%] right-[-10%] text-[9px] uppercase tracking-widest font-bold text-slate-500">Comm</span>
        <span className="absolute bottom-[-5%] right-[10%] text-[9px] uppercase tracking-widest font-bold text-slate-500">Problem Solving</span>
        <span className="absolute bottom-[-5%] left-[10%] text-[9px] uppercase tracking-widest font-bold text-slate-500">Culture</span>
        <span className="absolute top-[40%] left-[-10%] text-[9px] uppercase tracking-widest font-bold text-slate-500">Confidence</span>
      </div>
    </div>
  );
}