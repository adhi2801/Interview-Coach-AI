// frontend/src/config.js
// In production (Railway), this comes from an environment variable.
// Locally, it falls back to localhost.

export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
export const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:8000";