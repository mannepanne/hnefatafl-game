# Phase 1: Foundation

## Phase overview

**Phase number:** 1
**Phase name:** Foundation (Worker + Vite + D1 + KV scaffolding, deployed to production domain)
**Estimated timeframe:** 3–5 days for someone familiar with the stack; budget 5–10 days for first-time setup of Wrangler + Custom Domain + Drizzle + CI. Realistically ~50/50 to slip 1–2 days because the `@cloudflare/vite-plugin` + Bun + Wrangler + dual-Vitest-pool integration matrix is wide — none hard individually, but tooling surprises compound.
**Dependencies:** None — this is the starting phase.

### Preconditions (verify before starting)
- `hultberg.org` is on Cloudflare DNS in the account that will own this Worker. Custom Domain on a sibling zone requires the parent zone to be co-located.
- Cloudflare account is on the Free plan, Workers enabled, no payment card required for the Phase 1 surface.
- A Cloudflare API token with `D1:edit` scope exists separately from `wrangler login` — `drizzle-kit push` against remote D1 needs the token to authenticate.

**Brief description:**
Stand up the minimum platform shell: a single Cloudflare Worker that serves a Vite-built React SPA via the static-assets binding, with D1 and KV bindings created and exercised by a single trivial pipeline-check table and a single put/get round-trip, Wrangler configured, the production domain `hnefatafl.hultberg.org` wired up, and CI in place. No game logic — this phase exists to prove the end-to-end deploy, dev, and migration loops work before we build anything on top.

---

## Scope and deliverables

### In scope
- [ ] Bun-managed project scaffold (`package.json`, `bun.lock`).
- [ ] Vite + React 18 + TypeScript (strict mode) frontend boilerplate, ported tailwind + shadcn/ui base config from the prototype.
- [ ] Cloudflare Worker entry point using Hono, with `/api/health` returning `{ok: true}`. Routing precedence is explicit: `/api/*` is matched by Hono and returns JSON 404 on no-match; everything else falls through to `env.ASSETS.fetch()`. Encoded in `wrangler.toml` as `assets.not_found_handling = "single-page-application"` so unknown SPA paths serve `index.html` (Phase 3 client-side routing depends on this).
- [ ] `@cloudflare/vite-plugin` configured so `bun run dev` runs the Worker + SPA together with HMR.
- [ ] `wrangler.toml` with bindings declared: `ASSETS` (static), `DB` (D1), `KV` (KV namespace). Binding names match in local (vite-plugin) and remote — same identifiers, two contexts.
- [ ] One D1 database created (`hnefatafl-prod`) and one KV namespace (`hnefatafl-kv-prod`), IDs committed in config.
- [ ] Drizzle ORM installed; `drizzle.config.ts` pointing at D1; schema contains a single trivial pipeline-check table (e.g. `_pipeline_check (id INTEGER PRIMARY KEY, created_at TEXT)`). Phase 4's first real migration drops this table.
- [ ] Migration tooling decision explicit: `drizzle-kit generate` emits SQL files into wrangler's `migrations_dir`; `wrangler d1 migrations apply` is the deploy verb. Drizzle generates, Wrangler applies, same directory.
- [ ] Migration tooling working end-to-end: the single-table migration applied via `wrangler d1 migrations apply` locally and to remote, both verified.
- [ ] Custom Domain configured for `hnefatafl.hultberg.org` pointing at the Worker, SSL provisioned.
- [ ] GitHub Actions CI workflow: install deps, type-check, run tests, build. (No deploy from CI yet — Phase 1 is local deploy.)
- [ ] Test infrastructure: Vitest configured, `@cloudflare/vitest-pool-workers` configured for Worker tests, plain Vitest for pure-TS code. A trivial passing test in each pool.
- [ ] Parchment palette + Cinzel + Cormorant Garamond fonts wired up (loaded, applied to a placeholder landing page).
- [ ] Carry over the prototype's existing `tsconfig.json` strict settings, `tailwind.config.js`, `components.json` (shadcn config), `postcss.config.js` — adapted to the new project root.
- [ ] Placeholder landing page (`/`) shows the parchment background, fonts loaded, and pinned copy: heading "Hnefatafl", subtitle "The king's table — coming soon", and a small line "A faithful port in progress." (British English throughout.)
- [ ] `REFERENCE/environment-setup.md` updated *before* implementation starts with: a first-time Cloudflare setup checklist (account on Free plan, Workers enabled, parent zone `hultberg.org` on Cloudflare DNS, API token with `D1:edit` scope, the three CI secrets `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_DATABASE_ID` / `CLOUDFLARE_API_TOKEN`), how to create the D1 + KV resources, how to wire the Custom Domain (and the `*.workers.dev` fallback if SSL is still provisioning), how secrets are stored, and what `wrangler dev` does locally.
- [ ] Root `CLAUDE.md` and `SPECIFICATIONS/CLAUDE.md` updated with the actual phase list and stack (replacing template placeholders).
- [ ] Tests for the health endpoint and the static-asset fallthrough.

