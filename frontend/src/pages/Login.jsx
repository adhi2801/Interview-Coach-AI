import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import api, { saveAuth } from "../lib/api";
import { ChevronRight, Mail, Lock, Activity, Eye, EyeOff, Check, X, AlertTriangle } from "lucide-react";
import AuthShell from "../components/app/AuthShell";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REMEMBERED_EMAIL_KEY = "ic_remembered_email";

export default function Login({ onAuth, onSwitchToSignup, onBackToHome }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const emailInputRef = useRef(null);

  const emailValid = email.length === 0 || EMAIL_RE.test(email);

  useEffect(() => {

    const remembered = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
    emailInputRef.current?.focus();
  }, []);

  function handlePasswordKeyUp(e) {
    setCapsLockOn(e.getModifierState && e.getModifierState("CapsLock"));
  }

  async function handleLogin(e) {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      saveAuth(res.data.access_token, res.data.user);
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      setSuccess(true);
      setTimeout(() => onAuth(res.data.user), 700);
    } catch (err) {
      // err.message is the server's own reason ("Invalid email or password",
      // "Too many requests...") or a clear network message from lib/api.
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      label="Sign in"
      title="Pick up where"
      accent="you left off."
      body="Your rating history, the gaps diagnosed from your past answers and every session replay are waiting in your account."
      points={[
        { k: "Rating", v: "One ELO across interviews and coding, kept for every scored answer." },
        { k: "Gaps", v: "Ranked by how often they show up in your real answers." },
        { k: "Security", v: "Passwords hashed with bcrypt; sessions use signed JWTs." },
      ]}
      onBackToHome={onBackToHome}
    >
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-10 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                      <Check size={22} className="text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-extrabold text-white">Welcome back</h2>
                    <p className="text-xs text-slate-400">Redirecting you in…</p>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="mb-8 relative z-10">
                      <h2 className="text-3xl font-semibold tracking-[-0.035em] text-white mb-2">Welcome back</h2>
                      <p className="text-sm text-white/55">Log in to your InterviewCoach account.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4 relative z-10">

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block ml-1">Email</label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-300 transition-colors">
                            <Mail size={16} />
                          </div>
                          <input
                            ref={emailInputRef}
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => setEmailTouched(true)}
                            className={`w-full bg-[#050507] border py-3 pl-12 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all shadow-inner font-medium ${
                              emailTouched && !emailValid ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/40" : "border-white/10 focus:border-indigo-400 focus:ring-indigo-400/50"
                            }`}
                            placeholder="you@company.com"
                          />
                          {emailTouched && email.length > 0 && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              {emailValid ? <Check size={14} className="text-emerald-400" /> : <X size={14} className="text-rose-400" />}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block">Password</label>
                        </div>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-300 transition-colors">
                            <Lock size={16} />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            autoComplete="current-password"
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
                      </div>

                      <label className="flex items-center gap-2 pl-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-3.5 h-3.5 rounded accent-indigo-400 bg-[#050507] border-white/20 cursor-pointer"
                        />
                        <span className="text-[11px] font-medium text-slate-400">Remember my email on this device</span>
                      </label>

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
                               Authenticating...
                            </>
                          ) : (
                            <>
                              <div className="absolute inset-0 w-full h-full bg-linear-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
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
                          className="text-white hover:text-indigo-300 transition-colors font-bold ml-1 border-b border-white/20 hover:border-indigo-300 pb-0.5 outline-none focus-visible:text-indigo-300"
                        >
                          Sign up
                        </button>
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
    </AuthShell>
  );
}