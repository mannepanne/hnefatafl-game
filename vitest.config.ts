// ABOUT: Vitest 4 config with two projects: Worker tests run inside workerd via
// ABOUT: @cloudflare/vitest-pool-workers; pure-TS tests run in Node.

import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import path from "node:path";

const alias = {
  "@": path.resolve(__dirname, "./src"),
};

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          cloudflareTest({
            main: "./src/worker/index.ts",
            wrangler: { configPath: "./wrangler.toml" },
          }),
        ],
        resolve: { alias },
        test: {
          name: "worker",
          include: ["tests/worker/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "shared",
          environment: "node",
          include: ["tests/shared/**/*.test.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "vite.config.ts",
        "vitest.config.ts",
        "drizzle.config.ts",
        "tailwind.config.js",
        "postcss.config.js",
        "src/client/main.tsx",
        "src/db/migrations/**",
        "worker-configuration.d.ts",
        "**/*.d.ts",
        "dist/**",
        ".wrangler/**",
        "node_modules/**",
      ],
    },
  },
});
