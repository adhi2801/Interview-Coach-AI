// frontend/src/config.js
// The API is reached at /api on the app's own origin: Vercel (api/backend.js),
// nginx (Dockerfile) and the dev server all forward it to the backend. Being
// same-origin is what lets the login live in an HttpOnly cookie.
//
// REACT_APP_API_URL can still point straight at the backend (an absolute
// URL); the app then falls back to a bearer token it keeps itself.

export const API_URL = import.meta.env.REACT_APP_API_URL || "/api";
export const WS_URL = import.meta.env.REACT_APP_WS_URL || "ws://localhost:8000";

// Cookie sessions whenever the API is same-origin.
export const COOKIE_SESSIONS = API_URL.startsWith("/");

// The coaching socket connects to the backend directly (with a one-minute
// ticket), so a production build needs its address.
if (import.meta.env.PROD && !import.meta.env.REACT_APP_WS_URL) {
  console.error(
    "[config] REACT_APP_WS_URL is not set in this production build, so live coaching will try localhost. Check your Vercel environment variables."
  );
}
