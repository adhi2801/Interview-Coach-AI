// frontend/src/pages/Landing.jsx
//
// The public front door. One idea carries the page: show a single real
// interview beat by beat — question, spoken answer, five scores, harder
// follow-up — as a scroll-driven film. Everything around it stays quiet.
//
// Honesty rules for this page: every capability named here exists in the
// product, every number is either a real count from the codebase (93 topics,
// 4 editor languages, 4 personas, 7 company profiles) or explicitly labelled
// as an example.

import React, { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Button, Logo } from "../components/ui";
import { ease, reveal } from "../lib/motion";
import { cn } from "../lib/utils";

const GITHUB_URL = "https://github.com/adhi2801/Interview-Coach-AI";

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

// The example interview shown in the film. Scores and ELO values are an
// illustration and are labelled as such on screen.
const FILM = {
  company: "Google",
  role: "Backend Engineer, L4",
  persona: "Socratic",
  question:
    "Design a rate limiter for an API that serves 100 million requests a second across five regions. How do you keep the limits consistent when a region is partitioned?",
  answer:
    "I'd start with a token bucket per user, held in Redis in each region, so the hot path never leaves the region. For global consistency I'd accept a small overshoot: each region gets a share of the budget and rebalances every few seconds. Under a partition, a region keeps enforcing its last known share, so we fail closed on abuse without dropping legitimate traffic.",
  scores: [
    { label: "Technical accuracy", value: 8.2 },
    { label: "Problem solving", value: 7.6 },
    { label: "Communication", value: 6.9 },
    { label: "Culture fit", value: 7.8 },
    { label: "Confidence", value: 6.4 },
  ],
  eloBefore: 1284,
  eloAfter: 1301,
  followUp:
    "Your regional shares drift under uneven load. A single tenant now sends 40% of global traffic from one region. What changes?",
};

const BEATS = [
  {
    title: "It asks what they would ask.",
    body: "Pick a company and an interviewer. Questions follow that company's focus areas, generated fresh for your level — not pulled from a list you can memorize.",
  },
  {
    title: "You answer out loud.",
    body: "Speak or type. While you talk, it tracks your pace and filler words, and nudges you when you stall.",
  },
  {
    title: "Every answer gets five scores.",
    body: "Technical accuracy, problem solving, communication, culture fit, and confidence — each with a written explanation of what held it back.",
  },
  {
    title: "Then it gets harder.",
    body: "Strong answers raise your rating and earn a tougher follow-up on the same problem. Weak ones send you back to the topic you're missing.",
  },
];

const COMPANIES = [
  { id: "google", name: "Google", role: "Distributed Systems Engineer, L5", persona: "Socratic", category: "System design",
    context: "You're designing a globally distributed rate limiter that absorbs 100 million requests per second of burst traffic across five continents.",
    ask: "Walk through your architecture and explain exactly how the token buckets stay in sync across regions." },
  { id: "meta", name: "Meta", role: "Infrastructure Engineer, L5", persona: "Standard", category: "System design",
    context: "Instagram Live is launching real-time reactions. The feature has to hold two billion concurrent connections.",
    ask: "Design the fan-out. Where are the bottlenecks, and how do you shard the WebSocket connections?" },
  { id: "amazon", name: "Amazon", role: "Backend Engineer, L5", persona: "Hostile", category: "System design",
    context: "You own the checkout service for Prime Day. Traffic spikes to 500,000 requests per second in the first minute of the sale.",
    ask: "How do you guarantee no customer cart is lost during a full regional outage?" },
  { id: "microsoft", name: "Microsoft", role: "Systems Architect, L5", persona: "Exhausted", category: "System design",
    context: "Word Online's collaborative editor is being rebuilt to meet enterprise compliance requirements.",
    ask: "Two users edit the same paragraph offline and reconnect at once. Walk me through conflict resolution." },
  { id: "apple", name: "Apple", role: "Platform Engineer, L5", persona: "Standard", category: "Security",
    context: "Millions of devices need to sync telemetry from their secure enclaves, with no plaintext ever leaving the device.",
    ask: "Describe the on-device aggregation and how you'd construct the encrypted payload for the cloud handshake." },
  { id: "netflix", name: "Netflix", role: "Site Reliability Engineer, L5", persona: "Socratic", category: "System design",
    context: "You're designing a multi-region streaming CDN that runs active-active under continuous chaos testing.",
    ask: "us-east-1 goes dark. How do DNS and the edge caches reroute fifty million active streams on their own?" },
  { id: "startup", name: "Startup", role: "Founding Engineer", persona: "Standard", category: "System design",
    context: "You're the only backend engineer. The company needs usage-based billing in two weeks.",
    ask: "Design multi-tenant subscriptions, usage metering, and idempotent payment retries you can actually ship on time." },
];

