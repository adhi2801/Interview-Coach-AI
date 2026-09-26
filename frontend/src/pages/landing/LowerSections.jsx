// frontend/src/pages/landing/LowerSections.jsx
//
// The second half of the landing page. Every section here is driven by
// scroll position rather than one-shot entrances, so it moves in both
// directions and never sits still:
//   How        — a rail draws across the three steps; each step runs a
//                small live preview of that stage of the product
//   Graph      — topics get "diagnosed" one by one as you scroll; tallies
//                count with them and a gap is traced back to its roots
//   Stack      — the real architecture as a diagram whose wires draw with
//                scroll, with requests travelling along them
//   BuildLog   — an incident log with a progress rail
//   Prompts    — sample questions drifting with scroll velocity
//   FinalCta / Footer — a closing headline and a wordmark that fills in

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight, ArrowUpRight, BarChart3, BrainCircuit, Mic, Sparkles } from "lucide-react";
import DotField from "../../components/fx/DotField";
import SplitReveal from "../../components/fx/SplitReveal";
import Reveal from "../../components/fx/Reveal";
import Magnetic from "../../components/fx/Magnetic";
import { VelocityMarquee } from "../../components/fx/Effects";
import { scrollToTarget } from "../../components/fx/SmoothScroll";
import { cn } from "../../lib/utils";
import { FRAME, Label, Section } from "./blueprint";
import { ARCHITECTURE_CARDS, COMPANY_SIM_DATA, DEMO_KEYS, KNOWLEDGE_CATEGORIES, TOTAL_KG_NODES } from "./content";

export const GITHUB_URL = "https://github.com/adhi2801/Interview-Coach-AI";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black";
const H2 = "mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-6xl";

function useSectionProgress(ref, offset) {
  const { scrollYProgress } = useScroll({ target: ref, offset });
  return useSpring(scrollYProgress, { stiffness: 160, damping: 32, mass: 0.35, restDelta: 0.0005 });
}

/* ================================================================ How */

const HOW = [
  { icon: BrainCircuit, title: "Configure", body: "Pick a company, a role and how hostile the interviewer should be." },
  { icon: Mic, title: "Execute", body: "Answer out loud with live coaching, or solve it in the sandboxed editor." },
  { icon: BarChart3, title: "Diagnose", body: "Five scores, a rating change, and the exact prerequisite to study next." },
];

function ConfigurePreview({ on }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!on) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % DEMO_KEYS.length), 1600);
    return () => clearInterval(t);
  }, [on]);
  const d = COMPANY_SIM_DATA[DEMO_KEYS[i]];
  const rows = [["Company", d.badge], ["Role", d.role], ["Persona", d.persona]];
  return (
    <div className="space-y-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-3 border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
          <span className="text-white/35">{k}</span>
          <motion.span key={v} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="truncate text-white/85">{v}</motion.span>
        </div>
      ))}
    </div>
  );
}

function ExecutePreview({ on }) {
  return (
    <div className="border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em]">
        <span className="flex items-center gap-1.5 text-rose-300"><span className="rec-dot h-1.5 w-1.5 rounded-full bg-rose-400" />Listening</span>
        <span className="tabular-nums text-white/45">138 wpm · example</span>
      </div>
      <div className="mt-2 flex h-7 items-center gap-[3px]" aria-hidden="true">
        {Array.from({ length: 30 }).map((_, k) => (
          <span key={k} className="voice-bar w-[3px] rounded-full bg-indigo-400/80" style={{ animationDelay: `${(k * 97) % 900}ms`, animationPlayState: on ? "running" : "paused" }} />
        ))}
      </div>
      <p className="mt-2 truncate font-mono text-[11px] text-white/60">
        <span className="text-indigo-300">def</span> allow(user):<span className="caret ml-0.5 inline-block h-3 w-[2px] translate-y-[2px] bg-indigo-300" />
      </p>
    </div>
  );
}

function DiagnosePreview({ progress }) {
  const vals = [8.2, 7.6, 6.9, 7.8, 6.4];
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/30">Example scores</p>
      {vals.map((v, k) => (
        <Bar key={k} v={v} k={k} progress={progress} />
      ))}
    </div>
  );
}

