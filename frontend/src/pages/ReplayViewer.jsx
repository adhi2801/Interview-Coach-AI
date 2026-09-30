// Sessions: every past interview in a filterable table, and a replay of any
// one of them — each question, how it scored and why, the answer, the gaps
// it found, and what the live coach said while it was being written.

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { ArrowLeft, Search } from "lucide-react";
import api from "../lib/api";
import { AppHeader, Frame, PageIntro } from "../components/app/AppChrome";
import StudyPlan from "./StudyPlan";
import { humanize } from "./knowledge/graph";
import ScoreBars, { overallScore } from "./interview/ScoreBars";

const capitalize = (s = "") => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "–");

function Delta({ value }) {
  if (value == null) return <span className="text-white/40">–</span>;
  const tone = value > 0 ? "text-emerald-300" : value < 0 ? "text-rose-300" : "text-white/55";
  return <span className={`font-mono tabular-nums ${tone}`}>{value > 0 ? "+" : ""}{value}</span>;
}

// ---------------------------------------------------------------- list ----

function SessionsList({ onSelectSession, onExit }) {
  const [sessions, setSessions] = useState(null);
  const [deltas, setDeltas] = useState({});
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("all");
  const [sort, setSort] = useState("recent");

  useEffect(() => {
    api.get("/user/sessions").then((r) => setSessions(r.data?.sessions || [])).catch(() => setSessions([]));
    // Rating changes come from the activity feed, which interleaves coding
    // submissions: diffing consecutive interviews alone was wrong whenever
    // a coding submission moved the rating in between.
    api.get("/user/activity").then((r) => {
      setDeltas(Object.fromEntries((r.data?.activity || []).filter((e) => e.track === "interview").map((e) => [e.id, e.elo_delta])));
    }).catch(() => {});
  }, []);

  const companies = useMemo(() => [...new Set((sessions || []).map((s) => (s.company_target || "").toLowerCase()).filter(Boolean))].sort(), [sessions]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (sessions || []).filter((s) =>
      (company === "all" || (s.company_target || "").toLowerCase() === company) &&
      (!q || `${s.company_target} ${s.role} ${s.persona}`.toLowerCase().includes(q)));
    if (sort === "highest") list.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    if (sort === "lowest") list.sort((a, b) => (a.score ?? 999) - (b.score ?? 999));
    return list;
  }, [sessions, query, company, sort]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-transparent font-sans text-slate-200">
      <AppHeader back={{ label: "Overview", onClick: onExit }} />
      <PageIntro title="Sessions"
        subtitle="Open any session to go back through it: each question, your answer, how it scored and why, and the gaps it found." />

      <Frame className="flex-1" innerClassName="border-b border-white/[0.08]">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <label className="relative block w-full md:w-72">
            <span className="sr-only">Search sessions</span>
            <Search size={14} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search company, role or interviewer"
              className="w-full border border-white/10 rounded-lg bg-[#07070b] py-2 pl-9 pr-3 text-[13.5px] text-white placeholder:text-white/45 focus:border-indigo-400 focus:outline-none" />
          </label>
          <div className="flex flex-wrap items-center gap-4 text-[13px] text-white/60">
            <label className="flex items-center gap-2">Company
              <select value={company} onChange={(e) => setCompany(e.target.value)}
                className="border border-white/15 rounded-lg bg-[#07070b] px-2 py-1.5 text-white focus:border-indigo-400 focus:outline-none">
                <option value="all">All</option>
                {companies.map((c) => <option key={c} value={c}>{capitalize(c)}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2">Sort
              <select value={sort} onChange={(e) => setSort(e.target.value)}
                className="border border-white/15 rounded-lg bg-[#07070b] px-2 py-1.5 text-white focus:border-indigo-400 focus:outline-none">
                <option value="recent">Most recent</option>
                <option value="highest">Highest score</option>
                <option value="lowest">Lowest score</option>
              </select>
            </label>
          </div>
        </div>

        {sessions === null ? (
          <div aria-busy="true" aria-label="Loading sessions" className="space-y-px p-6">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse bg-white/[0.03]" />)}</div>
        ) : sessions.length === 0 ? (
          <p className="px-5 py-16 text-center text-[15px] text-white/65 md:px-8">No sessions yet. Finished interviews appear here to replay.</p>
        ) : (
          <div className="overflow-x-auto px-5 md:px-8">
            <table className="w-full min-w-[44rem] text-left text-[14px]">
              <thead>
                <tr className="border-b border-white/[0.08] text-[12.5px] text-white/50">
                  <th scope="col" className="py-3 pr-4 font-normal">Date</th>
                  <th scope="col" className="py-3 pr-4 font-normal">Interview</th>
                  <th scope="col" className="py-3 pr-4 font-normal">Interviewer</th>
                  <th scope="col" className="py-3 pr-4 text-right font-normal">Questions</th>
                  <th scope="col" className="py-3 pr-4 text-right font-normal">Score</th>
                  <th scope="col" className="py-3 text-right font-normal">Rating</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b border-white/[0.05]">
                    <td className="py-3.5 pr-4 font-mono text-[12.5px] text-white/55">{fmtDate(s.started_at)}</td>
                    <td className="py-3.5 pr-4">
                      <button type="button" onClick={() => onSelectSession(s.id)}
                        className="text-left text-white hover:underline hover:decoration-white/40 hover:underline-offset-4">
                        {capitalize(s.company_target || "Interview")}<span className="text-white/50"> · {s.role}</span>
                      </button>
                    </td>
                    <td className="py-3.5 pr-4 text-white/70">{capitalize(s.persona || "standard")}</td>
                    <td className="py-3.5 pr-4 text-right font-mono tabular-nums text-white/70">{s.question_count}</td>
                    <td className="py-3.5 pr-4 text-right font-mono tabular-nums text-white/90">{s.score != null ? s.score.toFixed(1) : "–"}</td>
                    <td className="py-3.5 text-right"><Delta value={deltas[s.id]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="py-8 text-[14px] text-white/60">No sessions match these filters.</p>}
          </div>
        )}
      </Frame>
    </div>
  );
}

// -------------------------------------------------------------- replay ----

function Replay({ sessionId, onBack }) {
  const [replay, setReplay] = useState(null);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [studyTopic, setStudyTopic] = useState(null);

  useEffect(() => {
    setReplay(null);
    setError("");
    api.get(`/replay/${sessionId}`).then((r) => setReplay(r.data)).catch((err) => setError(err.message || "Couldn't load this session."));
  }, [sessionId]);

  const questions = replay?.questions || [];
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea, select")) return;
      if (e.key === "ArrowRight") setIndex((i) => Math.min(questions.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [questions.length]);

  const q = questions[index];
  const scored = questions.map((x) => overallScore(x.scores)).filter((v) => v != null);
  const average = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-transparent font-sans text-slate-200">
      <AppHeader back={{ label: "Sessions", onClick: onBack }} />
      <Frame innerClassName="border-b border-white/[0.08]">
        <div className="px-5 pb-8 pt-12 md:px-8 md:pt-14">
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white">
            <ArrowLeft size={13} aria-hidden="true" /> All sessions
          </button>
          {error ? (
            <p className="mt-6 text-[16px] text-white/80">{error}</p>
          ) : !replay ? (
            <div aria-busy="true" aria-label="Loading the session" className="mt-6 h-12 w-2/3 animate-pulse bg-white/[0.04]" />
          ) : (
            <>
              <h1 className="mt-5 text-[40px] font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-[52px]">
                {capitalize(replay.company)}, {replay.role}
              </h1>
              <p className="mt-3 text-[15px] text-white/60">
                {fmtDate(replay.started_at)}. {questions.length} {questions.length === 1 ? "question" : "questions"}
                {average != null && <>, averaging <span className="font-mono tabular-nums text-white">{average.toFixed(1)}</span> out of 10</>}.
              </p>
            </>
          )}
        </div>
      </Frame>

      {replay && questions.length > 0 && (
        <Frame className="flex-1" innerClassName="border-b border-white/[0.08]">
          <div className="grid lg:grid-cols-[17rem_minmax(0,1fr)]">
            <nav aria-label="Questions in this session" className="border-b border-white/[0.08] lg:border-b-0 lg:border-r">
              <ol className="lg:sticky lg:top-16">
                {questions.map((x, i) => {
                  const score = overallScore(x.scores);
                  const active = i === index;
                  return (
                    <li key={i} className="border-b border-white/[0.06]">
                      <button type="button" onClick={() => setIndex(i)} aria-current={active ? "step" : undefined}
                        className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors md:px-6 ${active ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"}`}>
                        <span className={`grid h-6 w-6 shrink-0 place-items-center border font-mono text-[11.5px] ${active ? "border-indigo-300 text-indigo-100" : "border-white/25 text-white/65"}`}>{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className={`line-clamp-2 text-[13.5px] leading-snug ${active ? "text-white" : "text-white/75"}`}>{x.question}</span>
                          <span className="mt-1 block text-[12px] text-white/50">
                            {score != null ? <>Scored <span className="font-mono">{score.toFixed(1)}</span></> : "Not scored"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <p className="hidden px-6 py-4 text-[12px] text-white/50 lg:block">Use ← and → to move between questions.</p>
            </nav>

            <article className="min-w-0 px-5 py-8 md:px-8">
              <p className="text-[13px] text-white/55">Question {index + 1}{q.category ? `, ${humanize(q.category).toLowerCase()}` : ""}</p>
              <h2 className="mt-2 max-w-3xl text-[22px] font-semibold leading-snug tracking-[-0.02em] text-white">{q.question}</h2>

              {q.scores ? (
                <section className="mt-8" aria-label="How it scored">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[44px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-white">{overallScore(q.scores).toFixed(1)}</span>
                    <span className="text-[16px] text-white/60">/10</span>
                  </div>
                  {q.scores.overall_summary && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/80">{q.scores.overall_summary}</p>}
                  <div className="mt-4"><ScoreBars scores={q.scores} flagged={q.scores.manipulation_attempt === true} /></div>
                </section>
              ) : (
                <p className="mt-6 text-[14.5px] text-white/65">This question was asked but not answered.</p>
              )}

              <div className="mt-8 grid gap-10 border-t border-white/[0.08] pt-8 md:grid-cols-2">
                <section aria-labelledby="replay-answer">
                  <h3 id="replay-answer" className="mb-3 text-[15px] font-semibold text-white">Your answer</h3>
                  <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-white/80">{q.answer?.trim() || "No answer was recorded."}</p>
                </section>
                <section aria-labelledby="replay-gaps">
                  <h3 id="replay-gaps" className="mb-3 text-[15px] font-semibold text-white">Gaps found</h3>
                  {q.gaps?.length ? (
                    <ul className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
                      {q.gaps.map((g) => (
                        <li key={g.gap} className="flex items-start justify-between gap-4 py-3">
                          <div className="min-w-0">
                            <p className="text-[14.5px] text-white">{humanize(g.gap)}</p>
                            {g.prerequisites_to_study_first?.length > 0 && (
                              <p className="mt-0.5 text-[13px] text-white/55">Study {g.prerequisites_to_study_first.map(humanize).join(", ")} first.</p>
                            )}
                          </div>
                          <button type="button" onClick={() => setStudyTopic(g.gap)}
                            className="shrink-0 glass-control rounded-lg px-3 py-1.5 text-[13px] text-white hover:bg-white/[0.06]">Study plan</button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[14px] text-white/65">{q.scores ? "No gaps found in this answer." : "–"}</p>
                  )}
                </section>
              </div>

              {q.coaching_moments?.length > 0 && (
                <section aria-labelledby="replay-coach" className="mt-8 border-t border-white/[0.08] pt-8">
                  <h3 id="replay-coach" className="mb-3 text-[15px] font-semibold text-white">What the live coach said</h3>
                  <ol className="space-y-3">
                    {q.coaching_moments.map((m, i) => (
                      <li key={i} className="border-l-2 border-white/15 pl-4 text-[14px] leading-relaxed">
                        <p className="text-white/85">{m.intervention || m.suggestion}</p>
                        <p className="mt-0.5 text-[12.5px] text-white/50">
                          {m.source === "audio" ? "While speaking" : "While typing"}. Confidence {m.confidence_score ?? "–"}/10
                          {m.filler_count != null && `, ${m.filler_count} filler ${m.filler_count === 1 ? "word" : "words"}`}
                          {m.source === "audio" && m.words_per_minute ? `, ${Math.round(m.words_per_minute)} words a minute` : ""}.
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <div className="mt-10 flex items-center justify-between border-t border-white/[0.08] pt-5">
                <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}
                  className="glass-control rounded-lg px-4 py-2 text-[13.5px] text-white hover:bg-white/[0.06] disabled:opacity-40">Previous question</button>
                <button type="button" disabled={index === questions.length - 1} onClick={() => setIndex(index + 1)}
                  className="glass-control rounded-lg px-4 py-2 text-[13.5px] text-white hover:bg-white/[0.06] disabled:opacity-40">Next question</button>
              </div>
            </article>
          </div>
        </Frame>
      )}

      <AnimatePresence>
        {studyTopic && <StudyPlan topicName={studyTopic} company={replay?.company} onClose={() => setStudyTopic(null)} />}
      </AnimatePresence>
    </div>
  );
}

export default function ReplayViewer({ sessionId, onExit, onSelectSession, onBackToList }) {
  if (sessionId) return <Replay sessionId={sessionId} onBack={onBackToList || onExit} />;
  return <SessionsList onSelectSession={onSelectSession} onExit={onExit} />;
}