const PERSONAS = [
  { name: "Standard", body: "Neutral and evaluative. Closest to a real loop." },
  { name: "Hostile", body: "Skeptical. Pushes back on every assumption and adds constraints early." },
  { name: "Socratic", body: "Guides with questions so you reason your way to the answer." },
  { name: "Exhausted", body: "Fifth interview of the day. Terse, flat, and you carry the room." },
];

const STUDY_PATH = [
  { name: "Recursion", state: "solid" },
  { name: "Memoization", state: "solid" },
  { name: "Dynamic programming", state: "gap" },
  { name: "Interval scheduling", state: "next" },
];

const CODE_SAMPLE = `def rate_limiter(user_id, capacity, window):
    now = time.time()
    key = f"rate:{user_id}"
    pipe = redis.pipeline()
    pipe.zadd(key, {now: now})
    pipe.zremrangebyscore(key, 0, now - window)
    pipe.zcard(key)
    pipe.expire(key, window)
    _, _, count, _ = pipe.execute()
    return count <= capacity`;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Landing({ onGetStarted, onSignIn, onNavigatePrivacy, onNavigateTerms }) {
  return (
    <div className="min-h-screen bg-canvas text-label">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-surface-2 focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <GlobalNav onSignIn={onSignIn} onGetStarted={onGetStarted} />

      <main id="main">
        <Hero onGetStarted={onGetStarted} />
        <Film />
        <Tracks />
        <Companies onGetStarted={onGetStarted} />
        <StudyPlan />
        <Closing onGetStarted={onGetStarted} />
      </main>

      <Footer onNavigatePrivacy={onNavigatePrivacy} onNavigateTerms={onNavigateTerms} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#tracks", label: "Coding" },
  { href: "#companies", label: "Companies" },
  { href: "#study", label: "Study plan" },
];

function GlobalNav({ onSignIn, onGetStarted }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-400 ease-apple",
        "border-b backdrop-blur-xl backdrop-saturate-150",
        scrolled ? "border-hairline bg-black/[0.72]" : "border-transparent bg-transparent"
      )}
    >
      <nav aria-label="Primary" className="mx-auto flex h-12 max-w-page items-center justify-between px-4 sm:px-6">
        <a href="#main" aria-label="InterviewCoach home" className="rounded-md">
          <Logo className="[&_svg]:h-6 [&_svg]:w-6 [&_span]:hidden [&_span]:text-[15px] sm:[&_span]:inline" />
        </a>
        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-footnote text-label-2 transition-colors duration-200 hover:text-label">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-4">
          <button onClick={onSignIn} className="text-footnote text-label-2 transition-colors hover:text-label">
            Sign in
          </button>
          <Button size="sm" onClick={onGetStarted}>Start free</Button>
        </div>
      </nav>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero({ onGetStarted }) {
  return (
    <section className="relative flex min-h-[92svh] flex-col items-center justify-center px-6 pb-16 pt-32 text-center">
      <motion.h1
        variants={reveal}
        initial="hidden"
        animate="show"
        custom={0}
        className="max-w-[14ch] font-display text-display-xl font-semibold text-label"
      >
        The interview before the interview.
      </motion.h1>
      <motion.p
        variants={reveal}
        initial="hidden"
        animate="show"
        custom={1}
        className="mt-6 max-w-prose text-body-lg text-label-2"
      >
        An AI interviewer that asks what the company would ask, pushes back like a real panel, and scores every answer
        so you know exactly what to fix.
      </motion.p>
      <motion.div
        variants={reveal}
        initial="hidden"
        animate="show"
        custom={2}
        className="mt-10 flex flex-col items-center gap-5 sm:flex-row"
      >
        <Button size="lg" onClick={onGetStarted}>Start a free interview</Button>
        <a href="#how" className="text-body text-accent transition-colors hover:text-accent-hover hover:underline underline-offset-4">
          See how it works
        </a>
      </motion.div>
      <motion.p
        variants={reveal}
        initial="hidden"
        animate="show"
        custom={3}
        className="mt-6 text-footnote text-label-3"
      >
        Free. No credit card.
      </motion.p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Film: the one orchestrated moment. A sticky stage whose contents are
// driven directly by scroll position, so the viewer controls the pace.
// With reduced motion (or on small screens) the beats render as a plain
// stacked sequence instead.
// ---------------------------------------------------------------------------

function Film() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <section id="how" aria-label="How an interview works" className="scroll-mt-12">
      <div className={prefersReducedMotion ? "hidden" : "hidden lg:block"}>
        <ScrollFilm />
      </div>
      <div className={prefersReducedMotion ? "block" : "lg:hidden"}>
        <StackedFilm />
      </div>
    </section>
  );
}

