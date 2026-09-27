// Unit tests for the shared HTTP client. Requests never leave the process:
// each test swaps in an axios adapter that returns a canned response.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import api, {
  AUTH_EXPIRED_EVENT, clearAuth, coachingSocketUrl, getToken, isTokenExpired, saveAuth,
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

  it("explains a server error without leaking internals", async () => {
    await expect(api.get("/x", { adapter: respondWith(502, "<html>Bad gateway</html>") }))
      .rejects.toThrow("Something went wrong on our end");
  });
});

describe("session expiry", () => {
  it("logs out on a 401 when a token was sent", async () => {
    saveAuth("tok", { id: 1 });
    const onExpired = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);

    await expect(api.get("/user/sessions", { adapter: respondWith(401, { error: "expired" }) })).rejects.toThrow();

    expect(getToken()).toBeNull();
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

  it("reads the token's own expiry", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isTokenExpired(jwtWithExp(now + 3600))).toBe(false);
    expect(isTokenExpired(jwtWithExp(now - 10))).toBe(true);
    expect(isTokenExpired("not-a-jwt")).toBe(true);
    expect(isTokenExpired(null)).toBe(true);
  });
});

describe("coaching socket", () => {
  it("connects with a ticket, never the login token", async () => {
    saveAuth("login-token", { id: 1 });
    vi.spyOn(api, "post").mockResolvedValue({ data: { ticket: "a.b/c+d" } });

    const url = await coachingSocketUrl(42);

    expect(api.post).toHaveBeenCalledWith("/ws/coaching/42/ticket");
    expect(url).toMatch(/\/ws\/coaching\/42\?ticket=a\.b%2Fc%2Bd$/);
    expect(url).not.toContain("login-token");
  });
});
