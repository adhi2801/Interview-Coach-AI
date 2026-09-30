// The knowledge map: every topic laid out by subject (rows) and by how many
// prerequisites deep it sits (columns), coloured by what your scored answers
// actually showed. Select a topic to trace its chain; the side panel says
// what to learn, in what order.

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { AppHeader, Frame, PageIntro } from "../components/app/AppChrome";
import api from "../lib/api";
import { buildGraph, humanize, readyTopics, STATUS, summarize } from "./knowledge/graph";
import TopicMap, { StatusMark } from "./knowledge/TopicMap";
import Inspector from "./knowledge/Inspector";

function headline(stats) {
  if (!stats) return "Every topic, mapped by what it builds on.";
  if (stats.gaps && stats.blocked) {
    return `${stats.gaps} ${stats.gaps === 1 ? "gap is" : "gaps are"} holding back ${stats.blocked} ${stats.blocked === 1 ? "topic" : "topics"}.`;
  }
  if (stats.passed) return `You've shown ${stats.passed} of ${stats.total} topics.`;
  return `${stats.total} topics, mapped by what they build on.`;
}

function Legend({ stats, value, onChange }) {
  const items = [
    { id: STATUS.passed, label: "Shown", count: stats.passed },
    { id: STATUS.gap, label: "Gap", count: stats.gaps },
    { id: "ready", label: "Ready to learn", count: stats.ready },
    { id: STATUS.locked, label: "Locked", count: stats.locked },
    { id: STATUS.unattempted, label: "Not attempted", count: stats.unattempted },
  ];
  return (
    <div role="group" aria-label="Highlight topics by status" className="flex flex-wrap items-center gap-x-1 gap-y-1">
      {items.map((it) => {
        const on = value === it.id;
        return (
          <button key={it.id} type="button" aria-pressed={on} onClick={() => onChange(on ? null : it.id)}
            className={`flex items-center gap-2 px-2.5 py-1.5 text-[13px] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-indigo-300 ${
              on ? "bg-white/[0.08] text-white" : "text-white/65 hover:text-white"}`}>
            <StatusMark status={it.id === "ready" ? STATUS.unattempted : it.id} ready={it.id === "ready"} />
            {it.label}
            <span className="font-mono text-[11.5px] tabular-nums text-white/50">{it.count}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function StudyPlanBrowser({ onGoBack }) {
  const [topics, setTopics] = useState(null);
  const [error, setError] = useState("");
  // ?topic=name (from a study plan's "see it on the knowledge graph") preselects it.
  const [params] = useSearchParams();
  const [selected, setSelected] = useState(() => params.get("topic"));
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const inspectorRef = useRef(null);

  const load = () => {
    setError("");
    setTopics(null);
    api.get("/topics/status")
      .then((res) => setTopics(res.data?.topics || []))
      .catch((err) => setError(err.message || "Couldn't load the topic map."));
  };
  useEffect(load, []);

  const graph = useMemo(() => (topics?.length ? buildGraph(topics) : null), [topics]);
  // Drop a preselection that names no real topic.
  useEffect(() => { if (graph && selected && !graph.byName.has(selected)) setSelected(null); }, [graph, selected]);
  const stats = useMemo(() => (graph ? summarize(graph) : null), [graph]);
  const readySet = useMemo(() => new Set(graph ? readyTopics(graph).map((t) => t.name) : []), [graph]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !graph) return null;
    return new Set([...graph.byName.keys()].filter((n) => humanize(n).toLowerCase().includes(q)));
  }, [graph, query]);

  function select(name) {
    setSelected(name);
    // On narrow screens the panel sits under the map: bring it into view.
    if (name && window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => inspectorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searchBox = (
    <label className="relative block w-full sm:w-64">
      <span className="sr-only">Find a topic</span>
      <Search size={14} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a topic"
        className="w-full border border-white/10 bg-[#07070b] py-2 pl-9 pr-3 text-[13px] text-white placeholder:text-white/45 focus:border-indigo-400 focus:outline-none" />
    </label>
  );

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-transparent font-sans text-slate-200 selection:bg-indigo-500/40">
      <AppHeader back={{ label: "Overview", onClick: onGoBack }} />

      <PageIntro
        title={headline(stats)}
        subtitle="Each row is a subject; each column is how many prerequisites deep a topic sits. Colours come from your scored answers."
      />

      <Frame innerClassName="border-b border-white/[0.08]">
        <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          {stats ? <Legend stats={stats} value={statusFilter} onChange={setStatusFilter} /> : <span />}
          {searchBox}
        </div>
      </Frame>

      <Frame className="flex-1">
        {error ? (
          <div className="px-6 py-24 text-center">
            <p className="text-[15px] text-white/80">{error}</p>
            <button type="button" onClick={load} className="mt-4 border border-white/15 px-4 py-2 text-[13px] text-white hover:bg-white/[0.06]">
              Try again
            </button>
          </div>
        ) : !graph ? (
          <div aria-busy="true" aria-label="Loading the topic map" className="space-y-px p-6">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-16 animate-pulse bg-white/[0.03]" />)}
          </div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="min-w-0 border-b border-white/[0.08] lg:border-b-0 lg:border-r">
              <TopicMap graph={graph} selected={selected} onSelect={select} readySet={readySet}
                matches={matches} statusFilter={statusFilter} />
              {matches && matches.size === 0 && (
                <p className="px-6 py-4 text-[13px] text-white/55">No topic matches “{query}”.</p>
              )}
            </div>
            <aside ref={inspectorRef} aria-label="Topic details" className="scroll-mt-20 px-5 py-6 md:px-6 lg:sticky lg:top-16 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto" data-lenis-prevent>
              <Inspector graph={graph} selected={selected} readySet={readySet} onSelect={select} />
            </aside>
          </div>
        )}
      </Frame>
    </div>
  );
}