### Out of scope
- Any game logic — engine, AI, board rendering. (Phases 2 and 3.)
- Database schema beyond the single `_pipeline_check` placeholder table. (Phase 4.)
- Authentication, magic links, KV usage. (Phase 5.)
- Email provider integration (no `Emailer` interface yet). (Phase 5.)
- R2 setup. (Phase 7.)
- Turnstile setup. (Phase 8.)
- Production CI/CD auto-deploy. Magnus deploys with `wrangler deploy` manually for now.
- Real content on the landing page beyond the placeholder.

### Acceptance criteria
- [ ] `bun run dev` starts the Worker + Vite together, hot-reloads on file changes, and the placeholder page renders at `http://localhost:8787` (or whatever port Wrangler picks).
- [ ] `bun run build` produces a clean production bundle with no TypeScript errors.
- [ ] `bun run test` runs both Vitest pools (workers + plain) and they all pass. (`bun run test`, not `bun test` — Bun's built-in test runner does not load Vitest config.)
- [ ] `wrangler deploy` deploys to Cloudflare; the landing page is live at `hnefatafl.hultberg.org` with valid SSL, OR at the `*.workers.dev` URL if SSL is still provisioning at end of phase (see Known Risks).
- [ ] `curl https://hnefatafl.hultberg.org/api/health` returns `200 OK` with `{"ok":true}` (substitute `*.workers.dev` URL if SSL still pending).
- [ ] D1 binding is callable from the Worker, verified by a `vitest-pool-workers` test that inserts a row into `_pipeline_check` and selects it back. Not a live API route — the binding is exercised in-test only.
- [ ] KV binding is callable, verified by a `vitest-pool-workers` test that round-trips a `put`/`get`. Not a live API route.
- [ ] GitHub Actions CI passes on the PR for Phase 1.
- [ ] Coverage thresholds waived for Phase 1 only — re-enforced from Phase 2 onward where there is meaningful code to cover. Vitest config carves out `vite.config.ts`, `wrangler.toml`-generated types, `main.tsx`, and `src/db/migrations/**` so the threshold flip in Phase 2 doesn't trip on platform glue.

---

## Technical approach

### Architecture decisions

**Single Worker, single deploy unit (SPA + API together)**
- Choice: One Worker that serves the SPA via static-asset binding AND handles `/api/*` routes via Hono.
- Rationale: Simpler operationally — one `wrangler deploy`, one DNS record, no CORS, no cross-origin auth cookie weirdness. The static-asset binding (`@cloudflare/workers-types` `Fetcher`) is purpose-built for this.
- Alternatives considered: Separate Cloudflare Pages for SPA + Worker for API. Rejected — adds CORS and origin coordination for no upside on a single-domain project.

**Hono as the Worker framework**
- Choice: Hono v4.x for routing and middleware on the Worker.
- Rationale: Lightweight, Cloudflare-friendly (excellent Workers runtime support), good TypeScript ergonomics, easy to test under `vitest-pool-workers`.
- Alternatives considered: Raw `fetch` handler with manual routing (too much boilerplate as the route set grows); itty-router (smaller but less type-safe); Worktop (less active).

**Drizzle ORM for D1, with `wrangler d1 migrations apply` as the deploy verb**
- Choice: Drizzle with the D1 driver. `drizzle-kit generate` emits SQL into wrangler's `migrations_dir`; `wrangler d1 migrations apply` runs them locally and remotely. Drizzle generates, Wrangler applies, same directory.
- Rationale: First-class D1 support, type-safe queries, and the two tools' file conventions don't collide when the dirs are unified. Drizzle's HTTP runner against remote D1 is the alternative but adds an API-token path that wrangler doesn't need.
- Alternatives considered: Raw SQL with prepared statements (loses type safety for very little payoff at this scale); Kysely (good, but Drizzle's migration story for D1 is more mature today); drizzle's HTTP runner instead of wrangler (extra credential path).

**`@cloudflare/vite-plugin` for local dev**
- Choice: Use the official Cloudflare Vite plugin to run the Worker + SPA in a single dev server.
- Rationale: Matches production semantics (D1 local SQLite, KV local store, fetch routing through the Worker). Removes the dev/prod parity gap that plain `vite dev` would create.
- Alternatives considered: Separate `vite dev` + `wrangler dev` (two processes, manual coordination, CORS in dev); `miniflare` directly (lower-level; the Vite plugin wraps it well).

**`@cloudflare/vitest-pool-workers` for Worker tests, plain Vitest for pure TypeScript**
- Choice: Two Vitest pools — one running tests inside `workerd` for code that needs Worker bindings, plain Node Vitest for pure-TS code (game engine, AI evaluator).
- Rationale: Pure TS tests are faster in Node. Worker tests need to be in `workerd` to get realistic D1/KV/Fetch behaviour. Vitest supports both pools cleanly.

### Technology choices

| Tool | Version | Purpose |
|------|---------|---------|
| Bun  | latest stable | Package manager, script runner |
| Vite | 6.x          | Frontend dev server + bundler. **Must be 6.x** — `@cloudflare/vite-plugin@1.36+` peer-dep is `^6.1.0 \|\| ^7.0.0 \|\| ^8.0.0`; Vite 5.x will fail `bun install`. |
| React | 18.x        | UI |
| TypeScript | latest 5.x | Type safety, strict mode |
| Tailwind CSS | 3.x      | Styling (matches prototype) |
| shadcn/ui | latest      | Component primitives (matches prototype) |
| Hono | 4.x           | Worker routing |
| Drizzle ORM | latest    | D1 access + migrations |
| drizzle-kit | latest    | Schema generation, migration files |
| Wrangler | latest        | Cloudflare CLI / deploy |
| `@cloudflare/vite-plugin` | latest | Dev integration |
| `@cloudflare/vitest-pool-workers` | latest | Worker-runtime tests |
| Vitest | latest          | Test runner |

Documentation links live in the README; not duplicated here.

### Key files and components

**New files to create:**
```
/
├── package.json
├── bun.lock
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── wrangler.toml
├── drizzle.config.ts
├── tailwind.config.js
├── postcss.config.js
├── components.json
├── index.html
├── .github/workflows/ci.yml
├── src/
│   ├── client/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── pages/PlaceholderPage.tsx
│   ├── worker/
│   │   ├── index.ts
│   │   ├── routes/health.ts
│   │   └── types.ts            // env binding types
│   ├── shared/                 // empty stub for now, used in Phase 2 onward
│   └── db/
│       ├── schema.ts           // single `_pipeline_check` table; Phase 4 replaces it
│       └── migrations/
│           └── 0000_pipeline_check.sql  // generated from schema.ts; one trivial real table
├── tests/
│   ├── worker/health.test.ts
│   ├── worker/fallthrough.test.ts
│   ├── worker/d1-binding.test.ts   // in-test insert + select on _pipeline_check
│   ├── worker/kv-binding.test.ts   // in-test put + get round-trip
│   └── shared/.gitkeep
└── README.md (updated from template)
```

**Files to modify:**
- `CLAUDE.md` (root) — replace template placeholders with real project name, stack, phase list, current phase.
- `SPECIFICATIONS/CLAUDE.md` — replace template guidance below the cut line with the real phase list.
- `REFERENCE/environment-setup.md` — replace Supabase/Readwise/Perplexity/Resend setup notes with Cloudflare resource setup notes.
- `.gitignore` — add `.dev.vars`, `.wrangler/`, `dist/`, `node_modules/`, etc.

### Database schema changes

One trivial table in Phase 1: `_pipeline_check (id INTEGER PRIMARY KEY, created_at TEXT)`. Its purpose is to give the migration pipeline real schema to flow through — `drizzle-kit generate` cannot emit an empty migration (no diff = no SQL), and a no-op migration doesn't exercise Drizzle type-gen or `wrangler d1 migrations apply` in a meaningful way. The table has no production use; Phase 4's first migration drops it and introduces the real schema.

---

## Testing strategy

### Unit tests

**Coverage targets:** waived for Phase 1 only — re-enforced from Phase 2 onward (95% lines/functions/statements, 90% branches) once there's meaningful code to cover. Carve-outs configured in `vitest.config.ts` so the Phase 2 threshold flip doesn't trip on platform glue: `vite.config.ts`, `main.tsx`, generated wrangler types, `src/db/migrations/**`.

**Key test files:**
- `tests/worker/health.test.ts` — `/api/health` returns 200 + correct JSON. Uses `vitest-pool-workers` with a mock environment.
- `tests/worker/fallthrough.test.ts` — non-API routes call the `ASSETS` binding; `/api/nonexistent` returns JSON 404.
- `tests/worker/d1-binding.test.ts` — inserts a row into `_pipeline_check`, selects it back, asserts equality. Exercises the binding through Drizzle.
- `tests/worker/kv-binding.test.ts` — `put`/`get` round-trips a value via the KV binding.

### Integration tests

**Test scenarios (covered by manual + CI):**
- [ ] `bun run dev` starts and serves the placeholder page locally.
- [ ] `bun run build` succeeds with no TS errors.
- [ ] `wrangler deploy` succeeds (manual run by Magnus).
- [ ] Deployed `/api/health` returns 200 from the live domain.
- [ ] Deployed root `/` returns the placeholder HTML.

### Manual testing checklist

- [ ] Visit `https://hnefatafl.hultberg.org` in a browser — placeholder page renders, fonts loaded, parchment background visible.
- [ ] Visit `https://hnefatafl.hultberg.org/api/health` — returns `{"ok":true}`.
- [ ] Visit a non-existent path like `/foo/bar` — placeholder page renders (SPA fallback per `assets.not_found_handling = "single-page-application"`).
- [ ] Visit `/api/nonexistent` — returns JSON 404, not HTML. `/api/*` is matched by Hono and never falls through to the asset binding.
- [ ] Mobile responsive — placeholder reads fine on a phone-sized viewport.
- [ ] SSL certificate is valid (browser shows no warnings).

---

## Pre-commit checklist

- [ ] `bun run test` passes
- [ ] `bun run typecheck` (or `tsc --noEmit`) passes
- [ ] `bun run test:coverage` meets thresholds
- [ ] Manual verification: visited the deployed URL, health route works
- [ ] Documentation updated:
  - [ ] Root `CLAUDE.md` reflects real stack
  - [ ] `SPECIFICATIONS/CLAUDE.md` reflects real phase list
  - [ ] `REFERENCE/environment-setup.md` documents Cloudflare resource setup
- [ ] No `console.log` left in production code
- [ ] No secrets committed; `.dev.vars` is gitignored; secrets stored via `wrangler secret put`
- [ ] `wrangler.toml` D1 and KV IDs are real (not placeholder strings)

---

## PR workflow

### Branch naming
`feature/phase-1-foundation`

### PR title
`Phase 1: Foundation`

### Review requirements
- Run `/review-pr` first — triage will likely route this to **team tier** because it touches CI, deploys, and infrastructure config.
- If `/review-pr` doesn't auto-escalate and you want the deeper review, run `/review-pr-team` directly. Phase 1 is high-leverage and a wrangler-config footgun is cheaper to catch in review than in production debugging.

### Deployment steps
1. Run `bunx drizzle-kit generate` if schema changed (Phase 1 only generates once, when the `_pipeline_check` table is first added).
2. Run `wrangler d1 migrations apply hnefatafl-prod --local` to apply to the local D1 first, verify it runs cleanly.
3. Run `wrangler d1 migrations apply hnefatafl-prod --remote` to apply to prod D1.
4. Run `wrangler deploy` to push the Worker.
5. Verify `https://hnefatafl.hultberg.org/api/health` returns 200. If SSL is still provisioning, verify via the `*.workers.dev` URL instead — the phase ships on whichever is reachable.
6. Smoke-test the placeholder page in a browser.

---

## Edge cases and considerations

### Known risks

- **Custom Domain SSL provisioning lag:** Cloudflare provisions SSL for Custom Domains automatically but it can take from a few minutes to a few hours, occasionally up to ~24. **Mitigation:** set the Custom Domain up at the *very start* of Phase 1 so it has time to provision while everything else is built. **Fallback:** if SSL hasn't provisioned by end of phase, mark the phase complete using the `*.workers.dev` URL for verification and switch the canonical URL once SSL resolves. The phase is not blocked on Cloudflare's clock.

- **`@cloudflare/vite-plugin` is relatively new:** the API has evolved. **Mitigation:** pin the version in `package.json`, document the version in `REFERENCE/environment-setup.md`. If the plugin proves unreliable, fall back to running `vite dev` and `wrangler dev` as two processes with a small dev-proxy — but try the plugin first.

- **Vitest pool config:** running two pools (workers + plain) is configured via `test.projects` in `vitest.config.ts` (Vitest 4 syntax; the older `vitest.workspace.ts` is deprecated). **Mitigation:** start from the example in the `@cloudflare/vitest-pool-workers` README and adapt. Document the final config in `REFERENCE/testing-strategy.md`. Coverage merging across pools is a known sharp edge — verify the merged report sums correctly before relying on it.

- **D1 local vs remote drift:** `wrangler d1 migrations apply` has separate `--local` and `--remote` flags. Easy to apply to local and forget remote (or vice versa). **Mitigation:** the deploy steps above always run `--local` then `--remote` in sequence. Document it in `environment-setup.md`.

- **Tooling integration matrix:** Bun + `@cloudflare/vite-plugin` + Wrangler + dual-Vitest-pool is a wide combination, none individually hard but the integration surface is unproven for this exact stack. **Mitigation:** budget timeline accordingly (already reflected in the 5–10 day first-time estimate). Document a Node-runner fallback path in `REFERENCE/troubleshooting.md` in case `bun run test` against `vitest-pool-workers` proves flaky.

### Performance considerations

- Worker cold-start is negligible for a Hono app; nothing to optimise yet.
- Static assets are served by Cloudflare's edge directly via the asset binding — no Worker invocation for SPA bundle requests.

### Security considerations

- No user data in this phase; no auth surface to harden yet.
- `.dev.vars` must be gitignored; Wrangler secrets must be used for anything sensitive (in this phase: nothing).
- CI workflow must not echo any environment variables.

### Accessibility considerations

- Placeholder page should pass basic Lighthouse a11y (proper heading hierarchy, sufficient colour contrast, alt text on any decorative element).

### Future optimisation opportunities

- Add automatic deploy from CI once the `main` branch is stable (Phase 1 keeps deploys manual to avoid early-CI flakiness).
- Add a staging environment (`hnefatafl-staging.hultberg.org`) once Phase 5 introduces secrets that need rotation testing.

---

## Technical debt introduced

None deliberately. Any tooling shortcuts taken (e.g. version pins, plugin choices) should be documented in `REFERENCE/environment-setup.md` rather than left undocumented.

---

## Related documentation

- [Root CLAUDE.md](../CLAUDE.md)
- [Master specification](./ORIGINAL_IDEA/project-outline.md)
- [Cloudflare-only stack ADR](../REFERENCE/decisions/2026-05-12-cloudflare-only-stack.md)
- [Email provider abstraction ADR](../REFERENCE/decisions/2026-05-12-email-provider-abstraction.md) (referenced but not implemented yet)
- [testing-strategy.md](../REFERENCE/testing-strategy.md)
- [environment-setup.md](../REFERENCE/environment-setup.md)

---

## Notes

This phase is deliberately thin on game logic. Resist the temptation to "just add the engine quickly" — Phase 1's goal is to prove the platform works end-to-end with zero game complexity in the picture. Anything that goes wrong in Phase 1 (Custom Domain config, Wrangler bindings, CI setup, migration pipeline) is much easier to debug without 4000 lines of game code on top of it.