function ScrollFilm() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [beat, setBeat] = useState(0);
  const [local, setLocal] = useState(0); // 0..1 progress inside the current beat

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const scaled = Math.min(Math.max(p, 0), 0.9999) * BEATS.length;
    setBeat(Math.floor(scaled));
    setLocal(scaled - Math.floor(scaled));
  });

  const railScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={ref} style={{ height: `${BEATS.length * 100 + 40}vh` }} className="relative">
      <div className="sticky top-0 flex h-screen items-center">
        <div className="mx-auto grid w-full max-w-page grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-16 px-6">
          <div className="relative pl-8">
            {/* Progress rail: the one piece of chrome the film has. */}
            <div className="absolute bottom-0 left-0 top-0 w-px bg-hairline" aria-hidden="true">
              <motion.div style={{ scaleY: railScale }} className="h-full w-px origin-top bg-label" />
            </div>
            <ol className="space-y-10">
              {BEATS.map((b, i) => (
                <li key={b.title} aria-current={i === beat ? "step" : undefined}>
                  <motion.div
                    animate={{ opacity: i === beat ? 1 : 0.28 }}
                    transition={{ duration: 0.4, ease: ease.apple }}
                  >
                    <h2 className="font-display text-title font-semibold">{b.title}</h2>
                    <AnimatePresence initial={false}>
                      {i === beat && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.4, ease: ease.apple }}
                          className="overflow-hidden pt-3 text-body text-label-2"
                        >
                          {b.body}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </li>
              ))}
            </ol>
          </div>
          <Stage beat={beat} progress={local} />
        </div>
      </div>
    </div>
  );
}

function StackedFilm() {
  return (
    <div className="mx-auto max-w-page space-y-24 px-6 py-24">
      {BEATS.map((b, i) => (
        <motion.div
          key={b.title}
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="space-y-8"
        >
          <div className="max-w-prose">
            <h2 className="font-display text-title font-semibold">{b.title}</h2>
            <p className="mt-3 text-body text-label-2">{b.body}</p>
          </div>
          <Stage beat={i} progress={1} />
        </motion.div>
      ))}
    </div>
  );
}

