// Pure derivations for the overview, from /user/activity (both tracks,
// newest first, with real ELO deltas) and /user/skill-radar. Nothing here
// invents a number: when the data can't support a statement, it returns
// null and the page says nothing.

const DAY = 86_400_000;

export function capitalize(text = "") {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** Activity events -> table rows, newest first. */
export function toRows(activity) {
  return activity.map((e) => {
    const interview = e.track === "interview";
    return {
      key: `${e.track}-${e.id}`,
      id: e.id,
      track: e.track,
      when: e.timestamp ? new Date(e.timestamp) : null,
      title: interview ? capitalize(e.company_target || "Interview") : e.problem_title || "Coding problem",
      detail: interview ? e.role || "" : "Coding",
      mode: interview ? capitalize(e.persona || "standard") : capitalize(e.language || ""),
      // Interviews: the average answer score out of 10. Coding: tests passed.
      score: interview ? e.score ?? null : null,
      tests: !interview && e.tests_total ? `${e.tests_passed} of ${e.tests_total} tests` : null,
      delta: e.elo_delta ?? null,
      eloAfter: e.elo_after ?? null,
      company: interview ? (e.company_target || "").toLowerCase() : null,
      persona: interview ? (e.persona || "standard").toLowerCase() : null,
    };
  });
}

/** Rating over time, oldest first; one point per event with a rating. */
export function ratingSeries(rows) {
  return rows
    .filter((r) => r.eloAfter != null && r.when)
    .slice()
    .reverse()
    .map((r) => ({ t: r.when.getTime(), elo: Math.round(r.eloAfter), track: r.track }));
}

/** Change over the last `days`, only if there are two points inside it. */
export function recentChange(series, days = 30, now = Date.now()) {
  const inside = series.filter((p) => p.t >= now - days * DAY);
  if (inside.length < 2) return null;
  return inside[inside.length - 1].elo - inside[0].elo;
}

export function personalBest(series) {
  return series.length ? series.reduce((a, b) => (b.elo > a.elo ? b : a)) : null;
}

/** Consecutive days with practice, ending today or yesterday. */
export function streak(dates, now = new Date()) {
  const days = new Set(dates.map((d) => d.toDateString()));
  const cursor = new Date(now);
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (days.has(cursor.toDateString())) {
    n += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

/**
 * Weeks of practice as columns of 7 days (Mon..Sun), sized to the real
 * history: from the first active week to this week, at least 4 weeks and
 * at most 12 — no wall of empty weeks for a new account.
 */
export function practiceWeeks(dates, now = new Date()) {
  const counts = new Map();
  for (const d of dates) counts.set(d.toDateString(), (counts.get(d.toDateString()) || 0) + 1);
  const monday = (d) => {
    const m = new Date(d);
    m.setHours(0, 0, 0, 0);
    m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
    return m;
  };
  const thisWeek = monday(now);
  const first = dates.length ? monday(new Date(Math.min(...dates.map((d) => d.getTime())))) : thisWeek;
  const span = Math.round((thisWeek - first) / (7 * DAY)) + 1;
  const weeks = Math.min(12, Math.max(4, span));
  const out = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - w * 7);
    out.push(Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      return { date: day, count: counts.get(day.toDateString()) || 0, future: day > now };
    }));
  }
  return out;
}

/** The company this candidate practises for most, if any. */
export function mostPractisedCompany(rows) {
  const tally = {};
  for (const r of rows) if (r.company) tally[r.company] = (tally[r.company] || 0) + 1;
  const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

/**
 * "You score 1.2 higher with the hostile interviewer" — only when two
 * personas each have scored sessions and the gap is at least 0.8 (of 10).
 */
export function personaInsight(rows) {
  const by = {};
  for (const r of rows) {
    if (r.track !== "interview" || r.score == null) continue;
    (by[r.persona] ||= []).push(r.score);
  }
  const avgs = Object.entries(by).map(([persona, s]) => ({ persona, avg: s.reduce((a, b) => a + b, 0) / s.length }))
    .sort((a, b) => b.avg - a.avg);
  if (avgs.length < 2) return null;
  const best = avgs[0], worst = avgs[avgs.length - 1];
  const diff = best.avg - worst.avg;
  if (diff < 0.8) return null;
  return {
    text: `You score ${diff.toFixed(1)} higher with the ${best.persona} interviewer than the ${worst.persona} one`,
    detail: `${best.avg.toFixed(1)} vs ${worst.avg.toFixed(1)} out of 10, averaged across your sessions.`,
  };
}

/** The one-sentence summary under the greeting. */
export function summarySentence({ elo, change, topGap, weakest, hasHistory }) {
  if (!hasHistory) return "Your first session sets your rating. Start with an interview or a coding problem.";
  const parts = [`Your rating is ${elo.toLocaleString("en-US")}`];
  if (change) parts[0] += `, ${change > 0 ? "up" : "down"} ${Math.abs(change)} in the last 30 days`;
  parts[0] += ".";
  if (topGap) parts.push(`${topGap} is the gap to fix first.`);
  else if (weakest) parts.push(`${weakest} is your lowest-scoring dimension.`);
  return parts.join(" ");
}

/** Sessions in the last 7 days and the 7 before, for a like-for-like comparison. */
export function lastTwoWeeks(dates, now = Date.now()) {
  const t = typeof now === "number" ? now : now.getTime();
  const within = (from, to) => dates.filter((d) => d.getTime() > t - to * DAY && d.getTime() <= t - from * DAY).length;
  return { recent: within(0, 7), before: within(7, 14) };
}
