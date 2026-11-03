import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Libraries in their own chunks: they download in parallel and stay
        // cached across deploys, since they change far less than app code.
        // Recharts stays in the lazily loaded Analytics chunk.
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
            {
              name: "vendor-supabase",
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            },
            {
              name: "vendor-query",
              test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
