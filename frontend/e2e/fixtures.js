// A scripted backend for browser tests: every API route the tested flows
// touch, plus the live-coaching WebSocket. Requests never leave the page,
// so the tests are deterministic and free (no Claude, no database).

import { readFileSync } from "node:fs";
import { test as base, expect } from "@playwright/test";
import * as H from "./history.js";

// The real seeded topic graph (93 topics, 96 prerequisite edges) with a
// mid-progress candidate's statuses; generated from scripts/seed_topics.py.
export const KNOWLEDGE = JSON.parse(readFileSync(new URL("./topics.json", import.meta.url), "utf8"));

// The app calls its API same-origin at /api (see src/config.js); the
// coaching socket goes to the backend directly.
const API = "**/api/**";
const WS = "ws://localhost:8000";

import { CODING_RUN, CODING_SUBMIT, FORGOT_PASSWORD, SESSION, USER, authResponse } from "./responses.js";

export { SESSION, USER };

// The session itself is an HttpOnly cookie the page never sees; the app
// only keeps when it runs out. A login due for renewal, and a fresh one.
export const LOGIN_EXPIRES_AT = new Date(Date.now() + 3600_000).toISOString();
export const RENEWED_EXPIRES_AT = new Date(Date.now() + 24 * 3600_000).toISOString();


const SCORES = {
  score_technical: 7, score_communication: 8, score_problem_solving: 7, score_cultural_fit: 7,
  score_confidence: 8, technical_feedback: "Solid.", communication_feedback: "Clear.",
  problem_solving_feedback: "Good.", overall_summary: "A solid answer.", manipulation_attempt: false,
};

const FILLER = /\b(um|uh)\b/gi;

const STARTER = (name) => ({
  python: `# ${name} in Python\n`, javascript: `// ${name} in JS\n`,
  cpp: `// ${name} in C++\n`, java: `// ${name} in Java\n`,
});
export const REFERENCE_SOLUTION = "a, b = map(int, input().split())\nprint(a + b)";

export const PROBLEMS = {
  two_sum: {
    id: 1, slug: "two_sum", title: "Two Sum", difficulty: 4, description: "Add two numbers.",
    starter_code: STARTER("two_sum"), sample_test_cases: [{ input: "1 2", expected_output: "3" }], topics: [],
    has_reference_solution: true,
  },
  reverse_words: {
    id: 2, slug: "reverse_words", title: "Reverse Words", difficulty: 4, description: "Reverse them.",
    starter_code: STARTER("reverse_words"), sample_test_cases: [{ input: "a b", expected_output: "b a" }], topics: [],
    has_reference_solution: false,
  },
};

