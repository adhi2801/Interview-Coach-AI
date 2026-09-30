// Unit tests for the shared HTTP client. Requests never leave the process:
// each test swaps in an axios adapter that returns a canned response.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import api, {
  AUTH_EXPIRED_EVENT, clearAuth, coachingSocketUrl, hasSession, renewTokenIfDue, saveAuth,
} from "./api";

function respondWith(status, data) {
  return (config) => {
    const response = { status, data, headers: {}, config, statusText: String(status) };
    if (status >= 200 && status < 300) return Promise.resolve(response);
    const error = new Error(`Request failed with status code ${status}`);
    error.config = config;
    error.response = response;
    error.isAxiosError = true;
    return Promise.reject(error);
  };
}

function jwtWithExp(expSeconds) {
  const b64 = (obj) => btoa(JSON.stringify(obj)).replace(/=+$/, "");
  return `${b64({ alg: "HS256" })}.${b64({ exp: expSeconds })}.sig`;
}

beforeEach(() => clearAuth());
afterEach(() => vi.restoreAllMocks());

describe("error handling", () => {
  it("surfaces the backend's {error} message", async () => {
    await expect(
      api.get("/x", { adapter: respondWith(404, { error: "Session not found" }) }),
    ).rejects.toMatchObject({ message: "Session not found", status: 404 });
  });

  it("treats a legacy HTTP 200 + {error} body as a failure", async () => {
    await expect(
      api.get("/x", { adapter: respondWith(200, { error: "Invalid email or password" }) }),
    ).rejects.toThrow("Invalid email or password");
  });

  it("lets a job payload that carries a status through", async () => {
    const res = await api.get("/x", { adapter: respondWith(200, { status: "failed", error: "Scoring failed" }) });
    expect(res.data.status).toBe("failed");
  });

  it("adds the request id to server errors so reports can be traced", async () => {
    await expect(api.get("/x", { adapter: respondWith(500, { error: "Something went wrong on our end. Please try again.", request_id: "1a2b3c4d5e6f" }) }))
      .rejects.toThrow("Something went wrong on our end. Please try again. (ref 1a2b3c4d)");
    await expect(api.get("/x", { adapter: respondWith(503, { request_id: "1a2b3c4d5e6f" }) }))
      .rejects.toThrow("(ref 1a2b3c4d)");
  });

  it("explains a server error without leaking internals", async () => {
    await expect(api.get("/x", { adapter: respondWith(502, "<html>Bad gateway</html>") }))
      .rejects.toThrow("Something went wrong on our end");
  });
});

const inHours = (h) => new Date(Date.now() + h * 3600_000).toISOString();
const USER = { id: 1, name: "Ada" };

// Unit tests run with the default config: the API at /api, cookie sessions.
describe("cookie sessions", () => {
  it("keeps who is signed in and until when, never a token", () => {
    saveAuth({ user: USER, expires_at: inHours(20) });
    expect(hasSession()).toBe(true);
    expect(localStorage.getItem("access_token")).toBeNull();
    saveAuth({ user: USER, expires_at: inHours(-1) });
    expect(hasSession()).toBe(false);
  });

  it("marks requests as cookie-mode and sends no Authorization header", async () => {
    saveAuth({ user: USER, expires_at: inHours(20) });
    const res = await api.get("/x", { adapter: (config) => respondWith(200, { headers: config.headers })(config) });
    expect(res.data.headers["X-Session-Mode"]).toBe("cookie");
    expect(res.data.headers.Authorization).toBeUndefined();
  });

  it("logs out on a 401 while signed in", async () => {
    saveAuth({ user: USER, expires_at: inHours(20) });
    const onExpired = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);

    await expect(api.get("/user/sessions", { adapter: respondWith(401, { error: "expired" }) })).rejects.toThrow();

    expect(hasSession()).toBe(false);
    expect(onExpired).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  });

  it("does not log out on a wrong-password 401", async () => {
    const onExpired = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);

    await expect(api.post("/auth/login", {}, { adapter: respondWith(401, { error: "Invalid email or password" }) }))
      .rejects.toThrow("Invalid email or password");

    expect(onExpired).not.toHaveBeenCalled();
    window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  });

  it("renews only when less than half the day is left", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { user: USER, expires_at: inHours(24) } });
    saveAuth({ user: USER, expires_at: inHours(20) });
    expect(await renewTokenIfDue()).toBe(false);
    saveAuth({ user: USER, expires_at: inHours(2) });
    expect(await renewTokenIfDue()).toBe(true);
    expect(post).toHaveBeenCalledWith("/auth/refresh");
    expect(localStorage.getItem("session_expires_at")).toBe((await post.mock.results[0].value).data.expires_at);
  });
});

describe("bearer sessions (build pointed straight at the backend)", () => {
  async function bearerApi() {
    vi.resetModules();
    vi.doMock("../config", () => ({ API_URL: "https://backend.example", WS_URL: "wss://backend.example", COOKIE_SESSIONS: false }));
    const mod = await import("./api");
    vi.doUnmock("../config");
    return mod;
  }

  it("sends the saved token, and reads a legacy token's own expiry", async () => {
    const { default: client, saveAuth: save, hasSession: signedIn, clearAuth: clear } = await bearerApi();
    clear();
    const now = Math.floor(Date.now() / 1000);
    save({ access_token: jwtWithExp(now + 3600), user: USER });
    expect(signedIn()).toBe(true);
    const res = await client.get("/x", { adapter: (config) => respondWith(200, { headers: config.headers })(config) });
    expect(res.data.headers.Authorization).toBe(`Bearer ${jwtWithExp(now + 3600)}`);

    save({ access_token: jwtWithExp(now - 10), user: USER });
    expect(signedIn()).toBe(false);
    clear();
  });
});

describe("coaching socket", () => {
  it("connects with a one-minute ticket", async () => {
    saveAuth({ user: USER, expires_at: inHours(20) });
    vi.spyOn(api, "post").mockResolvedValue({ data: { ticket: "a.b/c+d" } });

    const url = await coachingSocketUrl(42);

    expect(api.post).toHaveBeenCalledWith("/ws/coaching/42/ticket");
    expect(url).toMatch(/\/ws\/coaching\/42\?ticket=a\.b%2Fc%2Bd$/);
  });
});
