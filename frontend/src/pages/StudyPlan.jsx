import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { motion, AnimatePresence } from "framer-motion";
import { Network, X, ChevronRight, Activity, AlertTriangle, RotateCcw, CheckCircle2, Lock } from "lucide-react";

// Honest per-step progress badges, sourced from the same /topics/status
// endpoint UserDashboard/StudyPlanBrowser already use — not invented here.
// Requires a token; if there's none (or the fetch fails), badges are
// simply omitted rather than showing a fabricated default.
function statusBadge(status) {
  if (status === "passed") return { label: "Passed", icon: CheckCircle2, cls: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" };
  if (status === "gap") return { label: "Gap", icon: AlertTriangle, cls: "text-rose-400 border-rose-500/30 bg-rose-500/10" };
  if (status === "locked") return { label: "Locked", icon: Lock, cls: "text-slate-500 border-white/10 bg-white/5" };
  return null; // "unattempted" — no badge, nothing to signal yet
}

export default function StudyPlan({ topicName, company, onClose }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [statusByTopic, setStatusByTopic] = useState(null); // null = not available, not "all unattempted"

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Lock background scroll while the modal is open.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  async function fetchPlan() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await axios.get(`${API_URL}/study-plan/${topicName}`, {
        params: { company }
      });
      if (!res.data?.steps) throw new Error("Empty plan");
      setPlan(res.data);
    } catch (err) {
      console.error("Failed to load study plan:", err);
      setLoadError(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicName, company]);

  // Real per-step progress, only if a token exists. Silently skipped
  // (not faked) if there's no session or the call fails.
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    axios.get(`${API_URL}/topics/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const map = {};
        (res.data?.topics || []).forEach((t) => { map[t.name] = t.status; });
        setStatusByTopic(map);
      })
      .catch(() => setStatusByTopic(null));
  }, []);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative w-full max-w-2xl bg-[#0A0A0C]/95 border border-white/[0.08] rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.9),_inset_0_1px_0_0_rgba(255,255,255,0.08)] overflow-hidden flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-8 h-8 border-[3px] border-slate-800 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Calculating Dependency Chain...</span>
            </div>
          ) : loadError || !plan || !plan.steps?.length ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
               <AlertTriangle size={32} className="text-rose-500" />
               <span className="text-sm font-medium text-slate-400">Failed to load study plan.</span>
               <button
                 onClick={fetchPlan}
                 className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-lg transition-colors"
               >
                 <RotateCcw size={13} /> Retry
               </button>
            </div>
          ) : (
            <>
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-white/[0.06] flex items-start justify-between bg-black/20 flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Network size={14} className="text-indigo-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Knowledge Pathway</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tighter text-white capitalize leading-tight">
                    {topicName.replace(/_/g, " ")}
                  </h2>
                  <p className="text-xs font-medium text-slate-400 mt-2">
                    {plan.steps.length} prerequisite steps determined by knowledge graph analysis.
                  </p>
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg border border-white/5 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  <X size={18} />
                </button>
              </div>

              {/* Kinetic Dependency Inspector (Scrollable Content) */}
              <div className="flex-1 overflow-y-auto p-8 scrollbar-hide relative">
                <div className="relative">
                  {plan.steps.map((step, i) => {
                    const isTarget = i === plan.steps.length - 1;
                    const isFirst = i === 0;
                    const relevance =
                      step.company_relevance >= 1.6 ? { label: `Critical for ${company}`, color: "text-rose-400 border-rose-500/30 bg-rose-500/10" } :
                      step.company_relevance >= 1.3 ? { label: `Important for ${company}`, color: "text-amber-400 border-amber-500/30 bg-amber-500/10" } :
                      step.company_relevance <= 0.6 ? { label: "Standard Foundation", color: "text-slate-400 border-white/10 bg-white/5" } :
                      { label: "Core Concept", color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10" };

                    const progress = statusByTopic ? statusBadge(statusByTopic[step.name]) : null;

                    return (
                      <motion.div
                        key={step.name}
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1, duration: 0.4 }}
                        className="flex gap-6 relative group"
                      >
                        {/* The Animated SVG Spine & Node Indicator */}
                        <div className="flex flex-col items-center flex-shrink-0 relative">
                          {!isFirst && (
                            <div className="absolute top-0 bottom-1/2 w-0.5 -mt-6">
                              <motion.div
                                initial={{ height: 0 }} animate={{ height: "100%" }} transition={{ duration: 0.5, delay: (i - 1) * 0.1 + 0.2 }}
                                className={`w-full ${isTarget ? "bg-gradient-to-b from-indigo-500/30 to-amber-500/50" : "bg-indigo-500/30"}`}
                              />
                            </div>
                          )}

                          <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold tabular-nums transition-colors duration-300 mt-0.5 ${
                            isTarget
                              ? "bg-amber-500/10 border-2 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] group-hover:border-amber-400"
                              : "bg-[#0A0A0C] border-2 border-indigo-500/30 text-indigo-400 group-hover:border-indigo-400"
                          }`}>
                            {i + 1}
                          </div>

                          {!isTarget && (
                            <div className="absolute top-8 bottom-[-24px] w-0.5">
                              <motion.div
                                initial={{ height: 0 }} animate={{ height: "100%" }} transition={{ duration: 0.5, delay: i * 0.1 + 0.2 }}
                                className="w-full bg-indigo-500/30"
                              />
                            </div>
                          )}
                        </div>

                        {/* Step Content */}
                        <div className="pb-10 flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className={`capitalize tracking-tight ${isTarget ? "text-amber-400 text-xl font-extrabold" : "text-slate-200 text-lg font-bold"}`}>
                              {step.name.replace(/_/g, " ")}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className="bg-[#050505] border border-white/10 shadow-inner text-slate-400 text-[10px] font-bold px-2 py-1 rounded tabular-nums uppercase tracking-widest">
                              Level {step.difficulty}
                            </span>
                            {company && (
                              <span className={`text-[9px] font-bold px-2 py-1 rounded border uppercase tracking-widest ${relevance.color}`}>
                                {relevance.label}
                              </span>
                            )}
                            {isTarget && (
                              <span className="text-[9px] font-bold px-2 py-1 rounded border uppercase tracking-widest text-amber-400 border-amber-500/30 bg-amber-500/10 flex items-center gap-1">
                                <Activity size={10} /> Target Node
                              </span>
                            )}
                            {progress && (
                              <span className={`text-[9px] font-bold px-2 py-1 rounded border uppercase tracking-widest flex items-center gap-1 ${progress.cls}`}>
                                <progress.icon size={10} /> {progress.label}
                              </span>
                            )}
                          </div>

                          <p className="text-slate-400 text-sm leading-relaxed font-medium">
                            {step.description}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-6 border-t border-white/[0.06] bg-[#050505] flex-shrink-0 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hidden sm:inline-block">End of Dependency Chain</span>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={onClose}
                  className="w-full sm:w-auto relative group overflow-hidden bg-white text-black px-8 py-3 rounded-lg text-sm font-bold active:scale-95 transition-all duration-150 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  Acknowledge Path <ChevronRight size={16} />
                  <kbd className="hidden sm:inline-flex ml-2 items-center justify-center bg-black/10 rounded px-1.5 py-0.5 text-[10px] font-mono text-black/60 relative z-10">↵ Esc</kbd>
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}