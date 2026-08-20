import { API_URL } from "../config";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup, useScroll, useTransform } from "framer-motion";
import {
  Terminal, ArrowLeft, ArrowRight, Target, CheckCircle2, XCircle,
  User, ShieldAlert, Brain, Battery, ChevronDown, Check, BookOpen,
  AlertTriangle, RotateCcw, Play, Zap, Cpu, Activity, TrendingUp
} from "lucide-react";
import axios from "axios";
import * as SelectPrimitive from "@radix-ui/react-select";
import { COMPANIES } from "../constants/companies";

const ROLES = [
  "Software Engineer — L3", "Senior Engineer — L4", "Staff Engineer — L5",
  "Backend Engineer — L4", "Frontend Engineer — L4", "ML Engineer", "Systems Architect"
];

const PERSONAS = [
  { id: "standard", label: "Standard", icon: User, color: "#3b82f6", tagline: "Neutral, evaluative — closest to a real interview loop." },
  { id: "hostile", label: "Hostile", icon: ShieldAlert, color: "#ef4444", tagline: "Pressure-tests your reasoning under active challenge." },
  { id: "socratic", label: "Socratic", icon: Brain, color: "#10b981", tagline: "Asks open-ended questions to guide your thinking." },
  { id: "exhausted", label: "Exhausted", icon: Battery, color: "#f59e0b", tagline: "Low engagement — tests your ability to carry the room." },
];

const KNOWN_COMPANIES = ["google", "amazon", "meta", "microsoft", "apple", "netflix", "startup"];

// Honest, generic progress copy tied to the real request lifecycle of
// /session/start — not scripted technical claims (no "WebRTC socket",
// no "calibrating engine") about things that aren't actually happening
// at that moment. Steps 0-2 are shown while the request is in flight;
// the final step only ever renders once the request has genuinely
// resolved (see bootStep logic in handleLaunch).
const BOOT_SEQUENCE = [
  "> Sending session request...",
  "> Waiting for the server to build your interview...",
  "> Almost there...",
  "SESSION READY."
];

