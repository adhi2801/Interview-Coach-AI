import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import api, { saveAuth } from "../lib/api";
import { ChevronRight, Mail, Lock, User, Activity, Eye, EyeOff, Check, X, AlertTriangle } from "lucide-react";
import AuthShell from "../components/app/AuthShell";

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
    nameInputRef.current?.focus();
  }, []);

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
    // Must match auth.py MIN_PASSWORD_LENGTH — this used to say 6, so a
    // 6-7 character password passed here and was then rejected by the server.
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/signup", { name, email, password });
      saveAuth(res.data.access_token, res.data.user);
      setSuccess(true);
      setTimeout(() => onAuth(res.data.user), 700);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      label="Create account"
      title="One free account."
      accent="A real interview."
      body="Your first session sets your baseline rating. Every answer after that moves it, and every gap it finds is traced back to what to study first."
      points={[
        { k: "Interviews", v: "Seven company profiles, four interviewer personas, five scores per answer." },
        { k: "Coding", v: "Verified problems, four languages, hidden tests run in a sandbox." },
        { k: "Your data", v: "Delete your account and all of its data at any time in Settings." },
      ]}
      onBackToHome={onBackToHome}
    >
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
                      <h2 className="text-3xl font-semibold tracking-[-0.035em] text-white mb-2">Create account</h2>
                      <p className="text-sm text-white/55">Free. Your first session sets your baseline rating.</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4 relative z-10">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block ml-1">Full Name</label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-300 transition-colors">
                            <User size={16} />
                          </div>
                          <input
                            ref={nameInputRef}
                            type="text"
                            required
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[#050507] border border-white/10 py-3 pl-12 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 transition-all shadow-inner font-medium"
                            placeholder="Jane Doe"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block ml-1">Email</label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-300 transition-colors">
                            <Mail size={16} />
                          </div>
                          <input
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => setEmailTouched(true)}
                            className={`w-full bg-[#050507] border py-3 pl-12 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all shadow-inner font-medium ${
                              emailTouched && !emailValid ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/40" : "border-white/10 focus:border-indigo-400 focus:ring-indigo-400/50"
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
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-300 transition-colors">
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
                            className="w-full bg-[#050507] border border-white/10 py-3 pl-12 pr-12 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 transition-all shadow-inner font-medium"
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
                              <Activity size={14} className="shrink-0" /> {error}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="pt-3">
                        <motion.button
                          whileTap={{ scale: loading ? 1 : 0.97 }}
                          disabled={loading}
                          type="submit"
                          className={`relative w-full flex items-center justify-center py-3.5 rounded-full text-xs font-extrabold uppercase tracking-widest transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-indigo-400 group ${
                            loading
                              ? "bg-[#111111] border border-white/10 text-slate-500 cursor-wait"
                              : "btn-liquid"
                          }`}
                        >
                          {loading ? (
                            <>
                               <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                               <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-600 border-t-black animate-spin mr-2" />
                               Initializing...
                            </>
                          ) : (
                            <>
                              <div className="absolute inset-0 w-full h-full bg-linear-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
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
                          className="text-white hover:text-indigo-300 transition-colors font-bold ml-1 border-b border-white/20 hover:border-indigo-300 pb-0.5 outline-none focus-visible:text-indigo-300"
                        >
                          Log in
                        </button>
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
    </AuthShell>
  );
}
