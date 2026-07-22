import { API_URL } from "../config";
import { useState, useEffect } from "react";
import axios from "axios";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer 
} from "recharts";
import { 
  ChevronLeft, AlertTriangle, Terminal, Zap, MessageSquare, Briefcase, ChevronRight,
  CheckCircle2, Lock, LayoutTemplate, Code2, Activity 
} from "lucide-react";

/**
 * Animated Counter for that massive score dopamine hit
 */
function AnimatedScore({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => v.toFixed(1));
  const [display, setDisplay] = useState("0.0");

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value]);

  return <>{display}</>;
}

export default function ReplayViewer({ sessionId, onExit }) {
  const [replay, setReplay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("prompt"); // "prompt", "solution", "evaluation"

  useEffect(() => {
    setMounted(true);
    async function fetchReplay() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await axios.get(`${API_URL}/replay/${sessionId || 1}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReplay(res.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    fetchReplay();
  }, [sessionId]);

  // Keyboard Navigation Support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!replay) return;
      if (e.key === "ArrowRight" || (e.metaKey && e.key === "Enter")) {
        setSelected((s) => Math.min(s + 1, replay.questions.length - 1));
      } else if (e.key === "ArrowLeft") {
        setSelected((s) => Math.max(s - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [replay]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-500">
           <span className="w-6 h-6 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
           <span className="text-xs font-mono font-bold uppercase tracking-widest">Decrypting Session Ledger...</span>
        </div>
      </div>
    );
  }

  if (!replay || replay.error) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
           <AlertTriangle size={32} className="text-red-500 mx-auto mb-4" />
           <p className="text-sm font-bold text-white uppercase tracking-widest">Replay Corrupted or Missing</p>
           {onExit && (
             <button
               onClick={onExit}
               className="mt-6 flex items-center gap-2 mx-auto text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
             >
               <ChevronLeft size={14} /> Back to Dashboard
             </button>
           )}
        </div>
      </div>
    );
  }

  const q = replay.questions[selected];
  
  const overall = q?.scores
    ? ((q.scores.score_technical + q.scores.score_communication +
        q.scores.score_problem_solving + q.scores.score_cultural_fit +
        q.scores.score_confidence) / 5).toFixed(1)
    : 0;

  // Determine semantic status color based on overall score
  const isCritical = overall < 5.0;
  const isWarning = overall >= 5.0 && overall < 7.5;
  const isSuccess = overall >= 7.5;

const ambientColor = isCritical ? 'rgba(239, 68, 68, 0.08)' // Red
                     : isWarning ? 'rgba(245, 158, 11, 0.05)' // Amber
                     : 'rgba(16, 185, 129, 0.08)'; // Emerald

  const textAccent = isCritical ? 'text-red-400' 
                   : isWarning ? 'text-amber-400' 
                   : 'text-emerald-400';

  // Add this block right here:
  const bgAccent = isCritical ? 'bg-red-500' 
                 : isWarning ? 'bg-amber-500' 
                 : 'bg-emerald-500';

  const tabs = [
    { id: "prompt", label: "System Prompt", icon: LayoutTemplate },
    { id: "solution", label: "Candidate Solution", icon: Code2 },
    { id: "evaluation", label: "Diagnostic Evaluation", icon: Activity },
  ];
  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-blue-500/30 relative flex flex-col items-center">
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* AMBIENT LIGHT ENGINE */}
      <motion.div 
        animate={{ backgroundColor: ambientColor }}
        transition={{ duration: 1.5 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] blur-[160px] mix-blend-screen pointer-events-none z-0 rounded-full"
      />

      <div className="fixed inset-0 z-10 pointer-events-none opacity-[0.03] mix-blend-soft-light" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />

      {/* ZONE A: FLOATING GLASS COMMAND NAVIGATION */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl h-14 border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.5),_inset_0_1px_0_0_rgba(255,255,255,0.05)] flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]">IC</div>
            <span className="text-zinc-400 text-[13px] font-bold tracking-tight hidden sm:block">InterviewCoach</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-white text-[11px] font-bold uppercase tracking-widest bg-white/[0.05] px-3 py-1 rounded-full border border-white/10">
              {replay.company || "Target"}
            </span>
            <span className="text-zinc-500 text-xs font-medium hidden md:block">&middot; {replay.role || "Software Engineer — L3/IC3"}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <span className="text-[10px] font-mono font-bold text-slate-500 bg-black/40 border border-white/5 px-3 py-1.5 rounded-full shadow-inner">
             {replay.total_questions} Nodes Logged
           </span>
           <div className="w-px h-4 bg-white/10" />
           <button
             onClick={onExit}
             className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
           >
             <ChevronLeft size={14} /> Exit Replay
           </button>
        </div>
      </header>

      {/* ZONE B & C: THE WORKBENCH LAYOUT */}
      <main className="w-full max-w-7xl pt-28 pb-32 px-4 md:px-8 flex flex-col md:flex-row gap-8 relative z-20 min-h-screen">
        
        {/* ZONE B: KINETIC TIMELINE LEDGER (22% Width) */}
        <aside className="w-full md:w-[260px] flex-shrink-0 flex flex-col relative">
          <div className="sticky top-28 flex flex-col gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-2">Timeline Ledger</span>
            
            <div className="relative">
              {/* Vertical Connecting Laser Line */}
              <div className="absolute left-[23px] top-4 bottom-4 w-px bg-white/5" />
              <motion.div 
                className="absolute left-[23px] top-4 w-px bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                initial={{ height: 0 }}
                animate={{ height: `${(selected / (replay.questions.length - 1 || 1)) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />

              <div className="flex flex-col gap-3 relative z-10">
                {replay.questions.map((qn, i) => {
                  const isPassed = i < selected;
                  const isActive = i === selected;
                  const isLocked = i > selected;
                  
                  return (
                    <motion.button
                      key={i}
                      whileHover={!isActive ? { x: 4 } : {}}
                      onClick={() => setSelected(i)}
                      className={`flex items-start gap-4 p-3 rounded-2xl border text-left transition-all duration-300 outline-none w-full ${
                        isActive 
                          ? "bg-white/[0.04] border-white/[0.15] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),_0_10px_20px_rgba(0,0,0,0.4)]" 
                          : "bg-[#08080A] border-white/[0.03] hover:border-white/[0.08]"
                      } ${isLocked ? "opacity-40 hover:opacity-70" : ""}`}
                    >
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        isActive ? "border-blue-500 bg-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]" 
                        : isPassed ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" 
                        : "border-white/10 bg-black text-slate-600"
                      }`}>
                        {isPassed ? <CheckCircle2 size={12} /> : isLocked ? <Lock size={10} /> : <span className="text-[10px] font-mono font-bold">{i + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <p className={`text-xs font-semibold line-clamp-2 leading-relaxed ${isActive ? "text-white" : "text-slate-500"}`}>
                          {isActive ? "Currently Viewing" : `Node 0${i + 1}`}
                        </p>
                        {!isLocked && (
                           <span className="text-[9px] font-mono uppercase tracking-widest text-slate-600">
                             Status: {isActive ? "Active" : "Completed"}
                           </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* ZONE C: PROGRESSIVE INSPECTOR CANVAS (78% Width) */}
        <section className="flex-1 flex flex-col bg-[#050507]/80 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_30px_60px_rgba(0,0,0,0.8)] rounded-[2rem] backdrop-blur-3xl overflow-hidden min-h-[600px] relative">
          
          {/* Animated Tabs Header */}
          <div className="flex items-center gap-2 p-3 border-b border-white/[0.06] bg-black/40">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 outline-none ${
                  activeTab === tab.id ? "text-white" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <tab.icon size={14} className="relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 p-8 md:p-12 overflow-y-auto scrollbar-hide">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + selected} // Force re-animation on tab or node change
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                
                {/* TAB 1: SYSTEM PROMPT */}
                {activeTab === "prompt" && (
                  <div className="max-w-3xl space-y-8">
                    <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest">
                      <Terminal size={12} /> Prompt Specification
                    </div>
                    <p className="text-xl md:text-2xl text-slate-200 font-medium leading-[1.8] tracking-tight">
                      {q?.question}
                    </p>
                    <div className="pt-8 border-t border-white/[0.06]">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Metadata Context</h4>
                      <div className="flex gap-3">
                         <span className="bg-white/[0.03] border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300">Analysis Complexity: High</span>
                         <span className="bg-white/[0.03] border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300">Format: Open-ended</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: CANDIDATE SOLUTION */}
                {activeTab === "solution" && (
                  <div className="max-w-4xl space-y-6">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest mb-2">
                      <MessageSquare size={12} /> Candidate Transcript
                    </div>
                    {q?.answer ? (
                      <div className="bg-[#030303] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] rounded-2xl p-8">
                        <p className="text-base font-mono text-slate-300 leading-[1.9] whitespace-pre-wrap">
                          {q.answer}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-white/10 rounded-2xl">
                        <Code2 size={32} className="mb-4 opacity-50" />
                        <p className="text-sm font-bold uppercase tracking-widest">No Response Recorded</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: DIAGNOSTIC EVALUATION */}
                {activeTab === "evaluation" && (
                  <div className="max-w-5xl">
                    
                    {/* The Hero Metric Block */}
                    {q?.scores && (
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 bg-white/[0.02] border border-white/[0.06] p-8 rounded-3xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2 block">
                            Calculated Node Score
                          </span>
                          <div className={`text-[80px] font-extrabold tracking-tighter tabular-nums leading-none ${textAccent} drop-shadow-[0_0_30px_currentColor]`}>
                            <AnimatedScore value={parseFloat(overall)} />
                            <span className="text-2xl text-slate-600 ml-2">/10</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                           <div className="bg-black/50 border border-white/10 px-4 py-3 rounded-xl flex items-center justify-between gap-8 min-w-[200px]">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Verdict</span>
                             <span className={`text-xs font-bold uppercase tracking-widest ${textAccent}`}>
                               {isCritical ? "Critical Flag" : isWarning ? "Sub-Optimal" : "Strong Signal"}
                             </span>
                           </div>
                           <div className="bg-black/50 border border-white/10 px-4 py-3 rounded-xl flex items-center justify-between gap-8">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Difficulty</span>
                             <span className="text-xs font-bold uppercase tracking-widest text-white">L4 Native</span>
                           </div>
                        </div>
                      </div>
                    )}

                    {/* Vector Analysis & Radar */}
                    {q?.scores && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
                        <div className="space-y-6">
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-6">Vector Analysis</h3>
                          {[
                            ["Technical Precision", q.scores.score_technical],
                            ["Communication", q.scores.score_communication],
                            ["Problem Solving", q.scores.score_problem_solving],
                            ["Cultural Alignment", q.scores.score_cultural_fit],
                            ["Executive Confidence", q.scores.score_confidence],
                          ].map(([label, val], idx) => {
                            const barColor = val >= 7 ? "bg-emerald-400" : val >= 5 ? "bg-amber-400" : "bg-red-400";
                            const shadowColor = val >= 7 ? "rgba(52,211,153,0.4)" : val >= 5 ? "rgba(251,191,36,0.4)" : "rgba(248,113,113,0.4)";
                            return (
                              <div key={label}>
                                <div className="flex justify-between items-end mb-2">
                                  <span className="text-xs font-semibold text-slate-300">{label}</span>
                                  <span className="text-xs font-bold tabular-nums text-white">{val}/10</span>
                                </div>
                                <div className="h-1.5 w-full bg-black shadow-inner rounded-full overflow-hidden border border-white/[0.05]">
                                  <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: `${(val || 0) * 10}%` }} 
                                    transition={{ type: "spring", damping: 25, stiffness: 200, delay: idx * 0.1 }}
                                    className={`h-full rounded-full ${barColor}`}
                                    style={{ boxShadow: `0 0 10px ${shadowColor}` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex flex-col items-center bg-[#000000] border border-white/[0.06] rounded-3xl p-6 shadow-inner relative overflow-hidden">
                          <div className={`absolute inset-0 ${bgAccent}/5 blur-[60px] pointer-events-none`} />
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 w-full mb-2 z-10">Skill Morphology</h3>
                          <div className="w-full h-[240px] z-10">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart data={[
                                { dim: "Technical", value: q.scores.score_technical },
                                { dim: "Comm.", value: q.scores.score_communication },
                                { dim: "Solve", value: q.scores.score_problem_solving },
                                { dim: "Culture", value: q.scores.score_cultural_fit },
                                { dim: "Conf.", value: q.scores.score_confidence },
                              ]}>
                                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                                <PolarAngleAxis dataKey="dim" tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }} />
                                <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                                <Radar dataKey="value" stroke={isCritical ? "#f87171" : isWarning ? "#fbbf24" : "#34d399"} fill={isCritical ? "#f87171" : isWarning ? "#fbbf24" : "#34d399"} fillOpacity={0.2} strokeWidth={2} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Diagnostics & Vulnerabilities */}
                    {q?.gaps?.length > 0 && (
                      <div className="space-y-4 pt-8 border-t border-white/[0.06]">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                          <Zap size={12} className="text-amber-400" /> Diagnosed Vulnerabilities
                        </h3>
                        {q.gaps.map((gap, i) => (
                          <div key={i} className="bg-black/40 border border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] p-5 rounded-2xl flex flex-col md:flex-row justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={14} className="text-red-400" />
                                <h4 className="text-sm font-bold text-slate-200 capitalize">{gap.gap.replace(/_/g, " ")}</h4>
                              </div>
                              {gap.prerequisites_to_study_first?.length > 0 && (
                                <p className="text-[11px] font-mono text-slate-500 pl-6 flex items-center gap-2">
                                  <span className="text-slate-600">Requires:</span>
                                  <span className="bg-white/[0.03] border border-white/5 px-2 py-0.5 rounded text-slate-300">
                                    {gap.prerequisites_to_study_first.join(" → ")}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Coaching Telemetry */}
                    {q?.coaching_moments?.length > 0 && (
                      <div className="pt-10">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                          <Briefcase size={12} className="text-blue-400" /> Execution Telemetry
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {q.coaching_moments.map((m, i) => (
                            <div key={i} className="bg-white/[0.02] border border-white/[0.04] p-5 rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
                              <p className="text-xs text-slate-300 font-medium leading-relaxed mb-4">"{m.suggestion}"</p>
                              <div className="flex gap-6 border-t border-white/[0.05] pt-3">
                                <div>
                                  <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Pace</span>
                                  <span className="text-xs font-mono font-bold text-white">{m.wpm} <span className="text-slate-600">WPM</span></span>
                                </div>
                                <div>
                                  <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Conf</span>
                                  <span className="text-xs font-mono font-bold text-white">{m.confidence}<span className="text-slate-600">/10</span></span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* ZONE 3: FLOATING ACTION DOCK (macOS Style) */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.2, type: "spring", damping: 20 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#050507]/90 border border-white/[0.1] backdrop-blur-2xl p-2 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8),_inset_0_1px_0_0_rgba(255,255,255,0.1)]"
      >
        <motion.button 
          whileTap={{ scale: 0.96 }}
          onClick={() => setSelected(Math.max(selected - 1, 0))}
          disabled={selected === 0}
          className="p-3 rounded-xl hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-400 hover:text-white"
        >
          <ChevronLeft size={18} />
        </motion.button>
        
        <div className="px-4 py-1 flex flex-col items-center justify-center min-w-[120px] border-x border-white/[0.05]">
           <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Timeline</span>
           <span className="text-xs font-mono font-bold text-white">Node {selected + 1} / {replay.questions.length}</span>
        </div>

        <motion.button 
          whileTap={{ scale: 0.96 }}
          onClick={() => setSelected(Math.min(selected + 1, replay.questions.length - 1))}
          disabled={selected === replay.questions.length - 1}
          className="relative group overflow-hidden px-6 py-2.5 rounded-xl bg-white text-black text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          {!disabledStateCheck(selected, replay.questions.length) && (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          )}
          Next Node <ChevronRight size={14} />
        </motion.button>
      </motion.div>

    </div>
  );
}

// Small helper to keep JSX clean for the button disable check
function disabledStateCheck(current, total) {
  return current === total - 1;
}