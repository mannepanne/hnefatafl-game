# Technical Debt Tracker

**When to read this:** Planning refactors, reviewing known issues, or documenting accepted shortcuts.

**Related Documents:**
- [CLAUDE.md](./../CLAUDE.md) - Project navigation index
- [testing-strategy.md](./testing-strategy.md) - Testing strategy
- [troubleshooting.md](./troubleshooting.md) - Common issues and solutions

---

Tracks known limitations, shortcuts, and deferred improvements in the codebase.
Items here are accepted risks or pragmatic choices made during development, not bugs.

---

## Active technical debt

### TD-001: No `environment: production` on deploy job
- **Location:** `.github/workflows/ci.yml` — `deploy` job
- **Issue:** Deploy job has no `environment: production` declaration. Missing: GitHub deployment history UI, optional required-reviewer gate, environment-scoped secrets.
- **Why accepted:** No real user data in Phase 1. Required-reviewer gate is irrelevant for a solo maintainer. Benefit materialises when accounts + magic-link tokens land.
- **Risk:** Low — no concrete attack vector or user impact in Phase 1.
- **Future fix:** Add `environment: production` to the deploy job before v0.2 ships (Phase 5).
- **Phase introduced:** Phase 1 (CD setup)

### TD-002: No staging environment
- **Location:** `.github/workflows/ci.yml`
- **Issue:** Every merge to `main` deploys straight to production at `hnefatafl.hultberg.org`. No staging or preview deploys for PRs.
- **Why accepted:** Phase 1 is anonymous-only with no real users. Blast radius near-zero.
- **Risk:** Low now; Medium before v0.2 ships (broken deploy = real users can't sign in).
- **Future fix:** Add a `staging` branch + `*.workers.dev` preview deploy before v0.2 ships.
- **Phase introduced:** Phase 1 (CD setup)

### TD-003: `workflow_dispatch` not enabled
- **Location:** `.github/workflows/ci.yml`
- **Issue:** No "Run workflow" button in GitHub Actions UI. Manual redeploy requires an empty commit (`git commit --allow-empty`) or `bunx wrangler rollback`.
- **Why accepted:** Workarounds are fast; adding `workflow_dispatch` speculatively means designing for a use case that hasn't happened yet (YAGNI).
- **Risk:** Low — workarounds are documented in `environment-setup.md`.
- **Future fix:** Add `workflow_dispatch:` under `on:` when the need arises.
- **Phase introduced:** Phase 1 (CD setup)

### TD-004: No alpha-beta pruning in minimax
- **Location:** `src/shared/game/ai.ts` — `minimax()`
- **Issue:** Minimax uses a fixed-width beam search (top-N move selection per ply) instead of alpha-beta pruning. Deeper search would significantly improve the Jarl difficulty without increasing tree size.
- **Why accepted:** The current beam search produces acceptable Jarl-level play within the 250 ms budget. Alpha-beta is a separate, non-trivial addition; doing it speculatively risks introducing search bugs before the AI quality baseline is validated.
- **Risk:** Low — affects AI strength ceiling only, not correctness. Current difficulty levels meet the spec's targets.
- **Future fix:** Add alpha-beta as an opt-in parameter to `minimax()` for a stronger difficulty tier (e.g. Konungr) post-v1.0.
- **Phase introduced:** Phase 2 (game engine + AI)

### TD-006: Anonymous games counter is vulnerable to inflation and not trustworthy as a metric
- **Location:** `src/worker/routes/stats.ts` — POST `/api/stats/anonymous-games`
- **Issue:** Two concurrent POSTs from one IP can both pass the rate-limit check before either increments the counter (KV read-modify-write with no atomicity). Additionally, KV is eventually consistent (~60 s cross-region), so an attacker hitting from multiple Cloudflare PoPs can bypass the per-IP cap. The counter is also trivially inflated by proxy pools, as there is no per-session deduplication. The correct fix is a Durable Object for atomic increments, but that adds complexity and cost.
- **Why accepted:** The only consequence is counter inflation — no auth bypass, no data exfiltration. The counter is a vanity stat, not a billing or eligibility signal. A Durable Object is disproportionate for a Free-plan single-player game.
- **Risk:** Low — impact is a meaningless number being wrong.
- **Future fix:** Replace with a Durable Object counter if the stat is ever surfaced as a credibility signal (marketing copy, leaderboard seed, etc.). Until then, do not cite the counter in external communications.
- **Phase introduced:** Phase 3 (3D board and gameplay loop)

### TD-007: No browser history sync in SPA router
- **Location:** `src/client/App.tsx` — `getInitialView()`, `App()`
- **Issue:** `getInitialView()` reads `window.location.pathname` once on mount; view transitions call `setView()` with no `pushState`. Browser back/forward won't navigate between views, and the URL stays `/privacy` after returning to menu.
- **Why accepted:** Spec explicitly rules out `react-router` for v0.1, and the only real views are not deep-linkable by design. The `/privacy` deep link works on initial load, which is sufficient for the cookie consent use-case.
- **Risk:** Low — cosmetic UX limitation; no data loss, no broken functionality.
- **Future fix:** Add `pushState` calls in the view-transition handlers and a `popstate` listener in `App`. Required before leaderboard/profile URLs become shareable in v1.0.
- **Phase introduced:** Phase 3 (3D board and gameplay loop)

### TD-008: No keyboard navigation on the 3D board
- **Location:** `src/client/components/game/Board3D.tsx`
- **Issue:** The board is fully mouse/touch-driven. There is no keyboard interface for selecting pieces or moving them, so users who cannot use a pointer device cannot play.
- **Why accepted:** Phase 3 focus is a working 3D board for the happy path. Keyboard nav on a 3D canvas is non-trivial (requires focus management, virtual cursor, and R3F accessibility hooks). No accessibility requirement for v0.1.
- **Risk:** Low — solo-maintainer, no stated accessibility requirement for launch.
- **Future fix:** Add a keyboard overlay or accessible board view (likely a companion 2D grid rendered in the DOM) before any public marketing that would attract a broader audience.
- **Phase introduced:** Phase 3 (3D board and gameplay loop)

### TD-009: AI runs on the main thread
- **Location:** `src/client/hooks/useGame.ts` — AI `setTimeout` callback
- **Issue:** `getAIMove()` runs synchronously on the main thread inside a `setTimeout`. On Jarl difficulty with the full beam-search tree, this can block the UI thread for ~200–250ms, causing a visible jank frame before the AI move is applied.
- **Why accepted:** A Web Worker would require serialising and deserialising the full game state on every turn, adding complexity disproportionate to the current beam-search depth. The 250ms budget is met for all three difficulty levels on modern hardware.
- **Risk:** Low — visible only at Jarl on slower devices; no correctness impact.
- **Future fix:** Move `getAIMove()` to a Web Worker (using `comlink` or Cloudflare's `useWorker` pattern) before adding harder difficulty tiers that push past the 250ms threshold.
- **Phase introduced:** Phase 3 (3D board and gameplay loop)

### TD-010: No CSRF / Origin check on POST endpoints

- **Location:** `src/worker/routes/stats.ts` — POST `/api/stats/anonymous-games`
- **Issue:** POST endpoints have no Origin/Referer check. For v0.1's anonymous vanity counter the risk is low (no auth token or user data at stake). However, the same absence will be a critical gap on Phase 5 magic-link token endpoints where a CSRF-forged POST could trigger unwanted token delivery.
- **Why accepted:** CSRF protection is disproportionate for an unauthenticated, low-value counter. The correct fix is a shared Origin-check middleware applied to all state-mutating endpoints, designed once alongside Phase 5 auth work rather than retrofitted piecemeal now.
- **Risk:** Low for Phase 3; High before Phase 5 ships.
- **Future fix:** Implement Origin/Referer check middleware before Phase 5 ships. Apply to all POST endpoints that handle auth tokens or account mutations.
- **Phase introduced:** Phase 3 (3D board and gameplay loop)

### TD-005: Replay-regression test suite is opt-in, not gating
- **Location:** `tests/shared/game/replay-regression.test.ts`
- **Issue:** The replay-regression suite runs only when `RUN_REPLAY=1` is set. A breaking engine change could pass CI without triggering the replay suite.
- **Why accepted:** The move sequence is not yet stable — Phase 3 and later phases may legitimately change AI output. Promoting to gating now would require updating golden files after every AI tweak, creating friction without value until the game ships.
- **Risk:** Low — the reference-positions suite (`reference-positions.test.ts`) covers all capture and win-condition rules. Replay-regression adds breadth, not depth.
- **Future fix:** Promote to gating once the game ships (v0.1) and the move sequence is stable. Update CI to run with `RUN_REPLAY=1`.
- **Phase introduced:** Phase 2 (game engine + AI)

---

### Example Format: TD-001: Description
- **Location:** `src/path/to/file.ts` - `functionName()`
- **Issue:** Clear description of the limitation or shortcut
- **Why accepted:** Reason for accepting this debt (e.g., runtime constraints, time pressure, lack of alternative)
- **Risk:** Low/Medium/High - Impact assessment
- **Future fix:** Proposed solution when time/resources allow
- **Phase introduced:** Phase number when this was added

---

## Resolved items

*(Move items here when addressed, with resolution notes)*

---

## Notes

- Items are prefixed TD-NNN for easy reference in code comments and PR reviews
- When adding new debt, include: location, issue description, why accepted, risk level, and proposed future fix
- Review this list at the start of each development phase to see if any items should be addressed
- Low-risk items can remain indefinitely; High-risk items should be addressed within 2-3 phases
