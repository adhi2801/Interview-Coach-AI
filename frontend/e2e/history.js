// A believable three-week history for one candidate, in the exact shapes
// the backend returns, so pages render as a real user would see them.
// Dates are relative to now; nothing here is random.

const DAY = 86_400_000;
const at = (daysAgo, hour = 19) => {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(hour, 12, 0, 0);
  return d.toISOString();
};

const SESSIONS_RAW = [
  { id: 9, company: "google", role: "Senior Engineer — L4", persona: "hostile", days: 0, score: 7.8, elo: 1262, q: 4 },
  { id: 8, company: "meta", role: "Senior Engineer — L4", persona: "standard", days: 1, score: 7.1, elo: 1241, q: 5 },
  { id: 7, company: "amazon", role: "Backend Engineer — L4", persona: "socratic", days: 3, score: 6.4, elo: 1226, q: 5 },
  { id: 6, company: "google", role: "Senior Engineer — L4", persona: "standard", days: 4, score: 5.8, elo: 1219, q: 3 },
  { id: 5, company: "stripe", role: "Backend Engineer — L4", persona: "exhausted", days: 7, score: 6.9, elo: 1231, q: 5 },
  { id: 4, company: "netflix", role: "Senior Engineer — L4", persona: "hostile", days: 9, score: 5.2, elo: 1214, q: 4 },
  { id: 3, company: "google", role: "Software Engineer — L3", persona: "standard", days: 12, score: 6.1, elo: 1222, q: 5 },
  { id: 2, company: "apple", role: "Software Engineer — L3", persona: "socratic", days: 15, score: 5.5, elo: 1208, q: 3 },
  { id: 1, company: "google", role: "Software Engineer — L3", persona: "standard", days: 19, score: 4.7, elo: 1193, q: 2 },
];

export const SESSIONS = SESSIONS_RAW.map((s) => ({
  id: s.id, company_target: s.company, role: s.role, persona: s.persona, started_at: at(s.days),
  question_count: s.q, elo_after: s.elo, score: s.score,
}));

const SUBMISSIONS_RAW = [
  { id: 14, title: "Two Sum", slug: "two_sum", days: 0, passed: 12, total: 12, lang: "python", elo: 1268 },
  { id: 13, title: "LRU Cache", slug: "lru_cache", days: 2, passed: 9, total: 14, lang: "python", elo: 1244 },
  { id: 12, title: "Merge Intervals", slug: "merge_intervals", days: 5, passed: 11, total: 11, lang: "java", elo: 1225 },
  { id: 11, title: "Course Schedule", slug: "course_schedule", days: 10, passed: 6, total: 13, lang: "cpp", elo: 1216 },
];

export const SUBMISSIONS = SUBMISSIONS_RAW.map((s) => ({
  id: s.id, problem_title: s.title, problem_slug: s.slug, tests_passed: s.passed, tests_total: s.total,
  language: s.lang, submitted_at: at(s.days, 21),
}));

// Merged, chronological, with deltas — as /user/activity builds it.
export const ACTIVITY = (() => {
  const events = [
    ...SESSIONS_RAW.map((s) => ({
      track: "interview", id: s.id, timestamp: at(s.days), elo_after: s.elo, company_target: s.company,
      role: s.role, persona: s.persona, score: s.score, question_count: s.q,
    })),
    ...SUBMISSIONS_RAW.map((s) => ({
      track: "coding", id: s.id, timestamp: at(s.days, 21), elo_after: s.elo, problem_title: s.title,
      problem_slug: s.slug, tests_passed: s.passed, tests_total: s.total, language: s.lang,
    })),
  ].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  let prev = null;
  for (const e of events) {
    e.elo_before = prev;
    e.elo_delta = prev == null ? null : Math.round(e.elo_after - prev);
    prev = e.elo_after;
  }
  return events.reverse().slice(0, 20);
})();

export const PROFILE = {
  name: "Ada", email: "ada@example.com", elo_rating: 1268, total_sessions: SESSIONS.length, avg_score: 6.2,
  preferences: { sound_effects: false, live_coaching_telemetry: true },
  bracket: { role: "Senior Engineer — L4", label: "L4 Band", low: 1050, high: 1199 },
};

