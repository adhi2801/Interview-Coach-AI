// A scripted backend for browser tests: every API route the tested flows
// touch, plus the live-coaching WebSocket. Requests never leave the page,
// so the tests are deterministic and free (no Claude, no database).

import { test as base, expect } from "@playwright/test";

const API = "http://localhost:8000";
const WS = "ws://localhost:8000";

export const USER = { id: 1, email: "ada@example.com", name: "Ada", elo_rating: 1200 };

// Unsigned, but shaped like our JWTs: the client only reads `exp`.
function fakeJwt(payload) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.signature`;
}
export const LOGIN_TOKEN = fakeJwt({ user_id: 1, exp: Math.floor(Date.now() / 1000) + 3600 });
export const ROTATED_TOKEN = fakeJwt({ user_id: 1, tv: 1, exp: Math.floor(Date.now() / 1000) + 3600 });

export const SESSION = {
  session_id: 42, question: "Design a rate limiter for a public API.", persona: "standard",
  scenario: "Your public API serves 10k requests per second.", constraints: ["Must fail open"],
  ask: "How would you design it?", category: "system_design", sub_category: "", difficulty: 4,
  company_profile: { name: "Google" },
};

const SCORES = {
  score_technical: 7, score_communication: 8, score_problem_solving: 7, score_cultural_fit: 7,
  score_confidence: 8, technical_feedback: "Solid.", communication_feedback: "Clear.",
  problem_solving_feedback: "Good.", overall_summary: "A solid answer.", manipulation_attempt: false,
};

const FILLER = /\b(um|uh)\b/gi;

export const test = base.extend({
  backend: async ({ page }, use) => {
    const calls = [];
    const socket = { urls: [], received: [] };

    await page.route(`${API}/**`, async (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      const method = req.method();
      calls.push({ method, path, body: req.postDataJSON?.() ?? null, auth: req.headers().authorization });
      const json = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

      if (method === "OPTIONS") return route.fulfill({ status: 204 });
      if (path === "/auth/login") {
        const { password } = req.postDataJSON();
        return password === "correct-horse"
          ? json(200, { access_token: LOGIN_TOKEN, user: USER })
          : json(401, { error: "Invalid email or password" });
      }
      if (path === "/auth/change-password") {
        const { current_password } = req.postDataJSON();
        return current_password === "correct-horse"
          ? json(200, { access_token: ROTATED_TOKEN, user: USER })
          : json(400, { error: "Current password is incorrect" });
      }
      if (path === "/auth/logout-all") return json(200, { status: "ok" });
      if (path === "/session/start") return json(200, SESSION);
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
        "/companies/google/profile": { name: "Google", typical_rounds: "2x Coding", difficulty_bias: 1.3 },
        "/roles/elo-bands": {},
        "/topics": { topics: [] },
        "/topics/status": { topics: [] },
        "/user/sessions": { sessions: [] },
        "/user/activity": { activity: [] },
        "/user/skill-radar": { radar: null, sample_size: 0 },
        "/user/gap-queue": { critical_gap: null, queue: [] },
        "/user/skill-matrix": { categories: [], total_touched: 0, total_topics: 0 },
        "/user/profile-summary": { ...USER, total_sessions: 0, avg_score: null, preferences: {}, bracket: null },
      };
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
    await page.addInitScript(([token, user]) => {
      localStorage.setItem("access_token", token);
      localStorage.setItem("user", JSON.stringify(user));
    }, [LOGIN_TOKEN, USER]);
    await use(true);
  },
});

export { expect };
