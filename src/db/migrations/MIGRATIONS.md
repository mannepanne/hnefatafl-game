# Migrations

## Two-system tracking — read this before touching migration files

This project uses **two separate migration tracking systems** that operate independently:

### 1. Wrangler D1 migrations (`db:apply:local` / `db:apply`)

`bun run db:apply:local` runs `wrangler d1 migrations apply hnefatafl-db --local`, which applies **all SQL files in this folder in lexicographic order** and records each applied file in a `d1_migrations` table inside D1 itself.

This is the canonical deployment mechanism. Use it for all schema changes.

### 2. Drizzle Kit journal (`meta/_journal.json`)

`bun run db:generate` reads `src/db/schema.ts`, compares against the journal, and generates a new numbered SQL file containing the diff DDL.

**The journal only lists Drizzle-generated files** (`0000_orange_vindicator.sql`). It intentionally does not list hand-authored files like `0001_site_stats_seed.sql`. This is correct — Drizzle Kit must not modify the seed file.

### Why this matters

Do **not** run `drizzle-kit migrate` for deployments — it would try to apply only the Drizzle-tracked file and skip the seed. Always use `bun run db:apply` (wrangler).

Do **not** try to "fix" the journal to include `0001_site_stats_seed.sql` — Drizzle would attempt to generate diffs against it and break future migrations.

## Files

| File | Origin | Purpose |
|---|---|---|
| `0000_orange_vindicator.sql` | Drizzle-generated | Schema DDL — all three tables with CHECK constraints |
| `0001_site_stats_seed.sql` | Hand-authored | Seeds the `site_stats` singleton row (idempotent) |
| `meta/_journal.json` | Drizzle-managed | Drizzle diff baseline — do not edit manually |
