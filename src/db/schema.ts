// ABOUT: Drizzle schema for the D1 database — leaderboard_profiles, game_results, site_stats.
// ABOUT: leaderboard_profiles: user accounts (email, display name, visibility). game_results: per-user game history with FK cascade. site_stats: singleton counter row.

import { sqliteTable, integer, text, check, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const leaderboardProfiles = sqliteTable(
  "leaderboard_profiles",
  {
    userId: text("user_id").primaryKey().notNull(),
    email: text("email").notNull().unique(),
    displayName: text("display_name").notNull(),
    isPublic: integer("is_public").notNull().default(0),
    isAdmin: integer("is_admin").notNull().default(0), // Phase 8 admin panel only — no current Worker consumer
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    uniqueIndex("idx_leaderboard_profiles_display_name").on(table.displayName),
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
  ],
);

export const gameResults = sqliteTable(
  "game_results",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => leaderboardProfiles.userId, { onDelete: "cascade" }),
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