function RollingNumber({ value, className = "" }) {
  const digits = String(value).split("");
  return (
    <span className={`inline-flex tabular-nums ${className}`}>
      {digits.map((d, i) => (
        <span key={i} className="relative inline-block overflow-hidden" style={{ height: "1em" }}>
          <AnimatePresence mode="popLayout">
            <motion.span key={d + i}
              initial={{ y: "100%", opacity: 0 }} animate={{ y: "0%", opacity: 1 }} exit={{ y: "-100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }} className="inline-block">
              {d}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

function DeepGlassCard({ children, className = "", accent, interactive = false, onClick, delay = 0 }) {
  const [mx, setMx] = useState(50);
  const [my, setMy] = useState(50);
  const cardRef = useRef(null);

  function handleMouseMove(e) {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    setMx(((e.clientX - r.left) / r.width) * 100);
    setMy(((e.clientY - r.top) / r.height) * 100);
  }

  const accentBorder = accent ? { borderLeftColor: accent, borderLeftWidth: "3px" } : {};

  return (
    <motion.div ref={cardRef} onMouseMove={handleMouseMove} onClick={onClick}
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28, delay }}
      whileHover={interactive ? { y: -3, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.6)" } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.1), 0 20px 40px -10px rgba(0,0,0,0.5)', ...accentBorder }}
      className={`relative rounded-2xl bg-[#0A0A0F]/80 border border-white/[0.08] overflow-hidden backdrop-blur-2xl transition-[border-color] duration-300 hover:border-white/[0.16] ${interactive ? "cursor-pointer" : ""} ${className}`}>
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0 opacity-0 hover:opacity-100"
        style={{ background: `radial-gradient(300px circle at ${mx}% ${my}%, rgba(255,255,255,0.05), transparent 45%)` }} />
      <div className="relative z-10 w-full h-full">{children}</div>
    </motion.div>
  );
}

function SkeletonLine({ className = "" }) {
  return <div className={`bg-white/[0.06] rounded-md animate-pulse ${className}`} />;
}

function EloGauge({ elo, size = 96 }) {
  const pct = Math.min(1, elo / 2000);
  const circumference = 263.8;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <motion.circle cx="50" cy="50" r="42" fill="none" stroke="#6366f1" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - circumference * pct }}
          transition={{ duration: 1.4, ease: "easeOut" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-white leading-none"><RollingNumber value={elo} /></span>
        <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-slate-500 mt-1">ELO</span>
      </div>
    </div>
  );
}

function CinematicSelect({ value, onChange, options }) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#08080C] border border-white/10 text-sm font-semibold text-white tracking-wide shadow-inner outline-none hover:border-white/20 transition-colors">
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon><ChevronDown size={14} className="text-slate-400" /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="overflow-hidden bg-[#0A0A0C]/95 backdrop-blur-3xl border border-white/10 rounded-xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] z-[9999]" position="popper" sideOffset={6}>
          <SelectPrimitive.Viewport className="p-1.5">
            {options.map((opt) => (
              <SelectPrimitive.Item key={opt} value={opt} className="relative flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all outline-none text-slate-300 hover:bg-white/[0.05] hover:text-white cursor-pointer data-[highlighted]:bg-blue-500/10 data-[highlighted]:text-blue-400">
                <SelectPrimitive.ItemText>{opt}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator><Check size={14} className="text-blue-400" /></SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export default function Dashboard({ onStart, user, onGoBack }) {
  const [company, setCompany] = useState(() => localStorage.getItem("ic_last_company") || "google");
  const [role, setRole] = useState(() => localStorage.getItem("ic_last_role") || ROLES[1]);
  const [persona, setPersona] = useState(() => localStorage.getItem("ic_last_persona") || "standard");
  const [isBooting, setIsBooting] = useState(false);
  const [bootStep, setBootStep] = useState(0);
  const [launchError, setLaunchError] = useState(false);
  const [systemStatus, setSystemStatus] = useState("checking");

  const [companyProfile, setCompanyProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  const [eloBands, setEloBands] = useState(null);
  const [companyIntel, setCompanyIntel] = useState(null);
  const [intelLoading, setIntelLoading] = useState(true);
  const [intelError, setIntelError] = useState(false);
  const [companySessions, setCompanySessions] = useState([]);
  const [sessionsError, setSessionsError] = useState(false);
  const [topicCount, setTopicCount] = useState(null);

  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [previewPulse, setPreviewPulse] = useState(false);

  const mainRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: mainRef, offset: ["start start", "end end"] });
  const orbYA = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const orbYB = useTransform(scrollYProgress, [0, 1], [0, -40]);

  const currentElo = Math.round(user?.elo_rating || 1200);
  const activeComp = COMPANIES.find(c => c.id === company) || COMPANIES[0];
  const isFreshlyGenerated = !KNOWN_COMPANIES.includes(company);

  // Single source of truth for auth headers — was previously duplicated
  // inline in four places (handlePreview, handleLaunch, and two effects).
  const authHeaders = () => {
    const token = localStorage.getItem("access_token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : null;
  };

  useEffect(() => {
    axios.get(`${API_URL}/health`, { timeout: 5000 })
      .then((res) => setSystemStatus(res.data?.status === "ok" ? "ok" : "degraded"))
      .catch(() => setSystemStatus("degraded"));
  }, []);

  useEffect(() => {
    localStorage.setItem("ic_last_company", company);
    localStorage.setItem("ic_last_role", role);
    localStorage.setItem("ic_last_persona", persona);
  }, [company, role, persona]);

  useEffect(() => {
    let cancelled = false;
    setProfileLoading(true);
    setProfileError(false);
    axios.get(`${API_URL}/companies/${company}/profile`)
      .then(res => { if (!cancelled) setCompanyProfile(res.data); })
      .catch(() => { if (!cancelled) setProfileError(true); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [company]);

  useEffect(() => {
    axios.get(`${API_URL}/roles/elo-bands`).then(res => setEloBands(res.data)).catch(() => setEloBands({}));
  }, []);

  useEffect(() => {
    const auth = authHeaders();
    if (!auth) { setIntelLoading(false); return; }
    let cancelled = false;
    setIntelLoading(true);
    setIntelError(false);
    Promise.all([
      axios.get(`${API_URL}/user/skill-radar`, { ...auth, params: { company } }),
      axios.get(`${API_URL}/user/gap-queue`, { ...auth, params: { company } }),
    ]).then(([radarRes, gapRes]) => {
      if (cancelled) return;
      setCompanyIntel({
        sampleSize: radarRes.data.sample_size, radar: radarRes.data.radar,
        criticalGap: gapRes.data.critical_gap, queue: gapRes.data.queue || [],
      });
    }).catch(() => {
      // A real fetch failure must not look identical to "you have no
      // data for this company yet" — that was masking backend errors
      // as empty state. Track it separately so the UI can tell the
      // difference (see the companyIntel render block below).
      if (!cancelled) { setCompanyIntel(null); setIntelError(true); }
    }).finally(() => { if (!cancelled) setIntelLoading(false); });
    return () => { cancelled = true; };
  }, [company]);

  useEffect(() => {
    const auth = authHeaders();
    if (!auth) return;
    let cancelled = false;
    setSessionsError(false);
    axios.get(`${API_URL}/user/sessions`, auth)
      .then(res => {
        if (cancelled) return;
        const matches = (res.data.sessions || [])
          .filter(s => (s.company_target || "").toLowerCase() === company.toLowerCase())
          .slice(0, 3);
        setCompanySessions(matches);
      })
      .catch(() => { if (!cancelled) { setCompanySessions([]); setSessionsError(true); } });
    return () => { cancelled = true; };
  }, [company]);

  useEffect(() => {
    axios.get(`${API_URL}/topics`).then(res => {
      const list = res.data?.topics || res.data;
      if (Array.isArray(list)) setTopicCount(list.length);
    }).catch(() => setTopicCount(null));
  }, []);

  useEffect(() => { setPreviewData(null); setPreviewError(false); }, [company, role, persona]);

  const band = eloBands?.[role];
  let strongest = null, weakest = null;
  if (companyIntel?.radar?.length) {
    strongest = companyIntel.radar.reduce((a, b) => (b.value > a.value ? b : a));
    weakest = companyIntel.radar.reduce((a, b) => (b.value < a.value ? b : a));
  }

  async function handlePreview() {
    const auth = authHeaders();
    if (!auth) { setPreviewError(true); return; }
    setPreviewPulse(true);
    setTimeout(() => setPreviewPulse(false), 300);
    setPreviewLoading(true);
    setPreviewError(false);
    try {
      const res = await axios.post(`${API_URL}/session/preview`,
        { user_name: user?.name || "Candidate", company, role, elo: currentElo, persona }, auth);
      setPreviewData(res.data);
    } catch (err) {
      setPreviewError(true);
    }
    setPreviewLoading(false);
  }

  const handleLaunch = async () => {
    if (isBooting) return;
    const auth = authHeaders();
    if (!auth) { setLaunchError(true); return; }
    setIsBooting(true);
    setLaunchError(false);
    let step = 0;
    setBootStep(0);
    // Advances through the honest "in-flight" steps only — never reaches
    // the final "SESSION READY" step on its own. That step is set
    // exactly once, only after the real request resolves below, so the
    // UI never claims completion before the backend actually responds.
    const interval = setInterval(() => {
      step++;
      if (step < BOOT_SEQUENCE.length - 1) setBootStep(step);
    }, 420);
    try {
      const res = await axios.post(`${API_URL}/session/start`,
        { user_name: user?.name || "Candidate", company, role, elo: currentElo, persona, preview_id: previewData?.preview_id || null },
        auth);
      clearInterval(interval);
      setBootStep(BOOT_SEQUENCE.length - 1);
      setTimeout(() => { if (onStart) onStart({ ...res.data, company, role, persona, elo: currentElo }); }, 400);
    } catch (err) {
      clearInterval(interval);
      setIsBooting(false);
      setLaunchError(true);
    }
  };

  const blurFade = {
    initial: { opacity: 0, filter: 'blur(6px)', y: 6 },
    animate: { opacity: 1, filter: 'blur(0px)', y: 0 },
    exit: { opacity: 0, filter: 'blur(6px)', y: -6 }
  };

  return (
    <div ref={mainRef} className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden flex flex-col relative">

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div style={{ y: orbYA }} animate={{ backgroundColor: activeComp.color, opacity: 0.13 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[160px] mix-blend-screen" />
        <motion.div style={{ y: orbYB }} initial={{ opacity: 0.1 }} animate={{ opacity: 0.1 }}
          className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full blur-[140px] mix-blend-screen bg-indigo-600" />
        <div className="absolute inset-0 opacity-[0.025] mix-blend-soft-light" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      </div>

      <AnimatePresence>
        {isBooting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="w-[90vw] max-w-[500px] bg-[#0A0A0C] border border-white/10 p-6 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] font-mono text-sm">
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <Terminal size={18} className="text-blue-400" />
                <span className="text-white font-bold tracking-tight">LAUNCHING SESSION</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-6">
                <motion.div className="h-full bg-blue-500" initial={{ width: "0%" }}
                  animate={{ width: `${(bootStep / (BOOT_SEQUENCE.length - 1)) * 100}%` }} transition={{ duration: 0.4 }} />
              </div>
              <div className="space-y-3 text-slate-400">
                {BOOT_SEQUENCE.slice(0, bootStep + 1).map((step, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                    {i === BOOT_SEQUENCE.length - 1 ? <span className="text-emerald-400 font-bold">{step}</span> : step}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="relative z-30 h-16 border-b border-white/[0.06] bg-black/40 backdrop-blur-md flex items-center justify-between px-6 lg:px-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onGoBack} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors bg-white/[0.03] border border-white/[0.08] px-3 py-1.5 rounded-full outline-none">
            <ArrowLeft size={14} /> Dashboard
          </button>
          <div className="w-px h-5 bg-white/10 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center font-bold text-black text-[10px] shadow-[0_0_15px_rgba(255,255,255,0.2)]">IC</div>
            <span className="font-semibold text-white tracking-tight text-sm">InterviewCoach</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-mono font-bold tracking-widest ${systemStatus === "ok" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : systemStatus === "degraded" ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-white/[0.03] border-white/10 text-slate-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${systemStatus === "ok" ? "bg-emerald-400 animate-pulse" : systemStatus === "degraded" ? "bg-rose-400" : "bg-slate-500"}`} />
            {systemStatus === "ok" ? "Engine Ready" : systemStatus === "degraded" ? "Engine Degraded" : "Checking..."}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-[10px] font-mono font-bold tracking-widest text-white">
            <Target size={12} className="text-slate-400" /> ELO <RollingNumber value={currentElo} />
          </div>
        </div>
      </header>

      <main className="relative z-20 flex-1 w-full max-w-[1560px] mx-auto px-6 lg:px-10 pt-6 lg:pt-8 pb-40">

        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Session Setup</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">Configure your interview.</h1>
          <p className="text-[13px] text-slate-500">
            Three decisions. Pick and launch. Everything else is the engine's job.
            {topicCount && <span className="text-slate-600"> · {topicCount} topics tracked</span>}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_360px] gap-5 items-start">

          {/* LEFT COLUMN — Company + Persona */}
          <div className="flex flex-col gap-5">

            <DeepGlassCard className="p-6" accent={activeComp.color} delay={0}>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-5 h-5 rounded-full bg-white/[0.08] border border-white/[0.14] flex items-center justify-center text-[9px] font-mono font-bold">1</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Target Company</span>
              </div>
              <LayoutGroup id="company-grid">
                <div className="grid grid-cols-3 gap-2">
                  {COMPANIES.map((c, idx) => (
                    <button key={c.id} onClick={() => setCompany(c.id)}
                      className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-white/[0.06] transition-colors outline-none ${idx === COMPANIES.length - 1 && COMPANIES.length % 3 === 1 ? "col-start-2" : ""}`}>
                      {company === c.id && (
                        <motion.div layoutId="company-active" transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          className="absolute inset-0 rounded-xl bg-white/[0.06] border border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]" />
                      )}
                      <div className={`relative z-10 transition-all ${company === c.id ? "grayscale-0 scale-110" : "grayscale opacity-50"}`}>{c.logo}</div>
                      <span className={`relative z-10 text-[9px] font-bold tracking-widest uppercase ${company === c.id ? "text-white" : "text-slate-500"}`}>{c.name}</span>
                    </button>
                  ))}
                </div>
              </LayoutGroup>
            </DeepGlassCard>

            <DeepGlassCard className="p-6" delay={0.05}>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-5 h-5 rounded-full bg-white/[0.08] border border-white/[0.14] flex items-center justify-center text-[9px] font-mono font-bold">3</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Interviewer Persona</span>
              </div>
              <LayoutGroup id="persona-list">
                <div className="flex flex-col gap-2">
                  {PERSONAS.map((p) => {
                    const isActive = persona === p.id;
                    const Icon = p.icon;
                    return (
                      <button key={p.id} onClick={() => setPersona(p.id)}
                        className="relative p-3 rounded-xl border border-white/[0.05] text-left transition-colors outline-none">
                        {isActive && (
                          <motion.div layoutId="persona-active" transition={{ type: "spring", stiffness: 380, damping: 32 }}
                            className="absolute inset-0 rounded-xl bg-white/[0.04] border border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)]" />
                        )}
                        <div className="relative z-10 flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 ${isActive ? "bg-[#0A0A0C] border-white/20" : "bg-white/5 border-white/10"}`}>
                            <Icon size={14} color={isActive ? p.color : "#94a3b8"} />
                          </div>
                          <div>
                            <span className={`block text-[13px] font-bold ${isActive ? "text-white" : "text-slate-400"}`}>{p.label}</span>
                            <span className="block text-[9.5px] text-slate-500 leading-snug">{p.tagline}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </LayoutGroup>
            </DeepGlassCard>

          </div>

          {/* CENTER COLUMN — Role + full Company Playbook, real data, always visible */}
          <div className="flex flex-col gap-5 min-w-0">

            <DeepGlassCard className="p-6" delay={0.08}>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-5 h-5 rounded-full bg-white/[0.08] border border-white/[0.14] flex items-center justify-center text-[9px] font-mono font-bold">2</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Scope &amp; Bracket</span>
              </div>
              <CinematicSelect value={role} onChange={setRole} options={ROLES} />
            </DeepGlassCard>

            <DeepGlassCard className="p-6 flex-1" accent="#a78bfa" delay={0.12}>
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <Cpu size={16} className="text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Company Playbook</span>
                </div>
                {isFreshlyGenerated && !profileLoading && (
                  <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded flex items-center gap-1">
                    <Zap size={10} /> Freshly Generated
                  </span>
                )}
              </div>

              <AnimatePresence mode="wait">
                {profileLoading ? (
                  <motion.div key="loading" {...blurFade} transition={{ duration: 0.2 }} className="space-y-3">
                    <SkeletonLine className="h-6 w-[70%]" /><SkeletonLine className="h-4 w-[90%]" /><SkeletonLine className="h-4 w-[60%]" />
                  </motion.div>
                ) : profileError ? (
                  <motion.div key="error" {...blurFade} className="flex flex-col items-center text-center gap-2 py-8">
                    <AlertTriangle size={20} className="text-amber-500/70" />
                    <p className="text-sm text-slate-400">Couldn't load the company playbook.</p>
                  </motion.div>
                ) : companyProfile ? (
                  <motion.div key={`profile-${company}`} {...blurFade} transition={{ duration: 0.25 }} className="space-y-6">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Behavioral Framework · {activeComp.name.toUpperCase()}
                      </span>
                      <p className="text-lg lg:text-xl font-bold text-white leading-snug tracking-tight bg-black/30 p-5 rounded-xl border border-white/[0.05]">
                        "{companyProfile.behavioral_framework}"
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <div className="bg-[#0A0A0C] border border-white/10 rounded-lg p-3.5 shadow-inner">
                        <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Interview Style</span>
                        <span className="text-xs font-bold text-white">{companyProfile.question_style}</span>
                      </div>
                      <div className="bg-[#0A0A0C] border border-white/10 rounded-lg p-3.5 shadow-inner">
                        <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Difficulty Bias</span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">{companyProfile.difficulty_bias}×</span>
                      </div>
                      {companyProfile.typical_rounds && (
                        <div className="bg-[#0A0A0C] border border-white/10 rounded-lg p-3.5 shadow-inner">
                          <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Typical Rounds</span>
                          <span className="text-xs font-bold text-white">{companyProfile.typical_rounds}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Company Values</span>
                      <div className="flex flex-wrap gap-1.5">
                        {companyProfile.values?.map((v, i) => (
                          <span key={i} className="text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/[0.08] text-indigo-300 border border-indigo-500/20">{v}</span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06]">
                      <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Focus Areas</span>
                      <p className="text-xs text-slate-400 capitalize">{companyProfile.focus_areas?.split(" ").join(" · ")}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-2">Do This</span>
                        <ul className="space-y-1.5">
                          {companyProfile.green_flags?.map((g, i) => (
                            <li key={i} className="text-[12px] font-medium text-slate-300 flex items-start gap-2"><CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" /><span>{g}</span></li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-rose-400 uppercase tracking-widest mb-2">Avoid This</span>
                        <ul className="space-y-1.5">
                          {companyProfile.red_flags?.map((r, i) => (
                            <li key={i} className="text-[12px] font-medium text-slate-400 flex items-start gap-2"><XCircle size={13} className="text-rose-400 mt-0.5 shrink-0" /><span>{r}</span></li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-600 italic pt-2 border-t border-white/[0.05]">Source: company_dna engine</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </DeepGlassCard>

          </div>

          {/* RIGHT COLUMN — Opening Line preview, Track Record, Readiness */}
          <div className="flex flex-col gap-5">

            <DeepGlassCard className="p-6" accent="#818cf8" delay={0.16}>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 block mb-3">Interviewer Opening Line</span>
              <AnimatePresence mode="wait">
                {!previewData && !previewLoading && !previewError && (
                  <motion.div key="idle" {...blurFade} transition={{ duration: 0.25 }}>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">
                      Generate a real preview — same engine that runs the actual interview. One real generation, on-demand.
                    </p>
                    <motion.button onClick={handlePreview} whileTap={{ scale: 0.97 }}
                      animate={previewPulse ? { scale: [1, 1.03, 1] } : {}} transition={{ duration: 0.3 }}
                      className="w-full flex items-center justify-center gap-2 text-xs font-bold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 rounded-lg py-2.5 transition-colors">
                      <Play size={12} /> Preview Opening Line
                    </motion.button>
                  </motion.div>
                )}
                {previewLoading && (
                  <motion.div key="loading" {...blurFade} transition={{ duration: 0.25 }} className="space-y-2">
                    <SkeletonLine className="h-3.5 w-[90%]" /><SkeletonLine className="h-3.5 w-[75%]" /><SkeletonLine className="h-3.5 w-[82%]" />
                  </motion.div>
                )}
                {previewError && (
                  <motion.div key="error" {...blurFade} transition={{ duration: 0.25 }} className="flex flex-col items-center text-center gap-2 py-3">
                    <AlertTriangle size={18} className="text-amber-500/70" />
                    <p className="text-xs text-slate-400">
                      {authHeaders() ? "Couldn't generate a preview right now." : "Sign in to preview the opening line."}
                    </p>
                    {authHeaders() && (
                      <button onClick={handlePreview} className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                        <RotateCcw size={11} /> Retry
                      </button>
                    )}
                  </motion.div>
                )}
                {previewData && (
                  <motion.div key="filled" {...blurFade} transition={{ duration: 0.25 }}>
                    <p className="text-sm text-slate-200 italic leading-relaxed bg-black/30 p-3.5 rounded-lg border border-white/[0.05]">
                      "{previewData.question}"
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-600">
                        {persona} · {activeComp.name} · {role.split("—")[0].trim()}
                      </span>
                      <button onClick={handlePreview} className="text-[10px] font-semibold text-slate-500 hover:text-white flex items-center gap-1">
                        <RotateCcw size={10} /> Regenerate
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </DeepGlassCard>

            <DeepGlassCard className="p-6" accent="#34d399" delay={0.2}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={13} className="text-slate-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Your Track Record — {activeComp.name}</span>
              </div>
              <AnimatePresence mode="wait">
                {intelLoading ? (
                  <motion.div key="loading" {...blurFade} transition={{ duration: 0.2 }} className="space-y-2">
                    <SkeletonLine className="h-3.5 w-[80%]" /><SkeletonLine className="h-3.5 w-[60%]" />
                  </motion.div>
                ) : intelError ? (
                  // Was previously indistinguishable from "no sessions yet" —
                  // a real backend failure now says so honestly instead of
                  // silently presenting as an empty-but-fine state.
                  <motion.div key="intel-error" {...blurFade} transition={{ duration: 0.2 }} className="flex items-center gap-2 text-xs text-amber-400/80">
                    <AlertTriangle size={13} /> Couldn't load your track record for this company.
                  </motion.div>
                ) : companyIntel?.sampleSize > 0 ? (
                  <motion.div key="loaded" {...blurFade} transition={{ duration: 0.2 }} className="space-y-3">
                    <p className="text-xs text-slate-400">
                      Based on <span className="text-white font-bold">{companyIntel.sampleSize}</span> real scored answer{companyIntel.sampleSize === 1 ? "" : "s"}.
                    </p>
                    {strongest && weakest && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/[0.03] rounded-lg px-2.5 py-2 border border-white/[0.06]">
                          <p className="text-[8.5px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Strongest</p>
                          <p className="text-[11.5px] font-bold text-emerald-400">{strongest.dim}</p>
                        </div>
                        <div className="bg-white/[0.03] rounded-lg px-2.5 py-2 border border-white/[0.06]">
                          <p className="text-[8.5px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Needs Work</p>
                          <p className="text-[11.5px] font-bold text-rose-400">{weakest.dim}</p>
                        </div>
                      </div>
                    )}
                    {companyIntel.criticalGap && (
                      <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-lg px-3 py-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400 mb-1">Recurring Gap</p>
                        <p className="text-xs text-slate-300">{companyIntel.criticalGap.gap.replace(/_/g, " ").toUpperCase()}</p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.p key="empty" {...blurFade} transition={{ duration: 0.2 }} className="text-xs text-slate-500">
                    No scored {activeComp.name} sessions yet — this fills in after your first one.
                  </motion.p>
                )}
              </AnimatePresence>
            </DeepGlassCard>

            {companySessions.length > 0 && (
              <DeepGlassCard className="p-6" delay={0.21}>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 block mb-3">Recent {activeComp.name} Sessions</span>
                <div className="flex flex-col gap-2">
                  {companySessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono">
                        {s.started_at ? new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                      </span>
                      <span className="text-slate-500 capitalize">{s.persona || "—"}</span>
                      <span className="font-bold text-white tabular-nums">{s.score != null ? `${s.score}/100` : "—"}</span>
                    </div>
                  ))}
                </div>
              </DeepGlassCard>
            )}
            {sessionsError && (
              <DeepGlassCard className="p-4" delay={0.21}>
                <div className="flex items-center gap-2 text-xs text-amber-400/80">
                  <AlertTriangle size={13} /> Couldn't load recent sessions for this company.
                </div>
              </DeepGlassCard>
            )}

            {companyIntel?.queue?.length > 0 && (
              <DeepGlassCard className="p-6" accent="#fb923c" delay={0.22}>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 block mb-3">Gap Fix Queue — {activeComp.name}</span>
                <div className="flex flex-col gap-2">
                  {companyIntel.queue.slice(0, 3).map((item, i) => (
                    <div key={item.gap} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-[11.5px] font-bold text-slate-300 capitalize">{item.gap.replace(/_/g, " ")}</span>
                      <span className={`text-[8.5px] font-mono font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${item.urgency === "critical" ? "bg-rose-500/[0.12] text-rose-400 border-rose-500/25" : "bg-amber-500/[0.12] text-amber-400 border-amber-500/25"}`}>
                        {item.urgency}
                      </span>
                    </div>
                  ))}
                </div>
              </DeepGlassCard>
            )}

            <DeepGlassCard className="p-6" delay={0.24}>
              <div className="flex items-center gap-4 mb-1">
                <EloGauge elo={currentElo} />
                <div className="flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Readiness Signal</p>
                  {band ? (
                    <>
                      <p className="text-[13px] font-bold text-slate-300 mb-2">{band.label}: {band.low}–{band.high}</p>
                      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(0, Math.min(100, ((currentElo - band.low) / (band.high - band.low)) * 100))}%` }}
                          transition={{ duration: 1, delay: 0.4 }} />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">No target band for this role yet.</p>
                  )}
                </div>
              </div>
            </DeepGlassCard>

          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.08] bg-[#050508]/90 backdrop-blur-2xl px-6 lg:px-10 py-4">
        <div className="max-w-[1560px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
            <span className="text-slate-600 uppercase tracking-widest text-[9px]">Active</span>
            <span className="text-white font-bold">{activeComp.name}</span><span className="text-slate-600">·</span>
            <span className="text-white font-bold">{role}</span><span className="text-slate-600">·</span>
            <span className="text-white font-bold capitalize">{persona}</span>
          </div>
          <div className="w-full sm:w-72 flex flex-col gap-1.5">
            {launchError && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1.5">
                <AlertTriangle size={11} /> {authHeaders() ? "Couldn't start session — try again." : "Sign in to start a session."}
              </p>
            )}
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleLaunch} disabled={isBooting}
              className="relative overflow-hidden w-full h-12 rounded-xl bg-white text-black text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 group">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative z-10 flex items-center gap-2">Cross Threshold <ArrowRight size={16} /></span>
            </motion.button>
          </div>
        </div>
      </footer>
    </div>
  );
}