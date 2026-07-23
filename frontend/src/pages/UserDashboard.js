import React, { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import axios from "axios";
import { API_URL } from "../config";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { Search, LogOut, LayoutGrid, History, Settings, Target, ChevronRight, Activity, Zap, ArrowRight, Code2, Terminal } from "lucide-react";

/**
 * Tabular Slot Number (Rule 3: Typographic Systems)
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

export default function UserDashboard({ user, onStartNew, onLogout, onNavigateHistory, onStartCoding, onNavigateSettings }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoverElo, setHoverElo] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

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
    elo: Math.round(s.elo_after || user.elo_rating),
    date: new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }));

  const companyCounts = {};
  meaningfulSessions.forEach((s) => {
    const c = s.company_target || "unknown";
    companyCounts[c] = (companyCounts[c] || 0) + 1;
  });
  const leastPracticed = Object.entries(companyCounts).sort((a, b) => a[1] - b[1])[0];

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const firstName = user?.name ? user.name.split(" ")[0].charAt(0).toUpperCase() + user.name.split(" ")[0].slice(1) : "Guest";
  const currentElo = Math.round(user?.elo_rating || 1200);
  const targetElo = 1400; // Benchmark target for typical L4

  // Calculate ELO Delta past 7 sessions
  const recentSessions = eloHistory.slice(-7);
  const eloDelta = recentSessions.length > 1 
    ? recentSessions[recentSessions.length - 1].elo - recentSessions[0].elo 
    : 0;

  return (
    <div className="relative min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden flex flex-col items-center">
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2.5s infinite linear;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* AMBIENT LIGHTS & GRAIN */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#000000]">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-600/10 blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-emerald-500/10 blur-[150px] mix-blend-screen" />
        <div 
          className="absolute inset-0 opacity-[0.03] mix-blend-soft-light"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
        />
      </div>

      {/* FLOATING HEADER BAR */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-7xl h-14 border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.5),_inset_0_1px_0_0_rgba(255,255,255,0.05)] flex items-center justify-between px-6">
        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-white">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-[10px]">IC</div>
          InterviewCoach
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-black/40 border border-white/5 px-3 py-1 rounded-full">
            ELO: <span className="text-white">{currentElo}</span>
          </span>
        </div>
      </header>

      {/* ATMOSPHERIC SPLIT-PANE CONTAINER */}
      <main className="relative z-20 w-full max-w-7xl min-h-screen pt-32 pb-32 px-6 md:px-10">
        
        <motion.div variants={containerVars} initial="hidden" animate="show" className="space-y-8">
          
          {/* ========================================================================= */}
          {/* ZONE 1: KINETIC COMMAND HEADER                                            */}
          {/* ========================================================================= */}
          <motion.header variants={itemVars} className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12 relative z-20">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter text-white mb-4 leading-tight drop-shadow-lg">
                Good {timeOfDay()}, {firstName}.
              </h1>
              <p className="text-sm md:text-base text-slate-400 font-medium leading-relaxed max-w-2xl">
                Targeting <span className="text-white font-bold capitalize">{leastPracticed ? leastPracticed[0] : "Top Tech"} L4</span> — Next recommended focus: System Architecture & Distributed Caching.
              </p>
            </div>
            
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="hidden md:flex items-center gap-2 px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md text-xs font-semibold text-slate-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex-shrink-0 cursor-pointer hover:bg-white/[0.05] transition-colors">
                <Search size={16} /> Command Palette
                <kbd className="ml-3 font-mono text-[10px] bg-black/50 border border-white/10 px-2 py-1 rounded text-slate-300 shadow-inner">⌘K</kbd>
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }} onClick={onStartNew}
                className="relative group overflow-hidden bg-white text-black px-8 py-3.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)] flex items-center justify-center gap-3 w-full lg:w-auto flex-shrink-0"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <Activity size={16} className="relative z-10 text-blue-600" /> 
                <span className="relative z-10">Launch Practice Session</span>
                <kbd className="hidden sm:inline-flex relative z-10 font-mono text-[10px] bg-black/10 px-2 py-1 rounded opacity-70">↵</kbd>
              </motion.button>
            </div>
          </motion.header>

          {/* ========================================================================= */}
          {/* ZONE 2: ASYMMETRICAL BENTO MATRIX                                         */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative z-10">
            
            {/* COLUMN A: Velocity Chart (65%) */}
            <motion.div variants={itemVars} className="xl:col-span-8 flex flex-col h-[460px]">
              <div className="bg-[#08080A]/80 backdrop-blur-3xl border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),_0_30px_60px_rgba(0,0,0,0.6)] rounded-[2rem] p-8 relative overflow-hidden h-full flex flex-col group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                {/* Chart Metrics Header */}
                <div className="flex flex-wrap justify-between items-start mb-8 gap-6 relative z-10">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 block mb-2 flex items-center gap-2">
                      <Activity size={12} className="text-blue-500"/> Live ELO Velocity
                    </span>
                    <div className="flex items-end gap-4">
                      <span className="text-5xl md:text-6xl font-extrabold tracking-tighter tabular-nums text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                        <SlotNumber value={currentElo} />
                      </span>
                      {eloDelta !== 0 && (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border mb-1.5 ${eloDelta > 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}>
                          <span className="text-sm font-bold font-mono">
                            {eloDelta > 0 ? "+" : ""}{eloDelta}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Past 7 Days</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-8 bg-black/40 border border-white/[0.05] px-6 py-4 rounded-2xl shadow-inner">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 block mb-1">Sessions</span>
                      <span className="text-2xl font-bold tabular-nums text-white"><SlotNumber value={meaningfulSessions.length} /></span>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 block mb-1">Streak</span>
                      <span className="text-2xl font-bold tabular-nums text-white"><SlotNumber value={meaningfulSessions.length > 0 ? Math.min(meaningfulSessions.length, 7) : 0} /> <span className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">Days</span></span>
                    </div>
                  </div>
                </div>

                {/* Recharts Implementation */}
                <div className="flex-1 w-full relative z-10 -ml-4 -mb-4">
                  {eloHistory.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={eloHistory} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorElo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4}/>
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <YAxis domain={['dataMin - 50', 'dataMax + 50']} hide />
                        <XAxis dataKey="session" hide />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <ReferenceLine y={targetElo} stroke="rgba(245,158,11,0.3)" strokeDasharray="4 4" label={{ position: 'insideTopRight', value: 'L4 Benchmark', fill: 'rgba(245,158,11,0.8)', fontSize: 10, fontFamily: 'monospace' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "rgba(5,5,7,0.9)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}
                          labelStyle={{ color: "#94a3b8", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}
                          itemStyle={{ color: "#fff", fontWeight: "bold", fontSize: "16px", fontFamily: "monospace" }}
                          cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                          formatter={(value, name, props) => [`${value} ELO`, props.payload.date]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="elo" 
                          stroke="#3b82f6" 
                          strokeWidth={3} 
                          fill="url(#colorElo)"
                          activeDot={{ r: 6, fill: "#fff", stroke: "#3b82f6", strokeWidth: 3, style: { filter: "drop-shadow(0 0 10px rgba(59,130,246,0.8))" } }}
                          animationDuration={1500} 
                          animationEasing="ease-out"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
                      <Activity size={32} className="mb-4 opacity-50" />
                      <p className="text-sm font-bold uppercase tracking-widest">Awaiting Telemetry Data</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* COLUMN B: Focus DNA (35%) */}
            <motion.div variants={itemVars} className="xl:col-span-4 flex flex-col h-[460px]">
              <div className="bg-[#08080A]/80 backdrop-blur-3xl border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),_0_30px_60px_rgba(0,0,0,0.6)] rounded-[2rem] p-8 relative overflow-hidden h-full flex flex-col group">
                <div className="absolute inset-0 bg-blue-500/[0.02] blur-[80px] pointer-events-none group-hover:bg-blue-500/[0.05] transition-colors duration-700" />
                
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-8 flex items-center gap-2 relative z-10">
                  <Target size={12} className="text-blue-500"/> Target Company DNA
                </span>
                
                <div className="flex items-center gap-5 mb-10 relative z-10">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-black font-extrabold text-2xl shadow-[0_0_30px_rgba(255,255,255,0.15)] flex-shrink-0">
                    {leastPracticed ? leastPracticed[0].charAt(0).toUpperCase() : "G"}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white capitalize leading-tight">{leastPracticed ? leastPracticed[0] : "Google"}</h3>
                    <p className="text-sm text-blue-400 font-semibold tracking-wide mt-1">L4 Software Engineer</p>
                  </div>
                </div>

                <div className="space-y-6 flex-1 w-full relative z-10">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Algorithms & Scale</span>
                      <span className="text-xs font-mono font-bold text-white">65%</span>
                    </div>
                    <div className="h-2 bg-black/60 shadow-inner rounded-full overflow-hidden border border-white/[0.05]">
                      <div className="h-full bg-blue-500 w-[65%] shadow-[0_0_10px_rgba(59,130,246,0.6)] rounded-full"/>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Architecture</span>
                      <span className="text-xs font-mono font-bold text-white">40%</span>
                    </div>
                    <div className="h-2 bg-black/60 shadow-inner rounded-full overflow-hidden border border-white/[0.05]">
                      <div className="h-full bg-amber-500 w-[40%] shadow-[0_0_10px_rgba(245,158,11,0.6)] rounded-full"/>
                    </div>
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full bg-white/[0.03] border border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.05] text-white px-6 py-4 rounded-xl text-sm font-bold transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_10px_20px_rgba(0,0,0,0.5)] flex items-center justify-between group/btn mt-6 relative z-10"
                >
                  <span className="flex items-center gap-3">
                    <Zap size={14} className="text-amber-500" /> Fix Systems Gap
                  </span>
                  <ArrowRight size={16} className="text-slate-500 group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all"/>
                </motion.button>
              </div>
            </motion.div>

          </div>

          {/* ========================================================================= */}
          {/* ZONE 3: RECENT SESSION LEDGER                                             */}
          {/* ========================================================================= */}
          <motion.div variants={itemVars} className="bg-[#08080A]/80 backdrop-blur-3xl border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),_0_30px_60px_rgba(0,0,0,0.6)] rounded-[2rem] overflow-hidden flex flex-col relative z-10">
            <div className="p-8 border-b border-white/[0.06] flex justify-between items-center bg-black/40">
              <div className="flex items-center gap-3">
                <History size={16} className="text-blue-500" />
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Session Ledger</h2>
              </div>
              <div className="flex gap-3">
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onStartCoding}
                  className="bg-white/[0.04] border border-white/[0.08] text-slate-200 px-5 py-2.5 rounded-lg text-xs font-bold transition-all hover:bg-white/[0.08] flex items-center gap-2"
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
              <div className="p-16 text-center flex flex-col items-center justify-center">
                 <Terminal size={32} className="text-slate-600 mb-4" />
                 <p className="text-sm text-slate-500 font-medium tracking-wide">No telemetry data recorded. Initialize your first session above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-black/20">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 border-b border-white/[0.06]">Target</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 border-b border-white/[0.06]">Depth</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 border-b border-white/[0.06]">Timestamp</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 border-b border-white/[0.06] text-right">Action</th>
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
                                <div className="text-[11px] text-slate-500 font-semibold">{session.role || "Software Engineer"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 whitespace-nowrap">
                            <span className="text-[10px] font-mono font-bold text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-md border border-blue-500/20 shadow-inner">
                              {session.question_count} {session.question_count === 1 ? 'Node' : 'Nodes'}
                            </span>
                          </td>
                          <td className="px-8 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-mono font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
                                {new Date(session.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shadow-inner ${isHigh ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : isLow ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-white/5 text-slate-400 border-white/10'}`}>
                                {finalElo} ELO
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5 whitespace-nowrap text-right relative">
                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-300 shadow-lg">
                              <ChevronRight size={14} className="text-slate-400 group-hover:text-white transition-colors" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

        </motion.div>
      </main>

      {/* ========================================================================= */}
      {/* FLOATING ACTION DOCK (macOS Style)                                        */}
      {/* ========================================================================= */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.5, type: "spring", damping: 22 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#050507]/90 border border-white/[0.1] backdrop-blur-3xl p-2.5 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8),_inset_0_1px_0_0_rgba(255,255,255,0.1)] flex items-center gap-1 overflow-x-auto max-w-[95vw]"
      >
        <DockItem icon={LayoutGrid} label="Dashboard" active />
        <DockItem icon={History} label="History" onClick={onNavigateHistory} />
        <DockItem icon={Target} label="Study Plan" disabled badge="SOON" />
        <DockItem icon={Settings} label="Settings" onClick={onNavigateSettings} />
        <div className="w-px h-8 bg-white/10 mx-2" />
        <DockItem icon={LogOut} label="Log Out" onClick={onLogout} danger />
      </motion.div>

    </div>
  );
}

// Subcomponent: Floating Dock Item
function DockItem({ icon: Icon, label, active, disabled, badge, onClick, danger }) {
  return (
    <button 
      onClick={disabled ? null : onClick}
      disabled={disabled}
      className={`relative group px-4 py-3 rounded-xl flex items-center gap-3 transition-all outline-none flex-shrink-0 ${
        active ? "bg-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" : 
        disabled ? "opacity-50 cursor-not-allowed" : 
        danger ? "hover:bg-rose-500/10" : "hover:bg-white/[0.04]"
      }`}
    >
      <Icon size={18} className={
        active ? "text-white" : 
        danger ? "text-slate-400 group-hover:text-rose-400" : "text-slate-400 group-hover:text-slate-200"
      } />
      <span className={`text-xs font-bold tracking-wide hidden sm:block ${
        active ? "text-white" : 
        danger ? "text-slate-400 group-hover:text-rose-400" : "text-slate-400 group-hover:text-slate-200"
      }`}>
        {label}
      </span>
      {badge && (
        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]">
          {badge}
        </span>
      )}
    </button>
  );
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}