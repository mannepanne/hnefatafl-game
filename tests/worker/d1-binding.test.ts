// ABOUT: Exercises the D1 binding against the real Phase 4 schema.
// ABOUT: Verifies schema integrity — singleton constraint, CHECK constraints, table structure.

import { env, applyD1Migrations } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";

// Inline DDL from 0000_orange_vindicator.sql (DROP TABLE IF EXISTS is a no-op in a fresh DB).
// 0001_site_stats_seed.sql seed is included as a separate query.
const migrations = [
  {
    name: "0000_orange_vindicator",
    queries: [
      "DROP TABLE IF EXISTS `_pipeline_check`",
      `CREATE TABLE \`game_results\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`user_id\` text NOT NULL,
        \`won\` integer NOT NULL,
        \`player_side\` text NOT NULL,
        \`difficulty\` text NOT NULL,
        \`duration_seconds\` integer NOT NULL,
        \`move_count\` integer NOT NULL,
        \`played_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
        CONSTRAINT "game_results_won_check" CHECK("game_results"."won" IN (0, 1)),
        CONSTRAINT "game_results_player_side_check" CHECK("game_results"."player_side" IN ('attackers', 'defenders')),
        CONSTRAINT "game_results_difficulty_check" CHECK("game_results"."difficulty" IN ('thrall', 'karl', 'jarl')),
        CONSTRAINT "game_results_duration_check" CHECK("game_results"."duration_seconds" >= 0),
        CONSTRAINT "game_results_move_count_check" CHECK("game_results"."move_count" >= 0)
      )`,
      "CREATE INDEX `idx_game_results_user_id` ON `game_results` (`user_id`)",
      `CREATE TABLE \`leaderboard_profiles\` (
        \`user_id\` text PRIMARY KEY NOT NULL,
        \`display_name\` text NOT NULL,
        \`is_public\` integer DEFAULT 0 NOT NULL,
        \`is_admin\` integer DEFAULT 0 NOT NULL,
        \`total_wins\` integer DEFAULT 0 NOT NULL,
        \`total_losses\` integer DEFAULT 0 NOT NULL,
        \`best_time_seconds\` integer,
        \`best_difficulty\` text,
        \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
        \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
        CONSTRAINT "leaderboard_profiles_display_name_check" CHECK(length("leaderboard_profiles"."display_name") BETWEEN 1 AND 32),
        CONSTRAINT "leaderboard_profiles_is_public_check" CHECK("leaderboard_profiles"."is_public" IN (0, 1)),
        CONSTRAINT "leaderboard_profiles_is_admin_check" CHECK("leaderboard_profiles"."is_admin" IN (0, 1)),
        CONSTRAINT "leaderboard_profiles_best_difficulty_check" CHECK("leaderboard_profiles"."best_difficulty" IS NULL OR "leaderboard_profiles"."best_difficulty" IN ('thrall', 'karl', 'jarl'))
      )`,
      `CREATE TABLE \`site_stats\` (
        \`id\` integer PRIMARY KEY DEFAULT 1 NOT NULL,
        \`total_anonymous_games\` integer DEFAULT 0 NOT NULL,
        \`total_registered_games\` integer DEFAULT 0 NOT NULL,
        \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
        CONSTRAINT "site_stats_singleton" CHECK("site_stats"."id" = 1),
        CONSTRAINT "site_stats_anonymous_games_check" CHECK("site_stats"."total_anonymous_games" >= 0),
        CONSTRAINT "site_stats_registered_games_check" CHECK("site_stats"."total_registered_games" >= 0)
      )`,
    ],
  },
  {
    name: "0001_site_stats_seed",
    queries: ["INSERT OR IGNORE INTO site_stats (id) VALUES (1)"],
  },
];

describe("D1 binding", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, migrations);
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
