import React, { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import axios from "axios";
import { API_URL } from "../config";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import PremiumLayout from "../components/layout/PremiumLayout";
import { Search, LogOut, LayoutGrid, History, Settings, Target, ChevronRight, Activity } from "lucide-react";

/**
 * Tabular Slot Number (Rule 3: Typographic Systems)
 * Rolls up smoothly, restricted strictly to tabular-nums so it doesn't jitter.
 */
function SlotNumber({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    session: `S${i + 1}`,
    elo: Math.round(s.elo_after || user.elo_rating),
  }));

  const companyCounts = {};
  meaningfulSessions.forEach((s) => {
    const c = s.company_target || "unknown";
    companyCounts[c] = (companyCounts[c] || 0) + 1;
  });
  const leastPracticed = Object.entries(companyCounts).sort((a, b) => a[1] - b[1])[0];

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  
  const itemVars = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
  };

  // Capitalize name safely
  const firstName = user?.name ? user.name.split(" ")[0].charAt(0).toUpperCase() + user.name.split(" ")[0].slice(1) : "Guest";

  return (
    <PremiumLayout>
      {/* Inline style for the shimmer animation (Rule 5: Micro-Interactions) */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
      `}</style>

      {/* RULE 2: Dynamic Ambient Glows (Behind the DOM) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[10%] w-[40vw] h-[40vw] rounded-full bg-emerald-500/5 blur-[100px] mix-blend-screen" />
      </div>

      <div className="flex h-screen overflow-hidden text-slate-50 relative z-10">
        
        {/* SIDEBAR: Frosted Glass */}
        <aside className="hidden md:flex w-64 border-r border-white/[0.06] bg-black/40 backdrop-blur-2xl flex-col justify-between flex-shrink-0 z-20">
          <div>
            <div className="h-16 flex items-center px-6 border-b border-white/[0.06]">
              <div className="w-6 h-6 rounded bg-white flex items-center justify-center font-bold text-black text-[10px] mr-3 shadow-[0_0_10px_rgba(255,255,255,0.2)]">IC</div>
              <span className="font-bold text-white tracking-tight text-sm">InterviewCoach</span>
            </div>
            
            <nav className="p-4 space-y-1">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] text-sm font-semibold text-white">
                <LayoutGrid size={16} className="text-blue-400" /> Dashboard
              </div>

              {/* FIXED: was a dead <div> with cursor-not-allowed, no onClick, no navigation.
                  Now a real <button> that calls onNavigateHistory (wired in App.js to setPage("replay")). */}
              <button
                onClick={onNavigateHistory}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.02] transition-colors text-left"
              >
                <History size={16} /> History
              </button>

              {/* Study Plan and Settings pages don't exist yet — left as visibly
                  disabled with a "Soon" label instead of a fake clickable dead-end,
                  so the UI doesn't lie about what's available. */}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 cursor-default">
                <Target size={16} /> Study Plan
                <span className="ml-auto text-[9px] uppercase tracking-widest text-slate-700">Soon</span>
              </div>
              <button
                onClick={onNavigateSettings}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.02] transition-colors text-left"
              >
                <Settings size={16} /> Settings
              </button>
            </nav>
          </div>
          
          <div className="p-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">{firstName}</span>
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">L4 Candidate</span>
              </div>
              <button onClick={onLogout} className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-md hover:bg-red-500/10">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-12 relative z-10">
          <div className="max-w-5xl mx-auto space-y-8 pb-20">
            
            {/* Header: Rule 3 Typography (text-3xl, font-extrabold, tracking-tighter) */}
            <header className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter text-white mb-2">
                  Good {timeOfDay()}, {firstName}.
                </h1>
                <p className="text-sm text-slate-400 font-medium">Here is your telemetry overview.</p>
              </div>
              
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-black/40 backdrop-blur-md text-xs font-medium text-slate-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                <Search size={14} /> Command Palette
                <kbd className="ml-2 font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300">⌘K</kbd>
              </div>
            </header>

            {/* Stat Row: Rule 1 (Frosted Glass & Beveling) & Rule 3 (Micro-labels) */}
            <motion.div 
              variants={containerVars} initial="hidden" animate="show"
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              <StatCard label="Current Rating">
                <SlotNumber value={Math.round(user.elo_rating)} />
              </StatCard>
              
              <StatCard label="Total Sessions">
                <SlotNumber value={meaningfulSessions.length} />
              </StatCard>
              
              <StatCard label="Day Streak">
                <SlotNumber value={meaningfulSessions.length > 0 ? Math.min(meaningfulSessions.length, 7) : 0} />
              </StatCard>
              
              <StatCard label="Recommended Focus">
                <span className="text-xl font-extrabold tracking-tighter text-white capitalize truncate block mt-2">
                  {leastPracticed ? leastPracticed[0] : "Initialize"}
                </span>
              </StatCard>
            </motion.div>

            {/* Chart Section: Rule 4 (Area Gradient) */}
            {eloHistory.length > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] rounded-2xl p-6 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rating History</h2>
                  {hoverElo && (
                    <span className="text-[10px] font-mono font-bold text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                      {hoverElo} ELO
                    </span>
                  )}
                </div>
                <div className="h-[240px] w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={eloHistory} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorElo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="session" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} dy={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px", fontFamily: "monospace" }}
                        labelStyle={{ display: "none" }}
                        itemStyle={{ color: "#60a5fa", fontWeight: "bold" }}
                        cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="elo" 
                        name="ELO"
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                        fill="url(#colorElo)"
                        activeDot={{ r: 5, fill: "#000", stroke: "#3b82f6", strokeWidth: 2 }}
                        isAnimationActive={true} 
                        animationDuration={1200} 
                        animationEasing="ease-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* Ledger Section: Rule 5 (Micro-Interactions) */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-white/[0.06] flex justify-between items-center bg-black/20">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Session Ledger</h2>
                <div className="flex items-center gap-2">
                  {/* FIXED: CodingRoom existed fully wired to the backend but had
                      zero entry point anywhere in the UI. This button is the
                      first place in the app that ever sets page to "coding". */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onStartCoding}
                    className="bg-white/[0.04] border border-white/[0.08] text-slate-200 px-5 py-2.5 rounded-lg text-xs font-bold transition-all hover:bg-white/[0.08] flex items-center gap-2"
                  >
                    Coding Room
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onStartNew}
                    className="relative group overflow-hidden bg-blue-600 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] flex items-center gap-2"
                  >
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                    <Activity size={14} className="relative z-10" /> 
                    <span className="relative z-10">New Session</span>
                  </motion.button>
                </div>
              </div>

              {loading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                      <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : meaningfulSessions.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-sm text-slate-500 font-medium">No telemetry data recorded. Initialize your first session above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-black/20">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-white/[0.06]">Target</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-white/[0.06] text-center">Depth</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-white/[0.06] text-right">Timestamp</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-white/[0.06] text-right">Action</th>
                      </tr>
                    </thead>
                    <motion.tbody variants={containerVars} initial="hidden" animate="show" className="divide-y divide-white/[0.04]">
                      {meaningfulSessions.slice(0, 10).map((session, i) => (
                        <motion.tr key={i} variants={itemVars} className="hover:bg-white/[0.03] transition-colors group cursor-pointer">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-white capitalize">{session.company_target || "Unknown"}</div>
                            <div className="text-xs text-slate-400 font-medium mt-0.5">{session.role || "Role unspecified"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-[11px] font-mono font-bold text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                              {session.question_count} {session.question_count === 1 ? 'Node' : 'Nodes'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-xs font-mono text-slate-500 group-hover:text-slate-300 transition-colors">
                              {new Date(session.started_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right relative">
                            {/* Slide-in arrow on hover */}
                            <ChevronRight size={16} className="inline-block text-slate-400 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                </div>
              )}
            </motion.div>

          </div>
        </main>
      </div>
    </PremiumLayout>
  );
}

// Rule 1: Frosted Glass Cards with Inner Bevel Highlight
function StatCard({ label, children }) {
  const itemVars = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
  };
  
  return (
    <motion.div 
      variants={itemVars} 
      className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] rounded-2xl p-6 flex flex-col justify-between h-32 relative overflow-hidden group"
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 relative z-10">{label}</span>
      <div className="text-4xl font-extrabold tracking-tighter text-white relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}