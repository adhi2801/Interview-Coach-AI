// The results for one answered question: score and verdict, the rating
// change, how each dimension scored (with the grader's own sentence), every
// gap found with what to study first, the answer itself, and what's next.
// Real data only; anything missing is said plainly or left out.

import { motion } from "motion/react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { humanize } from "../knowledge/graph";
import { TOTAL_NODES } from "./constants";
import ScoreBars, { overallScore } from "./ScoreBars";


function Heading({ children }) {
  return <h3 className="mb-4 text-[15px] font-semibold text-white">{children}</h3>;
}

export default function Debrief({
  personaMeta, questionNum, isLastNode, scores, gaps, gapAnalysisUnavailable, peer, newElo, currentElo, company,
  answer, liveCoaching, currentAnswerId, feedbackRating, onRateFeedback, onOpenStudyPlan, onRetry, onNext, onFinish,
}) {
  const overall = overallScore(scores) ?? 0;
  const eloDelta = newElo ? Math.round(newElo - currentElo) : null;
  const summary = (scores?.overall_summary || "").toLowerCase();
  const profanity = summary.includes("inappropriate language") || summary.includes("unprofessional language");
  const manipulation = scores?.manipulation_attempt === true;
  const flagged = profanity || manipulation;
  const passed = !flagged && overall >= 7;
  const verdict = flagged ? "Not graded on its content." : passed ? "A strong answer." : overall >= 5 ? "Close. Another pass will help." : "This one needs work.";

  return (
    <div className="h-full w-full flex-1 overflow-y-auto" data-lenis-prevent>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto w-full max-w-[1080px] px-5 pb-28 pt-10 md:px-8">

        <p className="text-[13px] text-white/55">
          Question {questionNum} of {TOTAL_NODES}, with the {personaMeta.label.toLowerCase()} interviewer
        </p>

        <section aria-labelledby="verdict" className="mt-3 grid gap-6 border-b border-white/[0.08] pb-9 md:grid-cols-[auto_minmax(0,1fr)] md:gap-10">
          <p className="flex items-baseline gap-1.5">
            <span className={`text-[76px] font-semibold leading-none tracking-[-0.05em] tabular-nums ${flagged ? "text-rose-200" : "text-white"}`}>
              {overall.toFixed(1)}
            </span>
            <span className="text-[18px] text-white/60">/10</span>
          </p>
          <div className="min-w-0 self-center">
            <h2 id="verdict" className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-white">{verdict}</h2>
            {eloDelta != null && (
              <p className="mt-2 text-[14px] text-white/65">
                Rating <span className="font-mono tabular-nums">{Math.round(currentElo).toLocaleString("en-US")}</span>
                <ArrowRight size={12} aria-label="to" className="mx-1.5 inline -mt-0.5" />
                <span className="font-mono tabular-nums text-white">{Math.round(newElo).toLocaleString("en-US")}</span>{" "}
                <span className={`font-mono tabular-nums ${eloDelta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>({eloDelta >= 0 ? "+" : ""}{eloDelta})</span>
              </p>
            )}
            {scores?.overall_summary && <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-white/80">{scores.overall_summary}</p>}
          </div>
        </section>

        {flagged && (
          <p role="alert" className="mt-6 border-l-2 border-rose-400 pl-4 text-[14px] leading-relaxed text-rose-100/90">
            {manipulation
              ? "This answer addressed the grader instead of the question, so every dimension scored zero. Answer the question itself to be graded."
              : "The answer contained language an interviewer would treat as disqualifying, so it was scored down. Keep to professional, specific language."}
          </p>
        )}

        {scores && (
          <section aria-labelledby="how" className="border-b border-white/[0.08] py-9">
            <Heading><span id="how">How it scored</span></Heading>
            <ScoreBars scores={scores} flagged={flagged} extraNote={(key) =>
              key === "score_confidence" && liveCoaching
                ? `Live coaching counted ${liveCoaching.filler_count ?? 0} filler ${liveCoaching.filler_count === 1 ? "word" : "words"}${liveCoaching.pace_source === "speech" && liveCoaching.words_per_minute ? ` at ${Math.round(liveCoaching.words_per_minute)} words a minute` : ""}.`
                : key === "score_cultural_fit" && company?.name ? `Judged against how ${company.name} interviews.` : null} />
            {peer?.percentile != null && !flagged && (
              <p className="mt-4 text-[13.5px] text-white/60">
                Better than {peer.percentile}% of answers at this difficulty ({peer.total_attempts} compared).
              </p>
            )}
          </section>
        )}

        <div className="grid gap-10 py-9 md:grid-cols-2">
          <section aria-labelledby="study">
            <Heading><span id="study">What to study</span></Heading>
            {gapAnalysisUnavailable ? (
              <p className="text-[14px] leading-relaxed text-white/65">
                Gap detection didn't return a result for this answer. That's not a clean bill of health, just no analysis this time.
              </p>
            ) : gaps?.length ? (
              <ul className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
                {gaps.map((g) => (
                  <li key={g.gap} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[14.5px] text-white">{humanize(g.gap)}</p>
                      <p className="mt-0.5 text-[13px] text-white/55">
                        {g.prerequisites_to_study_first?.length
                          ? `Study ${g.prerequisites_to_study_first.map(humanize).join(", ")} first.`
                          : "No prerequisites: practise it directly."}
                      </p>
                    </div>
                    <button type="button" onClick={() => onOpenStudyPlan(g.gap)}
                      className="shrink-0 border border-white/15 px-3 py-1.5 text-[13px] text-white hover:bg-white/[0.06]">
                      Study plan
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-white/65">No gaps found in this answer.</p>
            )}
          </section>

          <section aria-labelledby="answer">
            <Heading><span id="answer">Your answer</span></Heading>
            <p className="max-h-72 overflow-y-auto whitespace-pre-wrap text-[14.5px] leading-relaxed text-white/80" data-lenis-prevent>
              {answer?.trim() || "No answer was recorded."}
            </p>
          </section>
        </div>
      </motion.div>

      <div className="sticky bottom-0 z-20 border-t border-white/[0.1] bg-[#050507]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1080px] flex-wrap items-center gap-3 px-5 py-4 md:px-8">
          <button type="button" onClick={isLastNode ? onFinish : onNext}
            className="btn-liquid flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold">
            {isLastNode ? "Finish session" : "Next question"}
            <kbd className="hidden rounded bg-black/10 px-1.5 py-0.5 font-mono text-[10.5px] text-black/60 sm:inline">Ctrl ↵</kbd>
          </button>
          <button type="button" onClick={onRetry}
            className="flex items-center gap-2 border border-white/15 px-4 py-2.5 text-[14px] text-white hover:bg-white/[0.06]">
            <RefreshCw size={13} aria-hidden="true" /> Retry this question
          </button>
          {currentAnswerId && (
            <div role="group" aria-label="Was this feedback useful?" className="flex items-center gap-1 text-[13.5px] text-white/60 sm:ml-2">
              <span className="mr-1">Useful feedback?</span>
              {[["Yes", true], ["No", false]].map(([label, value]) => (
                <button key={label} type="button" aria-pressed={feedbackRating === value} onClick={() => onRateFeedback(value)}
                  className={`px-2.5 py-1.5 ${feedbackRating === value ? "bg-white/[0.1] text-white" : "hover:text-white"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={onFinish} className="ml-auto px-3 py-2.5 text-[14px] text-white/65 hover:text-white">
            End session
          </button>
        </div>
      </div>
    </div>
  );
}