export const RADAR = {
  radar: [
    { dim: "Technical", value: 6.6 }, { dim: "Communication", value: 7.4 }, { dim: "Problem solving", value: 6.1 },
    { dim: "Culture fit", value: 7.0 }, { dim: "Confidence", value: 5.7 },
  ],
  sample_size: 36,
};

export const GAP_QUEUE = {
  critical_gap: { gap: "recursion", occurrences: 4, urgency: "critical", prerequisites_to_study_first: ["functions", "control_flow"], category: "foundations" },
  queue: [
    { gap: "recursion", occurrences: 4, urgency: "critical", prerequisites_to_study_first: ["functions", "control_flow"], category: "foundations" },
    { gap: "hash_maps", occurrences: 3, urgency: "high", prerequisites_to_study_first: ["arrays"], category: "data_structures" },
    { gap: "processes_and_threads", occurrences: 2, urgency: "medium", prerequisites_to_study_first: [], category: "operating_systems" },
    { gap: "consistency_models", occurrences: 1, urgency: "low", prerequisites_to_study_first: ["replication"], category: "system_design" },
  ],
};

export const SKILL_MATRIX = {
  categories: [
    { category: "algorithms", touched: 5, total: 12 }, { category: "behavioral", touched: 3, total: 7 },
    { category: "data_structures", touched: 6, total: 14 }, { category: "databases", touched: 2, total: 7 },
    { category: "system_design", touched: 4, total: 12 },
  ],
  total_touched: 20, total_topics: 93,
};

export const REPLAYS = SESSIONS_RAW.map((s) => ({
  session_id: s.id, company: s.company, role: s.role, started_at: at(s.days), total_questions: s.q,
}));

const Q = (question, category, scores, answer, gaps = [], coaching = []) => ({
  question, category, sub_category: "", asked_at: at(0, 19),
  scores: {
    score_technical: scores[0], score_communication: scores[1], score_problem_solving: scores[2],
    score_cultural_fit: scores[3], score_confidence: scores[4],
    technical_feedback: "Correct core idea; the eviction policy under memory pressure was left vague.",
    communication_feedback: "Clear structure: requirements first, then the design, then trade-offs.",
    problem_solving_feedback: "Good instinct to fail open; didn't quantify the cost of doing so.",
    overall_summary: "A solid, well-organised answer. Push further on the numbers.",
  },
  answer, gaps, coaching_moments: coaching,
});

export const REPLAY_DETAIL = {
  session_id: 9, user_name: "Ada", company: "google", role: "Senior Engineer — L4",
  started_at: at(0, 19), ended_at: at(0, 20), total_questions: 3,
  questions: [
    Q("Design a rate limiter for a public API serving 10k requests per second.", "system_design", [8, 8, 7, 7, 8],
      "I'd use a token bucket per API key in Redis, refilled by elapsed time inside a Lua script so the check-and-take is atomic. Over the limit returns 429 with Retry-After. At 10k rps I'd shard keys across a Redis cluster and fail open if Redis is unreachable.",
      [], [{ source: "text", confidence_score: 8.4, words_per_minute: null, filler_count: 0, suggestion: "Good pace and clarity — keep going." }]),
    Q("It now has to work across three regions. What changes?", "distributed_systems", [6, 7, 6, 7, 6],
      "Um, so I'd keep a local bucket per region and, like, sync counts asynchronously, accepting some over-admission across regions.",
      [{ gap: "consistency_models", urgency: "medium", prerequisites_to_study_first: ["replication"] }],
      [{ source: "audio", confidence_score: 6.1, words_per_minute: 164, filler_count: 3, suggestion: "Watch the filler words: um, like, so" }]),
    Q("Tell me about a time you pushed back on a deadline.", "behavioral", [7, 9, 7, 8, 8],
      "On the payments migration I showed the team the error-budget burn projected past launch, proposed cutting two features, and we shipped on time with both following a week later.", [], []),
  ],
};
