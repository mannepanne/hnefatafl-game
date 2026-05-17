// ABOUT: Tests for /api/stats/anonymous-games — GET count, POST increment, IP rate limit.
// ABOUT: Counter backed by D1 site_stats; rate-limit keys remain in KV.

import { SELF, env, applyD1Migrations } from "cloudflare:test";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";

const URL = "https://example.com/api/stats/anonymous-games";

// Inline DDL matching the Phase 4 migrations — same queries as d1-binding.test.ts.
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

async function getCount(): Promise<number> {
  const res = await SELF.fetch(URL);
  expect(res.status).toBe(200);
  const body = (await res.json()) as { count: number };
  return body.count;
}

async function postIncrement(ip = "1.2.3.4"): Promise<Response> {
  return SELF.fetch(URL, {
    method: "POST",
    headers: { "CF-Connecting-IP": ip },
  });
}

describe("GET /api/stats/anonymous-games", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, migrations);
  });

  beforeEach(async () => {
    // Reset counter between tests
    await env.DB.prepare(
      "UPDATE site_stats SET total_anonymous_games = 0 WHERE id = 1",
    ).run();
  });

  it("returns 200 with count=0 when no games recorded", async () => {
    const count = await getCount();
    expect(count).toBe(0);
  });

  it("returns the current count after a direct D1 update", async () => {
    await env.DB.prepare(
      "UPDATE site_stats SET total_anonymous_games = 42 WHERE id = 1",
    ).run();
    const count = await getCount();
    expect(count).toBe(42);
  });
});

describe("POST /api/stats/anonymous-games", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, migrations);
  });

  beforeEach(async () => {
    // Reset D1 counter
    await env.DB.prepare(
      "UPDATE site_stats SET total_anonymous_games = 0 WHERE id = 1",
    ).run();
    // Clear rate-limit keys for test IPs
    const list = await env.KV.list({ prefix: "ratelimit:stats:" });
    for (const key of list.keys) {
      await env.KV.delete(key.name);
    }
  });

  it("returns 200 and increments the counter", async () => {
    const res = await postIncrement();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number };
    expect(body.count).toBe(1);
  });

  it("increments multiple times from different IPs", async () => {
    await postIncrement("1.1.1.1");
    await postIncrement("2.2.2.2");
    const count = await getCount();
    expect(count).toBe(2);
  });

  it("returns 429 when the same IP exceeds the rate limit (exercises increment + TTL path)", async () => {
    const ip = "9.9.9.9";
    // Hit the endpoint RATE_LIMIT times — all should succeed
    for (let i = 0; i < 10; i++) {
      const res = await postIncrement(ip);
      expect(res.status).toBe(200);
    }
    // 11th request from the same IP must be rejected
    const res = await postIncrement(ip);
    expect(res.status).toBe(429);
  });

  it("allows a different IP after one is rate-limited", async () => {
    await env.KV.put("ratelimit:stats:9.9.9.9", "10", { expirationTtl: 3600 });

    const res = await postIncrement("8.8.8.8");
    expect(res.status).toBe(200);
  });
});
