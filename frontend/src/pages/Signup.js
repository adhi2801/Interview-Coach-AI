import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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

  useEffect(() => {
    setMounted(true);
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
    <div className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden relative flex">
      
      {/* LAYER 1: Ambient Spotlights */}
      <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[50vh] bg-indigo-900/15 blur-[120px] pointer-events-none rounded-full mix-blend-screen z-0" />
      <div className="fixed bottom-[-10%] right-1/4 w-[50vw] h-[60vh] bg-blue-900/10 blur-[150px] pointer-events-none rounded-full mix-blend-screen z-0" />

      {/* LAYER 2: Texture */}
      <div 
        className="fixed inset-0 z-10 pointer-events-none opacity-[0.03] mix-blend-soft-light"
        style={{ backgroundImage: noiseSvg }}
      />

      {/* LAYER 3: Layout */}
      <div className="relative z-20 flex w-full min-h-screen">
        
        {/* Left Column: Value Hook */}
        <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 lg:p-16 border-r border-white/[0.05] relative">
          <div className={`transition-all duration-1000 transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-3 mb-16">
              <div className="w-7 h-7 rounded bg-white flex items-center justify-center font-bold text-black text-xs">IC</div>
              <span className="font-semibold text-white tracking-tight">InterviewCoach</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tighter text-white leading-tight max-w-md mb-6">
              Measure your skill.<br />
              <span className="text-slate-500">Master the interview.</span>
            </h1>
          </div>

          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[400px] aspect-square transition-all duration-1000 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <BreathingRadar />
          </div>

          <div className={`transition-all duration-1000 delay-150 transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              <Activity size={14} /> <span>Live Assessment Active</span>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div className="border-l border-white/10 pl-3">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Target Persona</span>
                <span className="text-sm font-semibold text-white">Hostile / L5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-16">
          <div className={`w-full max-w-[400px] transition-all duration-700 transform ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
            <div className="relative rounded-2xl bg-[#080808]/80 border border-white/[0.05] p-8 overflow-hidden backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),_0_30px_60px_rgba(0,0,0,0.8)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Create your account</h2>
                <p className="text-sm text-slate-400 font-medium">Enter your details to initialize your ELO rating.</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block">Full Name</label>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors"><User size={16} /></div>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" placeholder="Jane Doe" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block">Work Email</label>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors"><Mail size={16} /></div>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" placeholder="jane@company.com" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block">Password</label>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors"><Lock size={16} /></div>
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" placeholder="••••••••" />
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400">
                    {error}
                  </motion.div>
                )}

                <div className="pt-4">
                  <motion.button
                    whileTap={{ scale: loading ? 1 : 0.96 }}
                    disabled={loading}
                    type="submit"
                    className={`relative w-full flex items-center justify-center py-3 rounded-lg text-sm font-bold transition-all overflow-hidden ${
                      loading ? "bg-white/10 text-white/40 cursor-wait" : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
                    }`}
                  >
                    {loading ? (
                      <>
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                         Initializing ELO...
                      </>
                    ) : (
                      <>Create Account <ChevronRight size={16} className="ml-1" /></>
                    )}
                  </motion.button>
                </div>
              </form>

              {/* FIXED: "Continue with GitHub" button removed. It had full
                  hover/tap styling and looked completely real, but had no
                  onClick and no backend OAuth route exists (main.py has no
                  /auth/github or similar endpoint) — clicking it did nothing,
                  silently. Removing it is honest; a disabled-looking button
                  promising a feature that doesn't exist yet is worse than no
                  button at all. Add it back for real once GitHub OAuth is
                  actually implemented server-side. */}

              <div className="mt-8 pt-6 border-t border-white/[0.05]">
                <p className="text-center text-xs font-medium text-slate-500">
                  Already have an account? <span onClick={onSwitchToLogin} className="text-white hover:text-indigo-400 transition-colors cursor-pointer font-semibold">Log in</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BreathingRadar() {
  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none select-none">
      <svg viewBox="0 0 100 100" className="w-full h-full opacity-30 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)] overflow-visible">
        <motion.polygon
          initial={{ points: "50,50 50,50 50,50 50,50 50,50" }}
          animate={{ points: "50,15 85,45 70,80 30,80 15,45" }}
          transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
          fill="rgba(99,102,241,0.15)"
          stroke="rgba(99,102,241,0.8)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}