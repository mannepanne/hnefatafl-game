// ABOUT: Exercises the D1 binding against the real Phase 4 schema.
// ABOUT: Verifies schema integrity — singleton constraint, CHECK constraints, table structure.

import { env, applyD1Migrations } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { phase4Migrations } from "../helpers/migrations";

describe("D1 binding", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, phase4Migrations);
  });

  it("site_stats singleton row exists with id=1 and counter at 0", async () => {
    const row = await env.DB.prepare(
      "SELECT id, total_anonymous_games FROM site_stats WHERE id = 1",
    ).first<{ id: number; total_anonymous_games: number }>();
    expect(row?.id).toBe(1);
    expect(row?.total_anonymous_games).toBe(0);
  });

  it("site_stats singleton CHECK rejects a second row with a different id", async () => {
    await expect(
      env.DB.prepare("INSERT INTO site_stats (id) VALUES (2)").run(),
    ).rejects.toThrow();
  });

  it("game_results player_side CHECK rejects invalid values", async () => {
    await expect(
      env.DB.prepare(
        "INSERT INTO game_results (id, user_id, won, player_side, difficulty, duration_seconds, move_count) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(
          "test-id",
          "user-1",
          1,
          "invalid_side",
          "thrall",
          60,
          10,
        )
        .run(),
    ).rejects.toThrow();
  });

  it("game_results inserts a valid row", async () => {
    const id = "valid-game-1";
    await env.DB.prepare(
      "INSERT INTO game_results (id, user_id, won, player_side, difficulty, duration_seconds, move_count) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(id, "user-1", 1, "defenders", "karl", 120, 42)
      .run();

    const row = await env.DB.prepare(
      "SELECT id FROM game_results WHERE id = ?",
    ).bind(id).first<{ id: string }>();
    expect(row?.id).toBe(id);
  });

  it("_pipeline_check table no longer exists", async () => {
    const row = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='_pipeline_check'",
    ).first<{ name: string }>();
    expect(row).toBeNull();
  });
});
