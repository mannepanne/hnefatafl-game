// ABOUT: Exercises the D1 binding by inserting and selecting a row.
// ABOUT: Applies the Phase 1 _pipeline_check migration via vitest-pool-workers helpers.

import { env, applyD1Migrations } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";

const migrations = [
  {
    name: "0000_pipeline_check",
    queries: [
      `CREATE TABLE IF NOT EXISTS _pipeline_check (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        created_at text NOT NULL
      )`,
    ],
  },
];

describe("D1 binding", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, migrations);
  });

  it("inserts and selects a row", async () => {
    const now = new Date().toISOString();
    await env.DB.prepare("INSERT INTO _pipeline_check (created_at) VALUES (?)")
      .bind(now)
      .run();

    const row = await env.DB.prepare(
      "SELECT created_at FROM _pipeline_check ORDER BY id DESC LIMIT 1"
    ).first<{ created_at: string }>();

    expect(row?.created_at).toBe(now);
  });
});
