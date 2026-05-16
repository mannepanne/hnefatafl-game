# Phase 2: Game engine + AI

## Phase overview

**Phase number:** 2
**Phase name:** Game engine + AI (pure TypeScript, no UI, no Worker — just logic + tests)
**Estimated timeframe:** 3–4 days
**Dependencies:** Phase 1 complete (project scaffolding, test infrastructure).

**Brief description:**
Port the prototype's game engine and AI to `src/shared/game/` as **pure TypeScript** — no React, no DOM, no Worker bindings, no I/O. The engine and AI are fully deterministic given a seed (where applicable) and exhaustively covered by Vitest.

**Implementation strategy: Mode A (copy-then-adapt with tests-first).**
The prototype's `src/lib/game/{engine,ai,constants}.ts` is the *implementation* source of truth and gets lifted into `src/shared/game/` with targeted edits (see [§ Lift plan](#lift-plan)). The prototype's [`spec-game-engine.md`](./ORIGINAL_IDEA/ClaudeShipSource/spec-game-engine.md) and [`spec-ai.md`](./ORIGINAL_IDEA/ClaudeShipSource/spec-ai.md) are the *behavioural* source of truth — they pin down captures, win conditions, scoring weights, and search shape, and we treat them as canonical wherever this spec is silent.

**Tests are written first**, against the prototype specs and the prototype source, *before* the lift. Concretely: stub `src/shared/game/` exports with `throw new Error('not implemented')`, write the failing test suite, then lift the prototype code (with the impurity fixes from [§ Lift plan](#lift-plan)) until the suite goes green. This keeps us honest about what "faithful" means and gives us a regression net for every later adjustment.

---

## Scope and deliverables

### In scope

#### Types (`src/shared/game/types.ts`)

The canonical types match the prototype 1:1 — see [`src/types/game.ts`](./ORIGINAL_IDEA/ClaudeShipSource/src/types/game.ts) and [`spec-game-engine.md`](./ORIGINAL_IDEA/ClaudeShipSource/spec-game-engine.md#core-types-srctypesgamets):

```ts
type PieceType = 'king' | 'defender' | 'attacker'
type Side = 'defenders' | 'attackers'
type Difficulty = 'thrall' | 'karl' | 'jarl'

type WinReason =
  | { kind: 'king-captured' }
  | { kind: 'king-escaped' }
  | { kind: 'no-legal-moves'; stuckSide: Side }
  | { kind: 'attackers-insufficient' }

interface Position { row: number; col: number }
interface Piece { type: PieceType; side: Side; position: Position; id: string }
interface Move { from: Position; to: Position; pieceId: string }

interface GameState {
  board: (Piece | null)[][]       // 11×11 grid, row-major
  pieces: Piece[]
  currentTurn: Side
  moveHistory: Move[]
  capturedByAttackers: Piece[]
  capturedByDefenders: Piece[]
  gameOver: boolean
  winner: Side | null
  winReason: WinReason | null
  moveCount: number
  startTime: number               // ms epoch at game start; supplied by caller (see § Lift plan)
}
```

**Deliberate departures from the prototype's `GameState`:**
- `selectedPiece` and `validMoves` are **dropped** from the engine type. They are UI concerns and belong in the React layer (Phase 3). The engine never reads or writes them.

#### Constants (`src/shared/game/constants.ts`)

- `BOARD_SIZE = 11`
- Throne: `{ row: 5, col: 5 }`
- Corners: `{0,0}`, `{0,10}`, `{10,0}`, `{10,10}`
- Initial layout: 1 king + 12 defenders + 24 attackers, exactly as [`spec-game-engine.md § Board Setup`](./ORIGINAL_IDEA/ClaudeShipSource/spec-game-engine.md#board-setup-constantsts) describes.
- `MAX_MOVES = 500` — a hard cap to terminate self-play and pathological games as a draw (see [§ Draw on move limit](#draw-on-move-limit)).

#### Engine (`src/shared/game/engine.ts`)

Lifted from prototype [`engine.ts`](./ORIGINAL_IDEA/ClaudeShipSource/src/lib/game/engine.ts). Public surface:

- `createInitialState(opts?: { now?: () => number; idCounter?: { next(): string } }): GameState` — fresh state with all 37 pieces, attackers to move first.
- `getValidMoves(state, piece): Position[]` — rook-style sliding; throne is passable but not stoppable for non-kings; corners are entirely blocked for non-kings.
- `getAllMovesForSide(board, side): { piece: Piece; moves: Position[] }[]` — what the AI iterates.
- `makeMove(state, from, to): GameState` — pure transition, applies capture-processing-order (custodial → shield wall → dedupe → remove), updates `capturedBy*`, increments `moveCount`, toggles `currentTurn`, checks win conditions, returns new state.
- `checkWinCondition(state): WinReason | null` — returns the full discriminated union, not a side string. Order of check (matches prototype): king-escaped → attackers-insufficient → king-captured → no-legal-moves.
- Helpers exported for tests + AI: `isThrone`, `isCorner`, `isHostileSquare`, `findKing`, `getPieceAt`.

#### AI (`src/shared/game/ai.ts`)

Lifted from prototype [`ai.ts`](./ORIGINAL_IDEA/ClaudeShipSource/src/lib/game/ai.ts). Public surface:

- `evaluateBoard(state, forSide): number` — full evaluator. Weights per [`spec-ai.md § Full Evaluation`](./ORIGINAL_IDEA/ClaudeShipSource/spec-ai.md#full-evaluation-evaluateboard).
- `evaluateBoardFast(state, forSide): number` — fast evaluator used for per-ply pre-filtering. Omits the four lists called out in [`spec-ai.md § Fast Evaluation`](./ORIGINAL_IDEA/ClaudeShipSource/spec-ai.md#fast-evaluation-evaluateboardfast).
- `searchFromRoot(state, side, opts): Move | null` — minimax with per-ply widths and final jitter; no alpha-beta. Signature: `searchFromRoot(state, side, { widths: number[]; jitter: number; rng?: () => number })`.
- `minimax(state, widths, ply, toMove, aiSide, rng): number` — internal helper, exported for testing.
- `getThrallMove(state, side, rng): Move | null` — **scoring formula verbatim** from [`spec-ai.md § Thrall`](./ORIGINAL_IDEA/ClaudeShipSource/spec-ai.md#thrall-beginner): base `rng() * 100`, `+200` if the move captures anything, `±10_000` for immediate win/loss, then pick uniformly at random from the top 5.
- `getKarlMove(state, side, rng): Move | null` — `searchFromRoot(state, side, { widths: [15, 6], jitter: 15, rng })`. No artificial think delay.
- `getJarlMove(state, side, rng): Move | null` — `searchFromRoot(state, side, { widths: [12, 6, 4], jitter: 2, rng })`.
- `getAIMove(state, difficulty, side, rng?): Move | null` — dispatcher.

Every AI function takes an explicit `rng: () => number` (default `Math.random` only at the outermost dispatcher boundary). Tests always pass an explicit seeded RNG.

#### Tests (`tests/shared/game/`)

Test files live under `tests/shared/game/` to match `vitest.config.ts`'s `tests/shared/**/*.test.ts` glob — *not* alongside source. See [testing-strategy.md](../REFERENCE/testing-strategy.md) for rationale.

- `tests/shared/game/engine.test.ts` — setup, legal moves, captures, win conditions, purity.
- `tests/shared/game/ai.test.ts` — evaluator sanity, Thrall behaviour, Karl/Karl determinism with seeded RNG, dispatcher routing.
- `tests/shared/game/reference-positions.test.ts` — a hand-built fixture suite (see [§ Reference-position suite](#reference-position-suite)).
- `tests/shared/game/perf.test.ts` — perf assertions, **gated behind `RUN_PERF=1`** (see [§ Performance assertions](#performance-assertions)).

#### Lift plan

The prototype is pulled in module by module. Four impurities are fixed during the lift; nothing else changes about the algorithms or weights.

1. **Module-level ID counter** (`pieceIdCounter` in `engine.ts`). The prototype increments a file-scoped variable, which makes IDs non-deterministic across tests run in the same process and forbids resetting between runs. **Fix:** thread an `idCounter` object through `createInitialState` (default supplies a fresh counter per call). No global state.
2. **`Date.now()` in `createInitialState`.** Same problem — non-deterministic, hard to test. **Fix:** `createInitialState(opts?: { now?: () => number })`; default `() => Date.now()`. Tests pass a fixed `now`.
3. **UI mutators** (`selectPiece`, `deselectPiece`) and the `selectedPiece` / `validMoves` fields on `GameState`. **Fix:** drop them from the engine entirely. The React layer in Phase 3 owns selection state locally and calls `getValidMoves` when it needs candidate squares.
4. **`Math.random()` baked into AI scoring and search.** **Fix:** `rng` parameter on every AI function, threaded through `searchFromRoot` → `minimax`. Default is `Math.random` only at the outermost dispatcher (`getAIMove`).

Everything else is a copy-paste: capture logic, shield-wall logic, king-capture edge immunity, evaluator weights, search widths, jitter values.

### Out of scope

- React, UI, board rendering. (Phase 3.)
- Animation timing, think-delay UX. The engine and AI return synchronously. The hook in Phase 3 adds the simulated thinking pause.
- Persisting game results to D1. (Phase 4.)
- Worker-side AI (engine stays client-side; the Worker doesn't run it in Phase 2 or 3).
- Alpha-beta pruning, transposition tables, iterative deepening. Faithful port of the prototype's simple minimax.
- Opening books, endgame tablebases.

### Acceptance criteria

- [ ] `bun run test` runs the full Vitest suite (both projects) and all engine + AI tests pass.
- [ ] Coverage on `src/shared/game/**` is **≥95% lines/functions/statements and ≥90% branches** (per global [testing-strategy.md](../REFERENCE/testing-strategy.md) targets).
- [ ] The reference-position suite (see below) passes for all listed scenarios.
- [ ] AI determinism test: given the same seeded RNG and same starting state, Karl and Jarl produce the same move sequence across runs.
- [ ] Edge-case tests cover at minimum: king on each edge with three attackers (not captured), king flanked at throne by attackers on all four cardinal sides (captured), king adjacent to throne with three attackers + throne as fourth hostile (captured), shield wall capture along an edge, custodial capture between two attackers, attempt to stop on throne by non-king (rejected), attempt to enter corner by non-king (rejected), no-legal-moves stalemate for either side, attackers-insufficient win (defenders win once attacker count drops below 3).
- [ ] Move-limit cap: a game that hits `MAX_MOVES` terminates as a draw with `gameOver = true`, `winner = null`, `winReason = null` (see [§ Draw on move limit](#draw-on-move-limit) for the exact shape).

#### Reference-position suite

In place of a "byte-for-byte replay-parity" check (which the prototype isn't deterministic enough to support without first stripping its own impurities), the faithful-port guarantee is enforced by a curated set of **hand-built reference positions**:

- For each listed capture/win/stalemate scenario in the [edge-case list above](#acceptance-criteria), we construct a `GameState` by hand (or via a small fixture helper), call `makeMove` with the prescribed move, and assert the resulting state's `pieces`, `capturedBy*`, `winner`, and `winReason` exactly.
- For the evaluator, we construct 6–10 reference positions (king one step from corner, king flanked, etc.) and assert the score sign and rough magnitude match the prototype's published weights.
- These fixtures live as TypeScript factories in `tests/shared/game/fixtures/` so they remain refactor-friendly.

**Optional regression detector (non-gating).** A separate, opt-in test (`tests/shared/game/replay-regression.test.ts`, behind `RUN_REPLAY=1`) records a fixed number of self-play games using a seeded RNG and snapshots the resulting move sequences. It exists only to flag accidental divergence later — never to gate this PR. If it fails, we investigate; if it's expected (a deliberate change), we re-snapshot.

#### Performance assertions

Perf tests are **opt-in** via `RUN_PERF=1 bun run test`, not part of the default suite. CI sometimes runs on slower hardware than the developer's laptop, and a flaky `<50ms` assertion would block merges for no good reason.

Baseline numbers (from the prototype on the dev laptop): Karl ~19ms, Jarl ~79ms. The perf test asserts loose ceilings (Karl <100ms median over 20 runs, Jarl <250ms median over 20 runs) and prints the actual median so we can spot drift. The exact numbers are documented in `tests/shared/game/perf.test.ts` and revisited if we ever change machines or runtime.

---

## Technical approach

### Architecture decisions

**Pure functions, immutable `GameState`.** `makeMove` returns a new `GameState`; no mutation. Trivial to test, trivial to debug, no React state-sync surprises. Matches the prototype.

**RNG injected at call site.** Every AI function takes an explicit `rng: () => number`. Determinism for tests; `Math.random` is the only default, supplied at the `getAIMove` dispatcher. Cheap to add now; costly to retrofit if we ever want seeded replay.

**`shared/` directory, not `client/` or `worker/`.** Engine + AI live in `src/shared/game/`. Phase 4 may want server-side validation of submitted game results once accounts exist; putting the engine in `shared/` makes that a one-import change.

**No alpha-beta pruning.** Faithful port of per-ply-width minimax. The prototype's AI feel is what Magnus wants; optimisation risks changing it.

**Drop UI state from the engine.** `selectedPiece` and `validMoves` move out of `GameState`. Phase 3 holds them locally in the React layer. Keeps the engine importable in any context (tests, Worker, future server-side validator) without dragging UI concerns along.

**Draw on move limit.** The prototype has no explicit move cap, so theoretically a self-play AI vs AI loop can run forever. We cap at `MAX_MOVES = 500` and terminate with `gameOver = true, winner = null, winReason = null`. The dialog in Phase 3 surfaces this as a draw. Real Hnefatafl games rarely exceed 100 moves; 500 is comfortably above any sensible game.

### Technology choices

No new dependencies beyond what Phase 1 installed. This is pure TypeScript.

### Key files and components

**New files (source):**
```
src/shared/game/
├── index.ts            // public API barrel
├── types.ts            // shared types
├── constants.ts        // board size, throne, corners, initial layout, MAX_MOVES
├── engine.ts           // movement, captures, win conditions
└── ai.ts               // evaluator + minimax + per-difficulty dispatcher
```

**New files (tests):**
```
tests/shared/game/
├── engine.test.ts
├── ai.test.ts
├── reference-positions.test.ts
├── perf.test.ts                 // gated by RUN_PERF=1
├── replay-regression.test.ts    // gated by RUN_REPLAY=1
└── fixtures/
    ├── boards.ts                // hand-built `GameState` factories
    └── seeds.ts                 // shared seeded-RNG factories
```

**Files to modify:**
- `vitest.config.ts` — no change expected; the existing `tests/shared/**/*.test.ts` glob already covers the new files.
- None else — Phase 2 is otherwise purely additive.

### Database schema changes
None.

---

## Testing strategy

### Unit tests

**Coverage targets:** 100% target, 95%/90% minimum (matches global policy).

**Key test files:**
- `engine.test.ts`:
  - Initial state setup (37 pieces, correct positions, attackers to move).
  - `getValidMoves`: all 4 cardinal directions, blocking by friendly + enemy pieces, throne passable for non-king but not stoppable, corner blocked for non-king, king alone may stop on throne or corner.
  - Captures: single custodial, multi-direction custodial, shield wall along all four edges (with king inside group — king is never removed), custodial-versus-corner (corner counts as hostile), custodial-versus-throne (throne hostile to attackers always, to defenders only when empty).
  - King capture: four cardinal sides (off-throne, non-edge), flanked at throne by 4 attackers, adjacent to throne with 3 attackers + throne, **edge immunity** on all four edges.
  - Win conditions: each corner for `king-escaped`, the king-capture variants for `king-captured`, attackers reduced to 2 for `attackers-insufficient`, side with no legal moves for `no-legal-moves`.
  - `makeMove` purity: input state not mutated (deep-compare before/after).
- `ai.test.ts`:
  - `evaluateBoard` returns sensible scores for reference positions (king one step from corner → strong defender score, etc.).
  - `evaluateBoardFast` omits the documented terms and is monotonic with `evaluateBoard` for positions where the omitted terms are zero.
  - Thrall: with a seeded RNG, top-5 candidate set is correct, +200 capture bonus applied, ±10,000 win/loss bonus applied, final pick is from the top 5 uniformly.
  - Karl / Jarl: with a seeded RNG, same starting state → same chosen move; widths/jitter passed through correctly.
  - Dispatcher: `getAIMove` routes by difficulty.

### Integration tests

- **Reference-position suite** (`reference-positions.test.ts`) — described in [§ Reference-position suite](#reference-position-suite).
- **Optional replay regression** (`replay-regression.test.ts`) — gated, non-blocking.

### Manual testing checklist

Phase 2 has no UI, but:
- [ ] Run a small self-play script (Karl vs Karl, seeded RNG) and eyeball the move list — games end in reasonable move counts (not infinite, not 3 moves), captures look sensible, neither side hangs pieces obviously.

---

## Pre-commit checklist

- [ ] All engine + AI tests passing under `bun run test`
- [ ] Coverage ≥95% lines/functions/statements, ≥90% branches on `src/shared/game/**`
- [ ] Reference-position suite passing
- [ ] Type checking passes (`bun run typecheck`)
- [ ] No `Math.random()` calls anywhere in `src/shared/game/` except as the dispatcher default
- [ ] No `Date.now()` calls anywhere in `src/shared/game/` except as the `createInitialState` default
- [ ] No `console.log` left in `src/shared/game/`
- [ ] Perf test passes locally with `RUN_PERF=1 bun run test` (medians printed and recorded in the test file)

---

## PR workflow

### Branch naming
`feature/phase-2-game-engine-and-ai`

### PR title
`Phase 2: Game engine + AI`

### Review requirements
Run `/review-pr`. Triage will likely route to **standard** tier (substantial new code but contained, no infrastructure or security surface). Team escalation is fine if the diff is large.

### Deployment steps
None — Phase 2 doesn't deploy. The engine and AI sit in `src/shared/game/` unused by the Worker or the placeholder page until Phase 3.

---

## Edge cases and considerations

### Known risks

- **Capture-order subtlety.** Prototype documents custodial → shield wall → dedupe → remove. Getting it wrong silently double-counts captures or removes the wrong piece. **Mitigation:** explicit reference-position tests for overlapping captures.
- **King edge immunity.** King cannot be captured against any board edge — only four-sided custodial works, or flanked-at-throne. Easy to invert. **Mitigation:** dedicated tests for king on each edge surrounded by three attackers (must NOT be captured) and king at throne with all four sides hostile (MUST be captured).
- **RNG default leaking into tests.** If a test path accidentally hits `Math.random`, it'll fail intermittently. **Mitigation:** every test passes `rng` explicitly; consider a lint rule later if drift appears.
- **Performance drift.** A future change to the evaluator slows Karl past its budget → sluggish UI in Phase 3. **Mitigation:** opt-in perf test prints medians; rerun before merging anything that touches `evaluateBoard*`.
- **Self-play infinite loop.** Without `MAX_MOVES`, a pathological seed could loop forever in the regression detector. **Mitigation:** `MAX_MOVES = 500` cap, draw outcome.

### Performance considerations

- Engine functions run in the AI's hot loop; allocations matter. Prefer flat arrays and primitive comparisons over object juggling — matches what the prototype already does.
- Avoid `JSON.parse(JSON.stringify(state))` for cloning — write a typed `cloneState` helper if needed.

### Security considerations

None in Phase 2 (no I/O). Becomes relevant in Phase 4 when server-side result recording arrives — at that point the engine in `shared/` validates submitted move histories.

### Future optimisation opportunities

- Alpha-beta pruning + transposition tables — could enable a "Konungr" difficulty above Jarl.
- WASM port of the AI — overkill at current speeds, but technically possible.
- Move-ordering heuristics (search captures first) — strengthens the same minimax at the same depth.

### Draw on move limit

When `state.moveCount` reaches `MAX_MOVES` (default 500), `makeMove` returns a state with `gameOver = true`, `winner = null`, `winReason = null`, and no further moves are accepted. Phase 3's result dialog renders this as a draw. The cap is implemented at the `makeMove` boundary, not inside `checkWinCondition`, because the latter is a pure read on `state` and shouldn't depend on move history bookkeeping.

---

## Technical debt introduced

**TD-001: No alpha-beta pruning, fixed-width minimax**
- **Location:** `src/shared/game/ai.ts`
- **Issue:** Brute-force minimax with per-ply width limits, no pruning.
- **Why accepted:** Faithful port; the prototype's AI feel is what we want.
- **Risk:** Low. Doesn't affect correctness; only relevant if AI feel needs to change.
- **Future fix:** Add alpha-beta as opt-in for a stronger difficulty later.

**TD-002: Replay-regression detector is opt-in, not gating**
- **Location:** `tests/shared/game/replay-regression.test.ts` (behind `RUN_REPLAY=1`)
- **Issue:** It catches accidental divergence in self-play move sequences, but isn't part of CI's default run.
- **Why accepted:** Snapshot-based replay tests are flaky and gating them on every PR would create noise.
- **Risk:** Low. The reference-position suite is the real faithful-port guarantee; the regression detector is belt-and-braces.
- **Future fix:** Promote to gating once we've verified it's stable over many runs.

See [technical-debt.md](../REFERENCE/technical-debt.md).

---

## Related documentation

- [Phase 1 — Foundation](./01-foundation.md)
- [Master specification](./ORIGINAL_IDEA/project-outline.md)
- [Prototype engine spec](./ORIGINAL_IDEA/ClaudeShipSource/spec-game-engine.md) — **behavioural source of truth**
- [Prototype AI spec](./ORIGINAL_IDEA/ClaudeShipSource/spec-ai.md) — **behavioural source of truth**
- [Prototype engine source](./ORIGINAL_IDEA/ClaudeShipSource/src/lib/game/engine.ts) — **implementation source of truth**
- [Prototype AI source](./ORIGINAL_IDEA/ClaudeShipSource/src/lib/game/ai.ts) — **implementation source of truth**
- [Prototype types](./ORIGINAL_IDEA/ClaudeShipSource/src/types/game.ts)
- [testing-strategy.md](../REFERENCE/testing-strategy.md)

---

## Notes

The reference-position suite is the single most valuable test artefact in this phase. Hand-built fixtures for every capture/win/stalemate scenario give us a deterministic, refactor-friendly faithful-port guarantee that the prototype itself doesn't provide.

Resist the temptation to "improve" the AI heuristic during this phase. Port first, evaluate later. Any deviation from the prototype's evaluator weights or search widths needs an ADR.
