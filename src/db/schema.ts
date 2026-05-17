// ABOUT: Drizzle schema for the D1 database — game_results, leaderboard_profiles, site_stats.
// ABOUT: Phase 4 replaces the _pipeline_check placeholder with the real tables.

import { sqliteTable, integer, text, check, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const gameResults = sqliteTable(
  "game_results",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("user_id").notNull(),
    won: integer("won").notNull(),
    playerSide: text("player_side").notNull(),
    difficulty: text("difficulty").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    moveCount: integer("move_count").notNull(),
    playedAt: text("played_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    index("idx_game_results_user_id").on(table.userId),
    check("game_results_won_check", sql`${table.won} IN (0, 1)`),
    check(
      "game_results_player_side_check",
      sql`${table.playerSide} IN ('attackers', 'defenders')`,
    ),
    check(
      "game_results_difficulty_check",
      sql`${table.difficulty} IN ('thrall', 'karl', 'jarl')`,
    ),
    check(
      "game_results_duration_check",
      sql`${table.durationSeconds} >= 0`,
    ),
    check(
      "game_results_move_count_check",
      sql`${table.moveCount} >= 0`,
    ),
  ],
);

export const leaderboardProfiles = sqliteTable(
  "leaderboard_profiles",
  {
    userId: text("user_id").primaryKey().notNull(),
    displayName: text("display_name").notNull(),
    isPublic: integer("is_public").notNull().default(0),
    isAdmin: integer("is_admin").notNull().default(0),
    totalWins: integer("total_wins").notNull().default(0),
    totalLosses: integer("total_losses").notNull().default(0),
    bestTimeSeconds: integer("best_time_seconds"),
    bestDifficulty: text("best_difficulty"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    check(
      "leaderboard_profiles_display_name_check",
      sql`length(${table.displayName}) BETWEEN 1 AND 32`,
    ),
    check(
      "leaderboard_profiles_is_public_check",
      sql`${table.isPublic} IN (0, 1)`,
    ),
    check(
      "leaderboard_profiles_is_admin_check",
      sql`${table.isAdmin} IN (0, 1)`,
    ),
    check(
      "leaderboard_profiles_best_difficulty_check",
      sql`${table.bestDifficulty} IS NULL OR ${table.bestDifficulty} IN ('thrall', 'karl', 'jarl')`,
    ),
  ],
);

export const siteStats = sqliteTable(
  "site_stats",
  {
    id: integer("id").primaryKey().default(1).notNull(),
    totalAnonymousGames: integer("total_anonymous_games").notNull().default(0),
    totalRegisteredGames: integer("total_registered_games").notNull().default(0),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    check("site_stats_singleton", sql`${table.id} = 1`),
    check(
      "site_stats_anonymous_games_check",
      sql`${table.totalAnonymousGames} >= 0`,
    ),
    check(
      "site_stats_registered_games_check",
      sql`${table.totalRegisteredGames} >= 0`,
    ),
  ],
);
