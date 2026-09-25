// frontend/src/pages/Landing.jsx
//
// Landing page, v3. One system, three layers:
//   A — blueprint structure: a single framed column with visible rails,
//       marked section boundaries, hatched pauses, mono section labels,
//       one indigo accent.
//   C — the product tells the story: a live replica of the interview room
//       plays one full question as you scroll, and each feature has its own
//       self-playing demo of the real UI.
//   B — a few cinematic moments: the GPU dot-matrix field, iridescent
//       display type, scroll-filled manifesto, a big-type band moving with
//       scroll.
//
// Performance budget (measured with a CDP scroll benchmark): only transform
// and opacity animate; one live-blur surface (the nav); the WebGL field
// renders only while on screen; nothing re-renders the page per frame.
//
// Content is real: every count comes from the live API (93 topics, 25
// problems) or the codebase; demo values are labelled as examples.

import React, { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight, ArrowUpRight, BarChart3, BrainCircuit, GitBranch, Mic, Play, Sparkles } from "lucide-react";
import DotField from "../components/fx/DotField";
import SplitReveal from "../components/fx/SplitReveal";
import Reveal from "../components/fx/Reveal";
import Magnetic from "../components/fx/Magnetic";
import ScrollFillText from "../components/fx/ScrollFillText";
import { scrollToTarget } from "../components/fx/SmoothScroll";
import { ScrollTrigger, ease, prefersReducedMotion, useGSAP } from "../lib/motion";
import { cn } from "../lib/utils";
import { FRAME, Hatch, Iridescent, Label, Section } from "./landing/blueprint";
import InterviewDemo, { DEMO_STEPS, stepFor } from "./landing/InterviewDemo";
import FeatureTabs from "./landing/FeatureTabs";
import { ARCHITECTURE_CARDS, KNOWLEDGE_CATEGORIES, TOTAL_KG_NODES } from "./landing/content";

const GITHUB_URL = "https://github.com/adhi2801/Interview-Coach-AI";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

const NAV = [
  { id: "demo", label: "Demo" },
  { id: "features", label: "Features" },
  { id: "how", label: "How it works" },
  { id: "graph", label: "Knowledge graph" },
  { id: "stack", label: "Stack" },
];

const STATS = [
  ["93", "CS topics in the graph"],
  ["25", "verified coding problems"],
  ["5", "scoring dimensions"],
  ["4", "editor languages"],
];

const HOW = [
  { icon: BrainCircuit, title: "Configure", body: "Pick a company, a role and how hostile the interviewer should be." },
  { icon: Mic, title: "Execute", body: "Answer out loud with live coaching, or solve it in the sandboxed editor." },
  { icon: BarChart3, title: "Diagnose", body: "Five scores, a rating change, and the exact prerequisite to study next." },
];

const BUILD_NOTES = [
  { title: "Ephemeral disk killed the RAG store", body: "Railway wipes local disk on every redeploy, so the disk-based ChromaDB store kept losing its embeddings. Moved to cosine similarity computed in-process against PostgreSQL." },
  { title: "A silent WPM inflation bug", body: "The coach compounded word counts on every debounced chunk instead of replacing them, so reported pace climbed past 560 WPM the longer you typed. One-line fix, real regression until caught." },
  { title: "A sandbox API disappeared", body: "The original execution sandbox (Piston) closed public access mid-build. The whole coding track was rebuilt on Judge0." },
  { title: "One rating, two tracks", body: "Design interviews and coding submissions are graded differently but share one ELO formula, so the rating means the same thing on both." },
];

export default function Landing({ onGetStarted, onSignIn, onNavigatePrivacy, onNavigateTerms }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-[#050507] font-sans text-white selection:bg-indigo-500/40">
      <TopNav onGetStarted={onGetStarted} onSignIn={onSignIn} />
      <main>
        <Hero onGetStarted={onGetStarted} />
        <Hatch />
        <Manifesto />
        <DemoSection />
        <Hatch />
        <Features />
        <NumbersBand />
        <How />
        <Graph />
        <Stack />
        <About />
        <FinalCta onGetStarted={onGetStarted} />
      </main>
      <Footer onNavigatePrivacy={onNavigatePrivacy} onNavigateTerms={onNavigateTerms} />
    </div>
  );
}

