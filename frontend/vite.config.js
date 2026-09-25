import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // Keep the REACT_APP_* names so the existing Vercel environment variables
  // (REACT_APP_API_URL, REACT_APP_WS_URL, REACT_APP_SENTRY_DSN) keep working
  // after the move off Create React App.
  envPrefix: ["VITE_", "REACT_APP_"],
  server: { port: 3000 },
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