// The product itself, rendered as a single interview panel whose contents
// change with the beat. Styled like the real interview room, not a mockup
// of some other app.
function Stage({ beat, progress }) {
  return (
    <div className="relative overflow-hidden rounded-stage border border-hairline bg-surface">
      <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
        <div className="flex min-w-0 items-center gap-3 text-footnote">
          <span className="font-semibold text-label">{FILM.company}</span>
          <span className="text-label-3" aria-hidden="true">/</span>
          <span className="truncate text-label-2">{FILM.role}</span>
        </div>
        <span className="hidden shrink-0 rounded-full bg-surface-2 px-3 py-1 text-caption text-label-2 sm:inline">{FILM.persona} interviewer</span>
      </div>

      <div className="min-h-[440px] p-6 sm:p-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={beat}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.36, ease: ease.apple }}
          >
            {beat === 0 && <QuestionBeat />}
            {beat === 1 && <AnswerBeat progress={progress} />}
            {beat === 2 && <ScoresBeat progress={progress} />}
            {beat === 3 && <FollowUpBeat progress={progress} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="border-t border-hairline px-6 py-3 text-caption text-label-3">
        Example session. Scores and rating shown for illustration.
      </p>
    </div>
  );
}

function QuestionBeat() {
  return (
    <div>
      <p className="text-footnote text-label-3">Question 1 of 5, system design</p>
      <p className="mt-4 font-display text-[1.625rem] font-medium leading-[1.3] tracking-[-0.015em] text-label">
        {FILM.question}
      </p>
    </div>
  );
}

function AnswerBeat({ progress }) {
  const shown = Math.round(FILM.answer.length * Math.min(1, progress * 1.25));
  const words = FILM.answer.slice(0, shown).split(/\s+/).filter(Boolean).length;
  // Illustrative live meters that move with the transcript.
  const pace = Math.round(118 + 26 * Math.min(1, progress * 1.4));
  const fillers = progress > 0.55 ? 2 : progress > 0.25 ? 1 : 0;
  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <Meter label="Pace" value={`${pace}`} unit="wpm" />
        <Meter label="Fillers" value={`${fillers}`} />
        <Meter label="Words" value={`${words}`} />
      </div>
      <p className="mt-6 text-body leading-[1.6] text-label-2">
        <span className="text-label">{FILM.answer.slice(0, shown)}</span>
        {shown < FILM.answer.length && (
          <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-accent" aria-hidden="true" />
        )}
      </p>
    </div>
  );
}

function Meter({ label, value, unit }) {
  return (
    <div className="rounded-panel bg-surface-2 px-3 py-3 sm:px-4">
      <p className="text-caption text-label-3">{label}</p>
      <p className="mt-1 font-display text-headline font-semibold tabular-nums text-label">
        {value}
        {unit && <span className="ml-1 text-footnote font-normal text-label-3">{unit}</span>}
      </p>
    </div>
  );
}

