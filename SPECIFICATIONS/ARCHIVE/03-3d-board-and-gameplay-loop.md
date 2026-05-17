# Phase 3: 3D board + gameplay loop

## Phase overview

**Phase number:** 3
**Phase name:** 3D board + gameplay loop (v0.1 ships at the end of this phase)
**Estimated timeframe:** 7–10 days
**Dependencies:** Phase 1 (scaffolding), Phase 2 (engine + AI).

**Brief description:**
Wire the engine + AI from Phase 2 into a playable web UI. Build the menu page, rules page, and game page, render the 3D board with `@react-three/fiber`, animate moves and captures, and connect the AI turn loop. At the end of this phase, **v0.1 is shippable**: a complete, anonymous, single-player Hnefatafl game runs at `hnefatafl.hultberg.org`. No accounts, no leaderboard, no persistence beyond a KV-backed anonymous-games counter (the D1-persisted version lands in Phase 4).

Source of truth: [`ClaudeShipSource/spec-architecture.md`](./ORIGINAL_IDEA/ClaudeShipSource/spec-architecture.md), [`spec-frontend-pages.md`](./ORIGINAL_IDEA/ClaudeShipSource/spec-frontend-pages.md), [`spec-frontend-3d.md`](./ORIGINAL_IDEA/ClaudeShipSource/spec-frontend-3d.md), [`spec-frontend-hooks.md`](./ORIGINAL_IDEA/ClaudeShipSource/spec-frontend-hooks.md).

---

## Scope and deliverables

### In scope

**App shell:**
- [ ] State-machine SPA router (`AppView` type, no react-router) ported from the prototype. Views relevant to v0.1: `menu`, `game`, `rules`, `privacy`. (Other views — leaderboard, profile, sign-in, admin, contact — render placeholder "coming soon" panels for v0.1.)
- [ ] Parchment palette applied across the app (matches prototype Tailwind config + custom CSS variables).
- [ ] Cinzel + Cormorant Garamond fonts wired up.

**Menu page:**
- [ ] Title, subtitle, "Play" button, difficulty selector (Thrall/Karl/Jarl), side selector (defender/attacker — prototype calls this "Choose your side").
- [ ] Anonymous-games counter at the bottom — KV-backed via `/api/stats/anonymous-games`. Persists across page loads; gives v0.1 an honest visible signal that real users are playing.
- [ ] Links to Rules, Privacy.

**Game page:**
- [ ] 3D board rendered by `Board3D` component (port `Board3D.tsx` from prototype, ~874 lines).
- [ ] Ornate piece style (`OrnatePiece` from prototype, lathe-geometry, ~290 lines). Textured style is **deferred to Phase 7** — for v0.1 we ship ornate-only.
- [ ] Camera positioned at `[0, 12, ±10]` flipped by side.
- [ ] Click-to-select piece, click-to-move (only legal moves highlighted). Cancel selection by clicking elsewhere.
- [ ] AI turn loop: the player's move animates (700ms slide), then the AI thinks (300/500/800ms simulated delay by difficulty, added in the React hook, not in the AI module), then the AI's move animates. Total per-turn pause: ~1000/1200/1500ms.
- [ ] Move animation: 700ms slide.
- [ ] Capture animation: three-phase (pop / topple / sink-and-fade).
- [ ] Game status panel (whose turn, captured pieces count, move count, elapsed time).
- [ ] Game-over dialog when win condition met. Shows winner, duration (wall-clock seconds from `gameState.startTime` to end), and move count. "New game" returns to menu.

**Rules page:**
- [ ] Static page describing Copenhagen ruleset, board, pieces, movement, captures, win conditions. Port text from the prototype's `RulesPage.tsx`.

**Privacy page:**
- [ ] Static page. For v0.1, copy the prototype's text but with a note that accounts/data are not yet in play — adjust again in v0.2.

