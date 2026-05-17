# CLAUDE.md

Navigation index and quick reference for working with this project.

## Rules of engagement

Collaboration principles and ways of working: @.claude/CLAUDE.md
When asked to remember anything, add project memory in this CLAUDE.md (project root), not @.claude/CLAUDE.md.

## Project overview

**Hnefatafl game** — a faithful port of an existing Hnefatafl prototype to a pure Cloudflare stack. Single-player browser game; you play Copenhagen-ruleset 11×11 Hnefatafl against an AI with three difficulty levels.

**Hnefatafl** ("king's table") is a Viking-age asymmetric board game. The defender side controls a king + twelve men starting in the centre, trying to get the king to one of four corners. The attacker side controls twenty-four men starting on the edges, trying to capture the king first.

**Core workflow:**
1. Pick a side (defender or attacker) and a difficulty (Thrall, Karl, or Jarl).
2. Play a full game against the AI on a 3D board.
3. See the result (winner, duration, move count).
4. From v0.2 onward: optionally sign in with a magic link to track personal stats.

**Full specification:** [SPECIFICATIONS/ORIGINAL_IDEA/project-outline.md](./SPECIFICATIONS/ORIGINAL_IDEA/project-outline.md)
**Prototype source:** [SPECIFICATIONS/ORIGINAL_IDEA/ClaudeShipSource/](./SPECIFICATIONS/ORIGINAL_IDEA/ClaudeShipSource/) — design source of truth for game behaviour and visuals.

## Architecture overview

**Stack:**
- **Framework:** Cloudflare Workers (Hono) + Vite + React 18 + TypeScript (strict)
- **Styling:** Tailwind CSS + shadcn/ui, parchment palette, Cinzel + Cormorant Garamond fonts
- **3D:** `@react-three/fiber` + `@react-three/drei` + `three`
- **Database:** Cloudflare D1 (SQLite) + Drizzle ORM
- **Object storage:** Cloudflare R2 (piece textures)
- **Key-value:** Cloudflare KV (magic-link tokens, rate-limit buckets)
- **Email:** Cloudflare Email Sending (beta), Resend on `hultberg.org` as fallback — see [ADR](./REFERENCE/decisions/2026-05-12-email-provider-abstraction.md)
- **Bot protection:** Cloudflare Turnstile
- **Package manager:** Bun
- **Tests:** Vitest + `@cloudflare/vitest-pool-workers`
- **Deploy:** Wrangler, single Worker (SPA + API on one deploy unit)
- **Domain:** `hnefatafl.hultberg.org`

**Key integrations:** none external. Everything runs on Cloudflare. See ADR [2026-05-12-cloudflare-only-stack.md](./REFERENCE/decisions/2026-05-12-cloudflare-only-stack.md).

**Current status:** Phase 3 (3D board and gameplay loop) complete — v0.1 merged to main. Phase 4 (D1 schema + anonymous stats) is next.

## Implementation phases

Eight phases mapped to three shippable milestones:

**v0.1 — Anonymous play**
1. [01-foundation.md](./SPECIFICATIONS/01-foundation.md) — Worker + Vite + D1 + KV scaffolding, production domain live (3–5 days)
2. [02-game-engine-and-ai.md](./SPECIFICATIONS/02-game-engine-and-ai.md) — Pure-TS engine + AI port with 100% test coverage (5–8 days)
3. [03-3d-board-and-gameplay-loop.md](./SPECIFICATIONS/03-3d-board-and-gameplay-loop.md) — 3D board, gameplay loop, v0.1 ships (7–10 days)

**v0.2 — Accounts**
4. [04-d1-schema-and-anonymous-stats.md](./SPECIFICATIONS/04-d1-schema-and-anonymous-stats.md) — D1 schema, anonymous counter migrated from KV (stub spec)
5. [05-magic-link-auth.md](./SPECIFICATIONS/05-magic-link-auth.md) — Magic-link authentication, v0.2 ships (stub spec)

**v1.0 — Full game**
6. [06-leaderboard-and-profile.md](./SPECIFICATIONS/06-leaderboard-and-profile.md) — Leaderboard + profile pages (stub spec)
7. [07-r2-textured-pieces.md](./SPECIFICATIONS/07-r2-textured-pieces.md) — R2-hosted textured piece style (stub spec)
8. [08-admin-and-contact.md](./SPECIFICATIONS/08-admin-and-contact.md) — Admin panel + contact form, v1.0 ships (stub spec)

**Phases 4–8 are stubs.** They capture shape and dependencies; each gets re-drafted in full when its turn comes, using [`SPECIFICATIONS/00-TEMPLATE-phase.md`](./SPECIFICATIONS/00-TEMPLATE-phase.md).

**Current phase:** Phase 4 (D1 schema + anonymous stats) — not yet started.

