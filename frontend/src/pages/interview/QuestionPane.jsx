import { Terminal } from "lucide-react";
import { formatCategory } from "./constants";

// Left pane: the scenario, constraints and the ask.
export default function QuestionPane({
  question, category, scenario, constraints, ask, personaMeta,
}) {
  return (
    <div tabIndex={0} role="region" aria-label="Interview question" className="w-full lg:w-[30%] lg:h-full overflow-y-auto border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#0a0a10]/90 p-6 lg:p-8 flex flex-col shrink-0">
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3.5 mb-6">
        <Terminal size={16} className="shrink-0" style={{ color: "var(--accent)" }} />
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">The Question</h3>
        <span className="ml-auto bg-white/5 border border-white/10 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest text-slate-300">
          {formatCategory(category)}
        </span>
      </div>

      {scenario ? (
        <div className="flex-1 flex flex-col space-y-7">
          <div>
            <h4 className="text-[10px] font-bold tracking-widest text-slate-300 uppercase mb-2.5">Context</h4>
            <p className="text-sm text-slate-200 leading-[1.7] font-medium">{scenario}</p>
          </div>

          {constraints?.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold tracking-widest text-slate-300 uppercase mb-2.5">Constraints</h4>
              <ul className="space-y-3">
                {constraints.map((c, i) => (
                  <li key={i} className="text-sm text-slate-200 font-medium flex items-start gap-2.5 leading-[1.6]">
                    <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "var(--accent)" }} />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ask && (
            <div
              className="mt-auto pt-5 border-t rounded-xl p-4 -mx-1"
              style={{ borderColor: "transparent", background: `rgba(var(--accent-rgb), 0.06)` }}
            >
              <h4 className="text-[10px] font-bold tracking-widest uppercase mb-2 px-1" style={{ color: "var(--accent)" }}>
                {personaMeta.askLabel}
              </h4>
              <p className="text-sm md:text-[15px] font-bold text-white leading-[1.7] px-1">{ask}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm md:text-[15px] text-slate-200 leading-[1.7] font-medium">{question}</p>
      )}
    </div>
  );
}
