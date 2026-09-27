import { describe, expect, it } from "vitest";
import {
  lastTwoWeeks, mostPractisedCompany, personaInsight, personalBest, practiceWeeks, ratingSeries, recentChange,
  streak, summarySentence, toRows,
} from "./data";

const NOW = new Date("2026-09-28T20:00:00Z");
const daysAgo = (n) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

const ACTIVITY = [
  { track: "coding", id: 3, timestamp: daysAgo(0), elo_after: 1268, elo_delta: 6, problem_title: "Two Sum", tests_passed: 12, tests_total: 12, language: "python" },
  { track: "interview", id: 9, timestamp: daysAgo(1), elo_after: 1262, elo_delta: 21, company_target: "google", role: "Senior Engineer — L4", persona: "hostile", score: 78 },
  { track: "interview", id: 8, timestamp: daysAgo(2), elo_after: 1241, elo_delta: -3, company_target: "meta", role: "Senior Engineer — L4", persona: "standard", score: 60 },
  { track: "interview", id: 7, timestamp: daysAgo(40), elo_after: 1200, elo_delta: null, company_target: "google", role: "SWE", persona: "standard", score: 58 },
];

describe("overview data", () => {
  const rows = toRows(ACTIVITY);

  it("turns activity into readable rows", () => {
    expect(rows[0]).toMatchObject({ title: "Two Sum", detail: "Coding", mode: "Python", score: 100, delta: 6 });
    expect(rows[1]).toMatchObject({ title: "Google", detail: "Senior Engineer — L4", mode: "Hostile", score: 78 });
  });

  it("builds an oldest-first rating series and a 30-day change from real points only", () => {
    const series = ratingSeries(rows);
    expect(series.map((p) => p.elo)).toEqual([1200, 1241, 1262, 1268]);
    expect(recentChange(series, 30, NOW.getTime())).toBe(27);      // 1268 - 1241, not from 40 days ago
    expect(recentChange(series.slice(0, 2), 30, NOW.getTime())).toBeNull(); // one point in window
    expect(personalBest(series).elo).toBe(1268);
  });

  it("counts a streak ending today or yesterday", () => {
    const dates = [0, 1, 2, 5].map((n) => new Date(NOW.getTime() - n * 86_400_000));
    expect(streak(dates, NOW)).toBe(3);
    expect(streak(dates.slice(1), NOW)).toBe(2);   // yesterday still counts
    expect(streak([], NOW)).toBe(0);
  });

  it("sizes the practice grid to the history, 4 to 12 weeks", () => {
    expect(practiceWeeks([], NOW)).toHaveLength(4);
    expect(practiceWeeks([new Date(daysAgo(40))], NOW).length).toBeGreaterThanOrEqual(6);
    expect(practiceWeeks([new Date(daysAgo(400))], NOW)).toHaveLength(12);
    const weeks = practiceWeeks([new Date(daysAgo(0)), new Date(daysAgo(0))], NOW);
    expect(weeks.flat().find((d) => d.date.toDateString() === NOW.toDateString()).count).toBe(2);
  });

  it("finds the company practised most", () => {
    expect(mostPractisedCompany(rows)).toBe("google");
    expect(mostPractisedCompany([])).toBeNull();
  });

  it("only states a persona insight the data supports", () => {
    expect(personaInsight(rows).text).toBe("You score 19 points higher with the hostile interviewer than the standard one");
    expect(personaInsight(rows.filter((r) => r.persona !== "hostile"))).toBeNull();
  });

  it("writes an honest summary", () => {
    expect(summarySentence({ hasHistory: false })).toMatch(/first session sets your rating/);
    expect(summarySentence({ hasHistory: true, elo: 1268, change: 75, topGap: "Recursion" }))
      .toBe("Your rating is 1,268, up 75 in the last 30 days. Recursion is the gap to fix first.");
    expect(summarySentence({ hasHistory: true, elo: 1190, change: null, topGap: null, weakest: "Confidence" }))
      .toBe("Your rating is 1,190. Confidence is your lowest-scoring dimension.");
  });
});


describe("weekly comparison", () => {
  it("counts the last 7 days against the 7 before", () => {
    const d = (n) => new Date(NOW.getTime() - n * 86_400_000 - 1000);
    expect(lastTwoWeeks([d(0), d(1), d(6), d(8), d(13), d(20)], NOW)).toEqual({ recent: 3, before: 2 });
  });
});
