// The middle of the interview room: the answer field with its prompt,
// inline errors and the hint, and the dock to speak, ask for a hint or submit.
import { Lightbulb, Mic, Send, Square } from "lucide-react";
import { MOD_KEY } from "../../lib/utils";

export default function AnswerCanvas({
  personaMeta, answer, onAnswerChange, timeUp, isBehavioral, constraints,
  isRecording, waveLevels, onStartRecording, onStopRecording, micError,
  scoringError, onDismissError, showHint, onToggleHint, loading, onSubmit,
}) {
  return (
    <div className="w-full lg:w-[48%] min-h-[420px] lg:h-full relative bg-[#05060c]/70 flex flex-col border-r border-white/[0.08] shrink-0">

      {/* Who's across the table, and the live voice level while recording. */}
      <div className="h-12 border-b border-white/[0.06] bg-white/[0.02] flex items-center px-4 md:px-6 gap-3 shrink-0">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: "var(--accent)", animation: "evalPulse 2s ease-in-out infinite" }}
        />
        <span className="text-sm font-bold text-white tracking-wide truncate">{personaMeta.name}</span>
        <span className="text-[13px] text-slate-400 ml-1 hidden sm:inline truncate">“{personaMeta.quote}”</span>
        {isRecording && (
          <div className="ml-auto flex items-end gap-[2px] h-4 shrink-0">
            {waveLevels.map((h, i) => (
              <div
                key={i}
                className="w-[2px] rounded-full transition-[height] duration-75"
                style={{ height: `${h}px`, background: "var(--accent)" }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Text Area */}
      <div className="flex-1 relative w-full min-h-[280px]">
        {scoringError && (
          <div role="alert" className="absolute top-2 left-8 right-8 z-20 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs text-rose-300 flex items-center justify-between gap-3">
            <span>{scoringError}</span>
            <button onClick={onDismissError} aria-label="Dismiss error" className="text-rose-400 hover:text-rose-200 shrink-0">✕</button>
          </div>
        )}
        {micError && !scoringError && (
          <div role="alert" className="absolute top-2 left-8 right-8 z-20 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200">
            {micError}
          </div>
        )}
        {showHint && constraints?.length > 0 && (
        <div className="absolute top-2 left-8 right-8 z-20 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200">
        <strong>Tip:</strong> Make sure your answer directly addresses: "{constraints[0]}"
        </div>
         )}
        <textarea
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          disabled={timeUp}
          aria-label="Your answer"
          placeholder={isBehavioral
            ? "Set the scene, say what you did and why, then the result and what you'd do differently."
            : "Start with what you'd clarify, then your approach, then the trade-offs and limits."}
          className="w-full h-full bg-transparent text-slate-100 placeholder:text-white/40 text-[16px] leading-[1.75] p-8 pb-32 resize-none outline-none z-10 relative scrollbar-hide"
          style={{ caretColor: "var(--accent)" }}
        />
      </div>

      {/* Action Dock */}
      <div className="lg:absolute lg:bottom-5 lg:left-5 lg:right-5 flex items-center justify-between z-20 glass p-3 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] m-4 lg:m-0">
        <div className="flex items-center gap-2">
          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            aria-pressed={isRecording}
            aria-label={isRecording ? "Stop recording" : "Answer by voice"}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all outline-none ${
              isRecording ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-white/[0.04] glass-control text-slate-200 hover:text-white'
            }`}
          >
            {isRecording ? <Square fill="currentColor" size={14}/> : <Mic size={14}/>}
            <span className="hidden sm:inline">{isRecording ? "Stop" : "Speak"}</span>
          </button>
          <button onClick={onToggleHint} aria-expanded={showHint} className="text-xs font-bold text-slate-300 hover:text-white transition-colors bg-white/5 glass-control px-3.5 py-2 rounded-xl">
          <Lightbulb size={13} aria-hidden="true" className="inline mr-1" /> Hint
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[13px] text-slate-400 tabular-nums hidden xl:block">
            {answer.trim() ? answer.trim().split(/\s+/).length : 0} words
          </span>
          <button
            onClick={onSubmit}
            disabled={loading}
            className={`relative overflow-hidden px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 outline-none ${
              loading ? "bg-white/10 text-slate-500 cursor-wait" : "btn-liquid shadow-[0_0_20px_rgba(255,255,255,0.15)]"
            }`}
          >
            {loading ? (
              <><span aria-hidden="true" className="w-3.5 h-3.5 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin inline-block" /> Scoring…</>
            ) : (
              <><Send size={13} aria-hidden="true" /> Submit answer <kbd className="hidden sm:inline font-mono text-[11px] bg-black/10 px-1.5 py-0.5 rounded ml-1 text-black/60">{MOD_KEY}+Enter</kbd></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
