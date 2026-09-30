// The interview room's top bar: who you're interviewing with, time left on
// this question, where you are in the session, and the way out; then a
// progress strip with one segment per question.
import { CheckCircle2 } from "lucide-react";
import { TOTAL_NODES, formatTime } from "./constants";

export default function InterviewHeader({
  company, companyMeta, role, personaMeta, phase, timeLeft, questionNum, sessionElapsed, currentElo, onEndEarly,
}) {
  const PersonaIcon = personaMeta.icon;
  return (
    <>
    <header className="nav-glass h-14 flex items-center justify-between px-4 md:px-6 z-50 shrink-0 sticky top-0">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 bg-white flex items-center justify-center font-extrabold text-black text-[10px]">IC</div>
          <span className="text-white text-xs font-bold tracking-tight hidden sm:block">InterviewCoach</span>
        </div>
        <div className="w-px h-4 bg-white/10 hidden sm:block" />
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white text-[13.5px] font-medium flex items-center gap-1.5 shrink-0">
            {companyMeta ? <span className="shrink-0">{companyMeta.logo}</span> : <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />}
            {company?.name || "Target"}
          </span>
          <span className="text-slate-400 text-[13.5px] hidden md:inline truncate">
            {role || "Software Engineer"}
          </span>
          <span
            className="text-[13.5px] ml-1 hidden sm:flex items-center gap-1.5 shrink-0"
            style={{ color: "var(--accent)" }}
          >
            <PersonaIcon size={11} />
            {personaMeta.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6 shrink-0">
        {phase === "answering" ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[13px] hidden sm:block">Time left</span>
              <span className={`text-base font-bold tabular-nums font-mono ${timeLeft <= 20 ? "text-rose-400 animate-pulse" : timeLeft <= 60 ? "text-amber-400" : "text-white"}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2 hidden sm:flex">
              <span className="text-slate-400 text-[13px]">Question</span>
              <span className="text-sm font-mono font-bold text-white">{questionNum} of {TOTAL_NODES}</span>
            </div>
            <div className="w-px h-4 bg-white/10 hidden xl:block" />
            <div className="items-center gap-2 hidden xl:flex" title="Real time elapsed since this session started">
              <span className="text-slate-400 text-[13px]">Session</span>
              <span className="text-sm font-mono font-bold text-slate-300 tabular-nums">{formatTime(sessionElapsed)}</span>
            </div>
            <div className="w-px h-4 bg-white/10 hidden lg:block" />
            <div className="items-center gap-2 hidden lg:flex">
              <span className="text-slate-400 text-[13px]">Rating</span>
              <span className="text-sm font-mono font-bold text-slate-100 tabular-nums">{Math.round(currentElo)}</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <button onClick={onEndEarly} className="text-[13px] text-slate-300 hover:text-white glass-control rounded-lg px-3 py-1 hover:bg-white/[0.06] transition-colors">
              End early
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={16} />
              <span className="text-[13px] hidden sm:inline">Answer scored</span>
            </div>
          </>
        )}
      </div>
    </header>

    {/* One segment per question; the current one glows. */}
    <div className="h-[3px] w-full flex gap-[3px] shrink-0 z-40 bg-black/40">
      {Array.from({ length: TOTAL_NODES }).map((_, i) => (
        <div key={i} className="flex-1 h-full transition-colors duration-500"
          style={{
            background: i < questionNum - 1 ? `rgba(var(--accent-rgb), 0.6)`
              : i === questionNum - 1 ? "var(--accent)"
              : "rgba(255,255,255,0.06)",
            boxShadow: i === questionNum - 1 ? `0 0 6px var(--accent)` : "none"
          }}
        />
      ))}
    </div>
    </>
  );
}
