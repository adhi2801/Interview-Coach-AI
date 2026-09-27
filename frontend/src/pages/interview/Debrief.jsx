import { motion } from "motion/react";
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Lightbulb, Lock, MessageSquare,
  RefreshCw, ShieldAlert, Target, Terminal, ThumbsDown, ThumbsUp, XCircle,
} from "lucide-react";
import { TOTAL_NODES } from "./constants";
import { AnimatedNumber, DimCard, NextActionCard, VoiceStat } from "./widgets";

// The results view for one answered node: verdict, five-dimension scores,
// gaps, the answer, next actions and peer benchmark. Real data only.
export default function Debrief({
  personaMeta, questionNum, isLastNode, scores, gaps, gapAnalysisUnavailable, peer, newElo, currentElo, company, answer, liveCoaching, currentAnswerId, feedbackRating, onRateFeedback, onOpenStudyPlan, onRetry, onNext, onFinish,
}) {
  const rawOverall = scores ? (scores.score_technical + scores.score_communication + scores.score_problem_solving + scores.score_cultural_fit + scores.score_confidence) / 5 : 0;
  const isPass = Math.round(rawOverall * 10) >= 70;
  const verdictLabel = isPass ? "Strong Pass" : "Needs Revision";
  const eloDelta = newElo ? Math.round(newElo - currentElo) : 0;
  // Set by the backend when an answer was not graded on its content.
  const hasProfanityFlag = scores?.overall_summary?.toLowerCase().includes("inappropriate language") ||
                           scores?.overall_summary?.toLowerCase().includes("unprofessional language");

  return (
    <div className="flex-1 w-full h-full overflow-y-auto scrollbar-hide">
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-[1080px] mx-auto w-full px-6 py-10 flex flex-col gap-7"
      >

        {/* SECTION LABEL */}
        <div className="flex items-center gap-3">
          <div className="w-px h-7" style={{ background: `linear-gradient(to bottom, transparent, rgba(var(--accent-rgb),0.6), transparent)` }} />
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-500">
            Session Debrief &middot; {personaMeta.name} &middot; Node {questionNum} of {TOTAL_NODES}
          </span>
        </div>

        {/* PROFANITY / POLICY VIOLATION BANNER */}
        {hasProfanityFlag && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert size={20} className="shrink-0" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest">Policy Violation Detected</h4>
                <p className="text-xs text-rose-200/80 font-medium">Unprofessional or inappropriate language was flagged in your answer. Score penalized across technical dimensions.</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-md uppercase tracking-wider shrink-0">
              Non-Compliant
            </span>
          </div>
        )}

        {/* VERDICT CARD */}
        <div
          className="relative overflow-hidden rounded-3xl border p-6 md:p-9"
          style={{
            borderColor: hasProfanityFlag ? "rgba(239,68,68,0.25)" : isPass ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
            background: hasProfanityFlag ? "rgba(16,8,8,0.95)" : isPass ? "rgba(8,16,12,0.95)" : "rgba(16,8,8,0.95)",
            boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.55)"
          }}
        >
          <div
            className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none blur-[70px]"
            style={{ background: hasProfanityFlag || !isPass ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.14)" }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full pointer-events-none blur-[70px]"
            style={{ background: `rgba(var(--accent-rgb), 0.08)` }}
          />

          <div className="relative z-10 flex items-start gap-7 flex-wrap">
            {/* Score ring — real rawOverall, animated once on mount */}
            <div className="relative w-[110px] h-[110px] shrink-0">
              <svg width="110" height="110" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                <defs>
                  <linearGradient id="debriefRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor={isPass && !hasProfanityFlag ? "#10b981" : "#ef4444"} />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <motion.circle
                  cx="60" cy="60" r="52" fill="none" stroke="url(#debriefRingGrad)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - Math.min(10, rawOverall) / 10) }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[26px] font-black font-mono tracking-tight text-white leading-none">
                  <AnimatedNumber value={Math.round(rawOverall * 10) / 10} />
                </span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5">/10</span>
              </div>
            </div>

            {/* Verdict text */}
            <div className="flex-1 min-w-[220px]">
              <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
                <span
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border"
                  style={{
                    background: hasProfanityFlag ? "rgba(239,68,68,0.14)" : isPass ? "rgba(16,185,129,0.14)" : "rgba(239,68,68,0.12)",
                    borderColor: hasProfanityFlag ? "rgba(239,68,68,0.3)" : isPass ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.25)",
                    color: hasProfanityFlag || !isPass ? "#fca5a5" : "#6ee7b7"
                  }}
                >
                  {hasProfanityFlag ? "Disqualifying Conduct" : verdictLabel}
                </span>
                {newElo && (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-sm font-extrabold font-mono bg-white/5 border border-white/10 text-white">
                    {eloDelta >= 0 ? <ArrowRight size={13} className="-rotate-90 text-emerald-400" /> : <ArrowRight size={13} className="rotate-90 text-rose-400" />}
                    {eloDelta >= 0 ? `+${eloDelta}` : eloDelta} ELO
                  </span>
                )}
                {newElo && (
                  <span className="text-xs font-mono text-slate-500">
                    {Math.round(currentElo)} <ArrowRight size={11} className="inline -mt-0.5 mx-1" /> <span className="text-slate-200 font-bold">{Math.round(newElo)}</span>
                  </span>
                )}
              </div>

              <h2 className="text-2xl md:text-[26px] font-extrabold tracking-tight text-white leading-[1.15] mb-3">
                {hasProfanityFlag ? "Response flagged for conduct." : isPass ? "Strong pass on this node." : "This one needs another pass."}
              </h2>

              <div className="bg-black/50 border border-white/5 p-4 rounded-xl mt-2">
                <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium italic">
                  "{scores?.overall_summary || "Diagnostic review complete for this interview node."}"
                </p>
                <p className="text-[10px] font-mono text-slate-500 mt-2 not-italic">
                  — {personaMeta.name} &middot; scored across 5 dimensions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 5D SCORE BREAKDOWN — real scores only, no fabricated per-dimension commentary */}
        {scores && (
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-500 block mb-3.5">5-Dimension Score Breakdown</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { label: "Technical Accuracy", subtitle: "Correctness of approach", value: scores.score_technical, feedback: scores.technical_feedback, colorFrom: "#6366f1", colorTo: "#8b5cf6", badgeBg: "rgba(99,102,241,0.14)", badgeBorder: "rgba(99,102,241,0.28)", badgeColor: "#a5b4fc" },
                { label: "Problem Solving", subtitle: "Trade-off & structural thinking", value: scores.score_problem_solving, feedback: scores.problem_solving_feedback, colorFrom: "#10b981", colorTo: "#6366f1", badgeBg: "rgba(16,185,129,0.12)", badgeBorder: "rgba(16,185,129,0.25)", badgeColor: "#6ee7b7" },
                { label: "Communication", subtitle: "Clarity of explanation", value: scores.score_communication, feedback: scores.communication_feedback, colorFrom: "#f59e0b", colorTo: "#10b981", badgeBg: "rgba(245,158,11,0.12)", badgeBorder: "rgba(245,158,11,0.25)", badgeColor: "#fbbf24" },
                { label: "Culture Fit", subtitle: `${company?.name || "Company"}-specific behaviours`, value: scores.score_cultural_fit, colorFrom: "#ec4899", colorTo: "#8b5cf6", badgeBg: "rgba(236,72,153,0.1)", badgeBorder: "rgba(236,72,153,0.22)", badgeColor: "#f9a8d4" },                      ].map((d, i) => (
                <motion.div key={d.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <DimCard {...d} />
                </motion.div>
              ))}

              {/* Confidence + real voice telemetry — from actual liveCoaching captured
                  during this node, not simulated. Falls back honestly if no data. */}
              <div className="sm:col-span-2 bg-[#0a0a10]/90 border border-white/[0.08] rounded-2xl p-5">
                <div className="flex items-start gap-6 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center justify-between mb-3.5">
                      <div>
                        <div className="text-[13px] font-bold text-slate-200">Confidence Signal</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Voice &amp; speech telemetry</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold" style={{ background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.22)", color: "#7dd3fc" }}>
                        {scores.score_confidence ? scores.score_confidence.toFixed(1) : "—"}
                      </span>
                    </div>
                    <div className="h-[5px] w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(4, Math.min(100, Math.round((scores.score_confidence || 0) * 10)))}%`, background: "linear-gradient(90deg, #0ea5e9, #6366f1)" }} />
                    </div>
                  </div>
                  <div className="flex gap-3 flex-wrap shrink-0">
                    <VoiceStat label="WPM" value={liveCoaching?.words_per_minute ?? "—"} color="#7dd3fc" />
                    <VoiceStat label="Fillers" value={liveCoaching?.filler_count ?? "—"} color="#6ee7b7" />
                  </div>
                </div>
                {!liveCoaching && (
                  <p className="text-[10px] text-slate-600 italic mt-3">No live voice telemetry was captured for this answer.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CRITICAL GAP — real gaps/prerequisites only */}
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-rose-400/80 block mb-3.5">Critical Gap</span>
          {hasProfanityFlag ? (
            <div className="bg-[#0c0606] border border-rose-500/30 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <XCircle size={16} /> Unprofessional Communication Boundary
              </div>
              <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium">
                Responses containing vulgarity or casual dismissals automatically disqualify senior engineering candidates. Focus on structured, objective problem-solving language.
              </p>
            </div>
          ) : gaps?.length > 0 ? (
            <div className="bg-[#0c0606] border border-rose-500/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert size={16} />
                <h4 className="text-sm font-bold tracking-tight capitalize">{gaps[0].gap.replace(/_/g, " ")}</h4>
              </div>
              <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium">
                {gaps[0].prerequisites_to_study_first?.length > 0
                  ? `Prerequisite dependencies detected: ${gaps[0].prerequisites_to_study_first.join(", ")}.`
                  : "Flagged in this answer. It has no prerequisite to study first, so practise the topic directly."
                }
              </p>
              <button onClick={() => onOpenStudyPlan(gaps[0].gap)} className="text-xs font-mono font-bold text-blue-400 hover:underline flex items-center gap-1 pt-1">
                Study Path Graph →
              </button>
            </div>
          ) : gapAnalysisUnavailable ? (
            <div className="bg-[#0c0906] border border-amber-500/20 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle size={16} />
                <h4 className="text-sm font-bold tracking-tight">Gap analysis unavailable</h4>
              </div>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
                The gap-detection service didn't return a result for this answer. This is not the same as a clean pass — it means gap detection genuinely failed and no analysis was possible.
              </p>
            </div>
          ) : (
            <div className="bg-[#0a0a10]/90 border border-white/[0.08] rounded-2xl p-5 text-xs text-slate-300">
              No critical knowledge gaps detected for this response.
            </div>
          )}
        </div>

        {/* ANNOTATED ANSWER TRANSCRIPT — raw answer only, no fabricated tags */}
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-500 block mb-3.5">Your Answer</span>
          <div className="bg-[#0a0a10]/90 border border-white/[0.08] p-5 rounded-2xl space-y-3">
            <p className="text-xs md:text-sm font-mono text-slate-200 leading-[1.8] whitespace-pre-wrap">
              {answer || "[No response recorded]"}
            </p>
            {hasProfanityFlag && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded text-xs font-mono font-bold">
                  Disqualifying Language Flagged
                </span>
              </div>
            )}
          </div>
        </div>

        {/* NEXT ACTIONS — real, functional */}
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-500 block mb-3.5">Next Actions</span>
          <div className={`grid grid-cols-1 ${gaps?.length > 0 && !hasProfanityFlag ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3`}>
            {gaps?.length > 0 && !hasProfanityFlag && (
              <NextActionCard
                icon={Target}
                color="#fbbf24"
                bg="rgba(245,158,11,0.1)"
                border="rgba(245,158,11,0.22)"
                title="Patch the Gap"
                body={`Study ${gaps[0].gap.replace(/_/g, " ")} in your knowledge graph before the next attempt.`}
                cta="Open Knowledge Graph"
                onClick={() => onOpenStudyPlan(gaps[0].gap)}
              />
            )}
            <NextActionCard
              icon={RefreshCw}
              color="var(--accent)"
              bg="rgba(var(--accent-rgb),0.12)"
              border="rgba(var(--accent-rgb),0.25)"
              title={`Retry Node ${questionNum}`}
              body="Same node, same company. Take another pass with what you just learned."
              cta="Retry Now"
              onClick={onRetry}
            />
            <NextActionCard
              icon={isLastNode ? CheckCircle2 : ArrowRight}
              color="#6ee7b7"
              bg="rgba(16,185,129,0.1)"
              border="rgba(16,185,129,0.22)"
              title={isLastNode ? "Finish Session" : `Advance to Node ${questionNum + 1}`}
              body={isLastNode ? "You've completed all 5 nodes — wrap up and close out this session." : "Move on to the next node in this session."}
              cta={isLastNode ? "Finish" : "Continue"}
              onClick={isLastNode ? onFinish : onNext}
            />
          </div>
        </div>

        {/* PEER BENCHMARK — only shown when real peer data exists */}
        {peer && peer.percentile != null && !hasProfanityFlag && (
          <div className="bg-[#0a0a10]/90 border border-white/[0.08] rounded-2xl p-5 space-y-2 max-w-md">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-500 block mb-1">Peer Benchmark</span>
            <span className="text-xs font-mono text-slate-300 block">
              You scored top {Math.max(1, 100 - peer.percentile)}% globally on this scenario type.
            </span>
          </div>
        )}

        {/* BOTTOM CTA ROW */}
        <div className="flex items-center gap-3 flex-wrap pt-2 pb-8">
          {isLastNode ? (
            <button
              onClick={onFinish}
              className="btn-liquid px-6 py-3 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.15)] outline-none"
            >
              Finish Session <CheckCircle2 size={14} />
            </button>
          ) : (
            <button
              onClick={onNext}
              className="btn-liquid px-6 py-3 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.15)] outline-none"
            >
              Next Node <kbd className="font-mono text-[9px] bg-black/10 px-1 py-0.5 rounded text-black/70">↵</kbd>
            </button>
          )}
          <button
            onClick={onRetry}
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 outline-none"
          >
            <RefreshCw size={13} /> Retry This Node
          </button>
          {currentAnswerId && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden sm:inline">Was this feedback helpful?</span>
              <button onClick={() => onRateFeedback(true)} className={`p-2 rounded-lg border ${feedbackRating === true ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                <ThumbsUp size={14} />
              </button>
              <button onClick={() => onRateFeedback(false)} className={`p-2 rounded-lg border ${feedbackRating === false ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                <ThumbsDown size={14} />
              </button>
            </div>
          )}
          <button
            onClick={onFinish}
            className="ml-auto bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white px-5 py-3 rounded-xl text-xs font-bold transition-all outline-none"
          >
            End Session
          </button>
        </div>

      </motion.div>
    </div>
  );
}
