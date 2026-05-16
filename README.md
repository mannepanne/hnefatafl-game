# Hnefatafl

A faithful browser port of the Viking-age board game Hnefatafl ("king's table"). Single-player against an AI on a 3D board, three difficulty levels, Copenhagen ruleset on an 11×11 board.

Runs entirely on Cloudflare's free plan — Workers + D1 + KV + R2 — at [hnefatafl.hultberg.org](https://hnefatafl.hultberg.org).

## Status

**Phase 1 (Foundation):** in progress on `feature/phase-1-foundation`. See [SPECIFICATIONS/01-foundation.md](./SPECIFICATIONS/01-foundation.md) for what Phase 1 ships. Subsequent phases are listed in [CLAUDE.md](./CLAUDE.md).

## Quick start

```bash
bun install            # also runs `wrangler types` to generate worker-configuration.d.ts
bun run dev            # Vite + Worker dev server
bun run test           # Vitest (both pools: workers + node)
bun run typecheck      # tsc --noEmit
bun run build          # client SPA + Worker SSR bundle
bun run deploy         # build + wrangler deploy (requires wrangler login; merging to main deploys automatically via GitHub Actions)
```

> Use `bun run test`, NOT `bun test` — the latter invokes Bun's built-in runner and skips the Vitest config.

## First-time Cloudflare setup

Production deploys need real D1 / KV IDs in `wrangler.toml` (currently placeholders) and a Custom Domain attached to the Worker. Full walkthrough: [REFERENCE/environment-setup.md](./REFERENCE/environment-setup.md).

## Stack

- **Runtime:** Cloudflare Workers (Hono) + Static Assets binding (single deploy unit for SPA + API)
- **Frontend:** React 18 + Vite + TypeScript (strict) + Tailwind + shadcn/ui
- **3D board (Phase 3):** `@react-three/fiber` + `drei` + `three`
- **Database:** Cloudflare D1 + Drizzle ORM
- **KV / R2:** Cloudflare KV (magic-link tokens, rate-limits), R2 (piece textures)
- **Tests:** Vitest + `@cloudflare/vitest-pool-workers`
- **Package manager:** Bun

## Repository layout

```
src/
  worker/        Worker entry, Hono routes, types
  client/        React SPA (Vite entry, pages, components)
  db/            Drizzle schema + migrations
tests/
  worker/        Workers-pool tests (real bindings via Miniflare)
  shared/        Node-pool tests (pure logic)
SPECIFICATIONS/  Active phase specs (and ORIGINAL_IDEA + ARCHIVE)
REFERENCE/       How-it-works docs + ADRs (decisions/)
.claude/         Collaboration config + review skills
```

## Origin

Port of an existing prototype ([SPECIFICATIONS/ORIGINAL_IDEA/ClaudeShipSource/](./SPECIFICATIONS/ORIGINAL_IDEA/ClaudeShipSource/)) onto a Cloudflare-only stack. Game behaviour, visuals, and AI feel match the prototype — the port is faithful, not a redesign. Improvements wait until v1.0 ships.

## License

Personal project, no license declared. If you want to use any of this, ask.
