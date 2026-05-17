# Phase 4: D1 schema + anonymous stats (stub)

> **Stub spec.** This file captures the shape of the phase so the v0.1 milestone (Phases 1–3) can ship without us needing to commit to every detail here yet. **Re-draft this file in full** (using `00-TEMPLATE-phase.md`) when v0.1 is live and we're ready to start Phase 4. The current stub is good enough to (a) verify ordering, (b) confirm scope boundaries, and (c) catch dependency surprises.

## Overview

**Phase number:** 4
**Working name:** D1 schema + anonymous stats
**Dependencies:** Phases 1–3 complete (v0.1 in production).

**What it does:** Introduces the real D1 schema. Migrates the in-KV anonymous-games counter to a `site_stats` row in D1. Adds the `game_results` and `leaderboard_profiles` tables (empty until Phase 5 starts populating them). No new user-visible features — this is the data-layer foundation for v0.2.

## Deliverables (sketch)

- D1 schema for three tables (faithful port of the prototype's `spec-database.md` — `game_results`, `leaderboard_profiles`, `site_stats`).
- Drizzle schema definitions + generated migrations applied to remote D1.
- Replace KV-backed anonymous counter with D1-backed counter (a single `site_stats` row).
- Authorisation helper (`requireUser`, `requireAdmin`) stubs added but unused — Phase 5 fills them in.
- Replay-based result-validation helper: given a move history, replay it through the engine, return the resulting outcome. Used in Phase 5 to validate submitted game results server-side.

## Out of scope

- User accounts, magic-link auth — Phase 5.
- Leaderboard UI — Phase 6.
- Profile UI — Phase 6.

## Implementation notes (added after Phase 3)

- **D1 binding already provisioned.** `wrangler.toml` has a D1 binding from Phase 1. Phase 4 only needs to author and apply migrations — no infra setup required.
- **Counter migration scope.** `src/worker/routes/stats.ts` uses KV for two things: the counter (`stats:anonymous-games`) and per-IP rate limiting (`ratelimit:stats:<ip>`). Phase 4 replaces the counter with a D1 `site_stats` row; the rate-limit keys stay in KV.

## Open questions for this phase

- **Rate-limit migration:** does the per-IP rate limit move to D1 too, or stay in KV? **Decided: keep in KV** — KV is the right tool for short-TTL data; D1 is for durable rows.
- **Schema fidelity:** the prototype's schema uses Postgres-specific types (`UUID`, `TIMESTAMP WITH TIME ZONE`). D1 is SQLite — UUIDs become `TEXT` with a default of `lower(hex(randomblob(16)))` or generated app-side; timestamps become `INTEGER` (unix epoch ms) or `TEXT` ISO-8601. Pick one approach consistently. Default: app-generated UUIDs (`crypto.randomUUID()`), ISO-8601 `TEXT` for timestamps.
- **`site_stats` row identity:** the prototype uses `id = 1` INTEGER PK with `CHECK id = 1`. **Decided: match the prototype** — INTEGER PK aliases to SQLite rowid (efficient), and it avoids deviating from the prototype without reason.

## Prototype references
- [`spec-database.md`](./ORIGINAL_IDEA/ClaudeShipSource/spec-database.md)
- [`supabase/migrations/*.sql`](./ORIGINAL_IDEA/ClaudeShipSource/supabase/migrations/) — Postgres source; needs SQLite adaptation.
