# ADR: Build the port on a pure Cloudflare stack (no Supabase)

**Date:** 2026-05-12
**Status:** Active

---

## Decision

The port of the Hnefatafl prototype to production runs entirely on Cloudflare primitives: Workers (compute + static asset serving), D1 (SQLite database), R2 (object storage for piece textures), KV (magic-link tokens and rate-limit buckets), Email Sending (transactional email), and Turnstile (bot challenge). No Supabase, no third-party database, no separate hosting platform.

## Context

The prototype (`SPECIFICATIONS/ORIGINAL_IDEA/ClaudeShipSource/`) is built on Vite + React + Supabase, with Supabase handling auth (PKCE OAuth + magic links), Postgres with Row-Level Security policies, storage for piece textures, and Edge Functions for the contact form and admin endpoints. The prototype is functional and fun.

The trigger for this decision is **cost**: Magnus no longer has a free Supabase database tier available. Continuing on Supabase means a recurring monthly bill for a hobby game with low traffic. Cloudflare's Workers Free plan covers everything this game needs at zero ongoing cost for the traffic profile we expect.

A secondary trigger is **operational simplicity**: the prototype's biggest source of pain has been Supabase RLS — see the `fix_admin_rls_recursion.sql` migration in the prototype source. Replacing implicit DB-level policies with explicit Worker-side authorisation in TypeScript is easier to test, easier to read, and easier to reason about for a single solo maintainer.

This decision affects every backend choice for the project, so it warrants an ADR.

## Alternatives considered

- **Option A: Stay on Supabase, port frontend only.** Keep the Postgres schema, RLS policies, Edge Functions, and auth flows exactly as they are; just rehost the SPA on Cloudflare Pages. Rejected because (a) it doesn't solve the cost problem at all, and (b) it leaves the RLS-recursion footgun in place.

- **Option B: Cloudflare Workers + a different managed Postgres (Neon, Turso, PlanetScale).** A hybrid stack: Cloudflare for compute and static, an external SQL service for the database. Rejected because (a) it adds a second vendor back into the picture for no upside the game needs, (b) Cloudflare D1 is more than enough for a turn-based game's read/write volume, and (c) it complicates the auth story — KV is the natural store for short-lived magic-link tokens and is already co-located with the Worker.

- **Option C (chosen): Pure Cloudflare.** Workers + D1 + R2 + KV + Email Sending + Turnstile. Single vendor, single deploy unit, single billing surface, all on the Free plan.

- **Option D: Self-host on a VPS.** A small DigitalOcean or Hetzner box running Postgres + Node. Rejected because it trades a recurring Supabase bill for a recurring VPS bill *plus* ongoing OS/patching/backup work that a solo hobbyist shouldn't take on.

## Reasoning

Cost is the binding constraint. Cloudflare's Free plan limits (100k Worker requests/day, 5GB D1 storage, 10GB R2 storage, 100k KV reads/day) are an order of magnitude more than this game will ever consume. The board game is turn-based; even an enthusiastic single player generates a tiny request volume relative to those limits.

Cloudflare D1 is well-matched to a Hnefatafl backend. The data model is small — three tables in the prototype (`game_results`, `leaderboard_profiles`, `site_stats`) — and the workload is overwhelmingly write-once / read-many. SQLite semantics are fine here; there is nothing in this game that needs Postgres-specific features.

Replacing Row-Level Security with explicit Worker-side authorisation is a net positive for this project. Every endpoint will check "is this caller authenticated, and are they allowed to perform this action on this row?" in plain TypeScript before touching D1. More lines of code, but no implicit policy graph to debug.

Cloudflare's developer experience is mature enough: Wrangler for deploys, `@cloudflare/vite-plugin` for local dev, `@cloudflare/vitest-pool-workers` for testing Worker code, Drizzle ORM with D1 bindings, automatic Custom Domain SSL. The remaining sharp edge — Email Sending is in beta — is addressed by ADR `2026-05-12-email-provider-abstraction.md`.

## Trade-offs accepted

- **Lock-in to Cloudflare.** Every backend primitive is a Cloudflare product. Migrating off Cloudflare later would mean rewriting D1 → some SQL, R2 → some object store, KV → some KV, Email Sending → some SMTP/API. We accept this because the alternative is paying for portability we won't use.

- **D1 is still relatively young.** Some advanced Postgres ergonomics (rich extensions, mature backup tooling, decades of operator knowledge) aren't there. For this workload it doesn't matter.

- **No client-to-DB shortcut.** With Supabase, the client could query directly. With this stack, every read goes through a Worker route. Slightly more code, slightly more latency — but no RLS policies to maintain, and authorisation is co-located with route logic.

- **All eggs in one basket for outages.** If Cloudflare has a region-wide incident, the game is down. For a hobby game this is acceptable; the prototype on Supabase had the same single-vendor risk.

- **Email Sending is in beta.** Covered separately by the email-provider-abstraction ADR — the architecture explicitly allows switching to Resend without code changes.

## Implications

- All future architectural decisions assume Cloudflare primitives. New features should prefer Workers-native options (Queues, Durable Objects, Workers AI) before reaching for external services.
- The deploy unit is a single Worker that serves both the SPA bundle (via static-asset binding) and the `/api/*` routes. There is no separate frontend host.
- Local development uses `wrangler dev` with `@cloudflare/vite-plugin` so the dev environment matches production semantics (D1 local sqlite, KV local store, etc.).
- Database migrations are managed with `wrangler d1 migrations` (and/or `drizzle-kit` generating the SQL) and committed alongside code.
- Secrets are stored in Wrangler's secret store, never committed.

## References

- Related ADR: [`2026-05-12-email-provider-abstraction.md`](./2026-05-12-email-provider-abstraction.md) — how we de-risk the Email Sending beta.
- Prototype reference: [`SPECIFICATIONS/ORIGINAL_IDEA/ClaudeShipSource/spec-architecture.md`](../../SPECIFICATIONS/ORIGINAL_IDEA/ClaudeShipSource/spec-architecture.md) — what we're replacing.
- Prototype reference: [`SPECIFICATIONS/ORIGINAL_IDEA/ClaudeShipSource/spec-database.md`](../../SPECIFICATIONS/ORIGINAL_IDEA/ClaudeShipSource/spec-database.md) — Supabase schema and RLS policies we're not porting.
- Technology preferences: [`.claude/COLLABORATION/technology-preferences.md`](../../.claude/COLLABORATION/technology-preferences.md).
