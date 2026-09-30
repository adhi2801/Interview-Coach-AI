// frontend/src/lib/api.js
//
// The one HTTP client every page uses. Before this, each page imported
// axios directly, rebuilt `${API_URL}/...` URLs, and hand-copied the
// Authorization header — 40+ call sites, each with its
// own slightly different error handling.
//
// What it centralizes:
//   - base URL + a sane default timeout (no request can hang forever)
//   - signing requests in (session cookie, or a bearer token; see below)
//   - turning every failure into an Error whose .message is the real,
//     human-readable reason: the backend's {"error": "..."} body, or a
//     clear network/timeout message — so pages can just show err.message
//   - a global "session expired" signal on 401, which App listens to and
//     logs the user out, instead of every page silently rendering empty data

import axios from "axios";
import { API_URL, COOKIE_SESSIONS, WS_URL } from "../config";

// In cookie mode (the normal case: the API is same-origin at /api) the login
// token is an HttpOnly cookie this code never sees; what's kept here is only
// who is signed in and until when. In bearer mode (the build points straight
// at the backend) the token itself is kept too, and sent as a header.
const TOKEN_KEY = "access_token";
const USER_KEY = "user";
// Written on every sign-in and renewal, removed on sign-out; other tabs
// watch it to follow along.
export const AUTH_SESSION_KEY = "session_expires_at";
export const AUTH_EXPIRED_EVENT = "ic:auth-expired";

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function getToken() {
  return COOKIE_SESSIONS ? null : read(TOKEN_KEY);
}

// Reads a JWT's own `exp` claim client-side (no signature check; the server
// verifies everything). Only for bearer sessions saved before responses
// carried expires_at.
function tokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp ? payload.exp * 1000 : Infinity;
  } catch {
    return 0;
  }
}

function sessionExpiry() {
  const saved = Date.parse(read(AUTH_SESSION_KEY) || "");
  if (!Number.isNaN(saved)) return saved;
  const token = getToken();
  return token ? tokenExpiry(token) : 0;
}

/** Whether this browser holds a sign-in that hasn't run out. */
export function hasSession(skewSeconds = 30) {
  if (!COOKIE_SESSIONS && !getToken()) return false;
  return sessionExpiry() > Date.now() + skewSeconds * 1000;
}

/** Keeps a sign-in response: {user, expires_at} plus access_token in bearer mode. */
export function saveAuth(data, user = data.user) {
  if (!COOKIE_SESSIONS) localStorage.setItem(TOKEN_KEY, data.access_token);
  const expiresAt = data.expires_at || (data.access_token && new Date(tokenExpiry(data.access_token)).toISOString());
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_SESSION_KEY, expiresAt || "");
}

export function clearAuth() {
  try {
    for (const key of [TOKEN_KEY, USER_KEY, AUTH_SESSION_KEY]) localStorage.removeItem(key);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

/** Signs this browser out: forgets the session, and drops the cookie. */
export function endSession() {
  clearAuth();
  if (COOKIE_SESSIONS) api.post("/auth/logout").catch(() => { /* already signed out server-side */ });
}

export function loadSavedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Logins last a day. While the app is open, one with less than half of that
// left is swapped for a fresh one, so active users stay logged in and an
// idle or stolen token dies within a day.
const RENEW_WHEN_LEFT_MS = 12 * 60 * 60 * 1000;

export async function renewTokenIfDue() {
  if (!hasSession() || sessionExpiry() - Date.now() > RENEW_WHEN_LEFT_MS) return false;
  try {
    const { data } = await api.post("/auth/refresh");
    if (!data?.user || (!COOKIE_SESSIONS && typeof data.access_token !== "string")) return false;
    saveAuth(data, { ...loadSavedUser(), ...data.user });
    return true;
  } catch {
    return false; // a revoked session already triggered the logout event
  }
}

// The coaching socket takes a one-minute ticket bound to one session, not
// the login token: browsers can't put headers on a WebSocket, and
// anything in a URL ends up in proxy and access logs.
export async function coachingSocketUrl(sessionId) {
  const { data } = await api.post(`/ws/coaching/${sessionId}/ticket`);
  return `${WS_URL}/ws/coaching/${sessionId}?ticket=${encodeURIComponent(data.ticket)}`;
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (COOKIE_SESSIONS) {
    config.headers["X-Session-Mode"] = "cookie";
  } else {
    const token = getToken();
    if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  }
  // Read by the 401 handler below.
  config.sentSession = Boolean(config.headers.Authorization) || (COOKIE_SESSIONS && hasSession(0));
  return config;
});

function describeError(error) {
  if (axios.isCancel(error)) return "Request cancelled";
  const data = error.response?.data;
  // On a server error, the request id lets a bug report be matched to its logs.
  const ref = error.response?.status >= 500 && typeof data?.request_id === "string"
    ? ` (ref ${data.request_id.slice(0, 8)})` : "";
  if (data && typeof data.error === "string") return data.error + ref;
  if (data && typeof data.detail === "string") return data.detail;
  if (error.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
  if (!error.response) return "Can't reach the server. Check your connection and try again.";
  if (error.response.status >= 500) return `Something went wrong on our end. Please try again.${ref}`;
  return error.message || "Request failed";
}

api.interceptors.response.use(
  (response) => {
    // Compatibility with older backend builds that report failures as
    // HTTP 200 + {"error": "..."}: treat those as errors too, so a wrong
    // password or a missing record never flows into success handlers.
    // (Bodies that also carry a "status" field — e.g. a scoring job that
    // reports {"status": "failed", "error": ...} — are real payloads.)
    const data = response.data;
    if (data && typeof data === "object" && typeof data.error === "string" && !("status" in data)) {
      const err = new Error(data.error);
      err.status = response.status;
      err.data = data;
      return Promise.reject(err);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    // Only treat a 401 as "your session ended" if the request was signed in.
    // A 401 from /auth/login (wrong password) must not trigger a logout.
    if (status === 401 && error.config?.sentSession) {
      clearAuth();
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    const wrapped = new Error(describeError(error));
    wrapped.status = status;
    wrapped.data = error.response?.data;
    wrapped.isCancel = axios.isCancel(error);
    wrapped.cause = error;
    return Promise.reject(wrapped);
  }
);

export default api;
