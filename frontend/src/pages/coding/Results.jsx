// The coding room's right panel: what the last run or submit returned, the
// attempts on this problem, and the review of the last submission.
import { Activity, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { formatClock, parseErrorLine } from "./constants";

export function OutputTab({ runState, resultsSource, runError, runResults, runHistory, onRetry, onGoToLine, onOpenReview }) {
  const running = runState === "running";
  return (
    <div className="space-y-5">
      <div aria-live="polite">
        {runState === "idle" && (
          <p className="text-slate-400 leading-relaxed">
            Run checks your code against the examples. Submit runs every test, including hidden ones, and moves your rating.
          </p>
        )}
        {running && (
          <p className="flex items-center gap-2 text-slate-200">
            <Activity size={14} aria-hidden="true" className="animate-spin text-blue-400" />
            {resultsSource === "submit" ? "Running every test and reviewing your code…" : "Running your code on the examples…"}
          </p>
        )}
        {runState === "error" && (
          <div role="alert" className="space-y-2.5">
            <p className="flex items-center gap-2 text-rose-300 font-semibold"><XCircle size={15} aria-hidden="true" /> Your code wasn't {resultsSource === "submit" ? "submitted" : "run"}</p>
            <p className="text-slate-400 leading-relaxed">Nothing was scored. The server said:</p>
            <p className="font-mono text-[12px] text-rose-200 bg-black/40 border border-white/[0.07] rounded-md p-2.5 break-words">{runError}</p>
            <button type="button" onClick={onRetry}
              className="flex items-center gap-1.5 text-rose-200 hover:text-white">
              <RotateCcw size={12} aria-hidden="true" /> Try again
            </button>
          </div>
        )}
        {runState === "output" && runResults && (
          <ResultSummary source={resultsSource} results={runResults} />
        )}
      </div>

      {runState === "output" && runResults && (resultsSource === "run" ? (
        <ol className="space-y-2">
          {(runResults.results || []).map((r, idx) => {
            const line = !r.passed && parseErrorLine(r.stderr);
            return (
              <li key={idx} className={`border-l-2 py-2 pl-3 ${r.passed ? "border-emerald-400" : "border-rose-400"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    {r.passed ? <CheckCircle2 size={13} aria-hidden="true" className="text-emerald-400" /> : <XCircle size={13} aria-hidden="true" className="text-rose-400" />}
                    <span className="text-white">Example {idx + 1}</span>
                    <span className={r.passed ? "text-emerald-300" : "text-rose-300"}>{r.passed ? "passed" : "failed"}</span>
                  </span>
                  {line && (
                    <button type="button" onClick={() => onGoToLine(line)} className="text-[12.5px] text-indigo-200 hover:text-white">
                      Go to line {line}
                    </button>
                  )}
                </div>
                {!r.passed && (
                  <dl className="mt-1.5 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-[12px]">
                    <dt className="text-white/55">Input</dt><dd className="font-mono whitespace-pre-wrap break-all text-white/80">{r.input}</dd>
                    <dt className="text-white/55">Expected</dt><dd className="font-mono whitespace-pre-wrap break-all text-white/80">{r.expected}</dd>
                    <dt className="text-white/55">Your output</dt><dd className="font-mono whitespace-pre-wrap break-all text-rose-200">{r.actual || "(nothing printed)"}</dd>
                  </dl>
                )}
                {r.stderr && <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap text-[11.5px] text-rose-200/90">{r.stderr}</pre>}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-slate-400 leading-relaxed">
          Hidden tests stay hidden, so only the total is shown.{" "}
          <button type="button" onClick={onOpenReview} className="text-indigo-200 hover:text-white underline underline-offset-2">Read the review</button>
        </p>
      ))}

      {runHistory.length > 0 && (
        <section aria-labelledby="coding-attempts" className="pt-4 border-t border-white/[0.08]">
          <h2 id="coding-attempts" className="text-[12.5px] text-white/55 mb-2">Attempts on this problem</h2>
          <ol className="space-y-1">
            {[...runHistory].reverse().map((h, i) => (
              <li key={runHistory.length - i} className="flex items-center gap-3 tabular-nums">
                <span className="w-12 text-slate-300">{h.type === "submit" ? "Submit" : "Run"}</span>
                <span className={h.passed === h.total ? "text-emerald-300" : "text-rose-300"}>{h.passed} of {h.total} passed</span>
                <span className="ml-auto text-slate-400">{formatClock(h.at)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function ResultSummary({ source, results }) {
  const submit = source === "submit";
  const passed = submit ? results.tests_passed : results.passed_count;
  const total = submit ? results.tests_total : results.total;
  if (!total) return <p className="text-slate-400">{submit ? "This problem has no tests to run." : "This problem has no examples to run. Submit to run the full tests."}</p>;
  const allPassed = passed === total;
  return (
    <p className={`text-[15px] font-semibold tabular-nums ${allPassed ? "text-emerald-300" : "text-rose-300"}`}>
      {passed} of {total} {submit ? "tests" : "examples"} passed
    </p>
  );
}

export function Review({ review }) {
  if (!review) {
    return (
      <p className="text-slate-400 leading-relaxed">
        Submit to get a review: how many tests pass, the complexity of your approach, and notes on clarity and naming. Submitting also updates your rating.
      </p>
    );
  }
  const change = typeof review.new_elo === "number" && typeof review.previous_elo === "number"
    ? Math.round(review.new_elo) - Math.round(review.previous_elo) : null;
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div><dt className="text-[12.5px] text-white/55">Tests passed</dt><dd className="text-lg font-bold text-white tabular-nums">{review.tests_passed} of {review.tests_total}</dd></div>
        {typeof review.new_elo === "number" && (
          <div>
            <dt className="text-[12.5px] text-white/55">Rating</dt>
            <dd className="text-lg font-bold text-white tabular-nums">
              {Math.round(review.new_elo).toLocaleString()}
              {change != null && (
                <span className={`ml-1.5 text-[13px] font-medium ${change > 0 ? "text-emerald-300" : change < 0 ? "text-rose-300" : "text-slate-400"}`}>
                  {change > 0 ? `+${change}` : change === 0 ? "no change" : `−${Math.abs(change)}`}
                </span>
              )}
            </dd>
          </div>
        )}
        {review.cleanliness_score != null && (
          <div><dt className="text-[12.5px] text-white/55">Cleanliness</dt><dd className="text-lg font-bold text-white tabular-nums">{review.cleanliness_score}<span className="text-[13px] font-normal text-slate-400"> / 10</span></dd></div>
        )}
        {review.naming_score != null && (
          <div><dt className="text-[12.5px] text-white/55">Naming</dt><dd className="text-lg font-bold text-white tabular-nums">{review.naming_score}<span className="text-[13px] font-normal text-slate-400"> / 10</span></dd></div>
        )}
      </dl>
      {review.complexity_estimate && (
        <div>
          <h2 className="text-[12.5px] text-white/55 mb-1">Complexity</h2>
          <p className="font-mono text-slate-200 leading-relaxed">{review.complexity_estimate}</p>
        </div>
      )}
      {review.feedback && (
        <div>
          <h2 className="text-[12.5px] text-white/55 mb-1">Feedback</h2>
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{review.feedback}</p>
        </div>
      )}
      {review.quality_review_unavailable && (
        <p className="text-[13px] text-amber-200 leading-relaxed">
          The code-quality review wasn't available this time, so this submission was scored on its test results alone.
        </p>
      )}
    </div>
  );
}
