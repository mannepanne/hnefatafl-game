-- Hand-authored: Drizzle Kit never modifies this file.
-- Seeds the site_stats singleton row. INSERT OR IGNORE is idempotent — safe on replays.
INSERT OR IGNORE INTO site_stats (id) VALUES (1);
