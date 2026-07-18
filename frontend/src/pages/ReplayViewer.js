import { API_URL } from "../config";
import { useState, useEffect } from "react";
import axios from "axios";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer 
} from "recharts";
import { 
  ChevronLeft, AlertTriangle, Terminal, Zap, MessageSquare, Briefcase, ChevronRight 
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

export default function ReplayViewer({ sessionId }) {
  const [replay, setReplay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);
  const [mounted, setMounted] = useState(false);

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

  const ambientColor = isCritical ? 'rgba(239, 68, 68, 0.1)' // Red
                     : isWarning ? 'rgba(245, 158, 11, 0.07)' // Amber
                     : 'rgba(16, 185, 129, 0.1)'; // Emerald

  const textAccent = isCritical ? 'text-red-400' 
                   : isWarning ? 'text-amber-400' 
                   : 'text-emerald-400';

  const bgAccent = isCritical ? 'bg-red-400' 
                   : isWarning ? 'bg-amber-400' 
                   : 'bg-emerald-400';

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden relative flex flex-col">
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* AMBIENT LIGHT ENGINE: Dynamically maps to the current question's score */}
      <motion.div 
        animate={{ backgroundColor: ambientColor }}
        transition={{ duration: 1.5 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] blur-[150px] mix-blend-screen pointer-events-none z-0 rounded-full"
      />

      <div className="fixed inset-0 z-10 pointer-events-none opacity-[0.025] mix-blend-soft-light" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />

      {/* HEADER: Sticky, slim HUD */}
      <header className="sticky top-0 z-50 h-14 border-b border-white/[0.06] bg-[#000000]/80 backdrop-blur-md flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center text-[10px] font-bold text-black">IC</div>
            <span className="text-zinc-400 text-[13px] font-semibold tracking-tight hidden sm:block">InterviewCoach</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-white text-[11px] font-bold uppercase tracking-widest">
              {replay.company || "Target"}
            </span>
            <span className="text-zinc-600 text-xs font-medium hidden md:block">&middot; {replay.role || "L4 Candidate"}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <span className="text-xs font-mono font-bold text-slate-500 bg-white/[0.03] border border-white/10 px-3 py-1.5 rounded-md">
             {replay.total_questions} Nodes Logged
           </span>
           <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors">
              <ChevronLeft size={14} /> Exit Replay
           </button>
        </div>
      </header>

      {/* MAIN LAYOUT: Centered Document Architecture */}
      <main className="flex-1 w-full relative z-20 flex flex-col md:flex-row max-w-7xl mx-auto overflow-hidden h-[calc(100vh-56px)]">
        
        {/* TIMELINE SIDEBAR: Minimalist navigation */}
        <aside className="w-full md:w-[280px] border-r border-white/[0.06] bg-[#000000]/40 overflow-y-auto flex-shrink-0 p-6 flex flex-col gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Timeline Ledger</span>
          
          {replay.questions.map((qn, i) => {
            const ov = qn.scores ? ((qn.scores.score_technical + qn.scores.score_communication + qn.scores.score_problem_solving + qn.scores.score_cultural_fit + qn.scores.score_confidence) / 5).toFixed(1) : null;
            const qColor = !ov ? "text-slate-500" : ov >= 7 ? "text-emerald-400" : ov >= 5 ? "text-amber-400" : "text-red-400";
            
            return (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200 outline-none ${
                  selected === i 
                    ? "bg-white/[0.05] border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" 
                    : "bg-transparent border-transparent hover:bg-white/[0.02]"
                }`}
              >
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 ${
                   selected === i ? "border-white/20 bg-white/10 text-white" : "border-white/5 bg-transparent text-slate-600"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <p className={`text-xs font-semibold line-clamp-2 leading-snug ${selected === i ? "text-slate-200" : "text-slate-500"}`}>
                    {qn.question}
                  </p>
                  {ov && (
                    <span className={`text-[10px] font-mono font-bold self-start ${qColor}`}>
                      {ov}/10
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </aside>

        {/* CENTERED REPORT DOCUMENT */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 relative flex justify-center">
          <AnimatePresence mode="wait">
            <motion.div 
              key={selected}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-4xl space-y-8 pb-32"
            >
              
              {/* THE HERO METRIC */}
              {q?.scores && (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2 block">
                      Node {selected + 1} Evaluation
                    </span>
                    <div className="text-[100px] md:text-[140px] font-bold tracking-tighter tabular-nums leading-none text-white">
                      <AnimatedScore value={parseFloat(overall)} />
                    </div>
                  </div>
                  
                  {/* Delta / ELO Tags */}
                  <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                     <div>
                       <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Impact</span>
                       <span className={`text-lg font-mono font-bold px-2 py-1 rounded bg-black border ${
                         isCritical ? 'text-red-400 border-red-500/30' : isWarning ? 'text-amber-400 border-amber-500/30' : 'text-emerald-400 border-emerald-500/30'
                       }`}>
                         {isCritical ? 'CRITICAL GAP' : isWarning ? 'MODERATE' : 'STRONG SIGNAL'}
                       </span>
                     </div>
                  </div>
                </div>
              )}

              {/* THE PROMPT & ANSWER (Editorial Style) */}
              <div className="space-y-8 border-b border-white/[0.06] pb-12">
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                    <Terminal size={12} /> System Prompt
                  </h3>
                  <p className="text-lg text-slate-300 font-medium leading-relaxed max-w-3xl">
                    {q?.question}
                  </p>
                </div>

                {q?.answer && (
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
                      <MessageSquare size={12} /> Candidate Response
                    </h3>
                    <div className="bg-white/[0.02] border border-white/[0.06] p-6 rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
                      <p className="text-[15px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {q.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* THE 5D VECTOR ANALYSIS */}
              {q?.scores && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Vector Analysis</h3>
                    {[
                      ["Technical Precision", q.scores.score_technical],
                      ["Communication", q.scores.score_communication],
                      ["Problem Solving", q.scores.score_problem_solving],
                      ["Cultural Alignment", q.scores.score_cultural_fit],
                      ["Executive Confidence", q.scores.score_confidence],
                    ].map(([label, val], i) => {
                      const barColor = val >= 7 ? "bg-emerald-400" : val >= 5 ? "bg-amber-400" : "bg-red-400";
                      const shadowColor = val >= 7 ? "rgba(52,211,153,0.3)" : val >= 5 ? "rgba(251,191,36,0.3)" : "rgba(248,113,113,0.3)";
                      
                      return (
                        <div key={label}>
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-semibold text-slate-300">{label}</span>
                            <span className="text-xs font-bold tabular-nums text-white">{val}/10</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${(val || 0) * 10}%` }} 
                              transition={{ type: "spring", damping: 25, stiffness: 200, delay: i * 0.1 }}
                              className={`h-full rounded-full ${barColor}`}
                              style={{ boxShadow: `0 0 10px ${shadowColor}` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* RADAR CHART */}
                  <div className="flex flex-col items-center">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 w-full mb-4">Skill Radar</h3>
                    <div className="w-full h-[280px]">
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

              {/* DIAGNOSTICS & GAPS (Compiler Warning Style) */}
              <div className="space-y-6 pt-12">
                {q?.gaps?.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                      <Zap size={12} /> Diagnosed Vulnerabilities
                    </h3>
                    <div className="space-y-3">
                      {q.gaps.map((gap, i) => (
                        <div key={i} className="bg-red-500/[0.03] border-y border-r border-y-white/[0.02] border-r-white/[0.02] border-l-[3px] border-l-red-500 p-5 rounded-r-xl flex flex-col md:flex-row justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle size={14} className="text-red-500" />
                              <h4 className="text-sm font-bold text-red-400 capitalize">{gap.gap.replace(/_/g, " ")}</h4>
                            </div>
                            {gap.prerequisites_to_study_first?.length > 0 && (
                              <p className="text-xs font-mono text-slate-500 pl-6">
                                Requires prerequisite understanding of: <span className="text-slate-300">{gap.prerequisites_to_study_first.join(" → ")}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* COACHING MOMENTS */}
                {q?.coaching_moments?.length > 0 && (
                  <div className="pt-6">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                      <Briefcase size={12} /> Execution Telemetry
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.coaching_moments.map((m, i) => (
                        <div key={i} className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
                          <p className="text-xs text-slate-300 font-medium leading-relaxed mb-3">"{m.suggestion}"</p>
                          <div className="flex gap-4 border-t border-white/5 pt-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Pace</span>
                              <span className="text-xs font-mono font-bold text-white">{m.wpm} <span className="text-slate-600">WPM</span></span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Conf</span>
                              <span className="text-xs font-mono font-bold text-white">{m.confidence}<span className="text-slate-600">/10</span></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* NEXT ACTION LOOP */}
              <div className="pt-16 pb-8 flex justify-center">
                 <button 
                   onClick={() => setSelected(Math.min(selected + 1, replay.questions.length - 1))}
                   disabled={selected === replay.questions.length - 1}
                   className="relative group overflow-hidden bg-white text-black px-10 py-4 rounded-full text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] active:scale-95"
                 >
                   <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                   View Next Node <ChevronRight size={16} />
                   <kbd className="hidden sm:inline-flex items-center justify-center bg-black/10 rounded px-1.5 py-0.5 text-[10px] font-mono text-black/60 ml-2">↵</kbd>
                 </button>
              </div>

            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}