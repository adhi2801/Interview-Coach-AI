import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Content Security Policy for built pages: scripts only from this origin
// and jsDelivr (where the Monaco editor loads from), so injected script
// can't run (the login is an HttpOnly cookie script can't read anyway).
// Build-only, because the dev server injects inline scripts.
// frame-ancestors can't be set from a meta tag; X-Frame-Options covers it.
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "connect-src 'self' https: wss: http://localhost:8000 ws://localhost:8000",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// Matches modules from the named packages, with / or \ path separators.
const packages = (...names) => new RegExp(`node_modules[\\\\/](${names.join("|")})[\\\\/]`);

// The app calls its API at /api on its own origin (Vercel and nginx proxy it
// in production); the dev and preview servers forward it to a local backend.
const apiProxy = {
  "/api": { target: "http://localhost:8000", changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, "") },
};

const contentSecurityPolicy = {
  name: "content-security-policy",
  apply: "build",
  transformIndexHtml: () => [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" }],
};

export default defineConfig({
  plugins: [react(), tailwindcss(), contentSecurityPolicy],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // Keep the REACT_APP_* names so the existing Vercel environment variables
  // (REACT_APP_API_URL, REACT_APP_WS_URL, REACT_APP_SENTRY_DSN) keep working
  // after the move off Create React App.
  envPrefix: ["VITE_", "REACT_APP_"],
  server: { port: 3000, proxy: apiProxy },
  test: { environment: "jsdom", include: ["src/**/*.test.{js,jsx}", "api/**/*.test.js"] },
  preview: { port: 3000, proxy: apiProxy },
  build: {
    // Same output folder CRA used, so Vercel / nginx config is unchanged.
    outDir: "build",
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Long-lived vendor chunks, by explicit package list: a catch-all
        // function put React and small shared helpers into the chart chunk,
        // so every page (the landing page too) preloaded 365 kB of charts.
        codeSplitting: {
          groups: [
            // Small helpers shared by the app and recharts; left ungrouped
            // they land in the chart chunk and drag it into every page.
            { name: "shared", test: packages("clsx", "tailwind-merge", "use-sync-external-store"), priority: 50 },
            { name: "react", test: packages("react", "react-dom", "react-router", "react-router-dom", "scheduler"), priority: 40 },
            { name: "monaco", test: packages("@monaco-editor", "monaco-editor"), priority: 30 },
            // Recharts and its own dependencies: the overview chart only.
            { name: "charts", test: packages("recharts", "d3-[^\\\\/]+", "victory-vendor", "es-toolkit", "decimal\\.js-light", "internmap",
              "eventemitter3", "immer", "reselect", "redux", "@reduxjs", "react-redux", "redux-thunk"), priority: 20 },
            // GSAP and Lenis serve only the landing page.
            { name: "landing-fx", test: packages("gsap", "@gsap", "lenis"), priority: 20 },
            { name: "motion", test: packages("motion", "framer-motion", "motion-dom", "motion-utils"), priority: 20 },
          ],
        },
      },
    },
  },
});
