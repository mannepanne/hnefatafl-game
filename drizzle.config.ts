// ABOUT: Drizzle Kit configuration for D1.
// ABOUT: Generates SQL migrations from src/db/schema.ts into src/db/migrations/.

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  driver: "d1-http",
});
