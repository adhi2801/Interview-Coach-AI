// frontend/api/backend.js
//
// Vercel Function: the web app's /api/* requests, forwarded to the backend.
// Going through the app's own origin is what lets the login live in an
// HttpOnly cookie (a cookie set by the backend's own domain would be
// third-party here, and browsers block those).
//
// A plain vercel.json rewrite would proxy too, but every request would then
// reach the backend from Vercel's shared addresses, and the per-address rate
// limits (5 logins a minute) would be shared by every user. So this passes
// the caller's address on, with a secret that proves it came from here
// (PROXY_SECRET, set to the same value on Vercel and Railway).

const BACKEND_URL = (process.env.BACKEND_URL || "https://interview-coach-ai-production.up.railway.app").replace(/\/+$/, "");

// Hop-by-hop headers, and ones fetch() sets itself.
const DROP_REQUEST = ["host", "connection", "content-length", "accept-encoding", "x-proxy-secret", "x-client-ip"];
// fetch() has already decompressed the body, so these would no longer match it.
const DROP_RESPONSE = ["content-encoding", "content-length", "transfer-encoding", "connection"];

async function proxy(request) {
  const incoming = new URL(request.url);
  // vercel.json rewrites /api/<path>?<query> to /api/backend?upstream=<path>&<query>.
  const path = incoming.searchParams.get("upstream") || "";
  incoming.searchParams.delete("upstream");
  const query = incoming.searchParams.toString();
  const target = `${BACKEND_URL}/${path}${query ? `?${query}` : ""}`;

  const headers = new Headers(request.headers);
  for (const name of DROP_REQUEST) headers.delete(name);
  const callerIp = request.headers.get("x-real-ip") || (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  if (callerIp && process.env.PROXY_SECRET) {
    headers.set("x-client-ip", callerIp);
    headers.set("x-proxy-secret", process.env.PROXY_SECRET);
  }

  let upstream;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
      redirect: "manual",
    });
  } catch {
    return Response.json({ error: "Can't reach the server. Please try again in a moment." }, { status: 502 });
  }

  const responseHeaders = new Headers(upstream.headers);
  for (const name of DROP_RESPONSE) responseHeaders.delete(name);
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
