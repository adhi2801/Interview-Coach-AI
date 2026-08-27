import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { API_URL } from "../config";
import { ChevronRight, Mail, Lock, User, Activity, ShieldCheck, ArrowLeft, Eye, EyeOff, Check, X, AlertTriangle } from "lucide-react";

function GithubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size || 16} height={props.size || 16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.26 1.23-.26 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

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

// Wraps a disabled action (SSO, forgot-password) with a small honest
// tooltip on hover, instead of a button that silently does nothing.
function ComingSoonWrap({ children }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 -top-8 px-2.5 py-1 rounded-md bg-[#151519] border border-white/10 text-[10px] font-bold text-slate-300 whitespace-nowrap z-20 shadow-lg pointer-events-none"
          >
            Coming soon
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup({ onAuth, onSwitchToLogin, onBackToHome }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const nameInputRef = useRef(null);

  // Real, itemized requirements — same underlying rule the backend's
  // validate_password_strength enforces, broken into visible checks
  // instead of just a color bar with no explanation.
  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9!@#$%^&*]/.test(password),
  };
  const strength = Object.values(passwordChecks).filter(Boolean).length + (password.length > 5 ? 1 : 0);
  const emailValid = email.length === 0 || EMAIL_RE.test(email);

  useEffect(() => {
    setMounted(true);
    nameInputRef.current?.focus();
  }, []);

  const noiseSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

  function handlePasswordKeyUp(e) {
    setCapsLockOn(e.getModifierState && e.getModifierState("CapsLock"));
  }

  async function handleSignup(e) {
    if (e) e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError("Please enter a valid email address");
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
        setLoading(false);
      } else {
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setSuccess(true);
        setTimeout(() => onAuth(res.data.user), 700);
      }
    } catch (err) {
      setError("Cannot connect to authentication server.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden relative flex flex-col md:flex-row">

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="fixed top-[-10%] left-[-10%] w-[45vw] h-[55vh] bg-indigo-900/20 blur-[140px] pointer-events-none rounded-full mix-blend-screen z-0" />
      <div className="fixed bottom-[-10%] right-1/4 w-[50vw] h-[60vh] bg-blue-900/15 blur-[160px] pointer-events-none rounded-full mix-blend-screen z-0" />

      <div className="fixed inset-0 z-10 pointer-events-none opacity-[0.035] mix-blend-soft-light" style={{ backgroundImage: noiseSvg }} />

      <div className="relative z-20 flex flex-col md:flex-row w-full min-h-screen">

        {/* LEFT COLUMN */}
        <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 lg:p-16 border-r border-white/[0.06] relative bg-[#000000] overflow-hidden">

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/10 blur-[140px] rounded-full pointer-events-none" />

          <div className={`transition-all duration-1000 ease-out transform z-10 relative max-w-md ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-3 mb-16">
              <div className="w-7 h-7 rounded bg-white flex items-center justify-center font-bold text-black text-xs shadow-[0_0_20px_rgba(255,255,255,0.3)]">IC</div>
              <span className="font-bold text-white tracking-tight text-lg">InterviewCoach</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-[-0.035em] text-white leading-[1.15] max-w-md mb-6 drop-shadow-lg">
              Calibrate your baseline.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-300 to-slate-400">
                Own every interview.
              </span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-md leading-relaxed font-normal mb-8">
              Create your account to launch an adaptive diagnostic session and establish your true skill ELO.
            </p>
          </div>

          <div className={`transition-all duration-1000 delay-200 z-10 w-full max-w-[420px] ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <div className="bg-[#050508] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),_0_20px_40px_-10px_rgba(0,0,0,0.8)]">

              <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/[0.06]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-slate-400">Diagnostic Baseline</span>
                <span className="bg-blue-500/10 text-blue-300 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Awaiting Session 1
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs font-bold text-slate-300">System Architecture</span>
                    <span className="text-[10px] font-mono font-bold text-slate-500">Pending</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500/30 w-[35%] animate-pulse" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs font-bold text-slate-300">Algorithms &amp; DSA</span>
                    <span className="text-[10px] font-mono font-bold text-slate-500">Pending</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500/30 w-[25%] animate-pulse" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs font-bold text-slate-300">Communication &amp; Leadership</span>
                    <span className="text-[10px] font-mono font-bold text-slate-500">Pending</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500/30 w-[45%] animate-pulse" />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-[10px] font-mono text-slate-400">
                <Lock size={13} className="text-indigo-400 shrink-0" />
                <span>Calibrates automatically during your first simulation node</span>
              </div>

            </div>
          </div>

          <div className={`transition-all duration-1000 delay-150 ease-out transform z-10 relative ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-3">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Enterprise Grade Security</span>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div className="border-l border-white/10 pl-3">
                <span className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Authentication
                </span>
                <span className="text-xs font-semibold text-white">JWT + bcrypt Hashing</span>
              </div>
              <div className="border-l border-white/10 pl-3">
                <span className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Data Privacy
                </span>
                <span className="text-xs font-semibold text-white">Zero 3rd-Party Training</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-[55%] flex items-center justify-center p-6 lg:p-16 relative">

          <div className={`w-full max-w-[420px] transition-all duration-700 ease-out transform ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>

            <GlassCard>

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

              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-10 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                      <Check size={22} className="text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-extrabold text-white">Account created</h2>
                    <p className="text-xs text-slate-400">Redirecting you in…</p>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="mb-8 relative z-10">
                      <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">Create account</h2>
                      <p className="text-xs text-slate-300 font-medium">Join and calibrate your ELO baseline.</p>
                    </div>

                    <div className="space-y-3 mb-6 relative z-10">
                      <ComingSoonWrap>
                        <motion.button
                          type="button"
                          disabled
                          whileTap={{ scale: 0.97 }}
                          className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-xs font-bold bg-[#141418] border border-white/10 text-slate-500 transition-all shadow-sm outline-none cursor-not-allowed opacity-60"
                        >
                          <GithubIcon size={16} /> Sign up with GitHub
                        </motion.button>
                      </ComingSoonWrap>
                      <ComingSoonWrap>
                        <motion.button
                          type="button"
                          disabled
                          whileTap={{ scale: 0.97 }}
                          className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-xs font-bold bg-white/[0.03] border border-white/10 text-slate-500 transition-all shadow-sm outline-none cursor-not-allowed opacity-60"
                        >
                          <GoogleIcon size={16} /> Sign up with Google
                        </motion.button>
                      </ComingSoonWrap>
                    </div>

                    <div className="flex items-center my-6 relative z-10">
                      <div className="flex-1 h-px bg-white/[0.08]" />
                      <span className="px-4 text-[10px] uppercase tracking-widest font-mono font-bold text-slate-500">Or use email</span>
                      <div className="flex-1 h-px bg-white/[0.08]" />
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4 relative z-10">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block ml-1">Full Name</label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                            <User size={16} />
                          </div>
                          <input
                            ref={nameInputRef}
                            type="text"
                            required
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[#08080C] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner font-medium"
                            placeholder="Jane Doe"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block ml-1">Work Email</label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                            <Mail size={16} />
                          </div>
                          <input
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => setEmailTouched(true)}
                            className={`w-full bg-[#08080C] border rounded-xl py-3 pl-12 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all shadow-inner font-medium ${
                              emailTouched && !emailValid ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/40" : "border-white/10 focus:border-blue-500 focus:ring-blue-500/50"
                            }`}
                            placeholder="jane@company.com"
                          />
                          {emailTouched && email.length > 0 && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              {emailValid ? <Check size={14} className="text-emerald-400" /> : <X size={14} className="text-rose-400" />}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block ml-1">Password</label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                            <Lock size={16} />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyUp={handlePasswordKeyUp}
                            onKeyDown={handlePasswordKeyUp}
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

                        <AnimatePresence>
                          {capsLockOn && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 pt-1 px-1">
                                <AlertTriangle size={11} /> Caps Lock is on
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {password.length > 0 && (
                          <div className="pt-2 px-1 space-y-1.5">
                            <div className="flex gap-1">
                              <div className={`h-1 flex-1 rounded-full transition-colors ${strength >= 1 ? 'bg-rose-500' : 'bg-white/10'}`} />
                              <div className={`h-1 flex-1 rounded-full transition-colors ${strength >= 2 ? 'bg-amber-400' : 'bg-white/10'}`} />
                              <div className={`h-1 flex-1 rounded-full transition-colors ${strength >= 3 ? 'bg-emerald-400' : 'bg-white/10'}`} />
                              <div className={`h-1 flex-1 rounded-full transition-colors ${strength >= 4 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-white/10'}`} />
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                              <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${passwordChecks.length ? "text-emerald-400" : "text-slate-600"}`}>
                                {passwordChecks.length ? <Check size={10} /> : <X size={10} />} 8+ characters
                              </span>
                              <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${passwordChecks.upper ? "text-emerald-400" : "text-slate-600"}`}>
                                {passwordChecks.upper ? <Check size={10} /> : <X size={10} />} Uppercase letter
                              </span>
                              <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${passwordChecks.number ? "text-emerald-400" : "text-slate-600"}`}>
                                {passwordChecks.number ? <Check size={10} /> : <X size={10} />} Number or symbol
                              </span>
                            </div>
                          </div>
                        )}
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

                    <div className="mt-6 pt-6 border-t border-white/[0.06] relative z-10 text-center">
                      <p className="text-xs font-medium text-slate-400">
                        Already have an account?{" "}
                        <button
                          onClick={onSwitchToLogin}
                          className="text-white hover:text-blue-400 transition-colors font-bold ml-1 border-b border-white/20 hover:border-blue-400 pb-0.5 outline-none focus-visible:text-blue-400"
                        >
                          Log in
                        </button>
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlassCard({ children, className = "" }) {
  const cardRef = useRef(null);
  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCursorX(e.clientX - rect.left);
    setCursorY(e.clientY - rect.top);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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