function Bar({ v, k, progress }) {
  const scaleX = useTransform(progress, [0.55 + k * 0.05, 0.85 + k * 0.03], [0, v / 10], { clamp: true });
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 font-mono text-[10px] text-white/35">0{k + 1}</span>
      <div className="h-1.5 flex-1 overflow-hidden bg-white/[0.06]">
        <motion.div style={{ scaleX }} className="h-full origin-left bg-linear-to-r from-indigo-500 to-violet-300" />
      </div>
      <span className="w-7 text-right font-mono text-[10.5px] tabular-nums text-white/70">{v.toFixed(1)}</span>
    </div>
  );
}

export function How() {
  const ref = useRef(null);
  const progress = useSectionProgress(ref, ["start 75%", "end 55%"]);
  const inView = useInView(ref, { amount: 0.2 });
  const [step, setStep] = useState(-1);
  useMotionValueEvent(progress, "change", (p) => {
    const s = p < 0.08 ? -1 : p < 0.4 ? 0 : p < 0.7 ? 1 : 2;
    setStep((x) => (x === s ? x : s));
  });
  const rail = useTransform(progress, [0.05, 0.95], [0, 1]);

  return (
    <Section id="how">
      <div className="px-6 pb-10 pt-20 md:px-12">
        <Label index="03">How it works</Label>
        <SplitReveal by="lines" className={H2}>Under five minutes, start to scored.</SplitReveal>
      </div>
      <div ref={ref} className="relative grid grid-cols-1 border-t border-white/[0.08] md:grid-cols-3">
        {/* Rail: horizontal on desktop, vertical on phones */}
        <div aria-hidden="true" className="absolute left-0 top-0 hidden h-px w-full bg-white/[0.06] md:block">
          <motion.div style={{ scaleX: rail }} className="h-full origin-left bg-linear-to-r from-indigo-500 via-violet-400 to-emerald-300" />
        </div>
        <div aria-hidden="true" className="absolute left-6 top-0 h-full w-px bg-white/[0.06] md:hidden">
          <motion.div style={{ scaleY: rail }} className="h-full w-full origin-top bg-linear-to-b from-indigo-500 via-violet-400 to-emerald-300" />
        </div>
        {HOW.map((h, i) => {
          const on = step >= i;
          return (
            <div key={h.title} className={cn("relative flex flex-col py-10 pl-12 pr-6 md:px-10", i < 2 && "border-b border-white/[0.08] md:border-b-0 md:border-r")}>
              <span aria-hidden="true" className={cn("absolute left-[21px] top-11 h-[7px] w-[7px] border transition-all duration-500 md:-top-[4px] md:left-10", on ? "border-indigo-300 bg-indigo-400 shadow-[0_0_14px_rgba(129,140,248,0.9)]" : "border-white/25 bg-[#050507]")} />
              <div className="flex items-center justify-between">
                <span className={cn("font-mono text-[11px] uppercase tracking-[0.16em] transition-colors duration-500", on ? "text-indigo-300" : "text-white/35")}>Step 0{i + 1}</span>
                <h.icon size={18} className={cn("transition-colors duration-500", on ? "text-indigo-300" : "text-white/25")} />
              </div>
              <p className={cn("mt-10 text-2xl font-semibold tracking-[-0.03em] transition-colors duration-500", on ? "text-white" : "text-white/40")}>{h.title}</p>
              <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-white/55">{h.body}</p>
              <div className={cn("mt-8 transition-opacity duration-700", on ? "opacity-100" : "opacity-35")}>
                {i === 0 && <ConfigurePreview on={inView && step === 0} />}
                {i === 1 && <ExecutePreview on={inView && step === 1} />}
                {i === 2 && <DiagnosePreview progress={progress} />}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ============================================================== Graph */

const ALL_NODES = KNOWLEDGE_CATEGORIES.flatMap((c) => c.nodes);

function chipClass(status, done) {
  if (!done) return "border-white/[0.06] text-white/20";
  if (status === "passed") return "border-emerald-400/25 text-emerald-200/90";
  if (status === "gap") return "border-amber-400/40 bg-amber-500/10 text-amber-200 shadow-[0_0_18px_-6px_rgba(251,191,36,0.6)]";
  return "border-white/10 text-white/35";
}

// A real chain from the seeded prerequisite graph (seed_topics.py):
// distributed_systems <- concurrency <- processes_and_threads.
const TRACE = [
  { name: "Distributed Systems", note: "missed in your answer", status: "gap" },
  { name: "Concurrency", note: "prerequisite", status: "locked" },
  { name: "Processes & Threads", note: "prerequisite · study first", status: "locked" },
];

export function Graph() {
  const chipsRef = useRef(null);
  const progress = useSectionProgress(chipsRef, ["start 70%", "end 60%"]);
  const [done, setDone] = useState(0);
  useMotionValueEvent(progress, "change", (p) => {
    const n = Math.round(Math.min(1, Math.max(0, p)) * TOTAL_KG_NODES);
    setDone((x) => (x === n ? x : n));
  });
  const tally = useMemo(() => {
    const t = { passed: 0, gap: 0, locked: 0 };
    ALL_NODES.slice(0, done).forEach((n) => { t[n.status] += 1; });
    return t;
  }, [done]);
  const trace = useTransform(progress, [0.35, 0.95], [0, 1]);

  let idx = 0;
  return (
    <Section id="graph">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="border-b border-white/[0.08] lg:col-span-4 lg:border-b-0 lg:border-r">
          <div className="px-6 py-16 md:px-10 lg:sticky lg:top-16">
            <Label index="04">The map</Label>
            <SplitReveal by="lines" className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-5xl">
              {`${TOTAL_KG_NODES} topics. Every prerequisite.`}
            </SplitReveal>
            <p className="mt-5 text-[15px] leading-relaxed text-white/55">
              Each answer is tagged against the graph. Gaps trace back to what you need first, so you never study the wrong thing.
            </p>
            <div className="mt-8 grid grid-cols-3 border border-white/[0.08]">
              {[["Solid", tally.passed, "text-emerald-300", "bg-emerald-400"], ["Gaps", tally.gap, "text-amber-300", "bg-amber-400"], ["Not yet", tally.locked, "text-white/50", "bg-white/25"]].map(([k, v, c, dot], i) => (
                <div key={k} className={cn("px-3 py-3", i < 2 && "border-r border-white/[0.08]")}>
                  <p className={cn("text-3xl font-semibold tabular-nums tracking-[-0.04em]", c)}>{v}</p>
                  <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40"><span className={cn("h-1.5 w-1.5", dot)} />{k}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
              Scanned {done} / {TOTAL_KG_NODES} · example diagnostic
            </p>

            {/* Gap trace */}
            <div className="mt-8">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/40">Gap trace</p>
              <div className="relative mt-4 pl-6">
                <span aria-hidden="true" className="absolute left-[3px] top-2 h-[calc(100%-16px)] w-px bg-white/[0.08]" />
                <motion.span aria-hidden="true" style={{ scaleY: trace }} className="absolute left-[3px] top-2 h-[calc(100%-16px)] w-px origin-top bg-linear-to-b from-amber-400 to-indigo-400" />
                {TRACE.map((t, i) => (
                  <TraceStep key={t.name} t={t} i={i} progress={trace} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div ref={chipsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:col-span-8">
          {/* Phones: the tallies ride along with the chips. */}
          <div className="sticky top-16 z-10 flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#050507]/92 px-6 py-3 font-mono text-[10.5px] uppercase tracking-[0.12em] backdrop-blur-sm sm:col-span-2 lg:hidden">
            <span className="flex items-center gap-1.5 text-emerald-300"><span className="h-1.5 w-1.5 bg-emerald-400" />{tally.passed} solid</span>
            <span className="flex items-center gap-1.5 text-amber-300"><span className="h-1.5 w-1.5 bg-amber-400" />{tally.gap} gaps</span>
            <span className="tabular-nums text-white/40">{done}/{TOTAL_KG_NODES}</span>
          </div>
          {KNOWLEDGE_CATEGORIES.map((cat, ci) => (
            <div key={cat.title} className={cn("border-b border-white/[0.08] p-6", ci % 2 === 0 && "sm:border-r")}>
              <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/45">
                {cat.title} <span className="text-white/20">· {cat.nodes.length}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cat.nodes.map((n) => {
                  const d = idx++ < done;
                  return (
                    <span key={n.name} className={cn("border px-2 py-0.5 text-[11px] transition-[color,background-color,border-color,box-shadow] duration-500", chipClass(n.status, d))}>
                      {n.name}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function TraceStep({ t, i, progress }) {
  const opacity = useTransform(progress, [i * 0.3, i * 0.3 + 0.2], [0.25, 1]);
  const x = useTransform(progress, [i * 0.3, i * 0.3 + 0.2], [-8, 0]);
  return (
    <motion.div style={{ opacity, x }} className="relative pb-4 last:pb-0">
      <span aria-hidden="true" className={cn("absolute -left-6 top-1.5 h-[7px] w-[7px] border", t.status === "gap" ? "border-amber-300 bg-amber-400" : "border-indigo-300 bg-[#050507]")} />
      <p className={cn("text-[15px] font-semibold tracking-[-0.01em]", t.status === "gap" ? "text-amber-200" : "text-white")}>{t.name}</p>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">{i === 0 ? t.note : `← ${t.note}`}</p>
    </motion.div>
  );
}

/* ============================================================== Stack */

// The real request paths. Coordinates for a wide and a tall layout.
const NODES = {
  web: { label: "Browser", sub: "React 19 · Vite", wide: [30, 170], tall: [110, 20] },
  api: { label: "FastAPI", sub: "sessions · ELO · scoring", wide: [390, 170], tall: [110, 250] },
  claude: { label: "Claude", sub: "questions · grading", wide: [780, 30], tall: [5, 500] },
  pg: { label: "PostgreSQL", sub: "RAG · graph · history", wide: [780, 170], tall: [125, 500] },
  judge: { label: "Judge0", sub: "sandboxed runs", wide: [780, 310], tall: [245, 500] },
};
const NW = { wide: [190, 80], tall: [140, 76] };
const NW_SMALL = [110, 76];
const EDGES = [
  { from: "web", to: "api", label: "HTTPS · JSON", lane: -16, dur: 2.2 },
  { from: "web", to: "api", label: "WebSocket · voice", lane: 16, dur: 1.6, back: true },
  { from: "api", to: "claude", dur: 2.6 },
  { from: "api", to: "pg", dur: 1.9 },
  { from: "api", to: "judge", dur: 2.4 },
];

function box(key, mode) {
  const [x, y] = NODES[key][mode];
  const [w, h] = mode === "tall" && ["claude", "pg", "judge"].includes(key) ? NW_SMALL : NW[mode];
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

function edgePath(e, mode) {
  const a = box(e.from, mode);
  const b = box(e.to, mode);
  const lane = e.lane || 0;
  if (mode === "wide") {
    const x1 = a.x + a.w;
    const y1 = a.cy + lane;
    const x2 = b.x;
    const y2 = b.cy + lane;
    const mx = (x1 + x2) / 2;
    return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
  }
  const x1 = a.cx + lane;
  const y1 = a.y + a.h;
  const x2 = b.cx + lane;
  const y2 = b.y;
  const my = (y1 + y2) / 2;
  return `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
}

function Diagram({ mode, progress, className }) {
  const vb = mode === "wide" ? "0 0 1000 420" : "0 0 360 600";
  return (
    <svg viewBox={vb} className={className} role="img" aria-label="Architecture: the browser talks to a FastAPI backend over HTTPS and a voice WebSocket; the backend calls Claude, PostgreSQL and Judge0.">
      <defs>
        <linearGradient id={`wire-${mode}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#818cf8" />
          <stop offset="1" stopColor="#6ee7b7" />
        </linearGradient>
      </defs>
      {EDGES.map((e, i) => {
        const d = edgePath(e, mode);
        const id = `edge-${mode}-${i}`;
        return (
          <g key={id}>
            <path d={d} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
            <Wire d={d} id={id} i={i} progress={progress} stroke={`url(#wire-${mode})`} />
            {[0, 0.5].map((off) => (
              <circle key={off} r="3.2" fill={e.back ? "#fb7185" : "#c7d2fe"}>
                <animateMotion dur={`${e.dur}s`} begin={`${off * e.dur}s`} repeatCount="indefinite" keyPoints={e.back ? "1;0" : "0;1"} keyTimes="0;1" calcMode="linear">
                  <mpath href={`#${id}`} />
                </animateMotion>
              </circle>
            ))}
            {e.label && mode === "wide" && (
              <text x={(box(e.from, mode).x + box(e.from, mode).w + box(e.to, mode).x) / 2} y={box(e.from, mode).cy + (e.lane || 0) + (e.lane < 0 ? -10 : 20)} textAnchor="middle" className="fill-white/45 font-mono text-[11px] uppercase tracking-[0.12em]">{e.label}</text>
            )}
          </g>
        );
      })}
      {Object.keys(NODES).map((k) => {
        const b = box(k, mode);
        const n = NODES[k];
        const hub = k === "api";
        return (
          <g key={k}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#07070b" stroke={hub ? "rgba(129,140,248,0.6)" : "rgba(255,255,255,0.14)"} />
            {hub && <rect x={b.x - 5} y={b.y - 5} width={b.w + 10} height={b.h + 10} fill="none" stroke="rgba(129,140,248,0.18)" className="hub-pulse" />}
            <text x={b.cx} y={b.cy - 4} textAnchor="middle" className="fill-white text-[15px] font-semibold">{n.label}</text>
            <text x={b.cx} y={b.cy + 15} textAnchor="middle" className="fill-white/40 font-mono text-[9.5px] uppercase tracking-[0.08em]">
              {mode === "tall" && b.w < 130 ? n.sub.split(" · ")[0] : n.sub}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Wire({ d, id, i, progress, stroke }) {
  const pathLength = useTransform(progress, [0.05 + i * 0.07, 0.4 + i * 0.07], [0, 1]);
  return <motion.path id={id} d={d} fill="none" stroke={stroke} strokeWidth="1.6" style={{ pathLength }} />;
}

export function Stack() {
  const ref = useRef(null);
  const progress = useSectionProgress(ref, ["start 85%", "end 40%"]);
  return (
    <Section id="stack">
      <div className="px-6 pb-10 pt-20 md:px-12">
        <Label index="05">Under the hood</Label>
        <SplitReveal by="lines" className={H2}>No magic. Just engineering.</SplitReveal>
      </div>
      <div ref={ref} className="relative overflow-hidden border-t border-white/[0.08] bg-[radial-gradient(ellipse_at_50%_50%,rgba(79,70,229,0.08),transparent_70%)] px-4 py-10 md:px-10 md:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <Diagram mode="wide" progress={progress} className="relative hidden w-full md:block" />
        <Diagram mode="tall" progress={progress} className="relative mx-auto block w-full max-w-[380px] md:hidden" />
        <p className="relative mt-4 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">The real request paths · animation is illustrative</p>
      </div>
      <Reveal className="grid grid-cols-1 border-t border-white/[0.08] sm:grid-cols-2 lg:grid-cols-3">
        {ARCHITECTURE_CARDS.map((a, i) => (
          <div
            key={a.title}
            data-reveal
            className={cn(
              "spot-card relative border-b border-white/[0.08] p-6 md:p-8",
              i % 2 === 0 ? "sm:border-r" : "sm:border-r-0",
              i % 3 === 2 ? "lg:border-r-0" : "lg:border-r"
            )}
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--sx", `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty("--sy", `${e.clientY - r.top}px`);
            }}
          >
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-indigo-300">{a.tag}</p>
            <p className="mt-6 text-xl font-semibold tracking-[-0.02em]">{a.title}</p>
            <p className="mt-2 text-[14px] leading-relaxed text-white/55">{a.desc}</p>
          </div>
        ))}
      </Reveal>
      <div className="flex flex-col gap-4 px-6 py-8 md:flex-row md:items-center md:px-10">
        <span className="flex w-max shrink-0 items-center gap-2 border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-amber-200">
          <Sparkles size={13} /> Powered by Claude
        </span>
        <p className="text-sm leading-relaxed text-white/55">
          Question generation and scoring run on Claude — disclosed on purpose, no “proprietary AI”. This codebase wraps it with rubric enforcement, company context and a prerequisite graph.
        </p>
      </div>
    </Section>
  );
}

/* =========================================================== Build log */

const BUILD_NOTES = [
  { title: "Ephemeral disk killed the RAG store", body: "Railway wipes local disk on every redeploy, so the disk-based ChromaDB store kept losing its embeddings.", fix: "Cosine similarity computed in-process against PostgreSQL" },
  { title: "A silent WPM inflation bug", body: "The coach compounded word counts on every debounced chunk instead of replacing them, so reported pace climbed past 560 WPM the longer you typed.", fix: "Replace per-chunk counts, never accumulate" },
  { title: "A sandbox API disappeared", body: "The original execution sandbox (Piston) closed public access mid-build.", fix: "Whole coding track rebuilt on Judge0" },
  { title: "One rating, two tracks", body: "Design interviews and coding submissions are graded differently.", fix: "Both share one ELO formula, so the rating means the same thing" },
];

export function BuildLog() {
  const ref = useRef(null);
  const progress = useSectionProgress(ref, ["start 70%", "end 55%"]);
  const [lit, setLit] = useState(-1);
  useMotionValueEvent(progress, "change", (p) => {
    const n = Math.min(BUILD_NOTES.length - 1, Math.floor(p * BUILD_NOTES.length + 0.15) - (p < 0.03 ? 1 : 0));
    setLit((x) => (x === n ? x : n));
  });
  return (
    <Section>
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="border-b border-white/[0.08] lg:col-span-5 lg:border-b-0 lg:border-r">
          <div className="px-6 py-16 md:px-10 lg:sticky lg:top-16">
            <Label index="06">Built solo</Label>
            <SplitReveal by="lines" className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-5xl">
              I built this to prepare myself.
            </SplitReveal>
            <p className="mt-6 text-[15px] leading-relaxed text-white/55">
              A solo full-stack project, not a funded company: adaptive question generation, a custom retrieval pipeline, sandboxed code execution and a scoring engine that adjusts to how you answer.
              It runs on free-tier hosting, so the first request after a quiet period can take a few extra seconds. Nothing here is faked to look further along than it is.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="grid h-10 w-10 place-items-center bg-linear-to-br from-indigo-400 to-violet-500 text-sm font-bold">A</span>
              <div>
                <p className="text-sm font-semibold">Adhiswauran</p>
                <p className="text-xs text-white/45">Backend, frontend and infra, end to end</p>
              </div>
              <a href={`${GITHUB_URL}/commits`} target="_blank" rel="noopener noreferrer" className={cn("ml-auto flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-indigo-300 hover:text-indigo-200", FOCUS)}>
                Commit history <ArrowUpRight size={13} />
              </a>
            </div>
          </div>
        </div>
        <div ref={ref} className="relative lg:col-span-7">
          <div aria-hidden="true" className="absolute bottom-0 left-8 top-0 w-px bg-white/[0.06] md:left-10">
            <motion.div style={{ scaleY: progress }} className="h-full w-full origin-top bg-linear-to-b from-indigo-500 via-violet-400 to-emerald-300" />
          </div>
          {BUILD_NOTES.map((n, i) => {
            const on = i <= lit;
            return (
              <div key={n.title} className="relative border-b border-white/[0.08] py-10 pl-16 pr-6 md:pl-20 md:pr-10">
                <span aria-hidden="true" className={cn("absolute left-[29px] top-[46px] h-[7px] w-[7px] border transition-all duration-500 md:left-[37px]", on ? "border-indigo-300 bg-indigo-400 shadow-[0_0_14px_rgba(129,140,248,0.9)]" : "border-white/25 bg-[#050507]")} />
                <p className={cn("font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors duration-500", on ? "text-indigo-300" : "text-white/30")}>Incident 0{i + 1}</p>
                <p className={cn("mt-3 text-xl font-semibold tracking-[-0.02em] transition-colors duration-500", on ? "text-white" : "text-white/40")}>{n.title}</p>
                <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-white/55">{n.body}</p>
                <p className={cn("mt-4 inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-all duration-700", on ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-white/10 text-white/30")}>
                  <span className={cn("h-1.5 w-1.5 transition-colors", on ? "bg-emerald-400" : "bg-white/20")} /> Fix · {n.fix}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/* ============================================================ Prompts */

const PROMPTS = DEMO_KEYS.map((k) => ({ badge: COMPANY_SIM_DATA[k].badge, text: COMPANY_SIM_DATA[k].ask, persona: COMPANY_SIM_DATA[k].persona }));

function PromptCard({ p }) {
  return (
    <div className="mr-4 w-[300px] shrink-0 whitespace-normal border border-white/[0.08] bg-[#07070b] p-5 md:w-[380px]">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em]">
        <span className="text-white/80">{p.badge}</span>
        <span className="border border-indigo-400/30 bg-indigo-500/10 px-1.5 py-0.5 text-indigo-300">{p.persona}</span>
      </div>
      <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-white/70">{p.text}</p>
    </div>
  );
}

export function Prompts() {
  const half = Math.ceil(PROMPTS.length / 2);
  return (
    <Section>
      <div className="px-6 pb-8 pt-16 md:px-12">
        <Label index="07">Sample prompts</Label>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/55">Example prompts from the seven company profiles. Real sessions generate a fresh scenario every time. Scroll faster and they move faster.</p>
      </div>
      <div className="space-y-4 border-t border-white/[0.08] py-8 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
        <VelocityMarquee baseVelocity={-1.6}>{PROMPTS.slice(0, half).concat(PROMPTS.slice(0, half)).map((p, i) => <PromptCard key={i} p={p} />)}</VelocityMarquee>
        <VelocityMarquee baseVelocity={1.6}>{PROMPTS.slice(half).concat(PROMPTS.slice(half)).map((p, i) => <PromptCard key={i} p={p} />)}</VelocityMarquee>
      </div>
    </Section>
  );
}

/* ========================================================== Final CTA */

export function FinalCta({ onGetStarted }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [0.2, 1]);
  return (
    <Section innerClassName="overflow-hidden">
      <div className="absolute inset-0">
        <DotField cell={12} className="opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,transparent,#050507_70%)]" />
      </div>
      <div ref={ref} className="relative px-6 py-28 text-center md:py-40">
        <Label className="justify-center">Your move</Label>
        <motion.h2 style={{ scale, opacity }} className="mx-auto mt-8 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.045em] will-change-transform md:text-8xl">
          Stop reading.<br /><span className="text-iridescent">Start answering.</span>
        </motion.h2>
        <p className="mx-auto mt-6 max-w-md text-[17px] text-white/60">Free account, one real question. See how you actually do under pressure.</p>
        <div className="mt-10 flex justify-center">
          <Magnetic>
            <button onClick={onGetStarted} className={cn("btn-liquid flex items-center gap-2 rounded-full px-9 py-4 text-sm font-semibold", FOCUS)}>
              Try a free question <ArrowRight size={16} />
            </button>
          </Magnetic>
        </div>
      </div>
    </Section>
  );
}

/* ============================================================= Footer */

export function Footer({ nav, onNavigatePrivacy, onNavigateTerms }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const clip = useTransform(scrollYProgress, (p) => {
    const t = Math.min(1, Math.max(0, (p - 0.1) / 0.85));
    return `inset(${((1 - t) * 100).toFixed(2)}% 0% 0% 0%)`;
  });
  return (
    <footer>
      <div className={cn(FRAME, "grid grid-cols-1 gap-8 border-x border-t border-white/[0.08] px-6 py-12 md:grid-cols-4 md:px-10")}>
        <div className="md:col-span-2">
          <p className="flex items-center gap-3 text-[15px] font-semibold">
            <span className="grid h-7 w-7 place-items-center bg-white text-[10px] font-extrabold text-black">IC</span>
            InterviewCoach
          </p>
          <p className="mt-3 max-w-sm text-sm text-white/45">A solo-built AI mock interview platform. Open source.</p>
        </div>
        <div className="space-y-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <p className="text-white/30">Product</p>
          {nav.map((n) => (
            <a key={n.id} href={`#${n.id}`} onClick={(e) => { e.preventDefault(); scrollToTarget(document.getElementById(n.id)); }} className="block text-white/60 hover:text-white">{n.label}</a>
          ))}
        </div>
        <div className="space-y-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <p className="text-white/30">More</p>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="block text-white/60 hover:text-white">GitHub</a>
          <button onClick={() => onNavigatePrivacy?.()} className="block uppercase tracking-[0.14em] text-white/60 hover:text-white">Privacy</button>
          <button onClick={() => onNavigateTerms?.()} className="block uppercase tracking-[0.14em] text-white/60 hover:text-white">Terms</button>
        </div>
      </div>
      <div ref={ref} className={cn(FRAME, "relative select-none overflow-hidden border-x border-t border-white/[0.08] px-4 pb-2 pt-8 md:px-8")} aria-hidden="true">
        <p className="whitespace-nowrap text-center text-[clamp(44px,13.4vw,172px)] font-semibold leading-[0.85] tracking-[-0.06em] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.14)]">InterviewCoach</p>
        <motion.p style={{ clipPath: clip }} className="text-iridescent absolute inset-x-4 bottom-2 whitespace-nowrap text-center text-[clamp(44px,13.4vw,172px)] font-semibold leading-[0.85] tracking-[-0.06em] md:inset-x-8">InterviewCoach</motion.p>
      </div>
      <div className={cn(FRAME, "flex flex-col justify-between gap-2 border-x border-t border-white/[0.08] px-6 py-5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/35 md:flex-row md:px-10")}>
        <p>© 2026 InterviewCoach · Designed & engineered by Adhiswauran</p>
        <p>FastAPI · PostgreSQL · Claude · Judge0</p>
      </div>
    </footer>
  );
}
