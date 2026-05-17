# Phase 4: D1 schema + anonymous stats

## Phase overview

**Phase number:** 4
**Phase name:** D1 schema + anonymous stats
**Estimated timeframe:** 2–3 days
**Dependencies:** Phases 1–3 complete (v0.1 merged to main).

**Brief description:**
Introduces the real D1 schema. Replaces the KV-backed anonymous-games counter with a `site_stats` row in D1. Creates the `game_results` and `leaderboard_profiles` tables (empty until Phase 5 populates them). No new user-visible features — this is the data-layer foundation for v0.2.

---

## Scope and deliverables

### In scope
- [ ] Drop `_pipeline_check` placeholder table; replace with real schema
- [ ] Drizzle schema for three tables: `game_results`, `leaderboard_profiles`, `site_stats`
- [ ] Two migration files: Drizzle-generated schema DDL + hand-authored seed/constraints file
- [ ] Seed `site_stats` singleton row (`id = 1`)
- [ ] Replace KV-backed counter with D1-backed counter in `stats.ts` (using `c.env.DB.batch` for atomicity)
- [ ] DB client helper in `src/db/index.ts`
- [ ] Update tests: stats route tests, d1-binding test
- [ ] KV counter value carried over to D1 before deploying the new Worker (see deployment steps)
- [ ] Tests passing, coverage maintained

