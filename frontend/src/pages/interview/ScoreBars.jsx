// Five-dimension scores as uniform bars, coloured by the score itself
// (7 is a pass: under 6 amber, 8+ green), each with the grader's sentence
// where there is one. Shared by the debrief and the session replay.

export const DIMENSIONS = [
  { key: "score_technical", label: "Technical depth", feedback: "technical_feedback" },
  { key: "score_problem_solving", label: "Problem solving", feedback: "problem_solving_feedback" },
  { key: "score_communication", label: "Communication", feedback: "communication_feedback" },
  { key: "score_cultural_fit", label: "Culture fit" },
  { key: "score_confidence", label: "Confidence" },
];

export function overallScore(scores) {
  const values = DIMENSIONS.map((d) => scores?.[d.key]).filter((v) => typeof v === "number");
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export default function ScoreBars({ scores, flagged = false, extraNote }) {
  return (
    <ul className="divide-y divide-white/[0.06]">
      {DIMENSIONS.map((d) => {
        const v = scores?.[d.key];
        const tone = flagged ? "bg-rose-300/70" : v < 6 ? "bg-amber-300" : v >= 8 ? "bg-emerald-300" : "bg-indigo-300/80";
        const note = (d.feedback && scores?.[d.feedback]) || extraNote?.(d.key) || null;
        return (
          <li key={d.key} className="grid gap-x-6 gap-y-1.5 py-4 md:grid-cols-[11rem_minmax(0,1fr)_3.5rem] md:items-center">
            <span className="text-[14.5px] text-white">{d.label}</span>
            <span className="order-3 md:order-none">
              <span className="block h-[3px] bg-white/[0.07]">
                <span className={`block h-full ${tone}`} style={{ width: `${Math.max(2, Math.min(100, (v ?? 0) * 10))}%` }} />
              </span>
              {note && <span className="mt-2 block text-[13px] leading-snug text-white/60">{note}</span>}
            </span>
            <span className="font-mono text-[14px] tabular-nums text-white/85 md:text-right">{typeof v === "number" ? v.toFixed(1) : "–"}</span>
          </li>
        );
      })}
    </ul>
  );
}