function ScoresBeat({ progress }) {
  const fill = Math.min(1, progress * 1.6);
  const overall = FILM.scores.reduce((sum, s) => sum + s.value, 0) / FILM.scores.length;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-footnote text-label-3">Overall</p>
        <p className="font-display text-display-md font-semibold tabular-nums">{(overall * fill).toFixed(1)}</p>
      </div>
      <ul className="mt-6 space-y-5">
        {FILM.scores.map((s, i) => {
          const local = Math.min(1, Math.max(0, fill * 1.3 - i * 0.08));
          return (
            <li key={s.label}>
              <div className="flex items-baseline justify-between text-callout">
                <span className="text-label-2">{s.label}</span>
                <span className="tabular-nums text-label">{(s.value * local).toFixed(1)}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-label"
                  style={{ width: `${s.value * 10 * local}%`, opacity: 0.35 + s.value / 16 }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FollowUpBeat({ progress }) {
  const t = Math.min(1, progress * 1.5);
  const elo = Math.round(FILM.eloBefore + (FILM.eloAfter - FILM.eloBefore) * t);
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-footnote text-label-3">Your rating</p>
          <p className="mt-1 font-display text-display-md font-semibold tabular-nums">{elo}</p>
        </div>
        <p className="text-callout tabular-nums text-positive">+{elo - FILM.eloBefore}</p>
      </div>
      <div className="mt-8 border-t border-hairline pt-6">
        <p className="text-footnote text-label-3">Follow-up, harder</p>
        <p
          className="mt-3 font-display text-[1.375rem] font-medium leading-[1.35] tracking-[-0.012em] text-label transition-opacity duration-400"
          style={{ opacity: 0.2 + t * 0.8 }}
        >
          {FILM.followUp}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Two tracks
// ---------------------------------------------------------------------------

function Tracks() {
  return (
    <section id="tracks" className="scroll-mt-12 px-6 py-32">
      <div className="mx-auto max-w-page">
        <SectionHeading
          title="Talk it through. Or write it out."
          body="System design and behavioral rounds happen out loud. Coding rounds happen in a real editor, against real tests."
        />
        <div className="mt-16 grid gap-5 lg:grid-cols-2">
          <motion.article
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="flex flex-col rounded-stage bg-surface p-8 sm:p-10"
          >
            <h3 className="font-display text-title font-semibold">Voice interviews</h3>
            <p className="mt-3 max-w-md text-body text-label-2">
              Answer by speaking. Your words are transcribed as you go, with live feedback on pace and filler words, and
              every session is saved so you can replay it question by question.
            </p>
            <div className="mt-auto pt-10">
              <Waveform />
            </div>
          </motion.article>

          <motion.article
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            custom={1}
            className="flex flex-col rounded-stage bg-surface p-8 sm:p-10"
          >
            <h3 className="font-display text-title font-semibold">Coding interviews</h3>
            <p className="mt-3 max-w-md text-body text-label-2">
              Python, JavaScript, Java, or C++ in a full code editor. Run against sample cases, then submit against hidden
              tests in a sandbox. Hints nudge you forward without writing the code for you.
            </p>
            <pre
              className="mt-10 overflow-x-auto rounded-panel bg-canvas p-5 font-mono text-[12.5px] leading-[1.7] text-label-2"
              aria-label="Example solution"
            >
              <code>{CODE_SAMPLE}</code>
            </pre>
          </motion.article>
        </div>
      </div>
    </section>
  );
}

// Static, decorative. Heights are fixed so it never animates on its own.
const WAVE = [4, 9, 14, 7, 18, 26, 12, 20, 30, 16, 8, 22, 28, 14, 6, 11, 24, 18, 9, 5, 13, 21, 27, 15, 7, 10, 19, 25, 12, 6, 16, 23, 11, 5, 8, 14];

function Waveform() {
  return (
    <div className="flex h-16 items-center gap-[5px]" aria-hidden="true">
      {WAVE.map((h, i) => (
        <span key={i} className="w-[3px] rounded-full bg-label-2" style={{ height: `${h * 2}px`, opacity: 0.25 + (h / 30) * 0.75 }} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Companies + personas
// ---------------------------------------------------------------------------

function Companies({ onGetStarted }) {
  const [active, setActive] = useState("google");
  const company = COMPANIES.find((c) => c.id === active);

  return (
    <section id="companies" className="scroll-mt-12 bg-surface/40 px-6 py-32">
      <div className="mx-auto max-w-page">
        <SectionHeading
          title="Seven companies. Four kinds of interviewer."
          body="Each company profile shapes what gets asked and how it's judged. The interviewer's temperament is up to you."
        />

        <div className="mt-14 flex justify-center">
          <div role="tablist" aria-label="Company" className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface-2 p-1">
            {COMPANIES.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={active === c.id}
                aria-controls="company-panel"
                onClick={() => setActive(c.id)}
                className={cn(
                  "relative shrink-0 rounded-full px-4 py-2 text-footnote transition-colors duration-200",
                  active === c.id ? "text-canvas" : "text-label-2 hover:text-label"
                )}
              >
                {active === c.id && (
                  <motion.span
                    layoutId="company-pill"
                    className="absolute inset-0 rounded-full bg-label"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="relative">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div id="company-panel" role="tabpanel" className="mx-auto mt-10 max-w-3xl">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: ease.apple }}
              className="rounded-stage border border-hairline bg-canvas p-8 sm:p-10"
            >
              <p className="text-footnote text-label-3">
                {company.role}, {company.category.toLowerCase()}, {company.persona.toLowerCase()} interviewer
              </p>
              <p className="mt-5 text-body-lg text-label-2">{company.context}</p>
              <p className="mt-4 font-display text-[1.5rem] font-medium leading-[1.3] tracking-[-0.015em] text-label">
                {company.ask}
              </p>
            </motion.div>
          </AnimatePresence>
          <p className="mt-4 text-center text-footnote text-label-3">
            A sample. Real sessions generate a new question for your role and rating.
          </p>
        </div>

        <dl className="mx-auto mt-20 grid max-w-4xl gap-x-10 gap-y-8 sm:grid-cols-2">
          {PERSONAS.map((p) => (
            <div key={p.name} className="border-t border-hairline pt-5">
              <dt className="text-headline font-semibold">{p.name}</dt>
              <dd className="mt-1.5 text-callout text-label-2">{p.body}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-16 text-center">
          <Button variant="secondary" onClick={onGetStarted}>Choose your interviewer</Button>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Study plan
// ---------------------------------------------------------------------------

function StudyPlan() {
  return (
    <section id="study" className="scroll-mt-12 px-6 py-32">
      <div className="mx-auto grid max-w-page items-center gap-16 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-display-md font-semibold">Know what to study next.</h2>
          <p className="mt-5 max-w-md text-body-lg text-label-2">
            When an answer misses, it's traced back through a map of 93 connected topics to the prerequisite you're actually
            missing. Your plan is ordered by what the company you're targeting cares about most.
          </p>
        </div>

        <motion.ol
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="relative space-y-3"
          aria-label="Example study path"
        >
          {STUDY_PATH.map((step, i) => (
            <motion.li
              key={step.name}
              variants={reveal}
              custom={i}
              className={cn(
                "flex items-center justify-between rounded-panel px-6 py-5",
                step.state === "gap" ? "bg-surface-2 ring-1 ring-caution/40" : "bg-surface"
              )}
            >
              <span className="flex items-center gap-4">
                <span className="w-5 text-footnote tabular-nums text-label-3">{i + 1}</span>
                <span className={cn("text-body", step.state === "next" ? "text-label-2" : "text-label")}>{step.name}</span>
              </span>
              <span
                className={cn(
                  "text-footnote",
                  step.state === "solid" && "text-label-3",
                  step.state === "gap" && "text-caution",
                  step.state === "next" && "text-label-3"
                )}
              >
                {step.state === "solid" ? "Solid" : step.state === "gap" ? "Study this first" : "Unlocks after"}
              </span>
            </motion.li>
          ))}
          <p className="pt-2 text-caption text-label-3">Example path.</p>
        </motion.ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Closing + footer
// ---------------------------------------------------------------------------

function Closing({ onGetStarted }) {
  return (
    <section className="px-6 pb-40 pt-16 text-center">
      <h2 className="mx-auto max-w-[16ch] font-display text-display-lg font-semibold">
        Walk into the real one already warmed up.
      </h2>
      <div className="mt-10 flex justify-center">
        <Button size="lg" onClick={onGetStarted}>Start a free interview</Button>
      </div>
    </section>
  );
}

function Footer({ onNavigatePrivacy, onNavigateTerms }) {
  return (
    <footer className="border-t border-hairline px-6 py-10">
      <div className="mx-auto flex max-w-page flex-col gap-6 text-footnote text-label-3 sm:flex-row sm:items-center sm:justify-between">
        <p>Built by one developer with FastAPI, PostgreSQL, Claude, and Judge0.</p>
        <nav aria-label="Footer" className="flex gap-6">
          <button onClick={() => onNavigatePrivacy?.()} className="transition-colors hover:text-label">Privacy</button>
          <button onClick={() => onNavigateTerms?.()} className="transition-colors hover:text-label">Terms</button>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-label">
            Source on GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}

function SectionHeading({ title, body }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="font-display text-display-md font-semibold">{title}</h2>
      {body && <p className="mx-auto mt-5 max-w-prose text-body-lg text-label-2">{body}</p>}
    </div>
  );
}
