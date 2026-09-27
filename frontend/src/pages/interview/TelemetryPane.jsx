import { AnimatePresence, motion } from "motion/react";
import { Activity, AlertTriangle } from "lucide-react";

// Right pane while answering: live coaching from the socket, and the
// role's ELO band. Real data only — scores stay "Pending" until graded.
export default function TelemetryPane({
  personaMeta, liveCoaching, wsConnected, intervention, eloBand, currentElo,
}) {
  const PersonaIcon = personaMeta.icon;

  return (
    <div className="w-full lg:w-[22%] lg:min-w-[240px] bg-[#0a0a10]/90 p-6 flex flex-col shrink-0">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5 mb-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">Session Telemetry</h3>
        <Activity size={16} style={{ color: "var(--accent)" }} />
      </div>

      <div className="space-y-6">
        {/* Room mood — reflects real persona, not a live-changeable state */}
        <div className="flex items-center gap-3 pb-5 border-b border-white/[0.06]">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center border shrink-0"
            style={{ background: `rgba(var(--accent-rgb), 0.12)`, borderColor: `rgba(var(--accent-rgb), 0.25)` }}
          >
            <PersonaIcon size={16} style={{ color: "var(--accent)" }} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{personaMeta.label}</div>
            <div className="text-[10px] text-slate-400 truncate">{personaMeta.moodDesc}</div>
          </div>
        </div>

        {/* Confidence Widget */}
        <div>
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Confidence</span>
            <span className="text-sm font-bold text-white tabular-nums">{liveCoaching?.confidence_score || '--'}/10</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div className="h-full" style={{ background: "var(--accent)" }} animate={{ width: `${(liveCoaching?.confidence_score || 0) * 10}%` }} transition={{ type: "spring", stiffness: 100 }} />
          </div>
          <p className="text-[9.5px] text-slate-600 mt-1">
            {!wsConnected
              ? "Live coach offline · reconnecting…"
              : liveCoaching ? "Updates as you type or speak" : "Starts when you type or record"}
          </p>
        </div>

        {/* Pace Widget */}
        <div>
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Pace (WPM)</span>
            <span className="text-sm font-bold text-white tabular-nums">{liveCoaching?.words_per_minute || '--'}</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div className="h-full bg-blue-400" animate={{ width: `${Math.min((liveCoaching?.words_per_minute || 0) / 2, 100)}%` }} transition={{ type: "spring", stiffness: 100 }} />
          </div>
          <p className="text-[9.5px] text-slate-600 mt-1">
            {liveCoaching?.pace_source === "speech"
              ? "Speaking pace from your recording"
              : liveCoaching?.words_per_minute
                ? "Typing speed · only speech is judged on pace"
                : "Measured as you type or speak"}
          </p>
        </div>

        {/* Fillers Detected */}
        <div>
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Fillers Detected</span>
            <span className={`text-sm font-bold tabular-nums ${(liveCoaching?.filler_count || 0) > 3 ? 'text-amber-400' : 'text-white'}`}>{liveCoaching?.filler_count || 0}</span>
          </div>
          <p className="text-[9.5px] text-slate-600">"um", "uh", "like", "basically", "actually"</p>
        </div>

        {/* Intervention Toast */}
        <AnimatePresence>
          {intervention && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle size={14} className="text-amber-400" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Coach Probe</span>
              </div>
              <p className="text-xs md:text-sm font-medium text-amber-200/90 leading-relaxed">{intervention}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Score Preview — labels shown for visual parity with the
          design, but every value stays "Pending" until scoring
          actually returns real numbers. No simulated/fake scores. */}
      <div className="mt-6 pt-5 border-t border-white/[0.06]">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300 block mb-3">Score Preview</span>
        <div className="space-y-2.5">
          {["Technical Accuracy", "Problem Solving", "Communication", "Culture Fit", "Confidence"].map((label) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">{label}</span>
              <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider">Pending</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-600 italic mt-3">Scores are computed after you submit — not simulated live.</p>
      </div>

      {/* Bottom Target ELO — same real /roles/elo-bands source as
          Session Setup. Omitted entirely if no real band exists for
          this role, rather than showing an invented threshold. */}
      {eloBand && (
        <div className="mt-6 lg:mt-auto pt-5 border-t border-white/[0.08]">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">{eloBand.label}</span>
            <span className="text-sm font-mono font-bold text-white">{eloBand.low}–{eloBand.high}</span>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-linear-to-r from-indigo-500 to-purple-500 rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, ((currentElo - eloBand.low) / (eloBand.high - eloBand.low)) * 100))}%` }} />
          </div>
        </div>
      )}

    </div>
  );
}