### Out of scope
- Writing to `game_results` or `leaderboard_profiles` — Phase 5
- `requireUser` / `requireAdmin` auth helpers — Phase 5 (written next to actual callers)
- `replayGame()` validation helper — Phase 5 (written next to the route that consumes it; `makeMove` silently no-ops on illegal moves, so the API shape depends on the caller's needs)
- User accounts and magic-link auth — Phase 5
- Leaderboard UI — Phase 6
- CSRF fix on POST endpoints (TD-010) — Phase 5 (alongside auth)

### Acceptance criteria
- [ ] All three tables exist in D1 (local + remote) via Drizzle migration
- [ ] `site_stats` has exactly one row with `id = 1`; `_pipeline_check` is gone
- [ ] GET `/api/stats/anonymous-games` reads `total_anonymous_games` from D1
- [ ] POST `/api/stats/anonymous-games` increments D1 counter using `db.batch`; KV rate-limit unchanged
- [ ] No KV reads or writes for the counter in `stats.ts`
- [ ] `bun run test` passes with no regressions
- [ ] `bun run typecheck` passes
- [ ] `bun run test:coverage` meets targets (95% lines/functions/statements, 90% branches)

---

## Technical approach

### Database schema

All three tables adapted from the Postgres prototype to SQLite/D1:

| Postgres type | SQLite/D1 equivalent | Notes |
|---|---|---|
| `UUID` | `TEXT` | Generated in application code via `crypto.randomUUID()` |
| `BOOLEAN` | `INTEGER` (0/1) | Drizzle `integer({ mode: 'boolean' })` abstracts this |
| `TIMESTAMPTZ` | `TEXT` ISO-8601 | Default: `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` |
| SECURITY DEFINER functions | Worker-side logic | No stored procedures in D1 |
| RLS policies | Worker-side auth checks | No row-level security in D1 |

#### `game_results`

Stores individual game outcomes for registered users. **Empty until Phase 5.** Phase 5 will add the FK to `users` and `ON DELETE CASCADE` once that table exists.

```sql
CREATE TABLE game_results (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  won INTEGER NOT NULL CHECK (won IN (0, 1)),
  player_side TEXT NOT NULL CHECK (player_side IN ('attackers', 'defenders')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('thrall', 'karl', 'jarl')),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
  move_count INTEGER NOT NULL CHECK (move_count >= 0),
  played_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_game_results_user_id ON game_results (user_id);
```

Note: `id` is generated application-side via `crypto.randomUUID()` at insert time. There is no SQL default — Phase 5 must supply it explicitly.

#### `leaderboard_profiles`

Denormalised profile with aggregate stats. **Empty until Phase 5.**

```sql
CREATE TABLE leaderboard_profiles (
  user_id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 32),
  is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1)),
  total_wins INTEGER NOT NULL DEFAULT 0,
  total_losses INTEGER NOT NULL DEFAULT 0,
  best_time_seconds INTEGER,
  best_difficulty TEXT CHECK (best_difficulty IS NULL OR best_difficulty IN ('thrall', 'karl', 'jarl')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

Note: `is_admin` is included here (matching the prototype's migration 3) because it's needed by Phase 5's auth middleware. The prototype's RLS-recursion bug (where `is_admin` on the same table as the policy caused a stack overflow) cannot happen in a Worker — but the mixed concern (admin flag on public profile) is inherited debt. Flagged for review before Phase 8 admin work.

#### `site_stats` (singleton)

Matches the prototype's `id = 1` INTEGER PK with `CHECK (id = 1)`. INTEGER PRIMARY KEY aliases to SQLite's rowid — efficient, and it avoids deviating from the prototype pattern.

```sql
CREATE TABLE site_stats (
  id INTEGER PRIMARY KEY DEFAULT 1 NOT NULL,
  total_anonymous_games INTEGER NOT NULL DEFAULT 0,
  total_registered_games INTEGER NOT NULL DEFAULT 0,
  -- CONSTRAINT named for diagnosability in migration errors
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT site_stats_singleton CHECK (id = 1)
);
```

Note: `updated_at` has no auto-update trigger. D1 supports SQLite triggers but Drizzle Kit does not generate them — Worker code must set `updated_at` explicitly on every mutating query. This is low-risk in Phase 4 (single write path) but becomes important in Phase 5 when `leaderboard_profiles` is updated frequently.

### Migration approach

Drizzle and the scripts (`db:generate`, `db:apply:local`, `db:apply`) are already set up from Phase 1.

**⚠️ Before generating: verify Drizzle migration tracking is in place on remote D1.**
Run: `wrangler d1 execute hnefatafl-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"`. If no row is returned, Drizzle hasn't been managing migrations on this D1 yet — in that case, `db:generate` will produce a clean-slate migration rather than an incremental diff. Confirm the Phase 1 `db:apply` run actually inserted a tracking row before proceeding.

**Two-file approach — keeps generated and hand-authored SQL separate so `db:generate` can never clobber the custom parts:**

1. Update `src/db/schema.ts` with the real tables (see Drizzle schema section below)
2. Run `bun run db:generate` → Drizzle Kit generates `0001_real_schema.sql` (schema DDL only; no seed, no `CHECK (id = 1)` constraint)
3. Create `0002_site_stats_seed.sql` by hand — add the `CHECK` constraint and seed INSERT that Drizzle can't emit:
   ```sql
   -- Hand-authored: Drizzle Kit never modifies this file.
   INSERT OR IGNORE INTO site_stats (id) VALUES (1);
   ```
   Note: `INSERT OR IGNORE` is idempotent — safe to re-run against an already-seeded DB (migration replays in tests, accidental double-apply in CI).
4. Confirm the generated migration includes `DROP TABLE _pipeline_check` (`_pipeline_check` has no production-significant data and no live Worker code reads it — safe to drop)
5. Run `bun run db:apply:local` for local dev
6. Run `bun run db:apply` for remote D1 (production) — **but only after the KV backfill step in the deployment runbook**

### Key files

**New files:**
```
src/db/index.ts
src/db/migrations/
  0001_real_schema.sql       — Drizzle-generated schema DDL
  0002_site_stats_seed.sql   — hand-authored seed + constraints
```

**Modified files:**
```
src/db/schema.ts             — replace _pipeline_check with game_results, leaderboard_profiles, site_stats
src/worker/routes/stats.ts   — counter from KV to D1; rate-limit stays in KV
tests/worker/stats.test.ts   — migrate KV seeding to D1 seeding
tests/worker/d1-binding.test.ts — update to use real schema
```

### `src/db/index.ts`

```typescript
// ABOUT: Drizzle D1 client factory — call getDb(env.DB) inside request handlers.

import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
```

### `stats.ts` counter migration

Replace both KV calls for the counter with D1 reads and writes. Rate-limit keys remain in KV unchanged.

```typescript
// GET — read from D1
const row = await c.env.DB.prepare(
  'SELECT total_anonymous_games FROM site_stats WHERE id = 1'
).first<{ total_anonymous_games: number }>();
const count = row?.total_anonymous_games ?? 0;
return c.json({ count });

// POST — atomic batch: increment then read in a single D1 round-trip
const now = new Date().toISOString();
const [, result] = await c.env.DB.batch([
  c.env.DB.prepare(
    'UPDATE site_stats SET total_anonymous_games = total_anonymous_games + 1, updated_at = ? WHERE id = 1'
  ).bind(now),
  c.env.DB.prepare(
    'SELECT total_anonymous_games FROM site_stats WHERE id = 1'
  ),
]);
const count = (result.results[0] as { total_anonymous_games: number })?.total_anonymous_games ?? 0;
return c.json({ count });
```

Note: `db.batch` runs both statements in a single D1 transaction. The returned count reflects the state after this request's increment, though concurrent increments from other requests may also be included if they interleaved within the same batch window — acceptable for a vanity counter. POST returns the current counter value after at least this request's increment has been applied.

---

## Testing strategy

### Integration tests (Worker pool)

**`tests/worker/stats.test.ts`** — migrated from KV to D1:
- `applyD1Migrations` takes a `queries` array (not a file path) — inline the DDL from `0001_real_schema.sql` and `0002_site_stats_seed.sql` in `beforeAll`
- Reset `total_anonymous_games` to 0 between tests with a direct `UPDATE`
- Existing test cases (GET returns count, POST increments, rate limit via KV) ported as-is
- No KV seeding for the counter; KV still used for rate-limit reset in `beforeEach`

**`tests/worker/d1-binding.test.ts`** — updated to use the real schema:
- Replace `_pipeline_check` DDL with inline queries from both migration files
- Verify `site_stats` singleton row exists with `id = 1` and `total_anonymous_games = 0`
- Verify `CHECK (id = 1)` rejects a second `INSERT` with a different id value
- Verify `player_side` CHECK on `game_results` rejects invalid values

### Manual testing checklist

No new user-visible features in Phase 4. Verify via the running dev server:
- [ ] Open DevTools network tab; finish a game; confirm POST `/api/stats/anonymous-games` returns 200 with a non-zero count
- [ ] Refresh the page; confirm the counter value shown in the menu matches the D1 value (not reset to 0)

---

## Pre-commit checklist

- [ ] `bun run test` — all passing
- [ ] `bun run typecheck` — clean
- [ ] `bun run test:coverage` — meets targets
- [ ] `bun run db:apply:local` — both migrations applied cleanly
- [ ] `site_stats` singleton row confirmed in local D1 (`wrangler d1 execute hnefatafl-db --local --command "SELECT * FROM site_stats"`)
- [ ] No KV reads/writes for the counter in `stats.ts`
- [ ] REFERENCE/technical-debt.md updated if new debt introduced

---

## PR workflow

**Branch:** `feature/phase-4-d1-schema`
**PR title:** `Phase 4: D1 schema + anonymous stats`

**Review:** use `/review-pr` — the triage will auto-escalate to team tier because this touches the data layer (`src/db/`, `src/worker/routes/stats.ts`, migrations). That's correct behaviour; no need to force `/review-pr-team`.

**Deployment steps (after PR merges) — order matters:**
1. **KV → D1 counter backfill (do this first, before applying the migration or deploying):**
   ```bash
   # Read the current production counter value
   wrangler kv key get --binding=KV stats:anonymous-games
   # Seed it into D1 (substitute N with the value above)
   wrangler d1 execute hnefatafl-db --remote \
     --command "UPDATE site_stats SET total_anonymous_games = N WHERE id = 1"
   # Delete the KV key — new Worker reads D1; old key becomes dead weight
   wrangler kv key delete --binding=KV stats:anonymous-games
   ```
   If v0.1 has not accumulated meaningful counts, accepting a reset to 0 is also acceptable — document the choice in the PR.
2. `bun run db:apply` — apply both migrations to remote D1
3. Verify: `wrangler d1 execute hnefatafl-db --remote --command "SELECT * FROM site_stats"`
4. Deploy Worker: `wrangler deploy`
5. Smoke test: increment counter in-browser (finish a game), confirm GET `/api/stats/anonymous-games` reflects the updated count

---

## Edge cases and considerations

### D1 rate limits and behaviour
- D1 has a 10 MB row size limit and 25 MB max database size on the free plan (well within scope for Phase 4)
- D1 is eventually consistent in some read scenarios; for the counter this is acceptable (vanity metric)
- D1 does not support `RETURNING` on UPDATE — `db.batch` with a follow-up SELECT is the correct pattern

### Counter concurrency
POST uses `db.batch([update, select])`. Both statements run in a single D1 transaction, so the SELECT reflects the committed state after the UPDATE. Under concurrency, two concurrent batches can interleave at D1's level — the returned count will reflect "at least my increment plus any concurrent ones that committed first." The stored total is always correct; only the per-response value is non-deterministic under high concurrency. Acceptable for a vanity counter.

### `_pipeline_check` safe-to-drop
`_pipeline_check` exists only as a Phase 1 pipeline smoke test. No live Worker code reads or writes it. No production-significant data exists in the column. Drop is safe at migration time.

### Drizzle migration tracking
Before running `db:generate`, confirm the remote D1 has a `__drizzle_migrations` table from the Phase 1 apply. If missing, the generated diff will be a clean-slate migration that conflicts with the already-applied `0000_pipeline_check.sql`. If tracking is absent, the resolution is to run `bun run db:apply:local` against the remote D1 first (not `db:generate`) to establish the baseline, then generate from the correct state.

### Phase 5 FK addition
`game_results.user_id` and `leaderboard_profiles.user_id` have no FK in Phase 4 (the `users` table doesn't exist yet). Phase 5 adds the `users` table and FK constraints. SQLite's limited `ALTER TABLE` cannot add FKs after the fact — Phase 5 will need to rebuild these tables if FKs are required. SQLite FK enforcement is opt-in (`PRAGMA foreign_keys = ON`); D1 does not guarantee this pragma is set by default. Design Phase 5 with this in mind.

---

## Technical debt

No new entries. TD-010 (CSRF / Origin check on POST endpoints) is inherited from Phase 3 and remains deferred to Phase 5.

---

## Prototype references

- [`spec-database.md`](./ORIGINAL_IDEA/ClaudeShipSource/spec-database.md) — original Postgres schema
- [`supabase/migrations/20260411100142_create_game_tables.sql`](./ORIGINAL_IDEA/ClaudeShipSource/supabase/migrations/20260411100142_create_game_tables.sql) — Postgres source; adapted to SQLite above