/* ------------------------------------------------------------------ nav */

function TopNav({ onGetStarted, onSignIn }) {
  const go = (e, id) => {
    e.preventDefault();
    scrollToTarget(document.getElementById(id));
  };
  return (
    // Only transform animates here: animating opacity would make the header a
    // "backdrop root", and the glass would have nothing behind it to blur.
    <motion.header
      initial={{ y: -72 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: ease.expo }}
      className="nav-glass fixed inset-x-0 top-0 z-50 border-b border-white/[0.08]"
    >
      <div>
        <nav aria-label="Primary" className={cn(FRAME, "flex h-16 items-center justify-between border-x border-white/[0.08] px-5")}>
          <a href="#top" onClick={(e) => go(e, "top")} className={cn("flex items-center gap-3 rounded", FOCUS)}>
            <span className="grid h-7 w-7 place-items-center bg-white text-[10px] font-extrabold text-black">IC</span>
            <span className="text-[15px] font-semibold tracking-tight">InterviewCoach</span>
          </a>
          <ul className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} onClick={(e) => go(e, n.id)} className={cn("font-mono text-[11px] uppercase tracking-[0.16em] text-white/55 transition-colors hover:text-white", FOCUS)}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-4">
            <button onClick={onSignIn} className={cn("hidden font-mono text-[11px] uppercase tracking-[0.16em] text-white/60 transition-colors hover:text-white sm:block", FOCUS)}>Sign in</button>
            <button onClick={onGetStarted} className={cn("group flex items-center gap-2 bg-white px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-black transition-colors hover:bg-indigo-100", FOCUS)}>
              Start free <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </nav>
      </div>
    </motion.header>
  );
}

/* ----------------------------------------------------------------- hero */

