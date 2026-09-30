// The map itself: one lane per subject, one column per prerequisite depth.
// Selecting (or hovering) a topic draws its whole prerequisite chain as
// right-angled traces behind the nodes and dims everything unrelated.

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ancestors, humanize, STATUS } from "./graph";

const COLUMN_LABELS = ["No prerequisites", "1 step in", "2 steps in", "3 steps in", "4 steps in", "5 steps in"];
const columnLabel = (d) => COLUMN_LABELS[d] ?? `${d} steps in`;

// A status dot per topic (see the legend on the page): filled when your
// answers settled it — green shown, amber gap — a ring when it's open to
// you, and a faint dot when its prerequisites aren't shown yet. Round, so
// it reads as a status and not as a checkbox to tick.
export function StatusMark({ status, ready, urgent, className = "" }) {
  const base = "inline-block h-[9px] w-[9px] shrink-0 rounded-full";
  if (status === STATUS.passed) return <span aria-hidden="true" className={`${base} bg-emerald-400 ${className}`} />;
  if (status === STATUS.gap) {
    return (
      <span aria-hidden="true" className={`${base} bg-amber-400 ${urgent ? "outline outline-1 outline-offset-2 outline-amber-400/70" : ""} ${className}`} />
    );
  }
  if (status === STATUS.locked) return <span aria-hidden="true" className={`${base} scale-[0.6] bg-white/35 ${className}`} />;
  return <span aria-hidden="true" className={`${base} border-[1.5px] ${ready ? "border-indigo-300" : "border-white/45"} ${className}`} />;
}

const STATUS_WORDS = {
  passed: "shown in your answers",
  gap: "gap in your answers",
  locked: "locked",
  unattempted: "not attempted yet",
};

