// Response bodies the mock API (fixtures.js) returns for the core flows.
// Kept free of Playwright imports so a unit test can check them against
// contracts/api-responses.json — the same file the backend tests check the
// real API against — and the mocks can't quietly drift from the backend.

export const USER = { id: 1, email: "ada@example.com", name: "Ada", elo_rating: 1200 };

// What the web app gets: the token itself arrives as an HttpOnly cookie.
export const authResponse = (expiresAt) => ({ user: USER, expires_at: expiresAt });

export const FORGOT_PASSWORD = {
  status: "ok",
  message: "If an account uses that email, a reset link is on its way. It works for 30 minutes.",
};

export const SESSION = {
  session_id: 42, question: "Design a rate limiter for a public API.", persona: "standard",
  scenario: "Your public API serves 10k requests per second.", constraints: ["Must fail open"],
  ask: "How would you design it?", category: "system_design", sub_category: "", difficulty: 4,
  company_profile: { name: "Google" },
};

export const CODING_RUN = {
  results: [{ passed: true, input: "1 2", expected: "3", actual: "3", stderr: "" }],
  passed_count: 1,
  total: 1,
};

export const CODING_SUBMIT = {
  submission_id: 5, tests_passed: 2, tests_total: 2, complexity_estimate: "O(1)", cleanliness_score: 8,
  naming_score: 9, feedback: "Clean and direct.", quality_review_unavailable: false, previous_elo: 1200, new_elo: 1216,
};