function MaskLine({ children, delay, className }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className={cn("block", className)}
        initial={{ y: "105%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 1.1, ease: ease.expo, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Hero({ onGetStarted }) {
  return (
    <Section id="top" rule={false} className="pt-16" innerClassName="overflow-hidden">
      <div className="absolute inset-0">
        <DotField className="opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(5,5,7,0.2),#050507_75%)]" />
      </div>

      <div className="relative px-6 pb-14 pt-20 md:px-12 md:pt-28">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.6 }}>
          <Label>Adaptive interview simulator · free</Label>
        </motion.div>

        <h1 className="mt-7 max-w-5xl text-[44px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-7xl lg:text-[104px]">
          <MaskLine delay={0.15}>A real interview.</MaskLine>
          <MaskLine delay={0.28}><Iridescent>Not a practice quiz.</Iridescent></MaskLine>
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.9, ease: ease.expo }}
          className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"
        >
          <p className="max-w-xl text-[17px] leading-relaxed text-white/60 md:text-lg">
            An AI interviewer that asks what the company would ask, pushes back like a real panel, runs your code against hidden tests,
            and tells you exactly what to study next.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Magnetic>
              <button onClick={onGetStarted} className={cn("btn-liquid flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold", FOCUS)}>
                <Play size={14} className="fill-current" /> Try your first question
              </button>
            </Magnetic>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("flex items-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-semibold text-white/85 transition-colors hover:border-white/35 hover:text-white", FOCUS)}
            >
              <GitBranch size={15} /> Source
            </a>
          </div>
        </motion.div>
      </div>

      {/* Stats: real counts, bordered like a spec sheet. */}
      <div className="relative grid grid-cols-2 border-t border-white/[0.08] bg-[#050507]/70 md:grid-cols-4">
        {STATS.map(([n, label], i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 + i * 0.08 }}
            className={cn("px-6 py-6 md:px-8", i % 2 === 0 && "border-r border-white/[0.08]", i < 2 && "border-b border-white/[0.08] md:border-b-0", i === 1 && "md:border-r")}
          >
            <p className="text-4xl font-semibold tracking-[-0.04em] tabular-nums md:text-5xl">{n}</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-white/40">{label}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------ manifesto */

const MANIFESTO_ACCENTS = ["push", "back,", "out", "loud."];

function Manifesto() {
  return (
    <Section>
      <div className="px-6 py-24 md:px-12 md:py-32">
        <Label index="00">Why this exists</Label>
        <ScrollFillText
          className="mt-8 max-w-5xl text-3xl font-medium leading-[1.2] tracking-[-0.03em] md:text-5xl"
          text="Most interview prep is a list of questions and an answer key. Real interviews push back, change direction halfway, and judge how you think out loud. This one does too — then shows you exactly where you fell short."
          accentWords={MANIFESTO_ACCENTS}
        />
      </div>
    </Section>
  );
}

/* ------------------------------------------------ pinned product demo */

function useMediaQuery(q) {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setMatch(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [q]);
  return match;
}

function DemoSection() {
  const pinRef = useRef(null);
  const raw = useMotionValue(0);
  const progress = useSpring(raw, { stiffness: 140, damping: 28, mass: 0.4 });
  const [step, setStep] = useState(0);
  useMotionValueEvent(progress, "change", (v) => {
    const next = stepFor(v);
    setStep((s) => (s === next ? s : next));
  });

  const desktop = useMediaQuery("(min-width: 1024px)");
  const reduced = prefersReducedMotion();
  const inView = useInView(pinRef, { amount: 0.3 });

  // Desktop: the section pins and scroll position scrubs the demo.
  useGSAP(
    () => {
      if (!desktop || reduced || !pinRef.current) return undefined;
      const st = ScrollTrigger.create({
        trigger: pinRef.current,
        start: "top top+=64",
        end: "+=2400",
        pin: true,
        anticipatePin: 1,
        onUpdate: (self) => raw.set(self.progress),
      });
      return () => st.kill();
    },
    { dependencies: [desktop, reduced] }
  );

  // Phones / reduced motion: plays on a loop while visible.
  useEffect(() => {
    if (desktop && !reduced) return undefined;
    if (reduced) { raw.set(1); return undefined; }
    if (!inView) return undefined;
    const controls = animate(raw, [0, 1], { duration: 18, ease: "linear", repeat: Infinity, repeatDelay: 2 });
    return () => controls.stop();
  }, [desktop, reduced, inView, raw]);

  return (
    <Section id="demo">
      <div ref={pinRef} className="grid grid-cols-1 bg-[#050507] lg:min-h-[calc(100vh-64px)] lg:grid-cols-12">
        <div className="flex flex-col justify-between border-b border-white/[0.08] px-6 py-10 md:px-10 lg:col-span-4 lg:border-b-0 lg:border-r">
          <div>
            <Label index="01">One interview, start to finish</Label>
            <SplitReveal by="lines" className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-5xl">
              Watch it think with you.
            </SplitReveal>
          </div>
          <ol className="mt-10 space-y-1">
            {DEMO_STEPS.map((s, i) => {
              const on = i === step;
              return (
                <li key={s.title} className={cn("relative border-l py-3 pl-5 transition-colors duration-500", on ? "border-indigo-400" : "border-white/10")}>
                  <p className={cn("font-mono text-[11px] uppercase tracking-[0.14em] transition-colors duration-500", on ? "text-indigo-300" : "text-white/30")}>0{i + 1}</p>
                  <p className={cn("mt-1 text-lg font-semibold tracking-[-0.02em] transition-colors duration-500", on ? "text-white" : "text-white/35")}>{s.title}</p>
                  <motion.div
                    initial={false}
                    animate={{ height: on ? "auto" : 0, opacity: on ? 1 : 0 }}
                    transition={{ duration: 0.45, ease: ease.expo }}
                    className="overflow-hidden text-sm leading-relaxed text-white/55"
                  >
                    <p className="pt-1.5">{s.body}</p>
                  </motion.div>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="flex items-center px-4 py-8 md:px-8 lg:col-span-8">
          <InterviewDemo progress={progress} className="w-full" />
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------ features */

function Features() {
  return (
    <Section id="features">
      <div className="px-6 pb-10 pt-20 md:px-12">
        <Label index="02">What's inside</Label>
        <SplitReveal by="lines" className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-6xl">
          Four engines, one interview.
        </SplitReveal>
      </div>
      <div className="border-t border-white/[0.08]">
        <FeatureTabs />
      </div>
    </Section>
  );
}

/* ------------------------------------------------ big type, scroll-linked */

const BAND = ["93 topics", "25 problems", "5 dimensions", "4 languages", "7 companies", "4 personas"];

function BandRow() {
  return [...BAND, ...BAND].map((t, i) => (
    <span key={i} className="flex items-center gap-8 pr-8">
      <span>{t}</span>
      <span aria-hidden="true" className="h-3 w-3 shrink-0 bg-indigo-400/70" />
    </span>
  ));
}

function NumbersBand() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x1 = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const x2 = useTransform(scrollYProgress, [0, 1], ["-30%", "0%"]);
  return (
    <Section>
      <div ref={ref} className="overflow-hidden py-14">
        <p className="sr-only">{BAND.join(", ")}</p>
        <motion.div style={{ x: x1 }} className="flex whitespace-nowrap text-6xl font-semibold uppercase tracking-[-0.04em] text-white md:text-[128px]" aria-hidden="true">
          <BandRow />
        </motion.div>
        <motion.div style={{ x: x2 }} className="mt-2 flex whitespace-nowrap text-6xl font-semibold uppercase tracking-[-0.04em] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.28)] md:text-[128px]" aria-hidden="true">
          <BandRow />
        </motion.div>
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------- how */

function How() {
  return (
    <Section id="how">
      <div className="px-6 pb-10 pt-20 md:px-12">
        <Label index="03">How it works</Label>
        <SplitReveal by="lines" className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-6xl">
          Under five minutes, start to scored.
        </SplitReveal>
      </div>
      <Reveal className="grid grid-cols-1 border-t border-white/[0.08] md:grid-cols-3">
        {HOW.map((h, i) => (
          <div key={h.title} data-reveal className={cn("group relative px-6 py-10 md:px-10", i < 2 && "border-b border-white/[0.08] md:border-b-0 md:border-r")}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/35">Step 0{i + 1}</span>
              <h.icon size={18} className="text-indigo-300" />
            </div>
            <p className="mt-16 text-2xl font-semibold tracking-[-0.03em]">{h.title}</p>
            <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-white/55">{h.body}</p>
            <span aria-hidden="true" className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-indigo-400 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
          </div>
        ))}
      </Reveal>
    </Section>
  );
}

/* -------------------------------------------------------- knowledge graph */

function chipClass(status) {
  if (status === "passed") return "border-emerald-400/25 text-emerald-200/90";
  if (status === "gap") return "border-amber-400/40 bg-amber-500/10 text-amber-200";
  return "border-white/10 text-white/35";
}

function Graph() {
  return (
    <Section id="graph">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="border-b border-white/[0.08] px-6 py-16 md:px-10 lg:col-span-4 lg:border-b-0 lg:border-r">
          <Label index="04">The map</Label>
          <SplitReveal by="lines" className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-5xl">
            {`${TOTAL_KG_NODES} topics. Every prerequisite.`}
          </SplitReveal>
          <p className="mt-5 text-[15px] leading-relaxed text-white/55">
            Each answer is tagged against the graph. Gaps trace back to what you need first, so you never study the wrong thing.
          </p>
          <div className="mt-8 space-y-2 font-mono text-[11px] uppercase tracking-[0.14em]">
            <p className="flex items-center gap-2 text-emerald-200/80"><span className="h-2 w-2 bg-emerald-400" /> Solid</p>
            <p className="flex items-center gap-2 text-amber-200"><span className="h-2 w-2 bg-amber-400" /> Gap detected</p>
            <p className="flex items-center gap-2 text-white/40"><span className="h-2 w-2 bg-white/25" /> Not reached yet</p>
          </div>
          <p className="mt-8 font-mono text-[10px] uppercase tracking-wider text-white/30">Example diagnostic</p>
        </div>
        <Reveal className="grid grid-cols-1 sm:grid-cols-2 lg:col-span-8" stagger={0.05}>
          {KNOWLEDGE_CATEGORIES.map((cat, i) => (
            <div key={cat.title} data-reveal className={cn("border-b border-white/[0.08] p-6", i % 2 === 0 && "sm:border-r")}>
              <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/45">
                {cat.title} <span className="text-white/20">· {cat.nodes.length}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cat.nodes.map((n) => (
                  <span key={n.name} className={cn("border px-2 py-0.5 text-[11px] transition-colors hover:border-white/40 hover:text-white", chipClass(n.status))}>{n.name}</span>
                ))}
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------- stack */

function Stack() {
  return (
    <Section id="stack">
      <div className="px-6 pb-10 pt-20 md:px-12">
        <Label index="05">Under the hood</Label>
        <SplitReveal by="lines" className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-6xl">
          No magic. Just engineering.
        </SplitReveal>
      </div>
      <Reveal className="grid grid-cols-1 border-t border-white/[0.08] sm:grid-cols-2 lg:grid-cols-3">
        {ARCHITECTURE_CARDS.map((a, i) => (
          <div
            key={a.title}
            data-reveal
            className={cn(
              "border-b border-white/[0.08] p-6 transition-colors hover:bg-white/[0.02] md:p-8",
              i % 2 === 0 ? "sm:border-r" : "sm:border-r-0",
              i % 3 === 2 ? "lg:border-r-0" : "lg:border-r"
            )}
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

/* --------------------------------------------------------------- about */

function About() {
  return (
    <Section>
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="border-b border-white/[0.08] px-6 py-16 md:px-10 lg:col-span-5 lg:border-b-0 lg:border-r">
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
        <Reveal className="grid grid-cols-1 sm:grid-cols-2 lg:col-span-7">
          {BUILD_NOTES.map((n, i) => (
            <div key={n.title} data-reveal className={cn("border-b border-white/[0.08] p-6 md:p-8", i % 2 === 0 && "sm:border-r")}>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/35">Problem 0{i + 1}</p>
              <p className="mt-4 text-lg font-semibold tracking-[-0.02em]">{n.title}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/55">{n.body}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------- final CTA */

function FinalCta({ onGetStarted }) {
  return (
    <Section innerClassName="overflow-hidden">
      <div className="absolute inset-0">
        <DotField cell={12} className="opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,transparent,#050507_70%)]" />
      </div>
      <div className="relative px-6 py-28 text-center md:py-40">
        <Label className="justify-center">Your move</Label>
        <h2 className="mx-auto mt-8 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.045em] md:text-8xl">
          Stop reading.<br /><span className="text-iridescent">Start answering.</span>
        </h2>
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

/* --------------------------------------------------------------- footer */

function Footer({ onNavigatePrivacy, onNavigateTerms }) {
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
          {NAV.map((n) => (
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
      <div className={cn(FRAME, "flex flex-col justify-between gap-2 border-x border-t border-white/[0.08] px-6 py-5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/35 md:flex-row md:px-10")}>
        <p>© 2026 InterviewCoach · Designed & engineered by Adhiswauran</p>
        <p>FastAPI · PostgreSQL · Claude · Judge0</p>
      </div>
    </footer>
  );
}
