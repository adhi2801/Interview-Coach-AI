// frontend/src/pages/landing/InterviewDemo.jsx
//
// A faithful, self-playing replica of the real InterviewRoom: the question
// panel (context / constraints / ask), the answer canvas with live speech
// telemetry, then the five-dimension scores, the rating change and the
// harder follow-up. Driven by a single 0..1 `progress` motion value, so the
// same component can be scrubbed by scroll or played on a clock.
//
// Every number shown is illustrative and labelled "Example session".

import React, { useState } from "react";
import { useMotionValueEvent } from "motion/react";
import { Mic, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "../../lib/utils";

const SCENARIO = {
  company: "Google",
  role: "Backend Engineer · L4",
  persona: "Socratic",
  context: "Your API gateway fronts every Google product surface and absorbs 100M requests per second of burst traffic across five regions.",
  constraints: ["P99 latency under 10 ms", "Survive a full regional partition", "O(k) memory per node"],
  ask: "Design the rate limiter. How do the limits stay consistent when a region is partitioned?",
  answer:
    "I'd keep a token bucket per user in Redis inside each region so the hot path never leaves the region. For global consistency I accept a small overshoot: every region owns a share of the budget and rebalances every few seconds. During a partition a region keeps enforcing its last known share — we fail closed on abuse without dropping legitimate traffic.",
  scores: [
    ["Technical accuracy", 8.2],
    ["Problem solving", 7.6],
    ["Communication", 6.9],
    ["Culture fit", 7.8],
    ["Confidence", 6.4],
  ],
  eloBefore: 1284,
  eloAfter: 1301,
  followUp: "One tenant now sends 40% of global traffic from a single region. What changes in your design?",
};

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const seg = (p, a, b) => clamp01((p - a) / (b - a));

// Phase map (fractions of the whole timeline).
const PH = { question: [0.0, 0.2], answer: [0.22, 0.56], scores: [0.58, 0.8], outcome: [0.82, 0.97] };

export const DEMO_STEPS = [
  { title: "The question arrives", body: "Company focus and interviewer persona shape a fresh scenario at your level." },
  { title: "You answer out loud", body: "Speech is transcribed live while pace and filler words are tracked." },
  { title: "Five scores, with reasons", body: "Every answer is graded on five dimensions, each with written feedback." },
  { title: "It adapts", body: "Your rating moves and a harder follow-up is generated on the same problem." },
];

export function stepFor(p) {
  if (p < PH.answer[0]) return 0;
  if (p < PH.scores[0]) return 1;
  if (p < PH.outcome[0]) return 2;
  return 3;
}

export default function InterviewDemo({ progress, className }) {
  // Quantised so the demo re-renders at most ~300 times over the whole
  // timeline, not on every scroll pixel.
  const [p, setP] = useState(() => progress.get());
  useMotionValueEvent(progress, "change", (v) => {
    const q = Math.round(v * 300) / 300;
    setP((prev) => (prev === q ? prev : q));
  });

  const qT = seg(p, ...PH.question);
  const aT = seg(p, ...PH.answer);
  const sT = seg(p, ...PH.scores);
  const oT = seg(p, ...PH.outcome);

  const askChars = Math.round(SCENARIO.ask.length * seg(qT, 0.35, 1));
  const answerChars = Math.round(SCENARIO.answer.length * aT);
  const words = SCENARIO.answer.slice(0, answerChars).split(/\s+/).filter(Boolean).length;
  const listening = aT > 0 && aT < 1;
  const wpm = aT > 0 ? Math.round(112 + 30 * Math.min(1, aT * 1.3)) : 0;
  const fillers = aT > 0.62 ? 2 : aT > 0.3 ? 1 : 0;
  const confidence = aT > 0 ? (5.2 + 2.1 * aT).toFixed(1) : "--";
  const overall = SCENARIO.scores.reduce((s, [, v]) => s + v, 0) / SCENARIO.scores.length;
  const elo = Math.round(SCENARIO.eloBefore + (SCENARIO.eloAfter - SCENARIO.eloBefore) * oT);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/10 bg-[#07070b] shadow-[0_40px_120px_-40px_rgba(79,70,229,0.5)]", className)}>
      {/* Window chrome */}
      <div className="flex h-11 items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
          <span className="text-white/80">{SCENARIO.company}</span>
          <span>·</span>
          <span className="hidden sm:inline">{SCENARIO.role}</span>
          <span className="rounded border border-indigo-400/30 bg-indigo-500/10 px-1.5 py-0.5 text-indigo-300">{SCENARIO.persona}</span>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-white/40">Q1 / 5</span>
      </div>

      <div className="grid min-h-[430px] grid-cols-1 md:grid-cols-12">
        {/* Question inspector */}
        <div className="border-b border-white/[0.06] p-5 md:col-span-4 md:border-b-0 md:border-r">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">Context</p>
          <p className="text-[13px] leading-relaxed text-white/80" style={{ opacity: seg(qT, 0, 0.3) }}>{SCENARIO.context}</p>
          <p className="mb-2 mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">Constraints</p>
          <ul className="space-y-1.5">
            {SCENARIO.constraints.map((c, i) => (
              <li key={c} className="flex items-start gap-2 text-[12.5px] text-white/70 transition-opacity duration-300" style={{ opacity: qT > 0.12 + i * 0.07 ? 1 : 0.08 }}>
                <span className="mt-[7px] h-1 w-1 shrink-0 bg-indigo-400" />
                {c}
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-indigo-300">The ask</p>
            <p className="min-h-[60px] text-[13.5px] font-semibold leading-snug text-white">
              {SCENARIO.ask.slice(0, askChars)}
              {qT > 0 && qT < 1 && <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-indigo-400" />}
            </p>
          </div>
        </div>

        {/* Answer canvas */}
        <div className="flex flex-col p-5 md:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">Your answer</p>
            <span className={cn("flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors", listening ? "border-rose-400/40 bg-rose-500/10 text-rose-300" : "border-white/10 text-white/35")}>
              <Mic size={11} /> {listening ? "Listening" : aT >= 1 ? "Submitted" : "Hold to speak"}
            </span>
          </div>
          <p className="flex-1 text-[13.5px] leading-[1.7] text-white/85">
            {SCENARIO.answer.slice(0, answerChars)}
            {listening && <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-rose-400" />}
            {aT === 0 && <span className="text-white/25">Waiting for the question…</span>}
          </p>
          {/* Voice level: pure CSS animation on transform (compositor only) */}
          <div className={cn("mt-4 flex h-8 items-center gap-[3px] transition-opacity duration-500", listening ? "opacity-100" : "opacity-20")} aria-hidden="true">
            {Array.from({ length: 36 }).map((_, i) => (
              <span key={i} className="voice-bar w-[3px] rounded-full bg-indigo-400/80" style={{ animationDelay: `${(i * 97) % 900}ms`, animationPlayState: listening ? "running" : "paused" }} />
            ))}
          </div>
        </div>

        {/* Telemetry + scores */}
        <div className="border-t border-white/[0.06] p-5 md:col-span-3 md:border-l md:border-t-0">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">Live coaching</p>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
            {[["Pace", wpm ? `${wpm}` : "--", "wpm"], ["Fillers", `${fillers}`, ""], ["Confidence", confidence, "/10"]].map(([k, v, unit]) => (
              <div key={k} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
                <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">{k}</p>
                <p className="text-lg font-semibold tabular-nums text-white">{v}<span className="ml-1 text-[10px] font-normal text-white/35">{unit}</span></p>
              </div>
            ))}
          </div>
          <p className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">Scores {words ? `· ${words} words` : ""}</p>
          <ul className="space-y-2">
            {SCENARIO.scores.map(([label, value], i) => {
              const t = clamp01(sT * 1.35 - i * 0.08);
              return (
                <li key={label}>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/60">{label}</span>
                    <span className="tabular-nums text-white/90">{sT > 0 ? (value * t).toFixed(1) : "—"}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full origin-left rounded-full bg-linear-to-r from-indigo-500 to-violet-300" style={{ transform: `scaleX(${(value / 10) * t})` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Outcome strip */}
      <div className="grid grid-cols-1 border-t border-white/[0.08] md:grid-cols-12" style={{ opacity: 0.25 + 0.75 * clamp01(sT * 2) }}>
        <div className="flex items-center gap-4 border-b border-white/[0.06] px-5 py-4 md:col-span-4 md:border-b-0 md:border-r">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">Overall</p>
            <p className="text-2xl font-semibold tabular-nums text-white">{(overall * clamp01(sT * 1.2)).toFixed(1)}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">Rating</p>
            <p className="flex items-center justify-end gap-1.5 text-2xl font-semibold tabular-nums text-white">
              {elo}
              {oT > 0 && <span className="flex items-center text-sm text-emerald-400"><TrendingUp size={14} />+{elo - SCENARIO.eloBefore}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 px-5 py-4 md:col-span-8" style={{ opacity: 0.2 + 0.8 * oT }}>
          <Sparkles size={15} className="mt-0.5 shrink-0 text-indigo-300" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-indigo-300">Follow-up · harder</p>
            <p className="mt-1 text-[13.5px] font-medium text-white/90">{SCENARIO.followUp}</p>
          </div>
        </div>
      </div>
      <p className="absolute bottom-2 right-3 font-mono text-[9px] uppercase tracking-wider text-white/25">Example session</p>
    </div>
  );
}
