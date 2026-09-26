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
// Content is real: the problem count is read from the live API at load
// (see landing/liveCounts), topic counts come from the graph data, and demo
// values are labelled as examples.

import React, { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight, GitBranch, Play } from "lucide-react";
import DotField from "../components/fx/DotField";
import SplitReveal from "../components/fx/SplitReveal";
import Magnetic from "../components/fx/Magnetic";
import ScrollFillText from "../components/fx/ScrollFillText";
import { scrollToTarget } from "../components/fx/SmoothScroll";
import { ScrollTrigger, ease, prefersReducedMotion, useGSAP } from "../lib/motion";
import { cn } from "../lib/utils";
import { FRAME, Hatch, Iridescent, Label, Section } from "./landing/blueprint";
import InterviewDemo, { DEMO_STEPS, stepFor } from "./landing/InterviewDemo";
import FeatureTabs from "./landing/FeatureTabs";
import ScrollFilm from "./landing/ScrollFilm";
import { useProblemCount } from "./landing/liveCounts";
import { BuildLog, FinalCta, Footer, GITHUB_URL, Graph, How, Prompts, Stack } from "./landing/LowerSections";

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

const NAV = [
  { id: "film", label: "Film" },
  { id: "demo", label: "Demo" },
  { id: "features", label: "Features" },
  { id: "how", label: "How it works" },
  { id: "graph", label: "Knowledge graph" },
  { id: "stack", label: "Stack" },
];

const STATS = [
  ["93", "CS topics in the graph"],
  ["problems", "verified coding problems"],
  ["5", "scoring dimensions"],
  ["4", "editor languages"],
];

export default function Landing({ onGetStarted, onSignIn, onNavigatePrivacy, onNavigateTerms }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-[#050507] font-sans text-white selection:bg-indigo-500/40">
      <TopNav onGetStarted={onGetStarted} onSignIn={onSignIn} />
      <main>
        <Hero onGetStarted={onGetStarted} />
        <ScrollFilm />
        <Manifesto />
        <DemoSection />
        <Hatch />
        <Features />
        <NumbersBand />
        <How />
        <Graph />
        <Stack />
        <BuildLog />
        <Prompts />
        <FinalCta onGetStarted={onGetStarted} />
      </main>
      <Footer nav={NAV} onNavigatePrivacy={onNavigatePrivacy} onNavigateTerms={onNavigateTerms} />
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
  const problems = useProblemCount();
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
            <p className="text-4xl font-semibold tracking-[-0.04em] tabular-nums md:text-5xl">{n === "problems" ? problems : n}</p>
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
        <Label>Why this exists</Label>
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

const bandItems = (problems) => ["93 topics", `${problems} problems`, "5 dimensions", "4 languages", "7 companies", "4 personas"];

function BandRow({ items }) {
  return [...items, ...items].map((t, i) => (
    <span key={i} className="flex items-center gap-8 pr-8">
      <span>{t}</span>
      <span aria-hidden="true" className="h-3 w-3 shrink-0 bg-indigo-400/70" />
    </span>
  ));
}

function NumbersBand() {
  const ref = useRef(null);
  const BAND = bandItems(useProblemCount());
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x1 = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const x2 = useTransform(scrollYProgress, [0, 1], ["-30%", "0%"]);
  return (
    <Section>
      <div ref={ref} className="overflow-hidden py-14">
        <p className="sr-only">{BAND.join(", ")}</p>
        <motion.div style={{ x: x1 }} className="flex whitespace-nowrap text-6xl font-semibold uppercase tracking-[-0.04em] text-white md:text-[128px]" aria-hidden="true">
          <BandRow items={BAND} />
        </motion.div>
        <motion.div style={{ x: x2 }} className="mt-2 flex whitespace-nowrap text-6xl font-semibold uppercase tracking-[-0.04em] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.28)] md:text-[128px]" aria-hidden="true">
          <BandRow items={BAND} />
        </motion.div>
      </div>
    </Section>
  );
}