export const test = base.extend({
  // "empty" = a brand-new account; "rich" = three weeks of real-looking use.
  history: ["empty", { option: true }],

  backend: async ({ page, history }, use) => {
    const rich = history === "rich";
    const calls = [];
    const socket = { urls: [], received: [] };
    let nextPicks = 0; // like the real endpoint, /coding/next varies between calls
    const preferences = {}; // PATCH /user/preferences persists for the test
    const submitted = new Set(); // problem ids this account has submitted, as the real API tracks

    await page.route(`${API}/**`, async (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname.replace(/^\/api/, "");
      const method = req.method();
      calls.push({ method, path, body: req.postDataJSON?.() ?? null, auth: req.headers().authorization, mode: req.headers()["x-session-mode"] });
      const json = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

      if (method === "OPTIONS") return route.fulfill({ status: 204 });
      if (path === "/auth/login") {
        const { password } = req.postDataJSON();
        return password === "correct-horse"
          ? json(200, authResponse(LOGIN_EXPIRES_AT))
          : json(401, { error: "Invalid email or password" });
      }
      if (path === "/auth/change-password") {
        const { current_password } = req.postDataJSON();
        return current_password === "correct-horse"
          ? json(200, authResponse(RENEWED_EXPIRES_AT))
          : json(400, { error: "Current password is incorrect" });
      }
      if (path === "/auth/logout-all" || path === "/auth/logout") return json(200, { status: "ok" });
      if (path === "/auth/refresh") return json(200, authResponse(RENEWED_EXPIRES_AT));
      if (path === "/auth/forgot-password") {
        return json(200, FORGOT_PASSWORD);
      }
      if (path === "/auth/reset-password") {
        return req.postDataJSON().token === "good-token"
          ? json(200, authResponse(RENEWED_EXPIRES_AT))
          : json(400, { error: "This reset link has already been used or has expired. Ask for a new one." });
      }
      if (path === "/user/preferences" && method === "PATCH") {
        const { key, value } = req.postDataJSON();
        preferences[key] = value;
        return json(200, { status: "ok", preferences });
      }
      if (path === "/session/start") return json(200, SESSION);
      if (path === "/topics/status") return json(200, { topics: KNOWLEDGE.topics });
      if (path.startsWith("/study-plan/")) {
        const topic = decodeURIComponent(path.split("/").pop());
        const steps = [topic].map((name) => ({ name, description: KNOWLEDGE.descriptions[name] || "" }));
        // The real endpoint returns the whole chain; descriptions for every node suffice here.
        for (const name of Object.keys(KNOWLEDGE.descriptions)) steps.push({ name, description: KNOWLEDGE.descriptions[name] });
        return json(200, { topic, company: null, steps });
      }
      if (path === "/coding/next") {
        const slug = nextPicks++ % 2 === 0 ? "two_sum" : "reverse_words";
        return json(200, { id: PROBLEMS[slug].id, slug, title: PROBLEMS[slug].title, difficulty: 4 });
      }
      if (path === "/coding/problems") {
        return json(200, { problems: Object.values(PROBLEMS).map(({ id, slug, title, difficulty }) => ({ id, slug, title, difficulty })) });
      }
      if (/^\/coding\/problems\/[^/]+\/solution$/.test(path)) {
        const problem = PROBLEMS[path.split("/")[3]];
        return submitted.has(problem.id)
          ? json(200, { language: "python", code: REFERENCE_SOLUTION })
          : json(403, { error: "Submit your own solution first, then the reference solution opens up." });
      }
      if (path.startsWith("/coding/problems/")) {
        const problem = PROBLEMS[path.split("/").pop()];
        return json(200, { ...problem, reference_solution_unlocked: problem.has_reference_solution && submitted.has(problem.id) });
      }
      if (path === "/coding/run") {
        return json(200, CODING_RUN);
      }
      if (path === "/coding/submit") {
        submitted.add(req.postDataJSON().problem_id);
        return json(200, CODING_SUBMIT);
      }
      if (path === "/ws/coaching/42/ticket") return json(200, { ticket: "short-lived-ticket" });
      if (path === "/answer/submit") return json(200, { job_id: 7, status: "processing" });
      if (path === "/answer/status/7") {
        return json(200, {
          status: "done", scores: SCORES, overall_score: 7.4, gaps: [], gap_analysis_unavailable: false,
          peer_comparison: { percentile: null, tier: "insufficient_data", total_attempts: 0 },
          new_elo: 1212, next_question: "Now make it multi-region.", next_scenario: "", next_constraints: [],
          next_ask: "", next_category: "system_design", answer_id: 99,
        });
      }
      const fixtures = {
        "/health": { status: "ok", database: "ok", cache: "ok" },
        "/companies": { companies: ["google", "amazon"] },
        // Mirrors backend/engines/company_dna.py and ROLE_ELO_BANDS.
        "/companies/google/profile": {
          name: "Google", focus_areas: "algorithms data-structures system-design scalability",
          behavioral_framework: "STAR method aligned with Google's 4 core attributes",
          typical_rounds: "2x Coding · 1x System Design · 1x Googley", difficulty_bias: 1.3,
          question_style: "Open-ended, ambiguous, expects clarifying questions",
          red_flags: ["No clarifying questions", "Skips edge cases", "Can't estimate complexity"],
          green_flags: ["Structured approach", "Thinks out loud", "Tests their own solution"],
          values: ["Googleyness", "General Cognitive Ability", "Leadership", "Role-Related Knowledge"],
        },
        "/roles/elo-bands": {
          "Software Engineer — L3": { label: "L3 Band", low: 900, high: 1049 },
          "Senior Engineer — L4": { label: "L4 Band", low: 1050, high: 1199 },
          "Backend Engineer — L4": { label: "L4 Band", low: 1050, high: 1199 },
          "Frontend Engineer — L4": { label: "L4 Band", low: 1050, high: 1199 },
          "ML Engineer": { label: "ML Band", low: 1100, high: 1249 },
          "Staff Engineer — L5": { label: "L5 Band", low: 1200, high: 1399 },
          "Systems Architect": { label: "Staff Band", low: 1400, high: 1599 },
        },
        "/topics": { topics: [] },
        "/topics/status": { topics: [] },
        "/user/sessions": { sessions: rich ? H.SESSIONS : [] },
        "/user/activity": { activity: rich ? H.ACTIVITY : [] },
        "/user/skill-radar": rich ? H.RADAR : { radar: null, sample_size: 0 },
        "/user/gap-queue": rich ? H.GAP_QUEUE : { critical_gap: null, queue: [] },
        "/user/skill-matrix": rich ? H.SKILL_MATRIX : { categories: [], total_touched: 0, total_topics: 0 },
        "/user/profile-summary": { ...(rich ? H.PROFILE : { ...USER, total_sessions: 0, avg_score: null, bracket: null }), preferences },
        "/replays": { replays: rich ? H.REPLAYS : [] },
        "/coding/submissions": { submissions: rich ? H.SUBMISSIONS : [] },
      };
      if (/^\/replay\/\d+$/.test(path)) {
        return rich ? json(200, { ...H.REPLAY_DETAIL, session_id: Number(path.split("/").pop()) }) : json(404, { error: "Replay not found" });
      }
      return json(200, fixtures[path] ?? {});
    });

    await page.routeWebSocket(`${WS}/ws/coaching/**`, (ws) => {
      socket.urls.push(ws.url());
      ws.onMessage((raw) => {
        const msg = JSON.parse(String(raw));
        socket.received.push(msg);
        if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
        if (msg.type === "reset") ws.send(JSON.stringify({ type: "reset_ack" }));
        if (msg.type === "text_chunk") {
          const fillers = (msg.text.match(FILLER) || []).length;
          ws.send(JSON.stringify({
            type: "coaching_update", confidence_score: 8, words_per_minute: null, pace_source: "typing",
            fillers_found: [], filler_count: fillers, word_count: msg.text.split(/\s+/).length,
            suggestion: "Keep going.", intervention: null,
          }));
        }
      });
    });

    await use({ calls, socket });
  },

  signedIn: async ({ page }, use) => {
    await page.addInitScript(([expiresAt, user]) => {
      localStorage.setItem("session_expires_at", expiresAt);
      localStorage.setItem("user", JSON.stringify(user));
    }, [LOGIN_EXPIRES_AT, USER]);
    await use(true);
  },
});

export { expect };
