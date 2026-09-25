// frontend/src/pages/landing/FeatureTabs.jsx
//
// Auto-advancing feature tabs with a progress rail (pauses on hover/focus),
// each paired with a live mini-demo of the real product surface. Only the
// active demo runs; the progress bar is a CSS transform animation.

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { BrainCircuit, CheckCircle2, Code2, Mic, Network, XCircle } from "lucide-react";
import { COMPANY_SIM_DATA, DEMO_KEYS } from "./content";
import { cn } from "../../lib/utils";
import { ease } from "../../lib/motion";

const DURATION = 7000;

const TABS = [
  {
    id: "adaptive",
    icon: BrainCircuit,
    label: "Adaptive interviewer",
    title: "Asks what they would ask.",
    body: "Seven company profiles and four interviewer personas shape every question. Scenarios are generated fresh for your role and rating — never a list you can memorise.",
    tags: ["7 company profiles", "4 personas", "ELO-matched"],
  },
  {
    id: "coding",
    icon: Code2,
    label: "Live coding",
    title: "Real code. Real tests.",
    body: "Python, JavaScript, Java or C++ in a full editor. Run against sample cases, then submit against hidden tests in a sandbox. Hints nudge without writing code for you.",
    tags: ["25 problems", "4 languages", "Hidden tests"],
  },
  {
    id: "voice",
    icon: Mic,
    label: "Voice coaching",
    title: "Hear how you actually sound.",
    body: "Answer out loud. Your speech is transcribed live while pace, filler words and hesitation are tracked — with a nudge when you stall.",
    tags: ["Live transcript", "Pace & fillers", "Replays"],
  },
  {
    id: "graph",
    icon: Network,
    label: "Knowledge graph",
    title: "Know exactly what to study next.",
    body: "A missed answer is traced back through 93 connected topics to the prerequisite you're actually missing, ordered by what your target company weighs most.",
    tags: ["93 topics", "Prerequisite chains", "Company-weighted"],
  },
];

export default function FeatureTabs() {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.35 });
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const running = inView && !paused;

  useEffect(() => {
    if (!running) return undefined;
    const t = setTimeout(() => setActive((a) => (a + 1) % TABS.length), DURATION);
    return () => clearTimeout(t);
  }, [active, running]);

  const tab = TABS[active];

  return (
    <div
      ref={ref}
      className="grid grid-cols-1 lg:grid-cols-12"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Tab rail */}
      <div role="tablist" aria-label="Features" className="border-b border-white/[0.08] lg:col-span-4 lg:border-b-0 lg:border-r">
        {TABS.map((t, i) => {
          const on = i === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => setActive(i)}
              className={cn(
                "relative flex w-full items-center gap-3 border-b border-white/[0.06] px-6 py-5 text-left font-mono text-[11.5px] uppercase tracking-[0.14em] transition-colors",
                on ? "bg-white/[0.03] text-white" : "text-white/40 hover:bg-white/[0.02] hover:text-white/75"
              )}
            >
              <span className={cn("h-1.5 w-1.5 shrink-0 transition-colors", on ? "bg-indigo-400" : "bg-white/20")} />
              <t.icon size={15} className={on ? "text-indigo-300" : "text-white/35"} />
              {t.label}
              {on && (
                <span className="absolute bottom-0 left-0 h-px w-full overflow-hidden bg-white/[0.06]">
                  <span
                    key={`${active}-${running}`}
                    className="tab-progress block h-full origin-left bg-indigo-400"
                    style={{ animationDuration: `${DURATION}ms`, animationPlayState: running ? "running" : "paused" }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div role="tabpanel" className="relative min-h-[520px] overflow-hidden lg:col-span-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: ease.expo }}
            className="grid h-full grid-cols-1 xl:grid-cols-2"
          >
            <div className="flex flex-col justify-between p-8 lg:p-10">
              <div>
                <h3 className="text-3xl font-semibold leading-[1.05] tracking-[-0.03em] text-white">{tab.title}</h3>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/55">{tab.body}</p>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {tab.tags.map((tag) => (
                  <span key={tag} className="border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-white/70">{tag}</span>
                ))}
              </div>
            </div>
            <div className="relative border-t border-white/[0.06] bg-[radial-gradient(ellipse_at_70%_40%,rgba(79,70,229,0.14),transparent_65%)] p-6 xl:border-l xl:border-t-0">
              {tab.id === "adaptive" && <AdaptiveDemo />}
              {tab.id === "coding" && <CodeDemo />}
              {tab.id === "voice" && <VoiceDemo />}
              {tab.id === "graph" && <GraphDemo />}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- demos */

function useTicker(stepMs, steps) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((x) => (x + 1) % steps), stepMs);
    return () => clearInterval(id);
  }, [stepMs, steps]);
  return n;
}

