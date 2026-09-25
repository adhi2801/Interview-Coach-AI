// frontend/src/lib/api.js
//
// The one HTTP client every page uses. Before this, each page imported
// axios directly, rebuilt `${API_URL}/...` URLs, and hand-copied the
// Authorization header from localStorage — 40+ call sites, each with its
// own slightly different error handling.
//
// What it centralizes:
//   - base URL + a sane default timeout (no request can hang forever)
//   - attaching the bearer token when one exists
//   - turning every failure into an Error whose .message is the real,
//     human-readable reason: the backend's {"error": "..."} body, or a
//     clear network/timeout message — so pages can just show err.message
//   - a global "session expired" signal on 401, which App listens to and
//     logs the user out, instead of every page silently rendering empty data

import axios from "axios";
import { API_URL } from "../config";

const TOKEN_KEY = "access_token";
const USER_KEY = "user";
export const AUTH_EXPIRED_EVENT = "ic:auth-expired";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

export function loadSavedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Reads the JWT's own `exp` claim client-side (no signature check — the
// server still verifies everything). Lets the app drop a stale 7-day-old
// token at boot instead of showing a logged-in shell where every call 401s.
export function isTokenExpired(token, skewSeconds = 30) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return true;
  }
}

export function wsAuthQuery() {
  const token = getToken();
  return token ? `?token=${encodeURIComponent(token)}` : "";
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function describeError(error) {
  if (axios.isCancel(error)) return "Request cancelled";
  const data = error.response?.data;
  if (data && typeof data.error === "string") return data.error;
  if (data && typeof data.detail === "string") return data.detail;
  if (error.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
  if (!error.response) return "Can't reach the server. Check your connection and try again.";
  if (error.response.status >= 500) return "Something went wrong on our end. Please try again.";
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
    // Only treat a 401 as "your session ended" if we actually sent a token.
    // A 401 from /auth/login (wrong password) must not trigger a logout.
    const sentToken = Boolean(error.config?.headers?.Authorization);
    if (status === 401 && sentToken) {
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
