// ABOUT: Vitest 4 config with three projects: Worker tests run inside workerd via
// ABOUT: @cloudflare/vitest-pool-workers; pure-TS tests run in Node; client hooks run in jsdom.

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
            wrangler: { configPath: "./wrangler.test.toml" },
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
      {
        resolve: { alias },
        test: {
          name: "client",
          environment: "jsdom",
          include: ["tests/client/**/*.test.ts"],
          setupFiles: ["tests/client/setup.ts"],
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
        "src/client/components/game/**",
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