function AdaptiveDemo() {
  const n = useTicker(1700, DEMO_KEYS.length);
  const sim = COMPANY_SIM_DATA[DEMO_KEYS[n]];
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {DEMO_KEYS.map((k, i) => (
          <span key={k} className={cn("border px-2 py-1 font-mono text-[10px] uppercase transition-colors duration-300", i === n ? "border-indigo-400/50 bg-indigo-500/15 text-indigo-200" : "border-white/10 text-white/35")}>{k}</span>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={n}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.35, ease: ease.expo }}
          className="flex-1 border border-white/[0.08] bg-black/40 p-4"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">{sim.role} · {sim.persona}</p>
          <p className="mt-3 text-[13px] leading-relaxed text-white/70">{sim.context}</p>
          <p className="mt-3 text-[14px] font-semibold leading-snug text-white">{sim.ask}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const CODE = [
  "def two_sum(nums, target):",
  "    seen = {}",
  "    for i, n in enumerate(nums):",
  "        if target - n in seen:",
  "            return [seen[target - n], i]",
  "        seen[n] = i",
];
const TESTS = ["[2,7,11,15], 9", "[3,2,4], 6", "[3,3], 6", "hidden #1", "hidden #2"];

function CodeDemo() {
  const n = useTicker(260, CODE.length + TESTS.length + 8);
  const lines = Math.min(CODE.length, n);
  const tests = Math.max(0, Math.min(TESTS.length, n - CODE.length - 1));
  return (
    <div className="flex h-full flex-col gap-3 font-mono text-[12px]">
      <div className="flex-1 border border-white/[0.08] bg-black/50">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5 text-[10px] text-white/40">
          <span>solution.py</span><span className="text-emerald-300/80">Python 3.11</span>
        </div>
        <pre className="p-3 leading-[1.75] text-white/80">
          {CODE.slice(0, lines).map((l, i) => (
            <div key={i}><span className="mr-3 inline-block w-4 text-right text-white/20">{i + 1}</span>{l}</div>
          ))}
          {lines < CODE.length && <span className="inline-block h-[1em] w-[7px] translate-y-[2px] bg-indigo-400" />}
        </pre>
      </div>
      <div className="border border-white/[0.08] bg-black/50 p-3">
        <div className="mb-2 flex justify-between text-[10px] uppercase tracking-wider text-white/40">
          <span>Tests</span><span className="tabular-nums">{tests}/{TESTS.length} passed</span>
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {TESTS.map((t, i) => (
            <div key={t} className={cn("flex items-center gap-2 transition-colors duration-300", i < tests ? "text-emerald-300" : "text-white/25")}>
              {i < tests ? <CheckCircle2 size={12} /> : <XCircle size={12} className="opacity-40" />} {t}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-white/40">Complexity estimate: <span className="text-white/80">O(n) time · O(n) space</span></p>
      </div>
    </div>
  );
}

const TRANSCRIPT = "So, um, I'd start by clarifying the read to write ratio, and then, like, pick a partitioning key that keeps hot users spread across shards.";

function VoiceDemo() {
  const n = useTicker(120, 150);
  const chars = Math.min(TRANSCRIPT.length, Math.round(n * 1.6));
  const shown = TRANSCRIPT.slice(0, chars);
  const fillers = (shown.match(/\b(um|like)\b/g) || []).length;
  const wpm = Math.round(96 + Math.min(1, chars / TRANSCRIPT.length) * 38);
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex h-24 items-center justify-center gap-[3px] border border-white/[0.08] bg-black/40" aria-hidden="true">
        {Array.from({ length: 44 }).map((_, i) => (
          <span key={i} className="voice-bar w-[3px] rounded-full bg-indigo-400/80" style={{ animationDelay: `${(i * 131) % 1000}ms` }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[["Pace", `${wpm}`, "wpm"], ["Fillers", `${fillers}`, ""], ["Hesitation", chars > 60 ? "low" : "—", ""]].map(([k, v, u]) => (
          <div key={k} className="border border-white/[0.08] bg-black/40 px-3 py-2">
            <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">{k}</p>
            <p className="text-lg font-semibold tabular-nums text-white">{v}<span className="ml-1 text-[10px] font-normal text-white/35">{u}</span></p>
          </div>
        ))}
      </div>
      <p className="flex-1 border border-white/[0.08] bg-black/40 p-3 text-[13px] leading-relaxed text-white/80">
        {shown.split(/(\bum\b|\blike\b)/g).map((part, i) =>
          /^(um|like)$/.test(part) ? <mark key={i} className="bg-amber-400/20 px-0.5 text-amber-200">{part}</mark> : <span key={i}>{part}</span>
        )}
        <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-rose-400" />
      </p>
    </div>
  );
}

const GRAPH = [
  { id: "rec", label: "Recursion", x: 12, y: 18 },
  { id: "memo", label: "Memoization", x: 44, y: 18 },
  { id: "dp", label: "Dynamic programming", x: 76, y: 38 },
  { id: "graphs", label: "Graphs", x: 12, y: 62 },
  { id: "bfs", label: "BFS / DFS", x: 44, y: 62 },
  { id: "short", label: "Shortest paths", x: 76, y: 82 },
];
const EDGES = [["rec", "memo"], ["memo", "dp"], ["graphs", "bfs"], ["bfs", "short"], ["dp", "short"]];
const PATH = ["rec", "memo", "dp"];

function GraphDemo() {
  const n = useTicker(800, PATH.length + 3);
  const lit = new Set(PATH.slice(0, Math.min(PATH.length, n)));
  const byId = Object.fromEntries(GRAPH.map((g) => [g.id, g]));
  return (
    <div className="relative h-full min-h-[340px] border border-white/[0.08] bg-black/40">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {EDGES.map(([a, b]) => {
          const on = lit.has(a) && lit.has(b);
          return <line key={a + b} x1={byId[a].x} y1={byId[a].y} x2={byId[b].x} y2={byId[b].y} stroke={on ? "#818cf8" : "rgba(255,255,255,0.12)"} strokeWidth={on ? 0.6 : 0.3} vectorEffect="non-scaling-stroke" style={{ transition: "stroke 0.4s" }} />;
        })}
      </svg>
      {GRAPH.map((g) => {
        const on = lit.has(g.id);
        const gap = g.id === "dp";
        return (
          <div key={g.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${g.x}%`, top: `${g.y}%` }}>
            <span
              className={cn(
                "block whitespace-nowrap border px-2.5 py-1.5 font-mono text-[10.5px] transition-all duration-500",
                gap && on ? "border-amber-400/60 bg-amber-500/15 text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.35)]"
                  : on ? "border-indigo-400/60 bg-indigo-500/15 text-indigo-100"
                  : "border-white/10 bg-black/60 text-white/40"
              )}
            >
              {g.label}{gap && on ? " · gap" : ""}
            </span>
          </div>
        );
      })}
      <p className="absolute bottom-2 left-3 font-mono text-[9px] uppercase tracking-wider text-white/30">Example study path</p>
    </div>
  );
}
