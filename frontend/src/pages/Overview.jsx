// Overview: what to do next, and whether it's working. Actions first, then
// the rating over time beside a ranked list of gaps to fix, then scores by
// dimension, practice rhythm, and recent activity. Everything shown comes
// from real endpoints; anything the data can't support is left out.

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { ArrowUpRight, Code2, Play } from "lucide-react";
import api from "../lib/api";
import { useTransitionNavigate } from "../lib/navigation";
import { AppHeader, Frame, PageIntro } from "../components/app/AppChrome";
import StudyPlan from "./StudyPlan";
import { humanize } from "./knowledge/graph";
import RatingChart from "./overview/RatingChart";
import {
  capitalize, lastTwoWeeks, mostPractisedCompany, personaInsight, personalBest, practiceWeeks, ratingSeries, recentChange,
  streak, summarySentence, toRows,
} from "./overview/data";

const URGENCY_TONE = { critical: "text-rose-300", high: "text-amber-300", medium: "text-amber-200/80", low: "text-white/55" };
const fmtDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function SectionHead({ title, meta, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-white">{title}</h2>
        {meta && <p className="mt-0.5 text-[13px] text-white/55">{meta}</p>}
      </div>
      {children}
    </div>
  );
}

function Delta({ value }) {
  if (value == null) return <span className="text-white/40">–</span>;
  const tone = value > 0 ? "text-emerald-300" : value < 0 ? "text-rose-300" : "text-white/55";
  return <span className={`font-mono tabular-nums ${tone}`}>{value > 0 ? "+" : ""}{value}</span>;
}

function Actions({ onStartNew, onStartCoding }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <button type="button" onClick={onStartNew}
        className="btn-liquid flex items-center gap-2 px-5 py-3 text-[14px] font-semibold">
        <Play size={14} aria-hidden="true" /> Start an interview
      </button>
      <button type="button" onClick={onStartCoding}
        className="flex items-center gap-2 glass-control rounded-lg px-5 py-3 text-[14px] font-semibold text-white hover:bg-white/[0.06]">
        <Code2 size={14} aria-hidden="true" /> Solve a coding problem
      </button>
    </div>
  );
}