**Hooks:**
- [ ] `useGame` hook: holds `GameState` (engine state) alongside `UIState` (`{ selectedPiece: Piece | null; validMoves: Position[]; lastMove: Move | null }`) as separate React state slices. Exposes `selectPiece`, `move`, `newGame`. Dispatches AI turn automatically when `currentTurn === aiSide`. Handles AI think delay (300/500/800ms by difficulty) and animation timing.
- [ ] `usePieceStyle` hook: reads `localStorage` key `hnefatafl-piece-style`, defaults to `ornate`. For v0.1 only `ornate` is valid; `textured` is rejected with a fallback to ornate.

**Worker side:**
- [ ] `/api/stats/anonymous-games` endpoint:
  - [ ] `GET` returns `{count: number}` from KV.
  - [ ] `POST` increments the counter by 1. Rate-limited per IP (see "Edge cases" below).
- [ ] Worker integration test for both endpoints.

**Tests:**
- [ ] Unit tests for hooks (`useGame`, `usePieceStyle`).
- [ ] Integration tests for game flow: pick side+difficulty → play to a known endgame → assert game-over dialog appears with correct outcome.
- [ ] Worker tests for the anonymous-games endpoint, including the rate limiter.
- [ ] 3D component tests stay light (rendering 3D under jsdom is painful) — visual regression deferred; manual checklist used instead.

### Out of scope
- Textured piece style — Phase 7.
- Accounts, leaderboard, profile, admin, contact — placeholder views only.
- Persisted per-user game results — Phase 4.
- `PlayerIdentity.tsx` from the prototype — Supabase-dependent; replaced by an inline "Wanderer" label for v0.1.
- Sound effects.
- Multiplayer.
- Save/load mid-game.

### Acceptance criteria
- [ ] You can land on `hnefatafl.hultberg.org`, click Play, pick Thrall + defender, play a full game, win or lose, see the game-over dialog, click "New game", play again.
- [ ] All three AI difficulties (Thrall, Karl, Jarl) playable and feel distinct.
- [ ] Both sides (defender, attacker) playable.
- [ ] Capture animations look correct (three-phase pop/topple/sink).
- [ ] Move animations are 700ms and feel smooth at 60fps on a typical laptop.
- [ ] No console errors during a complete game.
- [ ] Anonymous-games counter increments after each game completes and persists across page reloads.
- [ ] Rules page renders with correct content.
- [ ] Mobile playable: on a 375×667 viewport, the full board is visible, tap-to-select and tap-to-move work, and the status panel stacks below the board. Camera zoom may need adjustment from the prototype defaults.
- [ ] All Phase 3 tests pass; coverage ≥95% on `src/client/hooks/**` and `src/client/state/**` (3D component coverage is lower by necessity).

---

## Technical approach

### Architecture decisions

**Port `Board3D` largely verbatim, then prune**
- Choice: Bring `Board3D.tsx`, `OrnatePiece.tsx`, `GameStatus.tsx`, and `GameOverDialog.tsx` over from the prototype as a starting point. Adjust import paths and props to consume `UIState` (see below) alongside `GameState`. Delete textured-piece code paths (deferred to Phase 7). `PlayerIdentity.tsx` is **not ported** — it is Supabase-dependent; replace with an inline "Wanderer" label. Phase 5 wires up real identity.
- Rationale: The 3D code is well-tuned and reproducing it from scratch risks subtle regressions (camera angles, lighting, piece geometry). Port-then-prune is faster and more faithful.
- Alternatives considered: Rewriting from scratch with cleaner abstractions. Rejected — not enough upside, real downside risk.

**UI state vs engine state**
- The Phase 2 engine is pure — `selectedPiece`, `validMoves`, and `lastMove` do not live in `GameState`. These are presentation concerns owned by the React layer.
- `useGame` manages two state slices: `gameState: GameState` (engine, updated immutably via `makeMove`) and `uiState: UIState` where `UIState = { selectedPiece: Piece | null; validMoves: Position[]; lastMove: Move | null }`.
- `selectPiece(piece)` calls `getValidMoves` and writes to `uiState`. `move(from, to)` calls `makeMove`, updates `gameState`, and resets `uiState`.
- `Board3D` receives both slices as props: reads `uiState` for highlight overlays and `gameState` for piece positions and turn state.
- **`useGame` is a rewrite**, not a port — the prototype's hook calls functions that no longer exist in the engine. Use the prototype as a behavioural reference, not a copy-paste source.
- **Interaction contract:** clicking an empty square deselects; clicking the selected piece again deselects; clicking a different friendly piece selects it instead (replacing the previous selection); clicking an enemy piece while a piece is selected does nothing (not a valid move target, does not cancel selection).

