// Right pane while answering: live coaching from the socket (confidence,
// pace, filler words, and any prompt from the coach) and where the role's
// rating band sits. Scores aren't shown here: they only exist once graded.

import { AnimatePresence, motion } from "motion/react";

function Meter({ label, value, suffix, fraction, note, warn }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-white/75">{label}</span>
        <span className={`font-mono text-[14px] tabular-nums ${warn ? "text-amber-300" : "text-white"}`}>
          {value ?? "–"}{value != null && suffix}
        </span>
      </div>
      {fraction != null && (
        <div className="mt-1.5 h-[3px] bg-white/[0.07]">
          <motion.div className="h-full" style={{ background: "var(--accent)" }}
            animate={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        </div>
      )}
      {note && <p className="mt-1.5 text-[12px] leading-snug text-white/50">{note}</p>}
    </div>
  );
}

// Confidence from a sentence or two is noise; it's shown once there's
// enough of an answer to judge.
const CONFIDENCE_MIN_WORDS = 40;

export default function TelemetryPane({ personaMeta, liveCoaching, wsConnected, intervention, eloBand, currentElo, wordCount = 0, showCoaching = true }) {
  const fillers = liveCoaching?.filler_count ?? 0;
  const wpm = liveCoaching?.words_per_minute;
  const status = !wsConnected
    ? "Live coach offline, reconnecting…"
    : liveCoaching ? "Updates as you type or speak" : "Starts when you type or record";
  const enough = wordCount >= CONFIDENCE_MIN_WORDS || liveCoaching?.pace_source === "speech";
  const confidence = enough ? liveCoaching?.confidence_score : null;

  return (
    <aside aria-label="Live coaching" className="flex w-full shrink-0 flex-col gap-7 bg-[#07080f]/55 p-6 lg:w-[22%] lg:min-w-[250px]">
      <p className="border-b border-white/[0.08] pb-5 text-[13px] leading-relaxed text-white/60">{personaMeta.moodDesc}</p>

      {!showCoaching ? (
        <p className="text-[13px] leading-relaxed text-white/55">Live coaching is off. Turn it on in Settings to see confidence, pace and filler words while you answer.</p>
      ) : (
      <div className="space-y-6">
        <h3 className="text-[14px] font-semibold text-white">Live coaching</h3>
        <Meter label="Confidence" value={confidence} suffix="/10"
          fraction={confidence != null ? confidence / 10 : 0}
          note={!wsConnected || enough ? status : `Shown after about ${CONFIDENCE_MIN_WORDS} words (${wordCount} so far)`} />
        <Meter label="Pace" value={wpm ? Math.round(wpm) : null} suffix=" wpm"
          note={liveCoaching?.pace_source === "speech" ? "Speaking pace from your recording" : wpm ? "Typing speed; only speech is judged on pace" : "Measured as you type or speak"} />
        <Meter label="Filler words" value={fillers} warn={fillers > 3} note={'"um", "uh", "like", "basically", "actually"'} />

        <AnimatePresence>
          {intervention && (
            <motion.p role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="border-l-2 border-amber-300 pl-3 text-[13.5px] leading-relaxed text-amber-100">
              {intervention}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      )}

      {eloBand && (
        <div className="mt-auto border-t border-white/[0.08] pt-5">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="text-white/75">{eloBand.label}</span>
            <span className="font-mono tabular-nums text-white/85">{eloBand.low}–{eloBand.high}</span>
          </div>
          <div className="relative mt-2 h-[3px] bg-white/[0.07]">
            <span aria-hidden="true" className="absolute top-1/2 h-[9px] w-[3px] -translate-y-1/2 bg-white"
              style={{ left: `${Math.max(0, Math.min(100, ((currentElo - eloBand.low) / (eloBand.high - eloBand.low)) * 100))}%` }} />
          </div>
          <p className="mt-1.5 text-[12px] text-white/50">Your rating: {Math.round(currentElo)}</p>
        </div>
      )}
    </aside>
  );
}