### SPECIFICATIONS/
- Numbered phase files (active work-in-progress)
- **ORIGINAL_IDEA/** — Master spec, prototype source, gamepiece textures
- **ARCHIVE/** — Completed phase specs (move here once a phase ships)

### REFERENCE/
How-it-works documentation:
- [testing-strategy.md](./REFERENCE/testing-strategy.md) — TDD workflow, coverage targets, Vitest pools
- [technical-debt.md](./REFERENCE/technical-debt.md) — Known issues, accepted shortcuts
- [environment-setup.md](./REFERENCE/environment-setup.md) — Cloudflare resource setup, secrets, Custom Domain
- [troubleshooting.md](./REFERENCE/troubleshooting.md) — Common issues
- [decisions/](./REFERENCE/decisions/) — Architecture Decision Records (ADRs)
- [TEMPLATE-UPDATES/](./REFERENCE/TEMPLATE-UPDATES/) — Migration packets for template improvements

*Keep CLAUDE.md files short (<300 lines). Details belong in subdirectory files.*

## Code conventions

### File headers
```typescript
// ABOUT: Brief description of file purpose
// ABOUT: Key functionality or responsibility
```

### Naming
- Descriptive names: e.g. `applyMove`, `getLegalMoves`, `evaluatePosition`, not `processBoard` or `handleStuff`.
- TypeScript conventions: camelCase for variables/functions, PascalCase for types/components.
- Avoid temporal references: no "new", "improved", "old".

### Comments
- Evergreen (describe what the code does, not how it evolved).
- Minimal (code should be self-documenting).
- Explain non-obvious decisions (e.g. "king edge immunity — see ClaudeShipSource/spec-game-engine.md").

## Development workflow

**⚠️ CRITICAL: ALL CODE CHANGES REQUIRE A FEATURE BRANCH + PR ⚠️**

**Step 0 (BEFORE making ANY changes):**
- [ ] On a feature branch (not main)?
- [ ] If on main: create feature branch first.

**Implementation steps:**
1. Create feature branch (`feature/`, `fix/`, `refactor/`).
2. Check `SPECIFICATIONS/` for the relevant phase spec.
3. Review the spec with `/review-spec` before starting non-trivial work.
4. Implement with tests (run tests + type checking continuously).
5. Create a PR for review:
   - `/review-pr` — dispatcher, triages to light/standard/team (1–5 min, longer if escalated)
   - `/review-pr-team` — force team review, skip triage (2–7 min)
   - See [pr-review-workflow.md](./REFERENCE/pr-review-workflow.md)

## TypeScript configuration

- Target: ES2022
- Strict mode: enabled
- Path alias: `@/` maps to `./src/`
- Runtime types: generated by `wrangler types` (postinstall) into `worker-configuration.d.ts` — gitignored. Re-run `bun run cf-typegen` after editing `wrangler.toml`.

## Testing

Tests serve dual purpose:
1. **Validation** — verify code works
2. **Directional context** — guide AI development

**Commands:**
```bash
bun run test              # Run all tests (both Vitest projects)
bun run test:watch        # Watch mode
bun run test:coverage     # Coverage report
bun run typecheck         # tsc --noEmit
bun run build             # Vite build (client + Worker SSR bundle)
bun run dev               # Local dev (Vite + Worker via @cloudflare/vite-plugin)
```

> Note: use `bun run test`, NOT `bun test`. `bun test` invokes Bun's built-in
> test runner, which won't pick up the Vitest config.

**Coverage target:** 100% (enforced minimums: 95% lines/functions/statements, 90% branches).

**See:** [testing-strategy.md](./REFERENCE/testing-strategy.md)

## Quick reference links

**Planning & specs:**
- **Project outline** → [SPECIFICATIONS/ORIGINAL_IDEA/project-outline.md](./SPECIFICATIONS/ORIGINAL_IDEA/project-outline.md)
- **Prototype source of truth** → [SPECIFICATIONS/ORIGINAL_IDEA/ClaudeShipSource/](./SPECIFICATIONS/ORIGINAL_IDEA/ClaudeShipSource/)
- **Implementation phases** → see list above or [SPECIFICATIONS/](./SPECIFICATIONS/)
- **Completed specs** → [SPECIFICATIONS/ARCHIVE/](./SPECIFICATIONS/ARCHIVE/)

**Reference docs:**
- **Cloudflare resource setup?** → [environment-setup.md](./REFERENCE/environment-setup.md)
- **Testing strategy?** → [testing-strategy.md](./REFERENCE/testing-strategy.md)
- **Known issues?** → [technical-debt.md](./REFERENCE/technical-debt.md)
- **Getting unstuck?** → [troubleshooting.md](./REFERENCE/troubleshooting.md)
- **Why is it this way?** → [decisions/](./REFERENCE/decisions/) — ADRs

## Project-specific notes

- **Cost constraint is binding.** Anything that adds a recurring bill needs an explicit justification. Cloudflare Free plan only.
- **Faithful port.** Game behaviour, visuals, and AI feel match the prototype. Improvements are out of scope until v1.0 ships; tweaks beyond that need an ADR.
- **Solo maintainer.** No on-call rotation, no shared inboxes. Operational complexity has to stay low.
- **British English** in all docs and user-facing copy.

---

**Remember:** This file is the navigation hub. Keep it current and concise; details belong in subdirectory files.
