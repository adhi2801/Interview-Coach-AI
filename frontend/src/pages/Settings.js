import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { API_URL } from "../config";
import { 
  ArrowLeft, LogOut, User, Mail, Activity, 
  ShieldAlert, Key, Trash2, Search, Mic, 
  Volume2, Monitor, Settings2, Edit2, Check, X
} from "lucide-react";

export default function Settings({ user, onLogout, onGoBack }) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  // Danger Zone States
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const firstName = user?.name
    ? user.name.split(" ")[0].charAt(0).toUpperCase() + user.name.split(" ")[0].slice(1)
    : "Guest";

  const getGradient = (name) => {
    if (!name) return "linear-gradient(135deg, #3b82f6, #8b5cf6)";
    const charCode = name.charCodeAt(0) || 0;
    const colors = [
      "linear-gradient(135deg, #3b82f6, #8b5cf6)",
      "linear-gradient(135deg, #10b981, #3b82f6)",
      "linear-gradient(135deg, #f59e0b, #ef4444)",
      "linear-gradient(135deg, #ec4899, #8b5cf6)"
    ];
    return colors[charCode % colors.length];
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.delete(`${API_URL}/user/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.error) {
        setDeleteError(res.data.error);
        setDeleting(false);
      } else {
        // Account and all data are gone server-side — clear local state and log out
        onLogout();
      }
    } catch (err) {
      setDeleteError("Something went wrong. Please try again.");
      setDeleting(false);
    }
  }

  // Dynamic Ambient Lighting based on Active Tab
  const getAmbientColors = () => {
    switch (activeTab) {
      case "profile": return { c1: "bg-indigo-900/20", c2: "bg-blue-900/15" };
      case "telemetry": return { c1: "bg-emerald-900/15", c2: "bg-teal-900/10" };
      case "hardware": return { c1: "bg-violet-900/15", c2: "bg-fuchsia-900/10" };
      case "danger": return { c1: "bg-rose-900/15", c2: "bg-red-900/10" };
      default: return { c1: "bg-indigo-900/15", c2: "bg-blue-900/10" };
    }
  };
  const ambient = getAmbientColors();

  const noiseSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

  const tabs = [
    { id: "profile", label: "General & Profile", icon: User },
    { id: "telemetry", label: "ELO & Telemetry", icon: Activity },
    { id: "hardware", label: "Audio & Hardware", icon: Mic },
    { id: "danger", label: "Danger Zone", icon: ShieldAlert, danger: true }
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative flex flex-col">
      
      {/* Dynamic Ambient Light Engine */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-1000">
        <div className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[150px] mix-blend-screen transition-colors duration-1000 ${ambient.c1}`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full blur-[120px] mix-blend-screen transition-colors duration-1000 ${ambient.c2}`} />
      </div>
      
      {/* Noise Texture */}
      <div 
        className="fixed inset-0 z-10 pointer-events-none opacity-[0.03] mix-blend-soft-light"
        style={{ backgroundImage: noiseSvg }}
      />

      {/* Sticky Header Control Bar */}
      <header className="sticky top-0 z-50 h-14 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-between px-6 flex-shrink-0">
        <button
          onClick={onGoBack}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors bg-white/[0.02] border border-white/[0.05] px-3 py-1.5 rounded-full hover:bg-white/[0.05]"
        >
          <ArrowLeft size={14} /> Dashboard
        </button>

        <div className="hidden sm:flex items-center gap-2 bg-[#0A0A0A] border border-white/[0.08] px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 shadow-inner">
          <Search size={14} /> Search Settings
          <kbd className="ml-2 font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300">⌘K</kbd>
        </div>
      </header>

      {/* Master-Detail Layout */}
      <main className="flex-1 w-full max-w-6xl mx-auto relative z-20 flex flex-col md:flex-row items-stretch pt-8 pb-20 px-6 gap-8">
        
        {/* Left Navigation Rail (280px) */}
        <aside className="w-full md:w-[260px] flex-shrink-0">
          <div className="sticky top-24">
            <h1 className="text-2xl font-bold tracking-tight text-white mb-6 pl-2">Settings</h1>
            <nav className="flex flex-col gap-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id !== "danger") setConfirmingDelete(false);
                    }}
                    className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      isActive 
                        ? tab.danger ? "text-rose-400" : "text-white"
                        : tab.danger ? "text-rose-500/50 hover:text-rose-400 hover:bg-rose-500/5" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className={`absolute inset-0 rounded-xl border ${tab.danger ? 'bg-rose-500/10 border-rose-500/20' : 'bg-white/[0.04] border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'}`}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon size={16} className="relative z-10" />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Right Configuration Canvas */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-8"
            >
              {/* Profile & General */}
              {activeTab === "profile" && (
                <>
                  <GlassCard mousePos={mousePos} className="p-8">
                    <div className="flex items-center gap-6 mb-8 pb-8 border-b border-white/[0.06]">
                      <div className="relative">
                        <div 
                          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-[0_0_30px_rgba(255,255,255,0.1)] border-2 border-black relative z-10"
                          style={{ background: getGradient(user?.name) }}
                        >
                          {initial}
                        </div>
                        {/* Magic UI Border Beam effect */}
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-50 blur-sm animate-[spin_4s_linear_infinite]" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight text-white mb-1">{user?.name || "Candidate"}</h2>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white/[0.03] border border-white/[0.08] px-2.5 py-1 rounded-full">
                            L4 Senior Bracket
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <ConfigRow 
                        label="Legal Name" 
                        value={user?.name || "—"} 
                        editable 
                      />
                      <ConfigRow 
                        label="Email Address" 
                        value={<span className="flex items-center gap-2">{user?.email || "—"} <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold">Verified</span></span>} 
                        editable 
                      />
                      <ConfigRow 
                        label="Authentication" 
                        value={<span className="flex items-center gap-2 text-slate-400"><Key size={14} /> Password securely hashed</span>} 
                        actionLabel="Update" 
                      />
                    </div>
                  </GlassCard>

                  <GlassCard mousePos={mousePos} className="p-8">
                    <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                      <Settings2 size={16} className="text-slate-400" /> Interview Preferences
                    </h3>
                    <div className="space-y-1">
                      <ToggleRow label="Sound Effects" description="Mechanical UI sounds and alerts." defaultOn={false} />
                      <ToggleRow label="Live Coaching Telemetry" description="Show WPM and real-time confidence scores during interview." defaultOn={true} />
                      <ToggleRow label="High Contrast Editor" description="Use strict dark mode themes in the coding sandbox." defaultOn={true} />
                    </div>
                  </GlassCard>
                </>
              )}

              {}
              {/* ELO & Telemetry */}
              {activeTab === "telemetry" && (
                <GlassCard mousePos={mousePos} className="p-8">
                  <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                    <Activity size={16} className="text-emerald-400" /> Active System Telemetry
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="bg-[#050505] border border-white/[0.04] p-5 rounded-xl">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Current Rating</span>
                      <span className="text-4xl font-extrabold text-white tabular-nums tracking-tighter">
                        {Math.round(user?.elo_rating || 1200)}
                      </span>
                    </div>
                    <div className="bg-[#050505] border border-white/[0.04] p-5 rounded-xl">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Global Percentile</span>
                      <span className="text-4xl font-extrabold text-emerald-400 tabular-nums tracking-tighter">
                        Top 15%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed bg-blue-500/5 border border-blue-500/10 p-4 rounded-lg">
                    Your progression data is strictly private and is only used to calibrate the adaptive difficulty of your simulations.
                  </p>
                </GlassCard>
              )}

              {/* Audio & Hardware */}
              {activeTab === "hardware" && (
                <GlassCard mousePos={mousePos} className="p-8">
                  <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                    <Mic size={16} className="text-violet-400" /> Audio Configuration
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Input Device</label>
                      <select className="w-full bg-[#050505] border border-white/10 rounded-lg px-4 py-3 text-sm text-white font-medium outline-none focus:border-indigo-500 appearance-none shadow-inner">
                        <option>Default - MacBook Pro Microphone</option>
                        <option>External USB Audio Interface</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3 flex items-center gap-2">
                        <Volume2 size={12} /> Live Input Level
                      </label>
                      {/* Fake Hardware Audio Meter */}
                      <div className="flex items-end gap-1 h-8 w-full p-2 bg-[#050505] border border-white/10 rounded-lg shadow-inner overflow-hidden">
                        {Array.from({ length: 30 }).map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: [4, Math.random() * 20 + 4, 4] }}
                            transition={{ duration: 0.5 + Math.random(), repeat: Infinity, repeatType: "reverse" }}
                            className="w-2 rounded-t-sm bg-emerald-500/80"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              )}

              {}
              {/* Danger Zone */}
              {activeTab === "danger" && (
                <GlassCard mousePos={mousePos} className="p-8 border-rose-500/20 bg-rose-950/5">
                  <h3 className="text-sm font-bold text-rose-400 mb-6 flex items-center gap-2">
                    <ShieldAlert size={16} /> Danger Zone
                  </h3>
                  
                  <div className="space-y-6">
                    {/* Log Out Row */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border border-rose-500/10 bg-rose-500/5">
                      <div>
                        <p className="text-sm font-bold text-white mb-1">End Current Session</p>
                        <p className="text-xs font-medium text-slate-400">Log out of your account on this device. Your data will remain safe.</p>
                      </div>
                      <button
                        onClick={onLogout}
                        className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm font-bold hover:bg-white/10 active:scale-95 transition-all w-full sm:w-auto"
                      >
                        <LogOut size={14} /> Log Out
                      </button>
                    </div>

                    {/* Delete Account Flow */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border border-rose-500/20 bg-rose-500/[0.02]">
                      {!confirmingDelete ? (
                        <>
                          <div>
                            <p className="text-sm font-bold text-rose-400 mb-1">Delete Account</p>
                            <p className="text-xs font-medium text-rose-200/50">
                              Permanently deletes your account, interview transcripts, and ELO history. Cannot be undone.
                            </p>
                          </div>
                          <button
                            onClick={() => setConfirmingDelete(true)}
                            className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-rose-500/30 text-rose-400 text-sm font-bold hover:bg-rose-500/10 active:scale-95 transition-all w-full sm:w-auto"
                          >
                            <Trash2 size={14} /> Delete Account
                          </button>
                        </>
                      ) : (
                        <div className="w-full">
                          <p className="text-sm font-bold text-rose-400 mb-1">Are you sure?</p>
                          <p className="text-xs font-medium text-rose-200/50 mb-4">
                            This permanently deletes your account and all associated data. There is no undo.
                          </p>
                          {deleteError && (
                            <p className="text-xs font-bold text-rose-400 mb-4 bg-rose-500/10 p-2 rounded">{deleteError}</p>
                          )}
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={() => setConfirmingDelete(false)}
                              disabled={deleting}
                              className="flex-1 px-5 py-2.5 rounded-lg border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/[0.05] transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleDeleteAccount}
                              disabled={deleting}
                              className="flex-1 px-5 py-2.5 rounded-lg bg-rose-600 text-white text-sm font-bold hover:bg-rose-500 active:scale-95 transition-all disabled:opacity-50"
                            >
                              {deleting ? "Deleting..." : "Yes, delete everything"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Reusable Sub-Components

function GlassCard({ children, className = "", mousePos }) {
  const [rect, setRect] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) setRect(cardRef.current.getBoundingClientRect());
  }, []);

  const isHovered = rect && mousePos.x >= rect.left && mousePos.x <= rect.right && mousePos.y >= rect.top && mousePos.y <= rect.bottom;
  const cursorX = rect ? mousePos.x - rect.left : 0;
  const cursorY = rect ? mousePos.y - rect.top : 0;

  return (
    <div 
      ref={cardRef}
      className={`relative rounded-2xl bg-[#080808]/80 border border-white/[0.06] overflow-hidden backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.8)] ${className}`}
    >
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(500px circle at ${cursorX}px ${cursorY}px, rgba(255,255,255,0.03), transparent 40%)`,
          opacity: isHovered ? 1 : 0
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function ConfigRow({ label, value, editable, actionLabel = "Edit" }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl hover:bg-white/[0.02] transition-colors group">
      <div className="mb-2 sm:mb-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{label}</p>
        {!isEditing ? (
          <div className="text-sm font-semibold text-white">{value}</div>
        ) : (
          <input 
            autoFocus
            type="text" 
            defaultValue={typeof value === 'string' ? value : ''} 
            className="bg-[#050505] border border-indigo-500/50 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-64 shadow-inner" 
          />
        )}
      </div>
      
      {editable && !isEditing ? (
        <button 
          onClick={() => setIsEditing(true)}
          className="text-xs font-semibold text-slate-500 hover:text-white transition-colors bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          {actionLabel}
        </button>
      ) : editable && isEditing ? (
        <div className="flex items-center gap-2">
           <button onClick={() => setIsEditing(false)} className="p-1.5 rounded bg-white/10 text-white hover:bg-white/20"><Check size={14}/></button>
           <button onClick={() => setIsEditing(false)} className="p-1.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"><X size={14}/></button>
        </div>
      ) : (
        <button className="text-xs font-semibold text-slate-600 cursor-not-allowed hidden sm:block">
          Managed
        </button>
      )}
    </div>
  );
}

function ToggleRow({ label, description, defaultOn }) {
  const [isOn, setIsOn] = useState(defaultOn);
  
  return (
    <div className="flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setIsOn(!isOn)}>
      <div className="pr-4">
        <p className="text-sm font-bold text-white mb-1">{label}</p>
        <p className="text-xs font-medium text-slate-500">{description}</p>
      </div>
      
      {/* iOS Style Spring Toggle */}
      <div className={`relative w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${isOn ? 'bg-indigo-600' : 'bg-slate-700'}`}>
        <motion.div 
          layout
          initial={false}
          className="w-4 h-4 bg-white rounded-full shadow-sm"
          animate={{ x: isOn ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </div>
  );
}