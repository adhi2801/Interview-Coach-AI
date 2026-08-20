import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { API_URL } from "../config";
import {
  ArrowLeft, LogOut, User, Activity,
  ShieldAlert, Key, Trash2, Search, Mic,
  Volume2, Settings2, Check, X, AlertTriangle,
  RotateCcw, Pencil, Square
} from "lucide-react";

// Sensible app defaults for any preference key not yet present on the
// user record — NOT what gets sent to the backend, only what's shown
// until the person actually changes something for the first time.
const PREFERENCE_DEFAULTS = {
  sound_effects: false,
  live_coaching_telemetry: true,
  high_contrast_editor: true,
};

const PREFERENCE_ROWS = [
  { key: "sound_effects", label: "Sound Effects", description: "Mechanical UI sounds and alerts during sessions." },
  { key: "live_coaching_telemetry", label: "Live Coaching Telemetry", description: "Show WPM and real-time confidence scores during interview." },
  { key: "high_contrast_editor", label: "High Contrast Editor", description: "Use strict dark mode themes in the coding sandbox." },
];

export default function Settings({ user, onLogout, onGoBack, onProfileUpdate }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  // Real profile summary — name, email, ELO, real session/score
  // aggregates, stored preferences, role-scoped bracket. Fetched once
  // from /user/profile-summary, not assembled from fabricated pieces.
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaveState, setNameSaveState] = useState("idle"); // idle | saving | saved | error

  // Preferences — local optimistic copy layered on top of PREFERENCE_DEFAULTS
  // + whatever the backend actually has stored, with per-row save-state.
  const [prefs, setPrefs] = useState(PREFERENCE_DEFAULTS);
  const [prefSaveState, setPrefSaveState] = useState({}); // key -> 'saving' | 'saved' | 'error'

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Real audio devices — from navigator.mediaDevices, not a hardcoded list.
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  // Real mic test — same AnalyserNode pattern as InterviewRoom's live
  // waveform, not Math.random() bars.
  const [micTesting, setMicTesting] = useState(false);
  const [micError, setMicError] = useState("");
  const [levels, setLevels] = useState(Array(32).fill(2));
  const micStreamRef = useRef(null);
  const micCtxRef = useRef(null);
  const micAnimRef = useRef(null);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem("access_token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : null;
  }, []);

  const fetchProfile = useCallback(() => {
    const auth = authHeaders();
    if (!auth) { setProfileLoading(false); setProfileError(true); return; }
    setProfileLoading(true);
    setProfileError(false);
    axios.get(`${API_URL}/user/profile-summary`, auth)
      .then(res => {
        if (res.data?.error) throw new Error(res.data.error);
        setProfile(res.data);
        setPrefs({ ...PREFERENCE_DEFAULTS, ...(res.data.preferences || {}) });
      })
      .catch(() => setProfileError(true))
      .finally(() => setProfileLoading(false));
  }, [authHeaders]);

  useEffect(() => {
    fetchProfile();
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [fetchProfile]);

  // Real device enumeration — only fetched when the Hardware tab is
  // actually opened, and only after permission (labels are blank
  // without it, which is an honest browser limitation, not a bug).
  useEffect(() => {
    if (activeTab !== "hardware" || devices.length > 0) return;
    setDevicesLoading(true);
    setDevicesError(false);
    navigator.mediaDevices?.enumerateDevices()
      .then((list) => {
        const mics = list.filter((d) => d.kind === "audioinput");
        setDevices(mics);
        if (mics[0]) setSelectedDeviceId(mics[0].deviceId);
        setDevicesLoading(false);
      })
      .catch(() => { setDevicesError(true); setDevicesLoading(false); });
  }, [activeTab, devices.length]);

  useEffect(() => {
    return () => {
      if (micAnimRef.current) cancelAnimationFrame(micAnimRef.current);
      if (micCtxRef.current && micCtxRef.current.state !== "closed") micCtxRef.current.close();
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const initial = profile?.name ? profile.name.charAt(0).toUpperCase() : (user?.name?.charAt(0).toUpperCase() || "U");
  const getGradient = (name) => {
    if (!name) return "linear-gradient(135deg, #3b82f6, #8b5cf6)";
    const colors = [
      "linear-gradient(135deg, #3b82f6, #8b5cf6)",
      "linear-gradient(135deg, #10b981, #3b82f6)",
      "linear-gradient(135deg, #f59e0b, #ef4444)",
      "linear-gradient(135deg, #ec4899, #8b5cf6)"
    ];
    return colors[(name.charCodeAt(0) || 0) % colors.length];
  };

  function startEditingName() {
    setNameDraft(profile?.name || "");
    setEditingName(true);
    setNameSaveState("idle");
  }

  async function saveName() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === profile?.name) { setEditingName(false); return; }
    const auth = authHeaders();
    if (!auth) { setNameSaveState("error"); return; }

    const previous = profile.name;
    setProfile((p) => ({ ...p, name: trimmed })); // optimistic
    setNameSaveState("saving");
    try {
      const res = await axios.patch(`${API_URL}/user/profile`, { name: trimmed }, auth);
      if (res.data?.error) throw new Error(res.data.error);
      setNameSaveState("saved");
      setEditingName(false);
      onProfileUpdate?.({ name: trimmed });
      setTimeout(() => setNameSaveState("idle"), 2000);
    } catch (err) {
      setProfile((p) => ({ ...p, name: previous })); // rollback
      setNameSaveState("error");
      setTimeout(() => setNameSaveState("idle"), 2500);
    }
  }

  async function togglePreference(key) {
    const auth = authHeaders();
    const newValue = !prefs[key];
    const previous = prefs[key];

    setPrefs((p) => ({ ...p, [key]: newValue })); // optimistic
    setPrefSaveState((s) => ({ ...s, [key]: "saving" }));

    if (!auth) {
      setPrefs((p) => ({ ...p, [key]: previous }));
      setPrefSaveState((s) => ({ ...s, [key]: "error" }));
      setTimeout(() => setPrefSaveState((s) => ({ ...s, [key]: null })), 2500);
      return;
    }

    try {
      const res = await axios.patch(`${API_URL}/user/preferences`, { key, value: newValue }, auth);
      if (res.data?.error) throw new Error(res.data.error);
      setPrefSaveState((s) => ({ ...s, [key]: "saved" }));
      setTimeout(() => setPrefSaveState((s) => ({ ...s, [key]: null })), 2000);
    } catch (err) {
      setPrefs((p) => ({ ...p, [key]: previous })); // rollback
      setPrefSaveState((s) => ({ ...s, [key]: "error" }));
      setTimeout(() => setPrefSaveState((s) => ({ ...s, [key]: null })), 2500);
    }
  }

  async function startMicTest() {
    setMicError("");
    try {
      const constraints = selectedDeviceId ? { audio: { deviceId: { exact: selectedDeviceId } } } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      micStreamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      micCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const barCount = 32;

      const render = () => {
        analyser.getByteFrequencyData(dataArray);
        const step = Math.floor(bufferLength / barCount) || 1;
        setLevels(Array.from({ length: barCount }, (_, i) => {
          const v = dataArray[i * step] || 0;
          return Math.max(3, Math.min(32, (v / 255) * 32));
        }));
        micAnimRef.current = requestAnimationFrame(render);
      };
      render();
      setMicTesting(true);
    } catch (err) {
      setMicError("Microphone access denied or unavailable.");
    }
  }

  function stopMicTest() {
    setMicTesting(false);
    if (micAnimRef.current) cancelAnimationFrame(micAnimRef.current);
    if (micCtxRef.current && micCtxRef.current.state !== "closed") micCtxRef.current.close();
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach((t) => t.stop());
    setLevels(Array(32).fill(2));
  }

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
        onLogout();
      }
    } catch (err) {
      setDeleteError("Something went wrong. Please try again.");
      setDeleting(false);
    }
  }

  const noiseSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

  const tabs = [
    { id: "profile", label: "General & Profile", icon: User },
    { id: "telemetry", label: "ELO & Telemetry", icon: Activity },
    { id: "hardware", label: "Audio & Hardware", icon: Mic },
    { id: "danger", label: "Danger Zone", icon: ShieldAlert, danger: true }
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative flex flex-col">

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[150px] mix-blend-screen bg-indigo-900/15" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full blur-[120px] mix-blend-screen bg-blue-900/10" />
      </div>

      <div className="fixed inset-0 z-10 pointer-events-none opacity-[0.03] mix-blend-soft-light" style={{ backgroundImage: noiseSvg }} />

      <header className="sticky top-0 z-50 h-16 border-b border-white/[0.06] bg-[#000000]/60 backdrop-blur-2xl flex items-center justify-between px-6 lg:px-12 flex-shrink-0">
        <button
          onClick={onGoBack}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors bg-white/[0.02] border border-white/[0.06] px-4 py-2 rounded-lg hover:bg-white/[0.05] outline-none"
        >
          <ArrowLeft size={14} /> Dashboard
        </button>

        <div className="hidden sm:flex items-center gap-2 bg-[#08080C] border border-white/[0.08] px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 shadow-inner">
          <Search size={14} /> Search Settings
          <kbd className="ml-2 font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300">⌘K</kbd>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto relative z-20 flex flex-col md:flex-row items-stretch pt-10 pb-20 px-6 gap-8">

        <aside className="w-full md:w-[260px] flex-shrink-0">
          <div className="sticky top-24">
            <h1 className="text-2xl font-extrabold tracking-tight text-white mb-6 pl-2">Settings</h1>
            <nav className="flex flex-col gap-1.5">
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
                        : tab.danger ? "text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/10" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeSettingsTab"
                        className={`absolute inset-0 rounded-xl border ${tab.danger ? 'bg-rose-500/10 border-rose-500/20' : 'bg-white/[0.06] border-white/[0.1] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'}`}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon size={16} className="relative z-10" />
                    <span className="relative z-10">{tab.label}</span>
                    {tab.id === "telemetry" && profile?.elo_rating != null && (
                      <span className="relative z-10 ml-auto text-[10px] font-mono font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/25 px-1.5 py-0.5 rounded-full tabular-nums">
                        {Math.round(profile.elo_rating)}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-8"
            >
              {activeTab === "profile" && (
                <>
                  <GlassCard mousePos={mousePos} className="p-8">
                    {profileLoading ? (
                      <div className="space-y-3">
                        <div className="h-6 w-40 bg-white/[0.06] rounded-md animate-pulse" />
                        <div className="h-4 w-64 bg-white/[0.06] rounded-md animate-pulse" />
                      </div>
                    ) : profileError ? (
                      <div className="flex flex-col items-center text-center gap-2 py-6">
                        <AlertTriangle size={20} className="text-amber-500/70" />
                        <p className="text-sm text-slate-400">Couldn't load your profile.</p>
                        <button onClick={fetchProfile} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                          <RotateCcw size={11} /> Retry
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-6 mb-8 pb-8 border-b border-white/[0.06]">
                        <div
                          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-[0_0_30px_rgba(139,92,246,0.3)] border-2 border-black shrink-0"
                          style={{ background: getGradient(profile?.name) }}
                        >
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            {editingName ? (
                              <>
                                <input
                                  autoFocus
                                  value={nameDraft}
                                  onChange={(e) => setNameDraft(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                                  className="text-2xl font-extrabold tracking-tight text-white bg-white/[0.05] border border-indigo-500/40 rounded-lg px-2 py-1 outline-none min-w-0"
                                />
                                <button onClick={saveName} className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25">
                                  <Check size={14} />
                                </button>
                                <button onClick={() => setEditingName(false)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white">
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <h2 className="text-2xl font-extrabold tracking-tight text-white">{profile?.name || "Candidate"}</h2>
                                <button onClick={startEditingName} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors">
                                  <Pencil size={13} />
                                </button>
                              </>
                            )}
                            <AnimatePresence>
                              {nameSaveState !== "idle" && (
                                <motion.span
                                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                  className={`text-[10px] font-mono font-bold flex items-center gap-1 ${nameSaveState === "error" ? "text-rose-400" : "text-emerald-400"}`}
                                >
                                  {nameSaveState === "saving" && <>Saving…</>}
                                  {nameSaveState === "saved" && <><Check size={10} /> Saved</>}
                                  {nameSaveState === "error" && <><AlertTriangle size={10} /> Failed — reverted</>}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {profile?.bracket ? (
                              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-300 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                                {profile.bracket.label} &middot; {profile.bracket.role}
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 bg-white/[0.03] border border-white/10 px-2.5 py-0.5 rounded-full italic">
                                No bracket yet — complete a session
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-5 pl-5 border-l border-white/[0.07] shrink-0">
                          <div className="text-center">
                            <div className="text-xl font-extrabold text-white font-mono tabular-nums">{Math.round(profile?.elo_rating ?? 1200)}</div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">ELO</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-extrabold text-white font-mono tabular-nums">{profile?.total_sessions ?? 0}</div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Sessions</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-extrabold text-white font-mono tabular-nums">
                              {profile?.avg_score != null ? profile.avg_score.toFixed(1) : "—"}
                            </div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Avg Score</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 font-mono text-xs">
                      <ConfigRow
                        label="EMAIL ADDRESS"
                        value={<span className="flex items-center gap-2">{profile?.email || user?.email || "—"} <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold">VERIFIED</span></span>}
                        managedNote="Not editable — tied to your login"
                      />
                      <ConfigRow
                        label="AUTHENTICATION"
                        value={<span className="flex items-center gap-2 text-slate-400"><Key size={14} /> Password securely hashed</span>}
                        managedNote="Managed — no manual reset needed"
                      />
                    </div>
                  </GlassCard>

                  <GlassCard mousePos={mousePos} className="p-8">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-6 flex items-center gap-2">
                      <Settings2 size={16} className="text-slate-400" /> Interview Preferences
                    </h3>
                    <div className="space-y-2">
                      {PREFERENCE_ROWS.map((row) => (
                        <ToggleRow
                          key={row.key}
                          label={row.label}
                          description={row.description}
                          isOn={!!prefs[row.key]}
                          saveState={prefSaveState[row.key]}
                          onToggle={() => togglePreference(row.key)}
                        />
                      ))}
                    </div>
                  </GlassCard>
                </>
              )}

              {activeTab === "telemetry" && (
                <GlassCard mousePos={mousePos} className="p-8">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-6 flex items-center gap-2 font-mono">
                    <Activity size={16} className="text-emerald-400" /> Real Rating & Session Stats
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-[#050508] border border-white/[0.06] p-6 rounded-2xl shadow-inner">
                      <span className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">Current Rating</span>
                      <span className="text-4xl font-extrabold text-white tabular-nums tracking-tighter font-mono">
                        {Math.round(profile?.elo_rating ?? 1200)}
                      </span>
                    </div>
                    <div className="bg-[#050508] border border-white/[0.06] p-6 rounded-2xl shadow-inner">
                      <span className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">Total Sessions</span>
                      <span className="text-4xl font-extrabold text-white tabular-nums tracking-tighter font-mono">
                        {profile?.total_sessions ?? 0}
                      </span>
                    </div>
                    <div className="bg-[#050508] border border-white/[0.06] p-6 rounded-2xl shadow-inner">
                      <span className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">Average Score</span>
                      <span className="text-4xl font-extrabold text-emerald-400 tabular-nums tracking-tighter font-mono">
                        {profile?.avg_score != null ? profile.avg_score.toFixed(1) : "—"}
                      </span>
                    </div>
                  </div>

                  {profile?.bracket ? (
                    <div className="bg-indigo-500/[0.06] border border-indigo-500/20 p-5 rounded-2xl mb-6">
                      <span className="block text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest mb-2">Current Bracket</span>
                      <p className="text-sm text-slate-200 font-medium">
                        Based on your most recent session (<span className="font-bold text-white">{profile.bracket.role}</span>), you're rated
                        {" "}<span className="font-bold text-white">{profile.bracket.label}</span> ({profile.bracket.low}–{profile.bracket.high}).
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white/[0.03] border border-white/[0.08] p-5 rounded-2xl mb-6">
                      <p className="text-sm text-slate-500">No bracket yet — this appears once you complete a session in a tracked role.</p>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 font-medium leading-relaxed bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl">
                    Your progression data is strictly private and is only used to calibrate the adaptive difficulty of your simulations.
                  </p>
                </GlassCard>
              )}

              {activeTab === "hardware" && (
                <GlassCard mousePos={mousePos} className="p-8">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-6 flex items-center gap-2 font-mono">
                    <Mic size={16} className="text-indigo-400" /> Audio Configuration
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 font-mono">Input Device Selector</label>
                      {devicesLoading ? (
                        <div className="h-11 bg-white/[0.05] rounded-xl animate-pulse" />
                      ) : devicesError ? (
                        <p className="text-xs text-amber-400/80 flex items-center gap-1.5"><AlertTriangle size={12} /> Couldn't list audio devices — check browser permissions.</p>
                      ) : devices.length > 0 ? (
                        <select
                          value={selectedDeviceId}
                          onChange={(e) => setSelectedDeviceId(e.target.value)}
                          className="w-full bg-[#050508] border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus:border-indigo-500 appearance-none shadow-inner cursor-pointer"
                        >
                          {devices.map((d, i) => (
                            <option key={d.deviceId || i} value={d.deviceId}>
                              {d.label || `Microphone ${i + 1} (grant permission to see its name)`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-slate-500">No input devices found, or permission hasn't been granted yet — click "Test Microphone" below to request access.</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 font-mono">
                          <Volume2 size={12} /> Live Input Level
                        </label>
                        <button
                          onClick={micTesting ? stopMicTest : startMicTest}
                          className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                            micTesting ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-white/[0.04] border-white/10 text-slate-300 hover:text-white"
                          }`}
                        >
                          {micTesting ? <><Square size={11} fill="currentColor" /> Stop Test</> : <><Mic size={11} /> Test Microphone</>}
                        </button>
                      </div>
                      {micError && <p className="text-xs text-rose-400 mb-2">{micError}</p>}
                      <div className="flex items-end gap-1 h-12 w-full p-2.5 bg-[#050508] border border-white/10 rounded-xl shadow-inner overflow-hidden">
                        {levels.map((h, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-t-sm transition-[height] duration-75 ${micTesting ? "bg-emerald-400" : "bg-white/10"}`}
                            style={{ height: `${h}px` }}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-600 mt-2">
                        {micTesting ? "Reading your real mic signal — speak to see it move." : "Real signal from your microphone — not simulated. Click Test to start."}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              )}

              {activeTab === "danger" && (
                <GlassCard mousePos={mousePos} className="p-8 border-rose-500/20 bg-rose-950/10">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-6 flex items-center gap-2 font-mono">
                    <ShieldAlert size={16} /> Danger Zone
                  </h3>

                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-rose-500/10 bg-rose-500/5">
                      <div>
                        <p className="text-sm font-bold text-white mb-1">End Current Session</p>
                        <p className="text-xs font-medium text-slate-400">Log out of your account on this device. Your data will remain safe.</p>
                      </div>
                      <button
                        onClick={onLogout}
                        className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm font-bold hover:bg-white/10 active:scale-95 transition-all w-full sm:w-auto outline-none"
                      >
                        <LogOut size={14} /> Log Out
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-rose-500/20 bg-rose-500/[0.03]">
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
                            className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 text-sm font-bold hover:bg-rose-500/10 active:scale-95 transition-all w-full sm:w-auto outline-none"
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
                              className="flex-1 px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/[0.05] transition-all outline-none"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleDeleteAccount}
                              disabled={deleting}
                              className="flex-1 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-500 active:scale-95 transition-all disabled:opacity-50 outline-none"
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
      className={`relative rounded-3xl bg-[#08080C] border border-white/[0.06] overflow-hidden backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),_0_20px_40px_-10px_rgba(0,0,0,0.8)] ${className}`}
    >
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(500px circle at ${cursorX}px ${cursorY}px, rgba(255,255,255,0.04), transparent 40%)`,
          opacity: isHovered ? 1 : 0
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function ConfigRow({ label, value, managedNote }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.02] transition-colors">
      <div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">{label}</p>
        <div className="text-sm font-semibold text-white">{value}</div>
      </div>
      <span className="text-[10px] font-mono text-slate-600 uppercase text-right max-w-[180px]">{managedNote}</span>
    </div>
  );
}

function ToggleRow({ label, description, isOn, onToggle, saveState }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={onToggle}>
      <div className="pr-4">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-bold text-white">{label}</p>
          <AnimatePresence>
            {saveState && (
              <motion.span
                initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`text-[9.5px] font-mono font-bold flex items-center gap-1 ${saveState === "error" ? "text-rose-400" : "text-emerald-400"}`}
              >
                {saveState === "saving" && "Saving…"}
                {saveState === "saved" && <><Check size={9} /> Saved</>}
                {saveState === "error" && <><AlertTriangle size={9} /> Failed — reverted</>}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <p className="text-xs font-medium text-slate-500">{description}</p>
      </div>

      <div className={`relative w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${isOn ? 'bg-indigo-600' : 'bg-white/10'}`}>
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