// ABOUT: Vite config combining React SPA and Cloudflare Worker dev integration.
// ABOUT: bun run dev serves both via Miniflare; bun run build outputs to dist/.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "node:path";

export default defineConfig({
  plugins: [react(), cloudflare()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
