// The coding room's left pane: the problem statement, its complexity
// targets, examples, and hints on request.
import { motion } from "motion/react";
import { Activity, Lightbulb } from "lucide-react";

export default function ProblemPane({ problem, hints, onHint }) {
  const examples = problem.sample_test_cases || [];
  const targets = [
    problem.time_complexity_target && `${problem.time_complexity_target} time`,
    problem.space_complexity_target && `${problem.space_complexity_target} space`,
  ].filter(Boolean);
  return (
    <section tabIndex={0} aria-label="Problem" className="h-full overflow-y-auto p-6 space-y-7 scrollbar-hide outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/20">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-white mb-2 leading-snug">{problem.title}</h1>
        {targets.length > 0 && (
          <p className="text-[13px] text-emerald-300 mb-4">Aim for {targets.join(" and ")}.</p>
        )}
        <p className="text-sm text-slate-200 leading-[1.7] whitespace-pre-line">{problem.description}</p>
      </div>

      {(problem.input_format || problem.output_format) && (
        <dl className="space-y-3 text-sm">
          {problem.input_format && (
            <div><dt className="text-[12.5px] text-white/55 mb-1">Input</dt><dd className="text-slate-200 leading-relaxed">{problem.input_format}</dd></div>
          )}
          {problem.output_format && (
            <div><dt className="text-[12.5px] text-white/55 mb-1">Output</dt><dd className="text-slate-200 leading-relaxed">{problem.output_format}</dd></div>
          )}
        </dl>
      )}

      {problem.constraints?.length > 0 && (
        <div>
          <h2 className="text-[12.5px] text-white/55 mb-2">Constraints</h2>
          <ul className="space-y-1.5">
            {problem.constraints.map((c, i) => (
              <li key={i} className="text-[13px] font-mono text-slate-300 flex items-start gap-2.5">
                <span aria-hidden="true" className="w-1 h-1 rounded-full bg-slate-500 mt-2 shrink-0" />{c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {examples.length > 0 && (
        <div>
          <h2 className="text-[12.5px] text-white/55 mb-2">Examples</h2>
          <ol className="space-y-2.5">
            {examples.map((tc, idx) => (
              <li key={idx} className="glass-control rounded-xl p-3">
                <p className="text-[12.5px] text-slate-400 mb-1.5">Example {idx + 1}</p>
                <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-[13px]">
                  <dt className="text-white/55">Input</dt><dd className="font-mono text-white whitespace-pre-wrap break-all">{tc.input}</dd>
                  <dt className="text-white/55">Output</dt><dd className="font-mono text-white whitespace-pre-wrap break-all">{tc.expected_output}</dd>
                </dl>
              </li>
            ))}
          </ol>
        </div>
      )}

      <section aria-labelledby="coding-hints" className="pt-5 border-t border-white/[0.08] space-y-3">
        <h2 id="coding-hints" className="text-[14px] font-semibold text-white flex items-center gap-2">
          <Lightbulb size={14} aria-hidden="true" className="text-amber-300" /> Hints
        </h2>
        {hints.cards.length === 0 && (
          <p className="text-[13px] text-slate-400 leading-relaxed">A hint looks at your current code and nudges you toward the next step without giving the answer.</p>
        )}
        {hints.cards.length > 0 && (
          <ol className="space-y-2">
            {hints.cards.map((hint, i) => (
              <motion.li key={i} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="border-l-2 border-amber-300/60 pl-3 text-[13.5px] text-slate-200 leading-relaxed">
                <span className="block text-[12.5px] text-amber-200/80 mb-0.5">Hint {i + 1}</span>{hint}
              </motion.li>
            ))}
          </ol>
        )}
        {hints.error && (
          <p role="alert" className="text-[13px] text-amber-200">Couldn't get a hint just now. Try again in a moment.</p>
        )}
        <button type="button" onClick={onHint} disabled={hints.loading}
          className="flex items-center gap-2 px-3 py-1.5 glass-control rounded-lg text-[13px] text-slate-200 hover:text-white hover:bg-white/[0.06] disabled:opacity-60 transition-colors">
          {hints.loading ? <><Activity size={12} aria-hidden="true" className="animate-spin" /> Thinking of a hint…</> : hints.cards.length ? "Another hint" : "Get a hint"}
        </button>
      </section>
    </section>
  );
}
