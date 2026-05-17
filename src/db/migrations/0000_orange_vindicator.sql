DROP TABLE IF EXISTS `_pipeline_check`;
--> statement-breakpoint
CREATE TABLE `game_results` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`won` integer NOT NULL,
	`player_side` text NOT NULL,
	`difficulty` text NOT NULL,
	`duration_seconds` integer NOT NULL,
	`move_count` integer NOT NULL,
	`played_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "game_results_won_check" CHECK("game_results"."won" IN (0, 1)),
	CONSTRAINT "game_results_player_side_check" CHECK("game_results"."player_side" IN ('attackers', 'defenders')),
	CONSTRAINT "game_results_difficulty_check" CHECK("game_results"."difficulty" IN ('thrall', 'karl', 'jarl')),
	CONSTRAINT "game_results_duration_check" CHECK("game_results"."duration_seconds" >= 0),
	CONSTRAINT "game_results_move_count_check" CHECK("game_results"."move_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_game_results_user_id` ON `game_results` (`user_id`);--> statement-breakpoint
CREATE TABLE `leaderboard_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`is_public` integer DEFAULT 0 NOT NULL,
	`is_admin` integer DEFAULT 0 NOT NULL,
	`total_wins` integer DEFAULT 0 NOT NULL,
	`total_losses` integer DEFAULT 0 NOT NULL,
	`best_time_seconds` integer,
	`best_difficulty` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "leaderboard_profiles_display_name_check" CHECK(length("leaderboard_profiles"."display_name") BETWEEN 1 AND 32),
	CONSTRAINT "leaderboard_profiles_is_public_check" CHECK("leaderboard_profiles"."is_public" IN (0, 1)),
	CONSTRAINT "leaderboard_profiles_is_admin_check" CHECK("leaderboard_profiles"."is_admin" IN (0, 1)),
	CONSTRAINT "leaderboard_profiles_best_difficulty_check" CHECK("leaderboard_profiles"."best_difficulty" IS NULL OR "leaderboard_profiles"."best_difficulty" IN ('thrall', 'karl', 'jarl'))
);
--> statement-breakpoint
CREATE TABLE `site_stats` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`total_anonymous_games` integer DEFAULT 0 NOT NULL,
	`total_registered_games` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "site_stats_singleton" CHECK("site_stats"."id" = 1)
);
