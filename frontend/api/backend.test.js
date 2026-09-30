// @vitest-environment node
// The /api proxy against a stand-in backend on a local port: paths, query
// strings, bodies and cookies pass through; the caller's address is vouched
// for only with the secret; a forged vouch from the browser is dropped.

import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let server;
let seen;

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      seen = { method: req.method, url: req.url, headers: req.headers, body };
      res.setHeader("Set-Cookie", ["ic_session=abc; HttpOnly; Path=/", "other=1; Path=/"]);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  vi.stubEnv("BACKEND_URL", `http://127.0.0.1:${server.address().port}/`);
  vi.stubEnv("PROXY_SECRET", "s3cret");
});

afterAll(() => {
  vi.unstubAllEnvs();
  server.close();
});

async function call(url, init) {
  const { POST, GET } = await import("./backend.js");
  const request = new Request(url, init);
  return (init?.method === "POST" ? POST : GET)(request);
}

describe("api/backend proxy", () => {
  it("forwards path, query and body, and passes every cookie back", async () => {
    const res = await call("https://app.example/api/backend?upstream=auth/login&next=%2Fhome", {
      method: "POST",
      headers: { "content-type": "application/json", "x-real-ip": "198.51.100.7", "x-session-mode": "cookie" },
      body: JSON.stringify({ email: "ada@example.com" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(seen.method).toBe("POST");
    expect(seen.url).toBe("/auth/login?next=%2Fhome");
    expect(JSON.parse(seen.body)).toEqual({ email: "ada@example.com" });
    expect(seen.headers["x-session-mode"]).toBe("cookie");
    expect(seen.headers["x-client-ip"]).toBe("198.51.100.7");
    expect(seen.headers["x-proxy-secret"]).toBe("s3cret");
    expect(res.headers.getSetCookie()).toEqual(["ic_session=abc; HttpOnly; Path=/", "other=1; Path=/"]);
  });

  it("never lets a browser supply the vouch itself", async () => {
    await call("https://app.example/api/backend?upstream=companies", {
      headers: { "x-proxy-secret": "guess", "x-client-ip": "1.2.3.4", "x-real-ip": "198.51.100.7" },
    });
    expect(seen.url).toBe("/companies");
    expect(seen.headers["x-proxy-secret"]).toBe("s3cret");
    expect(seen.headers["x-client-ip"]).toBe("198.51.100.7");
  });
});
