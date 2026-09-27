// Side panel. With nothing selected it answers "where do I start?"; with a
// topic selected it explains its status, the order to learn its chain in,
// and what it unlocks. Descriptions come from /study-plan/{topic}.

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import api from "../../lib/api";
import { descendants, humanize, learningPath, STATUS } from "./graph";
import { StatusMark } from "./TopicMap";

const URGENCY_RANK = { critical: 3, high: 2, medium: 1, low: 0 };

function statusSentence(topic, graph, ready) {
  switch (topic.status) {
    case STATUS.passed:
      return "You've covered this well in a scored answer.";
    case STATUS.gap: {
      const urgency = topic.urgency && topic.urgency !== "low" ? ` (${topic.urgency} urgency)` : "";
      return `Flagged as a gap in your answers${urgency}. Work back through the chain below.`;
    }
    case STATUS.locked: {
      const missing = topic.prerequisites.filter((p) => graph.byName.get(p).status !== STATUS.passed);
      return `Locked until you've shown ${missing.map(humanize).join(", ") || "its prerequisites"}.`;
    }
    default:
      return ready ? "Ready: you've shown everything it depends on." : "Not attempted yet.";
  }
}

function TopicRow({ topic, ready, onSelect, children }) {
  return (
    <li>
      <button type="button" onClick={() => onSelect(topic.name)}
        className="flex w-full items-start gap-2.5 py-2 text-left text-[13.5px] text-white/80 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-indigo-300">
        <StatusMark status={topic.status} ready={ready} className="mt-[5px]" />
        <span className="min-w-0">
          <span className="block">{humanize(topic.name)}</span>
          {children}
        </span>
      </button>
    </li>
  );
}

function StartHere({ graph, readySet, onSelect }) {
  const gaps = [...graph.byName.values()]
    .filter((t) => t.status === STATUS.gap)
    .map((t) => ({ t, blocks: [...descendants(graph, t.name)].length }))
    .sort((a, b) => (URGENCY_RANK[b.t.urgency] ?? 0) - (URGENCY_RANK[a.t.urgency] ?? 0) || b.blocks - a.blocks)
    .slice(0, 5);
  const ready = [...readySet].map((n) => graph.byName.get(n))
    .sort((a, b) => (a.difficulty ?? 5) - (b.difficulty ?? 5)).slice(0, 6);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-white">Where to start</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/55">
          Select any topic on the map to trace what it depends on and what it unlocks.
        </p>
      </div>
      {gaps.length > 0 && (
        <section>
          <h3 className="text-[13px] font-medium text-amber-200">Fix these gaps first</h3>
          <ul className="mt-1 divide-y divide-white/[0.06]">
            {gaps.map(({ t, blocks }) => (
              <TopicRow key={t.name} topic={t} onSelect={onSelect}>
                {blocks > 0 && <span className="block text-[12px] text-white/50">Holds back {blocks} later {blocks === 1 ? "topic" : "topics"}</span>}
              </TopicRow>
            ))}
          </ul>
        </section>
      )}
      {ready.length > 0 && (
        <section>
          <h3 className="text-[13px] font-medium text-indigo-200">Ready to learn now</h3>
          <ul className="mt-1 divide-y divide-white/[0.06]">
            {ready.map((t) => <TopicRow key={t.name} topic={t} ready onSelect={onSelect} />)}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function Inspector({ graph, selected, readySet, onSelect }) {
  const [descriptions, setDescriptions] = useState({});

  useEffect(() => {
    if (!selected) return undefined;
    let cancelled = false;
    api.get(`/study-plan/${encodeURIComponent(selected)}`)
      .then((res) => {
        if (cancelled) return;
        const found = Object.fromEntries((res.data?.steps || []).map((s) => [s.name, s.description]).filter(([, d]) => d));
        setDescriptions((prev) => ({ ...prev, ...found }));
      })
      .catch(() => { /* descriptions are optional; the path still renders */ });
    return () => { cancelled = true; };
  }, [selected]);

  if (!selected) return <StartHere graph={graph} readySet={readySet} onSelect={onSelect} />;

  const topic = graph.byName.get(selected);
  const path = learningPath(graph, selected);
  const unlocks = graph.dependents.get(selected).map((n) => graph.byName.get(n));

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12.5px] text-white/50">{humanize(topic.category)}, level {topic.difficulty ?? "–"} of 10</p>
          <h2 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-white">{humanize(topic.name)}</h2>
        </div>
        <button type="button" onClick={() => onSelect(null)} aria-label="Close topic"
          className="mt-1 shrink-0 p-1 text-white/55 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-indigo-300">
          <X size={16} />
        </button>
      </div>
      <p className="mt-3 flex items-start gap-2.5 text-[14px] leading-relaxed text-white/75">
        <StatusMark status={topic.status} ready={readySet.has(selected)} className="mt-[6px]"
          urgent={topic.urgency === "critical" || topic.urgency === "high"} />
        <span>{statusSentence(topic, graph, readySet.has(selected))}</span>
      </p>

      {path.length > 1 && (
        <section className="mt-8">
          <h3 className="text-[13px] font-medium text-white/85">Learn in this order</h3>
          <ol className="mt-3">
            {path.map((name, i) => {
              const step = graph.byName.get(name);
              const last = i === path.length - 1;
              return (
                <li key={name} className="relative flex gap-3 pb-4 last:pb-0">
                  {!last && <span aria-hidden="true" className="absolute left-[9px] top-6 bottom-0 w-px bg-white/[0.12]" />}
                  <span className={`relative z-10 grid h-[19px] w-[19px] shrink-0 place-items-center border font-mono text-[10.5px] ${last ? "border-indigo-300 text-indigo-200" : "border-white/25 text-white/60"} bg-[#050507]`}>
                    {i + 1}
                  </span>
                  <button type="button" onClick={() => onSelect(name)} disabled={last}
                    className="min-w-0 text-left disabled:cursor-default focus-visible:outline focus-visible:outline-1 focus-visible:outline-indigo-300">
                    <span className={`flex items-center gap-2 text-[13.5px] ${last ? "text-white" : "text-white/80 hover:text-white"}`}>
                      <StatusMark status={step.status} ready={readySet.has(name)} />
                      {humanize(name)}
                    </span>
                    {descriptions[name] && <span className="mt-0.5 block text-[12.5px] leading-snug text-white/50">{descriptions[name]}</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {unlocks.length > 0 && (
        <section className="mt-8">
          <h3 className="text-[13px] font-medium text-white/85">Unlocks</h3>
          <ul className="mt-1 divide-y divide-white/[0.06]">
            {unlocks.map((t) => <TopicRow key={t.name} topic={t} ready={readySet.has(t.name)} onSelect={onSelect} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
