import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../config";

export default function StudyPlan({ topicName, company, onClose }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await axios.get(`${API_URL}/study-plan/${topicName}`, {
          params: { company }
        });
        setPlan(res.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    fetchPlan();
  }, [topicName, company]);

  if (loading) {
    return (
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-5"
        onClick={onClose}
      >
        <div
          className="bg-black border border-white/[0.08] rounded-2xl p-8 max-w-[560px] w-full shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-slate-500 text-sm text-center">Building your study path...</p>
        </div>
      </div>
    );
  }

  if (!plan || !plan.steps?.length) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-5"
      onClick={onClose}
    >
      <div
        className="bg-black border border-white/[0.08] rounded-2xl p-8 max-w-[560px] w-full max-h-[80vh] overflow-y-auto shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-blue-500 text-[11px] font-bold uppercase tracking-widest mb-1">Study Path</p>
            <h2 className="text-white text-[22px] font-extrabold capitalize tracking-tight">
              {topicName.replace(/_/g, " ")}
            </h2>
          </div>
          <button
            className="text-zinc-600 text-2xl leading-none hover:text-white transition-colors"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <p className="text-zinc-500 text-[13px] leading-relaxed mb-6">
          {plan.steps.length} concepts to master, in the order our knowledge graph
          determined you need them — each step unlocks the next.
        </p>

        <div className="flex flex-col">
          {plan.steps.map((step, i) => {
            const isTarget = i === plan.steps.length - 1;
            const relevance =
              step.company_relevance >= 1.6 ? { label: `Critical for ${company}`, color: "text-red-400 border-red-400/25" } :
              step.company_relevance >= 1.3 ? { label: `Important for ${company}`, color: "text-amber-400 border-amber-400/25" } :
              step.company_relevance <= 0.6 ? { label: "Lower priority", color: "text-slate-500 border-slate-500/25" } :
              { label: "Standard", color: "text-blue-400 border-blue-400/25" };

            return (
              <div key={step.name} className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-[13px] font-bold tabular-nums flex-shrink-0 ${
                      isTarget
                        ? "bg-blue-600 text-white"
                        : "bg-white/[0.06] border border-white/10 text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < plan.steps.length - 1 && (
                    <div className="w-0.5 flex-1 bg-white/[0.08] min-h-[24px]" />
                  )}
                </div>

                <div className="pb-6 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`capitalize ${isTarget ? "text-indigo-300 text-base font-extrabold" : "text-slate-200 text-[15px] font-semibold"}`}>
                      {step.name.replace(/_/g, " ")}
                    </span>
                    <span className="bg-white/[0.06] text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums">
                      L{step.difficulty}
                    </span>
                    {company && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wide ${relevance.color}`}>
                        {relevance.label}
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-500 text-[13px] leading-relaxed">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}