**State-machine router, not react-router**
- Choice: Single `AppView` union type with `useState`; navigation by setState.
- Rationale: Matches the prototype. The app has very few views and they're not deep-linkable in v0.1 (no `/leaderboard/123` style URLs needed yet). A library would be overkill.
- Alternatives considered: react-router-dom (overkill for v0.1). May revisit in v1.0 if we want shareable URLs for leaderboard/profile pages.

**AI think delay belongs to the hook, not the AI module**
- Choice: `getAIMove` in `src/shared/game/ai.ts` returns instantly. The 300/500/800ms simulated thinking pause is added in `useGame` via `setTimeout`. Total per-turn pause (including the 700ms move animation) is ~1000/1200/1500ms.
- Rationale: Keeps the AI module pure (Phase 2 acceptance criterion). UX timing is a presentation concern. Also future-proofs server-side AI invocation — if we ever validate a game replay server-side, we don't want fake delays in the loop.
- **AI opening move:** when the player picks the defender side, the AI plays attackers and moves first (attackers always go first in Copenhagen hnefatafl). `useGame` dispatches an AI turn in a `useEffect` triggered on mount whenever `gameState.currentTurn === aiSide`. No special-case handling needed — the same dispatch path fires for the opening move and every subsequent AI turn.

**KV for the anonymous-games counter, with per-IP rate limit**
- Choice: Use KV with a single counter key. Rate-limit the `POST /api/stats/anonymous-games` endpoint to 10 increments per IP per hour, also in KV (TTL'd keys).
- Rationale: Avoids someone spamming the counter from a bot. 10/hour is generous for legitimate play (a real game takes minutes); anything beyond that is abuse.
- Alternatives considered: D1 row with a counter (heavier than KV, no real benefit). Atomically incrementing via Durable Object (overkill at this scale; KV read-then-write is fine — eventual consistency on a vanity counter is acceptable).

### Technology choices

| Tool | Purpose |
|------|---------|
| `@react-three/fiber` | 3D rendering |
| `@react-three/drei` | helpers (`OrbitControls`, `Plane`, etc.) |
| `three` | underlying 3D library |
| `@radix-ui/react-dialog` (via shadcn) | game-over dialog |

No new framework decisions; everything is consistent with Phase 1's stack.

### Key files and components

**New files to create:**
```
src/client/
├── App.tsx                       // state-machine router
├── state/
│   └── appView.ts                // AppView type + helpers
├── pages/
│   ├── MenuPage.tsx
│   ├── GamePage.tsx
│   ├── RulesPage.tsx
│   ├── PrivacyPage.tsx
│   └── PlaceholderPage.tsx       // for not-yet-built views
├── components/
│   ├── game/
│   │   ├── Board3D.tsx           // ported from prototype, ornate-only
│   │   ├── OrnatePiece.tsx       // ported verbatim
│   │   ├── GameStatus.tsx        // ported
│   │   ├── GameOverDialog.tsx    // ported
│   │   └── WandererLabel.tsx     // inline "Wanderer" stub — PlayerIdentity.tsx not ported (Supabase-dependent, Phase 5)
├── hooks/
│   ├── useGame.ts                // rewritten (prototype is behavioural reference); manages GameState + UIState
│   ├── useGame.test.ts
│   ├── usePieceStyle.ts          // simplified for v0.1 (ornate only)
│   └── usePieceStyle.test.ts
├── lib/
│   └── api.ts                    // small typed fetch wrapper for /api/* calls

src/worker/routes/
├── stats.ts                      // /api/stats/anonymous-games
└── stats.test.ts
```

**Files to modify:**
- `src/client/App.tsx` (created in Phase 1 as placeholder) — replace with state-machine router.
- `src/worker/index.ts` — register stats routes.
- `src/db/schema.ts` — still empty (no schema in Phase 3).

### Database schema changes
None. KV holds the counter and rate-limit buckets.

---

## Testing strategy

### Unit tests

**Coverage targets:** ≥95% lines/functions/statements on hooks and pure-logic modules. 3D components have lower coverage by nature; that's accepted.

**Key test files:**
- `useGame.test.ts` — selects pieces, executes moves, AI takes its turn after delay, game-over detection.
- `usePieceStyle.test.ts` — reads localStorage, defaults to ornate, rejects invalid values.
- `stats.test.ts` — GET returns counter, POST increments, POST rate-limited after 10 calls from the same IP, POST from a different IP is unaffected.
- `appView.test.ts` — view transitions are valid.

### Integration tests

- [ ] Playwright/headless test: load menu → click Play → pick Thrall + defender → play moves until king reaches corner → game-over dialog shows. **Optional for v0.1** — if Playwright adds too much CI overhead, defer to manual checklist.
- [ ] Worker integration: `POST /api/stats/anonymous-games` 11 times from the same IP, assert the 11th is rate-limited (429).

### Manual testing checklist

- [ ] Full game against Thrall as defender — wins occur, dialog correct.
- [ ] Full game against Karl as attacker — wins occur, dialog correct.
- [ ] Full game against Jarl as defender — wins occur, dialog correct.
- [ ] Camera angle flips correctly when switching sides.
- [ ] Capture animation plays for every capture type (custodial, shield wall).
- [ ] Game-over dialog shows correct winner / duration / move count.
- [ ] Anonymous-games counter increments after game completion and persists across reloads.
- [ ] Mobile viewport (375×667): board still readable, controls reachable.
- [ ] Tablet viewport (768×1024): board scales appropriately.
- [ ] Desktop (1440×900): default experience, no layout issues.
- [ ] Rules page renders all sections.
- [ ] No 3D rendering glitches (z-fighting, missing pieces, etc.).
- [ ] No console errors or warnings.

---

## Pre-commit checklist

- [ ] All Phase 3 tests passing
- [ ] Coverage thresholds met (≥95% on hooks + pure logic, branches ≥90% project-wide)
- [ ] Manual checklist completed at least once before opening the PR
- [ ] Type checking passes
- [ ] No `console.log` left in client code
- [ ] No `debugger` statements
- [ ] Lighthouse a11y score ≥90 on menu, rules, privacy; ≥80 on the game page (TD-002 makes ≥90 unachievable without keyboard nav)
- [ ] Bundle size sane (under ~800KB gzip is the rough target; react-three-fiber pushes us up)
- [ ] No dependency on the prototype's `supabase` package — confirm it's not in `package.json`

---

## PR workflow

### Branch naming
`feature/phase-3-3d-and-gameplay`

### PR title
`Phase 3: 3D board + gameplay loop (v0.1)`

### Review requirements
- Run `/review-pr`. This phase is large but mostly contained to client + a small KV endpoint. Triage may land on **standard** or **team** — fine either way.
- Worth specifically asking the reviewer to look at: (a) the AI turn-loop timing in `useGame`, (b) the rate-limit logic in `stats.ts`, (c) any leftover Supabase imports from the verbatim port.

### Deployment steps
1. `wrangler deploy`.
2. Smoke-test menu → play → game-over dialog on production.
3. Smoke-test the anonymous-games counter increments.
4. Tag the deploy as `v0.1.0` once smoke tests pass.
5. Tell Magnus he can play.

---

## Edge cases and considerations

### Known risks

- **Rate-limit on anonymous counter:** without it, anyone can run `while true; do curl -X POST .../anonymous-games; done` and inflate the counter. **Mitigation:** documented above; KV-backed per-IP bucket, 10/hour. Failure mode if the bucket itself fails: increment is silently rejected (no harm). Surface a clear error in the worker test so this doesn't quietly break.

- **3D performance on low-end devices:** `@react-three/fiber` is fine on modern hardware but can chug on older phones. **Mitigation:** test on the lowest-spec phone Magnus has access to; if it's bad, reduce shadow/AA quality on mobile breakpoints.

- **Verbatim port carries Supabase imports:** the prototype's `useGame`/`useAuth` may reference `supabase`. **Mitigation:** delete or stub those imports during the port; CI will flag any leftover via type-check.

- **AI think-delay race condition:** if the user clicks "New game" mid-AI-turn, the AI's `setTimeout` might fire and try to apply a move to a fresh board. **Mitigation:** use an abort signal / mounted ref in `useGame`; tests should cover "interrupt mid-AI-turn".

- **`window.localStorage` access in SSR-style code:** even though we're not SSR, the test environment may need a polyfill. **Mitigation:** jsdom provides one out of the box; if not, mock in test setup.

### Performance considerations

- AI runs on the main thread; Karl/Jarl can hit ~80ms which is visible as a frame stutter. **Mitigation:** the simulated think-delay (300/500/800ms, plus the 700ms move animation) covers this; the AI call is wrapped in a `setTimeout` so the browser breathes first.
- Capture animations should use `useFrame` from r3f, not React state updates per frame.

### Security considerations

- The anonymous-games counter is publicly writable (POST endpoint). Rate-limited per IP. Worst-case abuse: counter inflates faster than it should — visible nuisance, not a security incident.
- No authentication surface in this phase.

### Accessibility considerations

- 3D board is inherently visual. Provide a textual game status alongside the 3D rendering (whose turn, last move, captures) — already in the prototype.
- Keyboard support for piece movement is **out of scope for v0.1** — note as TD-002 below.
- All buttons (menu, dialog) keyboard-accessible.
- Colour contrast on parchment palette: confirm Cinzel text on parchment background meets WCAG AA.

### Future optimisation opportunities

- Move AI to a Web Worker so it doesn't block the main thread — would let us drop the simulated think delay and have the AI actually feel like it's thinking.
- Replace the simulated delay with real progress feedback ("Jarl is considering 12 moves…").
- Visual regression testing once the 3D output stabilises.

---

## Technical debt introduced

**TD-002: No keyboard navigation on the 3D board**
- **Location:** `src/client/components/game/Board3D.tsx`
- **Issue:** Piece selection and movement are mouse/touch only.
- **Why accepted:** Faithful port; the prototype has the same limitation. Building a fully keyboard-accessible 3D chess-like board is a project in itself.
- **Risk:** Medium for accessibility, low for project completion.
- **Future fix:** Post-v1.0 — overlay a 2D grid with keyboard focus management, mirroring the 3D state.

**TD-003: AI runs on main thread**
- **Location:** `src/client/hooks/useGame.ts`
- **Issue:** Karl/Jarl can stall a frame; masked by the simulated think delay.
- **Why accepted:** Web Worker integration is non-trivial and v0.1 is shippable without it.
- **Risk:** Low. Visible as occasional jank on low-end devices.
- **Future fix:** Wrap the AI module in a Web Worker; remove the simulated delay or shorten it.

See [technical-debt.md](../REFERENCE/technical-debt.md).

---

## Related documentation

- [Phase 1 — Foundation](./01-foundation.md)
- [Phase 2 — Game engine + AI](./02-game-engine-and-ai.md)
- [Master specification](./ORIGINAL_IDEA/project-outline.md)
- [Prototype architecture spec](./ORIGINAL_IDEA/ClaudeShipSource/spec-architecture.md)
- [Prototype frontend pages spec](./ORIGINAL_IDEA/ClaudeShipSource/spec-frontend-pages.md)
- [Prototype 3D spec](./ORIGINAL_IDEA/ClaudeShipSource/spec-frontend-3d.md)
- [Prototype hooks spec](./ORIGINAL_IDEA/ClaudeShipSource/spec-frontend-hooks.md)

---

## Notes

This phase ends with v0.1 shippable. After deploying, **tag the release `v0.1.0`** and pause for Magnus to actually play it for a few days before starting Phase 4. Feedback from those playthroughs will sharpen the Phase 4 scope (what stats matter? what was annoying? what should v0.2 prioritise?).

Resist scope creep here. Things like "while we're at it, let's add sound effects" or "let's get textured pieces in too" should be politely declined — those are out of scope and will block v0.1 shipping. The whole point of the milestone split is that v0.1 stays small.