function WorkOnNext({ gaps, loading, company, companies, onCompany, onStudy }) {
  return (
    <div>
      <SectionHead title="Work on next" meta="Gaps found in your answers, most urgent first">
        <label className="flex items-center gap-2 text-[13px] text-white/55">
          For
          <select value={company} onChange={(e) => onCompany(e.target.value)}
            className="border border-white/15 rounded-lg bg-[#07070b] px-2 py-1 text-[13px] text-white focus:border-indigo-400 focus:outline-none">
            {companies.map((c) => <option key={c} value={c}>{capitalize(c)}</option>)}
          </select>
        </label>
      </SectionHead>
      {loading ? (
        <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse bg-white/[0.03]" />)}</div>
      ) : gaps.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-white/60">
          No gaps recorded for {capitalize(company)} interviews yet. They appear here after your answers are scored.
        </p>
      ) : (
        <ol className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {gaps.slice(0, 5).map((g, i) => (
            <li key={g.gap}>
              <button type="button" onClick={() => onStudy(g.gap)}
                className="group flex w-full items-baseline gap-3 py-3 text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-indigo-300">
                <span className="w-4 shrink-0 font-mono text-[12px] tabular-nums text-white/50">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] text-white group-hover:underline group-hover:decoration-white/40 group-hover:underline-offset-4">{humanize(g.gap)}</span>
                  <span className="text-[12.5px] text-white/50">
                    Seen in {g.occurrences} {g.occurrences === 1 ? "answer" : "answers"}
                    {g.prerequisites_to_study_first?.length > 0 && `. Study ${g.prerequisites_to_study_first.map(humanize).join(", ")} first`}
                  </span>
                </span>
                <span className={`shrink-0 text-[12.5px] ${URGENCY_TONE[g.urgency] || URGENCY_TONE.low}`}>{capitalize(g.urgency || "low")}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function DimensionBars({ radar, sampleSize, company }) {
  if (!radar?.length) {
    return (
      <div>
        <SectionHead title="Scores by dimension" />
        <p className="text-[14px] text-white/60">No scored {capitalize(company)} answers yet.</p>
      </div>
    );
  }
  const sorted = [...radar].sort((a, b) => b.value - a.value);
  const best = sorted[0], worst = sorted[sorted.length - 1];
  return (
    <div>
      <SectionHead title="Scores by dimension" meta={`Average of ${sampleSize} scored ${capitalize(company)} ${sampleSize === 1 ? "answer" : "answers"}`} />
      <ul className="space-y-3">
        {radar.map((d) => (
          <li key={d.dim}>
            <div className="mb-1 flex justify-between text-[13px]">
              <span className="text-white/80">{d.dim}</span>
              <span className="font-mono tabular-nums text-white/70">{d.value.toFixed(1)}</span>
            </div>
            <div className="h-[3px] bg-white/[0.07]">
              <div className={`h-full ${d === worst ? "bg-amber-300" : d === best ? "bg-emerald-300" : "bg-indigo-300/80"}`} style={{ width: `${Math.max(2, Math.min(100, d.value * 10))}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13px] leading-relaxed text-white/55">
        Strongest in {best.dim.toLowerCase()}; {worst.dim.toLowerCase()} needs the most work.
      </p>
    </div>
  );
}

function Rhythm({ dates }) {
  const weeks = useMemo(() => practiceWeeks(dates), [dates]);
  const days = streak(dates);
  const active = weeks.flat().filter((d) => d.count > 0).length;
  const { recent, before } = lastTwoWeeks(dates);
  const tone = (n) => (n === 0 ? "bg-white/[0.05]" : n === 1 ? "bg-indigo-400/45" : n === 2 ? "bg-indigo-400/70" : "bg-indigo-300");
  const cell = "aspect-square w-full";
  return (
    <div>
      <SectionHead title="Practice rhythm" meta={days > 1 ? `${days}-day streak` : `${active} active ${active === 1 ? "day" : "days"} in ${weeks.length} weeks`} />
      <div className="flex items-stretch gap-[3px]" role="img" aria-label={`Practice on ${active} of the last ${weeks.length * 7} days`}>
        <div className="mr-1.5 grid grid-rows-7 gap-[3px] text-[11px] text-white/50">
          {["Mon", "", "Wed", "", "Fri", "", ""].map((l, i) => <span key={i} className="flex items-center">{l}</span>)}
        </div>
        {weeks.map((week, w) => (
          <div key={w} className="grid min-w-0 max-w-[22px] flex-1 grid-rows-7 gap-[3px]">
            {week.map((d) => (
              <span key={d.date.toISOString()} title={`${fmtDate(d.date)}: ${d.count} ${d.count === 1 ? "session" : "sessions"}`}
                className={`${cell} ${d.future ? "bg-transparent" : tone(d.count)}`} />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-5 text-[14px] leading-relaxed text-white/75">
        {recent} {recent === 1 ? "session" : "sessions"} in the last 7 days
        {before > 0 || recent > 0 ? <span className="text-white/55">, {before} the week before.</span> : "."}
      </p>
    </div>
  );
}

function ActivityTable({ rows, onOpen, onAll }) {
  return (
    <div>
      <SectionHead title="Recent activity" meta="Interviews and coding submissions; both move one rating">
        <button type="button" onClick={onAll} className="flex items-center gap-1 text-[13px] text-indigo-200 hover:text-white">
          All sessions <ArrowUpRight size={13} aria-hidden="true" />
        </button>
      </SectionHead>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13.5px] md:min-w-[40rem]">
          <thead>
            <tr className="border-b border-white/[0.08] text-[12px] text-white/50">
              <th scope="col" className="hidden py-2 pr-4 font-normal md:table-cell">Date</th>
              <th scope="col" className="py-2 pr-4 font-normal">Practice</th>
              <th scope="col" className="hidden py-2 pr-4 font-normal md:table-cell">Mode</th>
              <th scope="col" className="py-2 pr-4 text-right font-normal">Score</th>
              <th scope="col" className="py-2 text-right font-normal">Rating</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const open = r.track === "interview" ? () => onOpen(r.id) : null;
              return (
                <tr key={r.key} className="border-b border-white/[0.05]">
                  <td className="hidden py-3 pr-4 font-mono text-[12.5px] text-white/55 md:table-cell">{r.when ? fmtDate(r.when) : "–"}</td>
                  <td className="py-3 pr-4">
                    {open ? (
                      <button type="button" onClick={open} className="text-left text-white hover:underline hover:decoration-white/40 hover:underline-offset-4">
                        {r.title}<span className="text-white/50"> · {r.detail}</span>
                      </button>
                    ) : (
                      <span className="text-white">{r.title}<span className="text-white/50"> · {r.detail}</span></span>
                    )}
                    <span className="mt-0.5 block text-[12.5px] text-white/50 md:hidden">{r.when ? fmtDate(r.when) : ""}{r.mode ? `, ${r.mode}` : ""}</span>
                  </td>
                  <td className="hidden py-3 pr-4 text-white/65 md:table-cell">{r.mode}</td>
                  <td className="py-3 pr-4 text-right font-mono tabular-nums text-white/85">{r.score != null ? r.score.toFixed(1) : r.tests ?? "–"}</td>
                  <td className="py-3 text-right"><Delta value={r.delta} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Overview({ user, onStartNew, onStartCoding, onNavigateHistory, onEloUpdate }) {
  const navigate = useTransitionNavigate();
  const [rows, setRows] = useState(null);
  const [companies, setCompanies] = useState(["google", "amazon", "meta", "microsoft", "apple", "netflix", "startup"]);
  const [company, setCompany] = useState(null);
  const [radar, setRadar] = useState({ radar: null, sample_size: 0 });
  const [gaps, setGaps] = useState({ queue: [], loading: true });
  const [degraded, setDegraded] = useState(false);
  const [studyTopic, setStudyTopic] = useState(null);

  useEffect(() => {
    api.get("/health", { timeout: 5000 }).then((r) => setDegraded(r.data?.status !== "ok")).catch(() => setDegraded(true));
    api.get("/user/profile-summary").then((res) => {
      const elo = res.data?.elo_rating;
      if (typeof elo === "number" && Math.round(elo) !== Math.round(user?.elo_rating || 1200)) onEloUpdate?.(elo);
    }).catch(() => {});
    api.get("/companies").then((res) => {
      if (Array.isArray(res.data?.companies) && res.data.companies.length) setCompanies(res.data.companies);
    }).catch(() => {});
    api.get("/user/activity").then((res) => setRows(toRows(res.data?.activity || []))).catch(() => setRows([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default the company to the one this candidate practises for most.
  useEffect(() => {
    if (rows && !company) setCompany(mostPractisedCompany(rows) || companies[0]);
  }, [rows, company, companies]);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    setGaps((g) => ({ ...g, loading: true }));
    Promise.all([
      api.get("/user/skill-radar", { params: { company } }),
      api.get("/user/gap-queue", { params: { company } }),
    ]).then(([r, g]) => {
      if (cancelled) return;
      setRadar(r.data);
      setGaps({ queue: g.data?.queue || [], loading: false });
    }).catch(() => !cancelled && setGaps({ queue: [], loading: false }));
    return () => { cancelled = true; };
  }, [company]);

  const series = useMemo(() => ratingSeries(rows || []), [rows]);
  const dates = useMemo(() => (rows || []).filter((r) => r.when).map((r) => r.when), [rows]);
  const elo = Math.round(user?.elo_rating ?? 1200);
  const change = recentChange(series);
  const best = personalBest(series);
  const insight = useMemo(() => personaInsight(rows || []), [rows]);
  const weakest = radar.radar?.length ? [...radar.radar].sort((a, b) => a.value - b.value)[0].dim.toLowerCase() : null;
  const hasHistory = (rows || []).length > 0;
  const companyOptions = company && !companies.includes(company) ? [company, ...companies] : companies;

  return (
    <div className="relative min-h-screen overflow-x-clip bg-transparent font-sans text-slate-200 selection:bg-indigo-500/40">
      <AppHeader />

      <PageIntro
        title={`${greeting()}, ${user?.name?.split(" ")[0] || "there"}.`}
        subtitle={rows ? summarySentence({ elo, change, topGap: gaps.queue[0] ? humanize(gaps.queue[0].gap) : null, weakest: weakest && capitalize(weakest), hasHistory }) : " "}
        aside={<Actions onStartNew={onStartNew} onStartCoding={onStartCoding} />}
      />

      {degraded && (
        <Frame innerClassName="border-b border-white/[0.08]">
          <p role="status" className="px-5 py-3 text-[13.5px] text-amber-200 md:px-8">
            Scoring is having trouble right now, so new answers may take longer to grade. Your history is safe.
          </p>
        </Frame>
      )}

      {rows === null ? (
        <Frame innerClassName="border-b border-white/[0.08]">
          <div aria-busy="true" aria-label="Loading your overview" className="grid gap-px p-6 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse bg-white/[0.03]" />)}
          </div>
        </Frame>
      ) : (
        <>
          <Frame innerClassName="border-b border-white/[0.08]">
            <div className="grid lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
              <section aria-labelledby="rating-title" className="border-b border-white/[0.08] px-5 py-8 md:px-8 lg:border-b-0 lg:border-r">
                <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h2 id="rating-title" className="sr-only">Rating</h2>
                  <p className="text-[48px] font-semibold leading-none tracking-[-0.045em] text-white tabular-nums">{elo.toLocaleString("en-US")}</p>
                  <p className="text-[13.5px] text-white/60">
                    {change != null ? <><Delta value={change} /> in the last 30 days</> : "Rating"}
                    {best && best.elo > elo && <>, best {best.elo.toLocaleString("en-US")}</>}
                  </p>
                </div>
                {series.length >= 2 ? (
                  <>
                    <RatingChart series={series} />
                    <p className="mt-3 flex gap-4 text-[12px] text-white/55">
                      <span className="flex items-center gap-1.5"><span className="h-[6px] w-[6px] bg-indigo-300" />Interview</span>
                      <span className="flex items-center gap-1.5"><span className="h-[6px] w-[6px] bg-emerald-400" />Coding</span>
                    </p>
                  </>
                ) : (
                  <p className="max-w-md py-10 text-[14px] leading-relaxed text-white/60">
                    Your rating history draws itself here after two scored sessions. Every interview answer and coding submission moves it.
                  </p>
                )}
              </section>
              <section className="px-5 py-8 md:px-8">
                {company && (
                  <WorkOnNext gaps={gaps.queue} loading={gaps.loading} company={company} companies={companyOptions}
                    onCompany={setCompany} onStudy={setStudyTopic} />
                )}
              </section>
            </div>
          </Frame>

          {!hasHistory && (
            <Frame innerClassName="border-b border-white/[0.08]">
              <section aria-labelledby="how-title" className="px-5 py-8 md:px-8">
                <h2 id="how-title" className="text-[15px] font-semibold text-white">How it works</h2>
                <ol className="mt-5 grid gap-6 md:grid-cols-3">
                  {[
                    ["Answer real questions", "An interview is five questions in the style of the company you pick. Each answer is scored on technical depth, communication, problem solving, culture fit and confidence."],
                    ["See what's missing", "Topics you miss become gaps on your knowledge graph, with the prerequisites to study first."],
                    ["Get harder questions", "Every scored answer and coding submission moves your rating, and the next questions adapt to it."],
                  ].map(([title, body], i) => (
                    <li key={title} className="flex gap-3">
                      <span className="grid h-6 w-6 shrink-0 place-items-center border border-white/20 font-mono text-[12px] text-white/70">{i + 1}</span>
                      <div>
                        <h3 className="text-[14.5px] font-medium text-white">{title}</h3>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-white/60">{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </Frame>
          )}

          {hasHistory && (
            <Frame innerClassName="border-b border-white/[0.08]">
              <div className={`grid md:grid-cols-2 ${insight ? "lg:grid-cols-3" : ""}`}>
                <section className="border-b border-white/[0.08] px-5 py-8 md:border-r md:px-8 lg:border-b-0">
                  {company && <DimensionBars radar={radar.radar} sampleSize={radar.sample_size} company={company} />}
                </section>
                <section className={`px-5 py-8 md:px-8 ${insight ? "border-b border-white/[0.08] lg:border-b-0 lg:border-r" : ""}`}>
                  <Rhythm dates={dates} />
                </section>
                {insight && (
                  <section className="px-5 py-8 md:col-span-2 md:px-8 lg:col-span-1">
                    <SectionHead title="Pattern in your results" />
                    <p className="text-[18px] leading-snug tracking-[-0.01em] text-white">{insight.text}.</p>
                    <p className="mt-2 text-[13px] text-white/55">{insight.detail}</p>
                  </section>
                )}
              </div>
            </Frame>
          )}

          {hasHistory && (
            <Frame innerClassName="border-b border-white/[0.08]">
              <section className="px-5 py-8 md:px-8">
                <ActivityTable rows={rows.slice(0, 8)} onOpen={(id) => navigate(`/replay/${id}`)} onAll={onNavigateHistory} />
              </section>
            </Frame>
          )}
        </>
      )}

      <AnimatePresence>
        {studyTopic && <StudyPlan topicName={studyTopic} company={company} onClose={() => setStudyTopic(null)} />}
      </AnimatePresence>
    </div>
  );
}
