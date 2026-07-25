import React, { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import axios from "axios";
import { API_URL } from "../config";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { 
  Search, LogOut, LayoutGrid, History, Settings, Target, 
  ChevronRight, Activity, Zap, Code2, Play, Cpu, Wifi, GitBranch,
  PanelLeftClose, PanelLeftOpen, ArrowRight
} from "lucide-react";

/**
 * Tabular Slot Number
 * Rolls up smoothly, restricted strictly to tabular-nums so it doesn't jitter.
 */
function SlotNumber({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value]);

  return <span className="font-mono tabular-nums tracking-tight">{display}</span>;
}

export default function UserDashboard({ user, onStartNew, onLogout, onNavigateHistory, onStartCoding, onNavigateSettings, onNavigateStudyPlan }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  // Global Keyboard Listener: Press 'Enter' to launch practice session
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        onStartNew();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartNew]);

  async function fetchSessions() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`${API_URL}/user/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const meaningfulSessions = sessions.filter((s) => (s.question_count || 0) > 0);
  const eloHistory = meaningfulSessions.map((s, i) => ({
    session: `Node ${i + 1}`,
    elo: Math.round(s.elo_after || user?.elo_rating || 1200),
    date: new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }));

  const companyCounts = {};
  meaningfulSessions.forEach((s) => {
    const c = s.company_target || "unknown";
    companyCounts[c] = (companyCounts[c] || 0) + 1;
  });
  const sortedCompanies = Object.entries(companyCounts).sort((a, b) => a[1] - b[1]);
  const leastPracticed = sortedCompanies.length > 0 ? sortedCompanies[0] : ["Google", 0];

  // Motion Presets
  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } }
  };
  
  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 28 } }
  };

  const firstName = user?.name ? user.name.split(" ")[0].charAt(0).toUpperCase() + user.name.split(" ")[0].slice(1) : "Candidate";
  const userInitials = user?.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "IC";
  const currentElo = Math.round(user?.elo_rating || 1200);
  const targetElo = 1400; // Benchmark target for typical L4

  const recentSessions = eloHistory.slice(-7);
  const eloDelta = recentSessions.length > 1 
    ? recentSessions[recentSessions.length - 1].elo - recentSessions[0].elo 
    : 0;

  // Ghost telemetry mock curve
  const mockGhostData = [
    { session: "N1", elo: 1200 }, { session: "N2", elo: 1220 },
    { session: "N3", elo: 1210 }, { session: "N4", elo: 1245 },
    { session: "N5", elo: 1270 }
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden flex">
      
      {/* AMBIENT LIGHTS & GRAIN */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#000000]">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-600/10 blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-emerald-500/10 blur-[150px] mix-blend-screen" />
        <div 
          className="absolute inset-0 opacity-[0.035] mix-blend-soft-light"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
        />
      </div>

      {/* ========================================================================= */}
      {/* LEFT-RAIL SIDEBAR (SLIDING SPRING ANIMATION & DEEP GLASS)                  */}
      {/* ========================================================================= */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: sidebarOpen ? 260 : 0,
          opacity: sidebarOpen ? 1 : 0,
          x: sidebarOpen ? 0 : -20
        }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="flex-shrink-0 border-r border-white/[0.08] bg-[#050507]/90 backdrop-blur-2xl flex-col justify-between hidden lg:flex relative z-30 shadow-[4px_0_30px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        <div className="flex flex-col h-full justify-between w-[260px]">
          
          {/* Top Brand & Core Nav */}
          <div>
            <div className="h-20 flex items-center px-6 border-b border-white/[0.06] justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center font-bold text-black text-xs shadow-[0_0_20px_rgba(255,255,255,0.4)] flex-shrink-0">
                  IC
                </div>
                <div>
                  <span className="font-bold text-white tracking-tight text-sm block leading-none">InterviewCoach</span>
                  <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-widest block mt-1">Autonomous Engine</span>
                </div>
              </div>

              {/* Collapse Button inside Sidebar Header */}
              <button 
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors outline-none"
                title="Collapse Sidebar"
              >
                <PanelLeftClose size={18} />
              </button>
            </div>

            <nav className="p-4 space-y-1.5">
              <SidebarItem 
                icon={LayoutGrid} 
                label="Dashboard" 
                active 
              />
              <SidebarItem 
                icon={History} 
                label="Session Ledger" 
                onClick={onNavigateHistory} 
                badge={meaningfulSessions.length > 0 ? `${meaningfulSessions.length}` : null}
              />
              <SidebarItem 
                icon={Target} 
                label="Study Plan" 
                onClick={onNavigateStudyPlan}
                badge="93 NODES"
                badgeColor="text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
              />
              <SidebarItem 
                icon={Code2} 
                label="Coding Sandbox" 
                onClick={onStartCoding}
                badge="IDE"
                badgeColor="text-amber-400 bg-amber-500/10 border-amber-500/20"
              />
            </nav>
          </div>

          {/* Middle: Live System Telemetry HUD */}
          <div className="px-4 py-3">
            <div className="bg-black/60 border border-white/[0.06] rounded-2xl p-4 shadow-inner relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl pointer-events-none rounded-full" />
              
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">Engine Online</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500 font-bold">v2.4</span>
              </div>

              <div className="space-y-2 font-mono text-[11px]">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5 text-slate-500"><Cpu size={12}/> Model</span>
                  <span className="text-slate-200 font-bold">Claude 3.5</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5 text-slate-500"><Wifi size={12}/> Latency</span>
                  <span className="text-emerald-400 font-bold tabular-nums">16ms</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5 text-slate-500"><GitBranch size={12}/> Graph</span>
                  <span className="text-indigo-400 font-bold tabular-nums">93 Nodes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Account & System Controls */}
          <div className="p-4 border-t border-white/[0.06] space-y-2">
            <div className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.02] border border-white/[0.05] rounded-xl mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-inner flex-shrink-0">
                {userInitials}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-bold text-white truncate leading-tight">{user?.name || "Candidate"}</p>
                <p className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider truncate mt-0.5">L4 Senior Bracket</p>
              </div>
            </div>

            <SidebarItem icon={Settings} label="Settings" onClick={onNavigateSettings} />
            <SidebarItem icon={LogOut} label="Log Out" onClick={onLogout} danger />
          </div>

        </div>
      </motion.aside>

      {/* MAIN CONTENT CANVAS */}
      <main className="flex-1 w-full h-screen overflow-y-auto relative z-20 scrollbar-hide">
        {/* Floating Sidebar Expand Trigger (Positioned top-left independent of headline) */}
        <AnimatePresence>
          {!sidebarOpen && (
            <motion.button 
              initial={{ scale: 0.8, opacity: 0, x: -20 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0.8, opacity: 0, x: -20 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarOpen(true)}
              className="fixed top-6 left-6 z-40 hidden lg:flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#08080C]/90 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 backdrop-blur-xl transition-all shadow-[0_10px_25px_rgba(0,0,0,0.5)] outline-none group"
              title="Expand Sidebar"
            >
              <PanelLeftOpen size={18} className="text-blue-400 group-hover:text-white transition-colors" />
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 group-hover:text-white">Menu</span>
            </motion.button>
          )}
        </AnimatePresence>

        <div className="max-w-[1440px] mx-auto pt-12 lg:pt-16 pb-32 px-6 lg:px-12">
          
          <motion.div variants={containerVars} initial="hidden" animate="show" className="space-y-6">
            
            {/* TIER 1: COMMAND HEADER & PRIMARY DIRECTIVE */}
            <motion.header variants={itemVars} className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8 relative z-20">
              <div className="max-w-2xl">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2 leading-[1.1] drop-shadow-md">
                  Good {timeOfDay()}, {firstName}.
                </h1>
                <p className="text-sm text-slate-300 font-medium leading-relaxed">
                  Targeting <span className="text-white font-bold capitalize">{leastPracticed[0]} L4</span> — Next recommended focus: System Architecture & Distributed Caching.
                </p>
              </div>
              
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="hidden md:flex items-center gap-2 px-4 py-3 rounded-xl border border-white/[0.08] bg-[#08080C] text-xs font-semibold text-slate-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] cursor-text">
                  <Search size={16} className="text-slate-400" /> Command Palette
                  <kbd className="ml-3 font-mono text-[10px] bg-white/10 border border-white/10 px-2 py-0.5 rounded text-slate-300">⌘K</kbd>
                </div>
                
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }} onClick={onStartNew}
                  className="relative group overflow-hidden bg-white text-black px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-[0_20px_50px_-10px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3 w-full lg:w-auto flex-shrink-0"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  <Activity size={16} className="relative z-10 text-blue-600" /> 
                  <span className="relative z-10">Launch Practice Session</span>
                  <kbd className="hidden sm:inline-flex relative z-10 font-mono text-[10px] bg-black/10 border border-black/10 px-1.5 py-0.5 rounded text-black/70 shadow-sm">↵ Enter</kbd>
                </motion.button>
              </div>
            </motion.header>

            {/* TIER 2: BI-DIRECTIONAL TELEMETRY & TARGET DNA */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative z-10">
              
              {/* LEFT (8 Cols): Live ELO Velocity Chart */}
              <motion.div variants={itemVars} className="xl:col-span-8 flex flex-col min-h-[420px]">
                <GlassCard className="p-6 md:p-8 h-full flex flex-col group">
                  
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-6 relative z-10">
                    <div className="flex-1 min-w-[200px]">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300 mb-2 flex items-center gap-2">
                        <Activity size={14} className="text-blue-500"/> Live ELO Velocity
                      </span>
                      <div className="flex items-end gap-3 flex-wrap">
                        <span className="text-4xl md:text-5xl font-extrabold font-mono tabular-nums text-white drop-shadow-md">
                          <SlotNumber value={currentElo} />
                        </span>
                        {eloDelta !== 0 && (
                          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border mb-1 ${eloDelta > 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}>
                            <span className="text-xs font-bold font-mono tabular-nums">
                              {eloDelta > 0 ? "+" : ""}{eloDelta}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Past 7 Days</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 bg-[#050507]/80 border border-white/[0.08] px-5 py-3.5 rounded-xl shadow-inner flex-shrink-0 min-w-max">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Sessions</span>
                        <span className="text-xl font-bold font-mono tabular-nums text-white"><SlotNumber value={meaningfulSessions.length} /></span>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Streak</span>
                        <span className="text-xl font-bold font-mono tabular-nums text-white">
                          <SlotNumber value={meaningfulSessions.length > 0 ? Math.min(meaningfulSessions.length, 7) : 0} /> 
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-1">Days</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clean Ghost State */}
                  <div className="flex-1 w-full relative z-10 -ml-2 -mb-2">
                    {meaningfulSessions.length === 0 ? (
                      <div className="w-full h-full relative min-h-[220px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%" className="opacity-15 pointer-events-none">
                          <AreaChart data={mockGhostData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="ghostElo" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4}/>
                                <stop offset="100%" stopColor="#818cf8" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <YAxis domain={['dataMin - 50', 'dataMax + 50']} hide />
                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,0.06)" />
                            <Area type="monotone" dataKey="elo" stroke="#818cf8" strokeDasharray="4 4" strokeWidth={2} fill="url(#ghostElo)" />
                          </AreaChart>
                        </ResponsiveContainer>
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
                          <div className="bg-[#0A0A0E] border border-indigo-500/30 text-indigo-300 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_0_25px_rgba(99,102,241,0.2)] mb-3 flex items-center gap-2">
                            <Activity size={14} className="text-indigo-400 animate-pulse" /> Awaiting Telemetry Data
                          </div>
                          <p className="text-xs font-medium text-slate-400 text-center px-4">Complete 1 practice simulation to calibrate live velocity.</p>
                        </div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={eloHistory} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorElo" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <YAxis domain={['dataMin - 50', 'dataMax + 50']} hide />
                          <XAxis dataKey="session" hide />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                          <ReferenceLine y={targetElo} stroke="rgba(245,158,11,0.4)" strokeDasharray="4 4" label={{ position: 'insideTopRight', value: 'L4 Benchmark', fill: 'rgba(245,158,11,0.8)', fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#08080C", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", boxShadow: "0 20px 40px rgba(0,0,0,0.8)" }}
                            labelStyle={{ color: "#CBD5E1", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 700 }}
                            itemStyle={{ color: "#fff", fontWeight: "bold", fontSize: "16px", fontFamily: "monospace" }}
                            cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1, strokeDasharray: '4 4' }}
                            formatter={(value, name, props) => [`${value} ELO`, props.payload.date]}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="elo" 
                            stroke="#3b82f6" 
                            strokeWidth={3} 
                            fill="url(#colorElo)"
                            activeDot={{ r: 6, fill: "#fff", stroke: "#3b82f6", strokeWidth: 3, style: { filter: "drop-shadow(0 0 12px rgba(59,130,246,0.8))" } }}
                            animationDuration={1500} 
                            animationEasing="ease-out"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </GlassCard>
              </motion.div>

              {/* RIGHT (4 Cols): Target Company DNA Vector */}
              <motion.div variants={itemVars} className="xl:col-span-4 flex flex-col min-h-[420px]">
                <GlassCard className="p-6 md:p-8 h-full flex flex-col justify-between group relative overflow-hidden">
                  <div className="absolute inset-0 bg-blue-500/[0.02] blur-[80px] pointer-events-none group-hover:bg-blue-500/[0.06] transition-colors duration-700" />
                  
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 mb-6 flex items-center gap-2 relative z-10">
                      <Target size={14} className="text-blue-500"/> Target Company DNA
                    </span>
                    
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-black font-extrabold text-2xl shadow-[0_0_30px_rgba(255,255,255,0.15)] flex-shrink-0">
                        {leastPracticed ? leastPracticed[0].charAt(0).toUpperCase() : "G"}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white capitalize leading-tight">{leastPracticed ? leastPracticed[0] : "Google"}</h3>
                        <p className="text-xs text-blue-400 font-bold tracking-wide mt-1">L4 Software Engineer</p>
                      </div>
                    </div>

                    <div className="space-y-5 relative z-10">
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Algorithms & Scale</span>
                          <span className="text-xs font-mono font-bold text-white tabular-nums">65%</span>
                        </div>
                        <div className="h-2 bg-[#050507] shadow-inner rounded-full overflow-hidden border border-white/[0.05]">
                          <motion.div initial={{ width: 0 }} animate={{ width: "65%" }} transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.2 }} className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] rounded-full"/>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">System Architecture</span>
                          <span className="text-xs font-mono font-bold text-white tabular-nums">48%</span>
                        </div>
                        <div className="h-2 bg-[#050507] shadow-inner rounded-full overflow-hidden border border-white/[0.05]">
                          <motion.div initial={{ width: 0 }} animate={{ width: "48%" }} transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.4 }} className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)] rounded-full"/>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Execution Trigger */}
                  <motion.button 
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onStartNew}
                    className="w-full bg-white/[0.04] border border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.08] text-white px-5 py-3.5 rounded-xl text-xs font-bold transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),_0_10px_20px_rgba(0,0,0,0.5)] flex items-center justify-between group/btn mt-6 relative z-10 outline-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <Zap size={15} className="text-amber-500" /> Fix Systems Gap
                    </span>
                    <ChevronRight size={16} className="text-slate-400 group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all"/>
                  </motion.button>
                </GlassCard>
              </motion.div>

            </div>

            {/* TIER 3: SESSION LEDGER & HISTORICAL PROOF */}
            <motion.div variants={itemVars} className="relative z-10">
              <GlassCard className="p-0 overflow-hidden flex flex-col">
                <div className="p-6 lg:p-8 border-b border-white/[0.06] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#050507]/40">
                  <div className="flex items-center gap-3">
                    <History size={16} className="text-blue-500" />
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">Session Ledger</h2>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <motion.button 
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onStartCoding}
                      className="w-full sm:w-auto bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-slate-300 px-5 py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 outline-none"
                    >
                      <Code2 size={14} className="text-indigo-400" /> Coding Sandbox
                    </motion.button>
                  </div>
                </div>

                {loading ? (
                  <div className="p-8 space-y-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex justify-between items-center bg-white/[0.02] p-4 rounded-xl">
                        <div className="h-5 w-48 bg-white/5 rounded-md animate-pulse" />
                        <div className="h-5 w-24 bg-white/5 rounded-md animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : meaningfulSessions.length === 0 ? (
                  /* Ghost Table Structural Empty State (Linear/Stripe standard) */
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead className="bg-[#050507]/60">
                        <tr>
                          <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-white/[0.06]">Target</th>
                          <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-white/[0.06]">Date</th>
                          <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-white/[0.06]">Nodes</th>
                          <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-white/[0.06]">Result</th>
                          <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-white/[0.06] text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03] opacity-40">
                        <tr className="pointer-events-none">
                          <td className="px-8 py-4"><span className="text-xs font-bold text-slate-400">Google L4 (Sample)</span></td>
                          <td className="px-8 py-4"><span className="text-xs font-mono text-slate-500">Today</span></td>
                          <td className="px-8 py-4"><span className="text-xs font-mono text-slate-500">4 Qs</span></td>
                          <td className="px-8 py-4"><span className="text-xs font-mono text-emerald-400">1224 ELO (+24)</span></td>
                          <td className="px-8 py-4 text-right"><span className="text-xs font-bold uppercase text-slate-500">Replay →</span></td>
                        </tr>
                        <tr className="pointer-events-none">
                          <td className="px-8 py-4"><span className="text-xs font-bold text-slate-400">Meta L5 (Sample)</span></td>
                          <td className="px-8 py-4"><span className="text-xs font-mono text-slate-500">Yesterday</span></td>
                          <td className="px-8 py-4"><span className="text-xs font-mono text-slate-500">3 Qs</span></td>
                          <td className="px-8 py-4"><span className="text-xs font-mono text-slate-400">1200 ELO</span></td>
                          <td className="px-8 py-4 text-right"><span className="text-xs font-bold uppercase text-slate-500">Replay →</span></td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <div className="p-10 flex flex-col items-center justify-center border-t border-white/[0.04] bg-[#050507]/60 text-center">
                      <p className="text-xs font-semibold text-slate-400 mb-4">No completed sessions logged yet. Initialize your first simulation to begin recording telemetry history.</p>
                      <motion.button 
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onStartNew}
                        className="bg-white text-black px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md outline-none"
                      >
                        <Play size={14} className="text-blue-600 fill-current" /> Start First Session
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead className="bg-[#050507]/60">
                        <tr>
                          <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-white/[0.06]">Target</th>
                          <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-white/[0.06]">Date</th>
                          <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-white/[0.06]">Nodes</th>
                          <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-white/[0.06]">Result</th>
                          <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-white/[0.06] text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {meaningfulSessions.slice(0, 10).map((session, i) => {
                          const finalElo = Math.round(session.elo_after || 1200);
                          const isHigh = finalElo >= targetElo;
                          const isLow = finalElo < 1100;
                          
                          return (
                            <tr key={i} onClick={onNavigateHistory} className="hover:bg-white/[0.03] transition-colors group cursor-pointer">
                              <td className="px-8 py-5 whitespace-nowrap">
                                <div className="flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white text-xs shadow-inner">
                                    {(session.company_target || "U").charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-white capitalize tracking-tight mb-0.5">{session.company_target || "Unknown"}</div>
                                    <div className="text-[11px] text-slate-400 font-bold">{session.role || "Software Engineer"}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5 whitespace-nowrap">
                                <span className="text-xs font-mono font-medium text-slate-400 tabular-nums">
                                  {new Date(session.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              </td>
                              <td className="px-8 py-5 whitespace-nowrap">
                                <span className="text-[11px] font-mono font-bold text-slate-300 bg-white/[0.04] px-3 py-1.5 rounded-md border border-white/[0.06] tabular-nums">
                                  {session.question_count} Qs
                                </span>
                              </td>
                              <td className="px-8 py-5 whitespace-nowrap">
                                <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-md border tabular-nums ${isHigh ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : isLow ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-white/5 text-slate-300 border-white/10'}`}>
                                  {finalElo} ELO
                                </span>
                              </td>
                              <td className="px-8 py-5 whitespace-nowrap text-right relative">
                                <div className="inline-flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">
                                  Replay <ChevronRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            </motion.div>

          </motion.div>
        </div>
      </main>

      {/* MOBILE BOTTOM DOCK (Fallback for < 1024px Viewports) */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#050507]/90 border border-white/[0.08] backdrop-blur-2xl p-2 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8),_inset_0_1px_0_0_rgba(255,255,255,0.12)] flex items-center gap-1 lg:hidden">
        <MobileDockItem icon={LayoutGrid} active />
        <MobileDockItem icon={History} onClick={onNavigateHistory} />
        <MobileDockItem icon={Target} onClick={onNavigateStudyPlan} />
        <MobileDockItem icon={Settings} onClick={onNavigateSettings} />
        <div className="w-px h-6 bg-white/10 mx-1" />
        <MobileDockItem icon={LogOut} onClick={onLogout} danger />
      </nav>

    </div>
  );
}

// Subcomponents

function SidebarItem({ icon: Icon, label, active, onClick, danger, badge, badgeColor }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500 relative ${
        active 
          ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),_0_10px_20px_rgba(0,0,0,0.5)] border border-white/10" 
          : danger 
          ? "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" 
          : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={16} className={active ? "text-white" : danger ? "" : "text-slate-400"} />
        <span>{label}</span>
      </div>
      
      {badge && (
        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${
          badgeColor || "text-slate-300 bg-white/10 border-white/10"
        }`}>
          {badge}
        </span>
      )}

      {active && (
        <motion.div 
          layoutId="activeSidebarIndicator"
          className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
    </button>
  );
}

function MobileDockItem({ icon: Icon, active, onClick, danger }) {
  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-xl transition-all outline-none ${
        active ? "bg-white/[0.08] text-white" : 
        danger ? "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      <Icon size={20} />
    </button>
  );
}

function GlassCard({ children, className = "" }) {
  return (
    <div 
      className={`bg-[#08080C] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),_0_20px_50px_-10px_rgba(0,0,0,0.8)] rounded-3xl backdrop-blur-2xl ${className}`}
    >
      {children}
    </div>
  );
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}