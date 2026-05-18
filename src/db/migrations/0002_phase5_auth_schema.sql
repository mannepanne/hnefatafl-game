-- Hand-authored: Phase 5 auth schema changes.
-- Rebuilds leaderboard_profiles (add email NOT NULL UNIQUE, UNIQUE on display_name,
-- drop aggregate columns) and game_results (add FK ON DELETE CASCADE).
-- SQLite does not support DROP COLUMN or ADD CONSTRAINT directly, so both tables are
-- rebuilt using the standard CREATE/INSERT/DROP/RENAME pattern.
PRAGMA foreign_keys = OFF;
--> statement-breakpoint
CREATE TABLE `__new_leaderboard_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`is_public` integer DEFAULT 0 NOT NULL,
	`is_admin` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "leaderboard_profiles_email_unique" UNIQUE(`email`),
	CONSTRAINT "leaderboard_profiles_display_name_check" CHECK(length(`display_name`) BETWEEN 1 AND 32),
	CONSTRAINT "leaderboard_profiles_is_public_check" CHECK(`is_public` IN (0, 1)),
	CONSTRAINT "leaderboard_profiles_is_admin_check" CHECK(`is_admin` IN (0, 1))
);
--> statement-breakpoint
INSERT INTO `__new_leaderboard_profiles`(`user_id`, `email`, `display_name`, `is_public`, `is_admin`, `created_at`, `updated_at`)
	SELECT `user_id`, `user_id` || '@migration.invalid', `display_name`, `is_public`, `is_admin`, `created_at`, `updated_at`
	FROM `leaderboard_profiles`;
--> statement-breakpoint
DROP TABLE `leaderboard_profiles`;
--> statement-breakpoint
ALTER TABLE `__new_leaderboard_profiles` RENAME TO `leaderboard_profiles`;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_leaderboard_profiles_display_name` ON `leaderboard_profiles` (`display_name`);
--> statement-breakpoint
CREATE TABLE `__new_game_results` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`won` integer NOT NULL,
	`player_side` text NOT NULL,
	`difficulty` text NOT NULL,
	`duration_seconds` integer NOT NULL,
	`move_count` integer NOT NULL,
	`played_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "game_results_won_check" CHECK(`won` IN (0, 1)),
	CONSTRAINT "game_results_player_side_check" CHECK(`player_side` IN ('attackers', 'defenders')),
	CONSTRAINT "game_results_difficulty_check" CHECK(`difficulty` IN ('thrall', 'karl', 'jarl')),
	CONSTRAINT "game_results_duration_check" CHECK(`duration_seconds` >= 0),
	CONSTRAINT "game_results_move_count_check" CHECK(`move_count` >= 0),
	FOREIGN KEY (`user_id`) REFERENCES `leaderboard_profiles`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_game_results` SELECT * FROM `game_results`;
--> statement-breakpoint
DROP TABLE `game_results`;
--> statement-breakpoint
ALTER TABLE `__new_game_results` RENAME TO `game_results`;
--> statement-breakpoint
CREATE INDEX `idx_game_results_user_id` ON `game_results` (`user_id`);
--> statement-breakpoint
PRAGMA foreign_keys = ON;
