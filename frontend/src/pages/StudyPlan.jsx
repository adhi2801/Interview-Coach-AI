// Study plan for one topic, as a side sheet: the prerequisite chain in the
// order to learn it, each step's real status, and — when a company is set —
// how much that company weighs it. Opened from the overview's gap list and
// the interview debrief.

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, X } from "lucide-react";
import api, { hasSession } from "../lib/api";
import { useTransitionNavigate } from "../lib/navigation";
import { humanize } from "./knowledge/graph";
import { StatusMark } from "./knowledge/TopicMap";

const STATUS_WORDS = { passed: "Shown in your answers", gap: "Gap in your answers", locked: "Locked" };

function relevance(weight, company) {
  if (!company || weight == null) return null;
  const name = company.charAt(0).toUpperCase() + company.slice(1);
  if (weight >= 1.6) return { text: `Weighed heavily at ${name}`, tone: "text-amber-200" };
  if (weight >= 1.3) return { text: `Matters at ${name}`, tone: "text-indigo-200" };
  return null;
}

export default function StudyPlan({ topicName, company, onClose }) {
  const navigate = useTransitionNavigate();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [statuses, setStatuses] = useState(null); // null = unknown, never "all unattempted"
  const closeRef = useRef(null);
  const titleId = `study-plan-${topicName}`;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [onClose]);

  const load = () => {
    setError("");
    setPlan(null);
    api.get(`/study-plan/${encodeURIComponent(topicName)}`, { params: { company } })
      .then((res) => {
        if (!res.data?.steps?.length) throw new Error("This topic has no study plan yet.");
        setPlan(res.data);
      })
      .catch((err) => setError(err.message || "Couldn't load the study plan."));
  };
  useEffect(load, [topicName, company]);

  useEffect(() => {
    if (!hasSession()) return;
    api.get("/topics/status")
      .then((res) => setStatuses(Object.fromEntries((res.data?.topics || []).map((t) => [t.name, t.status]))))
      .catch(() => setStatuses(null));
  }, []);

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end" onClick={onClose}>
      <motion.div aria-hidden="true" className="absolute inset-0 bg-black/60"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
      <motion.section
        role="dialog" aria-modal="true" aria-labelledby={titleId}
        initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full max-w-[34rem] flex-col border-l border-white/[0.1] bg-[#050507]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-6 py-6 md:px-8">
          <div className="min-w-0">
            <p className="text-[13px] text-white/55">Study plan</p>
            <h2 id={titleId} className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-white">{humanize(topicName)}</h2>
            {plan && (
              <p className="mt-2 text-[13.5px] text-white/60">
                {plan.steps.length === 1 ? "No prerequisites: start here." : `${plan.steps.length} steps, foundations first.`}
              </p>
            )}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close study plan"
            className="shrink-0 p-1.5 text-white/60 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-indigo-300">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8" data-lenis-prevent>
          {error ? (
            <div>
              <p className="text-[14.5px] text-white/80">{error}</p>
              <button type="button" onClick={load} className="mt-4 glass-control rounded-lg px-4 py-2 text-[13px] text-white hover:bg-white/[0.06]">
                Try again
              </button>
            </div>
          ) : !plan ? (
            <div aria-busy="true" aria-label="Loading the study plan" className="space-y-4">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse bg-white/[0.03]" />)}
            </div>
          ) : (
            <ol>
              {plan.steps.map((step, i) => {
                const last = i === plan.steps.length - 1;
                const status = statuses?.[step.name];
                const weight = relevance(step.company_relevance, company);
                return (
                  <li key={step.name} className="relative flex gap-4 pb-7 last:pb-0">
                    {!last && <span aria-hidden="true" className="absolute left-[11px] top-7 bottom-0 w-px bg-white/[0.12]" />}
                    <span className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center border bg-[#050507] font-mono text-[11.5px] ${
                      last ? "border-indigo-300 text-indigo-100" : "border-white/25 text-white/65"}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <h3 className={`flex items-center gap-2 text-[15px] ${last ? "font-semibold text-white" : "text-white/90"}`}>
                        {status && <StatusMark status={status} />}
                        {humanize(step.name)}
                      </h3>
                      {step.description && <p className="mt-1 text-[13.5px] leading-relaxed text-white/60">{step.description}</p>}
                      <p className="mt-1.5 flex flex-wrap gap-x-3 text-[12.5px] text-white/50">
                        {step.difficulty != null && <span>Level {step.difficulty} of 10</span>}
                        {status && STATUS_WORDS[status] && <span>{STATUS_WORDS[status]}</span>}
                        {weight && <span className={weight.tone}>{weight.text}</span>}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-white/[0.08] px-6 py-4 md:px-8">
          <button type="button" onClick={() => { onClose(); navigate(`/study-plan?topic=${encodeURIComponent(topicName)}`); }}
            className="flex items-center gap-1.5 text-[13.5px] text-indigo-200 hover:text-white">
            See it on the knowledge graph <ArrowUpRight size={14} aria-hidden="true" />
          </button>
          <button type="button" onClick={onClose} className="glass-control rounded-lg px-4 py-2 text-[13.5px] font-medium text-white hover:bg-white/[0.06]">
            Done
          </button>
        </footer>
      </motion.section>
    </div>
  );
}