export default function TopicMap({ graph, selected, onSelect, readySet, matches, statusFilter }) {
  const containerRef = useRef(null);
  const nodeRefs = useRef(new Map());
  const [hovered, setHovered] = useState(null);
  const [traces, setTraces] = useState([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // Subjects with no evidence yet (nothing shown or missed in your answers)
  // fold to one line, so the map leads with what you've actually touched.
  const [unfolded, setUnfolded] = useState(() => new Set());
  const [showAll, setShowAll] = useState(false);

  const focus = hovered || selected;
  const chain = useMemo(() => (focus ? ancestors(graph, focus) : null), [graph, focus]);
  const unlocks = useMemo(() => new Set(focus ? graph.dependents.get(focus) : []), [graph, focus]);

  const isDimmed = (name, status) => {
    if (focus) return !(name === focus || chain.has(name) || unlocks.has(name));
    if (matches) return !matches.has(name);
    if (statusFilter) return statusFilter === "ready" ? !readySet.has(name) : status !== statusFilter;
    return false;
  };

  // Right-angled traces from each prerequisite's right edge to its
  // dependent's left edge, with the bend just before the dependent.
  const measure = useCallback(() => {
    const box = containerRef.current;
    if (!box) return;
    setSize({ w: box.scrollWidth, h: box.scrollHeight });
    // Phones stack lanes vertically, where bent traces would double back.
    if (!focus || window.matchMedia("(max-width: 767px)").matches) return setTraces([]);
    const origin = box.getBoundingClientRect();
    const at = (name) => {
      const el = nodeRefs.current.get(name);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        left: r.left - origin.left + box.scrollLeft, right: r.right - origin.left + box.scrollLeft,
        mid: r.top - origin.top + box.scrollTop + r.height / 2,
      };
    };
    const path = (from, to) => {
      const a = at(from), b = at(to);
      if (!a || !b) return null;
      const bend = b.left - 12;
      const r = Math.min(6, Math.abs(b.mid - a.mid) / 2);
      if (r < 1) return `M${a.right},${a.mid} H${b.left}`;
      const dir = b.mid > a.mid ? 1 : -1;
      return `M${a.right},${a.mid} H${bend - r} Q${bend},${a.mid} ${bend},${a.mid + dir * r}` +
             ` V${b.mid - dir * r} Q${bend},${b.mid} ${bend + r},${b.mid} H${b.left}`;
    };
    const lines = [];
    for (const name of [focus, ...chain]) {
      for (const p of graph.byName.get(name).prerequisites) {
        const d = path(p, name);
        if (d) lines.push({ key: `${p}>${name}`, d, kind: "chain" });
      }
    }
    for (const dep of unlocks) {
      const d = path(focus, dep);
      if (d) lines.push({ key: `${focus}>${dep}`, d, kind: "unlocks" });
    }
    setTraces(lines);
  }, [graph, focus, chain, unlocks]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const touched = (lane) => lane.columns.some((col) => col.some((t) => t.status === STATUS.passed || t.status === STATUS.gap));
  // A folded subject opens by itself when a search, a selection, its trace
  // or a status filter needs one of its topics on screen.
  const needed = (lane) => Boolean(statusFilter) || lane.columns.some((col) => col.some((t) =>
    (matches && matches.has(t.name)) || t.name === focus || (chain && chain.has(t.name)) || unlocks.has(t.name)));
  const isOpen = (lane) => showAll || touched(lane) || unfolded.has(lane.category) || needed(lane);
  const folded = graph.lanes.filter((lane) => !isOpen(lane)).length;
  // Subjects you've touched first, in the graph's order; the rest after.
  const lanes = [...graph.lanes.filter(touched), ...graph.lanes.filter((lane) => !touched(lane))];

  const columns = graph.maxDepth + 1;
  // Names wrap rather than truncate, so all six depths fit beside the
  // inspector on a laptop without scrolling sideways.
  const grid = { gridTemplateColumns: `8.5rem repeat(${columns}, minmax(7.25rem, 1fr))` };

  return (
    <div
      ref={containerRef}
      className="relative bg-[#050507] md:overflow-x-auto"
      data-lenis-prevent
      onMouseLeave={() => setHovered(null)}
    >
      <div className="relative md:min-w-[52rem]">
        <svg aria-hidden="true" className="pointer-events-none absolute left-0 top-0" width={size.w} height={size.h}>
          {traces.map((t) => (
            <path
              key={`${focus}:${t.key}`}
              d={t.d}
              pathLength="1"
              fill="none"
              className={t.kind === "chain" ? "km-trace stroke-indigo-300" : "stroke-white/35"}
              strokeWidth={t.kind === "chain" ? 1.25 : 1}
              strokeDasharray={t.kind === "unlocks" ? "0.012 0.012" : undefined}
            />
          ))}
        </svg>

        {/* Column heads: how many prerequisites deep. Phones stack instead. */}
        <div className="relative z-20 hidden border-b border-white/[0.08] bg-[#050507] md:grid" style={grid}>
          <div className="sticky left-0 z-10 bg-[#050507] px-4 py-3 text-[12px] text-white/50">Subject</div>
          {Array.from({ length: columns }, (_, d) => (
            <div key={d} className="whitespace-nowrap border-l border-white/[0.06] px-2.5 py-3 font-mono text-[11px] text-white/55">
              {columnLabel(d)}
            </div>
          ))}
        </div>

        {lanes.map((lane, laneIndex) => !isOpen(lane) ? (
          <div key={lane.category} className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 ${laneIndex ? "border-t border-white/[0.06]" : ""}`}>
            <p className="text-[13.5px] font-medium text-white/80">{humanize(lane.category)}</p>
            <p className="text-[13px] text-white/50">
              {lane.count} topics, none tried yet
              {(() => { const n = lane.columns.flat().filter((t) => readySet.has(t.name)).length; return n ? `; ${n} ready to start` : ""; })()}
            </p>
            <button type="button" onClick={() => setUnfolded((s) => new Set(s).add(lane.category))}
              aria-expanded="false" aria-label={`Show ${humanize(lane.category)} topics`}
              className="ml-auto rounded-md px-2 py-1 text-[13px] text-indigo-200 hover:bg-white/[0.05] hover:text-white">
              Show topics
            </button>
          </div>
        ) : (
          <div
            key={lane.category}
            className={`relative md:grid ${laneIndex ? "border-t border-white/[0.06]" : ""}`}
            style={grid}
          >
            <div className="bg-[#050507] px-4 pb-1 pt-4 md:sticky md:left-0 md:z-20 md:pb-4">
              <p className="text-[13.5px] font-medium text-white/85">{humanize(lane.category)}</p>
              <p className="mt-0.5 font-mono text-[11px] text-white/50">{lane.count} topics</p>
            </div>
            {lane.columns.map((topics, d) => (
              <div key={d} className={`relative z-10 px-4 md:border-l md:border-white/[0.06] md:px-2.5 md:py-4 ${topics.length ? "py-1.5" : "hidden md:block"}`}>
                <p className="mb-1 font-mono text-[10.5px] text-white/50 md:hidden">{columnLabel(d)}</p>
                <ul className="flex flex-wrap gap-1.5 md:flex-col md:flex-nowrap md:items-start">
                  {topics.map((t, i) => {
                    const dim = isDimmed(t.name, t.status);
                    const active = t.name === selected;
                    const ready = readySet.has(t.name);
                    const urgent = t.status === STATUS.gap && (t.urgency === "critical" || t.urgency === "high");
                    return (
                      <li key={t.name} className="km-node-in max-w-full" style={{ animationDelay: `${120 + d * 90 + i * 12}ms` }}>
                        <button
                          ref={(el) => (el ? nodeRefs.current.set(t.name, el) : nodeRefs.current.delete(t.name))}
                          type="button"
                          onClick={() => onSelect(active ? null : t.name)}
                          onMouseEnter={() => setHovered(t.name)}
                          onFocus={() => setHovered(t.name)}
                          onBlur={() => setHovered(null)}
                          aria-pressed={active}
                          data-dimmed={dim}
                          aria-label={`${humanize(t.name)}, ${ready ? "ready to learn" : STATUS_WORDS[t.status]}`}
                          className={`flex max-w-full items-start gap-2 bg-[#050507] py-1 pl-1.5 pr-2 text-left text-[13px] leading-snug transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-indigo-300 ${
                            active ? "text-white shadow-[inset_0_0_0_1px_rgba(165,180,252,0.9)]"
                              : dim ? "text-white/50 hover:text-white" : "text-white/90 hover:text-white"}`}
                        >
                          {/* Dimmed by colour, not opacity: labels stay readable (WCAG AA)
                              and the chip's opaque ground keeps traces tucked behind it. */}
                          <StatusMark status={t.status} ready={ready} urgent={urgent}
                            className={`mt-[4px] transition-opacity duration-200 ${dim ? "opacity-30" : ""}`} />
                          <span>{humanize(t.name)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ))}

        {(folded > 0 || showAll) && (
          <div className="border-t border-white/[0.08] px-4 py-3 text-[13px] text-white/55">
            {showAll ? (
              <button type="button" onClick={() => { setShowAll(false); setUnfolded(new Set()); }} className="text-indigo-200 hover:text-white">
                Fold the subjects you haven't tried yet
              </button>
            ) : (
              <>
                {folded} {folded === 1 ? "subject you haven't tried is" : "subjects you haven't tried are"} folded.{" "}
                <button type="button" onClick={() => setShowAll(true)} className="text-indigo-200 hover:text-white">Show every subject</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
