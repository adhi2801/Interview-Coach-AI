// frontend/src/config.js
// In production, this comes from an environment variable set in Vercel.
// Locally, it falls back to localhost.

export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
export const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:8000";

// Real safety net: if this ever loads in a production build without the
// env var set, every API call would silently fail against a localhost
// address that doesn't exist there — with no clue why. Loudly warn
// instead of failing mysteriously.
if (process.env.NODE_ENV === "production" && !process.env.REACT_APP_API_URL) {
  console.error(
    "[config] REACT_APP_API_URL is not set in this production build — falling back to localhost, which will not work. Check your Vercel environment variables."
  );
}