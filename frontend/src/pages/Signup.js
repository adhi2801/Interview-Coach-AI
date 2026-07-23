import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { API_URL } from "../config";
import { ChevronRight, Mail, Lock, User, Activity } from "lucide-react";

export default function Signup({ onAuth, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      
      {/* LAYER 1: Ambient Spotlights */}
      <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[50vh] bg-indigo-900/15 blur-[120px] pointer-events-none rounded-full mix-blend-screen z-0" />
      <div className="fixed bottom-[-10%] right-1/4 w-[50vw] h-[60vh] bg-blue-900/10 blur-[150px] pointer-events-none rounded-full mix-blend-screen z-0" />

      {/* LAYER 2: Texture */}
      <div 
        className="fixed inset-0 z-10 pointer-events-none opacity-[0.03] mix-blend-soft-light"
        style={{ backgroundImage: noiseSvg }}
      />

      {/* LAYER 3: Layout */}
      <div className="relative z-20 flex flex-col md:flex-row w-full min-h-screen">
        
        {/* Left Column: Value Hook */}
        <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 lg:p-16 border-r border-white/[0.05] relative bg-black/20 backdrop-blur-3xl">
          <div className={`transition-all duration-1000 transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-3 mb-16">
              <div className="w-7 h-7 rounded bg-white flex items-center justify-center font-bold text-black text-xs shadow-[0_0_15px_rgba(255,255,255,0.3)]">IC</div>
              <span className="font-semibold text-white tracking-tight text-lg">InterviewCoach</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tighter text-white leading-tight max-w-md mb-6">
              Measure your skill.<br />
              <span className="text-slate-500">Master the interview.</span>
            </h1>
          </div>

          {/* Generative Breathing Radar Graphic */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[400px] aspect-square transition-all duration-1000 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <BreathingRadar />
          </div>

          <div className={`transition-all duration-1000 delay-150 transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              <Activity size={14} className="text-blue-500" /> <span>Live Assessment Active</span>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div className="border-l border-white/10 pl-3">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Target Persona</span>
                <span className="text-sm font-semibold text-white">Hostile / L5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Form Vault */}
        <div className="w-full lg:w-[55%] flex items-center justify-center p-6 lg:p-16 relative">
          <div className={`w-full max-w-[420px] transition-all duration-700 transform ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
            
            {/* Deep Glass Container */}
            <GlassCard mousePos={mousePos}>
              
              {/* Mobile Branding Fallback */}
              <div className="lg:hidden flex items-center gap-3 mb-8 pb-8 border-b border-white/10">
                <div className="w-6 h-6 rounded bg-white flex items-center justify-center font-bold text-black text-[10px] shadow-[0_0_15px_rgba(255,255,255,0.3)]">IC</div>
                <span className="font-semibold text-white tracking-tight">InterviewCoach</span>
              </div>

              <div className="mb-8 relative z-10">
                <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Create your account</h2>
                <p className="text-sm text-slate-400 font-medium">Enter your details to initialize your ELO rating.</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-5 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block ml-1">Full Name</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                      <User size={16} />
                    </div>
                    <input 
                      type="text" 
                      required 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner placeholder-slate-600" 
                      placeholder="Jane Doe" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block ml-1">Work Email</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                      <Mail size={16} />
                    </div>
                    <input 
                      type="email" 
                      required 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner placeholder-slate-600" 
                      placeholder="jane@company.com" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block ml-1">Password</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                      <Lock size={16} />
                    </div>
                    <input 
                      type="password" 
                      required 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner placeholder-slate-600" 
                      placeholder="••••••••" 
                    />
                  </div>
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

                <div className="pt-6">
                  <motion.button
                    whileTap={{ scale: loading ? 1 : 0.96 }}
                    disabled={loading}
                    type="submit"
                    className={`relative w-full flex items-center justify-center py-3.5 rounded-xl text-sm font-bold transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-500 ${
                      loading ? "bg-[#111111] border border-white/10 text-slate-500 cursor-wait" : "bg-white text-black hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                    }`}
                  >
                    {loading ? (
                      <>
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                         <span className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-black animate-spin mr-2" />
                         Initializing ELO...
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        Create Account <ChevronRight size={16} className="ml-1 relative z-10" />
                      </>
                    )}
                  </motion.button>
                </div>
              </form>

              <div className="mt-8 pt-8 border-t border-white/[0.06] relative z-10">
                <p className="text-center text-xs font-medium text-slate-500">
                  Already have an account? <span onClick={onSwitchToLogin} className="text-white hover:text-blue-400 transition-colors cursor-pointer font-bold ml-1 border-b border-transparent hover:border-blue-400 pb-0.5">Log in to resume</span>
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      <svg viewBox="0 0 100 100" className="w-full h-full opacity-40 drop-shadow-[0_0_20px_rgba(79,70,229,0.4)] overflow-visible">
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

// Reusable Deep Glass Card with Vercel Cursor Spotlight
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
      className={`relative rounded-3xl bg-[#050507]/80 border border-white/[0.06] p-8 md:p-10 overflow-hidden backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),_0_30px_60px_rgba(0,0,0,0.8)] ${className}`}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(400px circle at ${cursorX}px ${cursorY}px, rgba(255,255,255,0.04), transparent 40%)`,
          opacity: isHovered ? 1 : 0
        }}
      />
      {children}
    </div>
  );
}