import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Content Security Policy for built pages. The session token lives in
// localStorage, so the real defence is that injected script can't run:
// scripts only from this origin and jsDelivr (where the Monaco editor
// loads from). Build-only, because the dev server injects inline scripts.
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
  server: { port: 3000 },
  test: { environment: "jsdom", include: ["src/**/*.test.{js,jsx}"] },
  preview: { port: 3000 },
  build: {
    // Same output folder CRA used, so Vercel / nginx config is unchanged.
    outDir: "build",
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: these change far less often than app code.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("monaco")) return "monaco";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("gsap") || id.includes("lenis") || id.includes("/motion") || id.includes("framer-motion")) return "motion";
          if (id.includes("react-dom") || id.includes("react-router") || id.includes("/react/") || id.includes("scheduler")) return "react";
        },
      },
    },
  },
});
