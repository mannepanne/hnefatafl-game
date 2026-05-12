# Phase 2: Game engine + AI

## Phase overview

**Phase number:** 2
**Phase name:** Game engine + AI (pure TypeScript, no UI, no Worker — just logic + tests)
**Estimated timeframe:** 5–8 days
**Dependencies:** Phase 1 complete (project scaffolding, test infrastructure).

**Brief description:**
Port the prototype's game engine and AI to `src/shared/game/` as **pure TypeScript** — no React, no DOM, no Worker bindings, no I/O. The engine and AI are fully deterministic given a seed (where applicable) and 100%-covered by Vitest. This phase doesn't render anything; it produces the core game model that Phase 3 (UI) and any future server-side logic will sit on top of.

Source of truth: [`ClaudeShipSource/spec-game-engine.md`](./ORIGINAL_IDEA/ClaudeShipSource/spec-game-engine.md), [`ClaudeShipSource/spec-ai.md`](./ORIGINAL_IDEA/ClaudeShipSource/spec-ai.md), and the prototype source at [`ClaudeShipSource/src/lib/game/`](./ORIGINAL_IDEA/ClaudeShipSource/src/lib/game/).

---

## Scope and deliverables

### In scope
- [ ] Type definitions in `src/shared/game/types.ts`: `Position`, `PieceType` (`king` | `defender` | `attacker`), `Side` (`defender` | `attacker`), `Piece`, `GameState`, `Move`, `Difficulty` (`thrall` | `karl` | `jarl`), `GameOutcome`.
- [ ] Constants in `src/shared/game/constants.ts`: board size (11), throne position `{x:5, y:5}`, four corner positions, initial piece layout (1 king + 12 defenders + 24 attackers, per prototype's `spec-game-engine.md`).
- [ ] Engine module `src/shared/game/engine.ts`:
  - [ ] `createInitialState()` returns a fresh `GameState` with all 37 pieces placed.
  - [ ] `getLegalMoves(state, position)` — rook-style sliding moves with throne/corner rules; only the king may stop on throne or corner.
  - [ ] `getAllLegalMoves(state, side)` — all legal moves for a side.
  - [ ] `applyMove(state, move)` — pure function: returns a new `GameState` after the move, applying captures in the documented order (custodial → shield wall → dedupe → remove).
  - [ ] `checkWinCondition(state)` — returns `null`, `'defenders'`, or `'attackers'`. Defenders win if king on corner. Attackers win if king captured (custodial four-side or flanked-at-throne, with edge immunity respected) or defenders have no legal moves.
  - [ ] Helpers: `isThrone`, `isCorner`, `isHostileSquare`, `findKing`, `getPieceAt`.
- [ ] Move history: `state.moveHistory: Move[]` populated by `applyMove`. Useful for Phase 4 (record game results) and for replay/debug.
- [ ] AI module `src/shared/game/ai.ts`:
  - [ ] `evaluate(state)` — shared evaluator returning a numeric score from the attacker's perspective (positive = attacker advantage). Factors: material balance (defenders weighted ×2), king→nearest-corner Manhattan distance, king-has-clear-path-to-corner penalty, king-on-edge bonus, attackers adjacent to king, attacker centrality. Exact weights match the prototype.
  - [ ] `searchFromRoot(state, side, options)` — minimax with per-ply width limits (no alpha-beta). `options = {widths: number[], jitter: number}`. Returns the chosen `Move`.
  - [ ] `getThrallMove(state, side)` — random legal move, but if any move captures something, picks the highest-value capture.
  - [ ] `getKarlMove(state, side)` — `searchFromRoot(state, side, {widths: [15, 6], jitter: 15})`. **No artificial think delay here** — that belongs to the UI hook in Phase 3.
  - [ ] `getJarlMove(state, side)` — `searchFromRoot(state, side, {widths: [12, 6, 4], jitter: 2})`.
  - [ ] `getAIMove(state, difficulty, side)` — dispatcher: routes to Thrall/Karl/Jarl.
- [ ] Deterministic RNG injection: every AI function takes an optional `rng: () => number` (default `Math.random`). Tests pass in a seeded RNG so results are reproducible.
- [ ] Exhaustive unit tests for engine and AI: 100% line coverage target (95% minimum), 90%+ branches.
- [ ] Performance assertions in tests: Karl returns a move in <50ms median; Jarl returns in <150ms median (loose bounds — prototype hit 19ms / 79ms). If they exceed, raise a flag.

### Out of scope
- React, UI, board rendering. (Phase 3.)
- Animation timing, think-delay UX. (Phase 3 — the AI module returns instantly; the hook adds the simulated thinking pause.)
- Persisting game results to D1. (Phase 4.)
- Worker-side AI (we keep it client-side; the Worker doesn't run the engine in Phase 2 or 3).
- Alpha-beta pruning, transposition tables, iterative deepening. Faithful port of the prototype's simple minimax.
- Opening books, endgame tablebases.

### Acceptance criteria
- [ ] `bun test src/shared/game` runs all engine + AI tests in the plain-Vitest pool (no Worker runtime needed) and they all pass.
- [ ] Coverage on `src/shared/game/**` is ≥95% lines/functions/statements and ≥90% branches.
- [ ] A blind comparison test: replay a recorded game from the prototype (move list captured by hand or by instrumenting the prototype briefly) through the ported engine, and every resulting `GameState` matches byte-for-byte after each move. **This is the strongest "faithful port" check we have.**
- [ ] AI determinism test: given the same seed, Karl and Jarl produce the same move sequence across runs.
- [ ] Edge-case tests cover: king on edge with three attackers (not captured), king flanked at throne by attackers on all four cardinal sides (captured), shield wall capture along an edge, custodial capture between two attackers, attempt to move onto throne by non-king (rejected), attempt to stop on corner by non-king (rejected), no-legal-moves stalemate for defenders (attackers win).

---

## Technical approach

### Architecture decisions

**Pure functions, immutable `GameState`**
- Choice: `applyMove` returns a new `GameState`; no mutation.
- Rationale: Trivial to test, trivial to debug ("here's the state before, here's the state after"), trivial to wire into React without state-sync bugs. Aligns with the prototype's pattern.
- Alternatives considered: Mutating the state in place (faster, but a constant source of subtle bugs in turn-based games). Rejected.

**RNG injected at call site**
- Choice: AI functions take an optional `rng` parameter.
- Rationale: Determinism for tests; in production, `Math.random` is fine. Cheap to add now, costly to retrofit later if we ever want replay/seeding.

**`shared/` directory, not `client/` or `worker/`**
- Choice: Engine + AI live in `src/shared/game/`.
- Rationale: Phase 4 may want to validate game results server-side ("does this move history actually produce a king-on-corner state?") to prevent cheating once accounts exist. Putting the engine in `shared/` makes that trivial — same module, same TypeScript types, on both sides.

**No alpha-beta pruning**
- Choice: Faithful port of the prototype's per-ply-width minimax. No optimisation.
- Rationale: The prototype's AI is enjoyable to play against; tweaking the algorithm changes its feel. "Faithful port" means matching feel, not making it stronger.
- Alternatives considered: Alpha-beta with the prototype's heuristic — would be faster but potentially stronger and behave differently. Out of scope; can revisit post-v1.0 if desired.

### Technology choices

No new dependencies beyond what Phase 1 installed. This is pure TypeScript.

### Key files and components

**New files to create:**
```
src/shared/game/
├── index.ts            // public API barrel
├── types.ts            // all shared types
├── constants.ts        // board size, throne, corners, initial layout
├── engine.ts           // movement, captures, win conditions
├── ai.ts               // evaluator + minimax + per-difficulty dispatcher
├── engine.test.ts
├── ai.test.ts
└── replay-fixtures/
    └── prototype-game-001.json  // recorded game(s) from prototype for parity tests
```

**Files to modify:**
- None — Phase 2 is purely additive.

### Database schema changes
None.

---

## Testing strategy

### Unit tests

**Coverage targets:** 100% target, 95%/90% minimum.

**Key test files:**
- `engine.test.ts`:
  - Initial state setup (37 pieces, correct positions).
  - Legal moves: all 8 directions, blocking by other pieces, throne/corner rules.
  - Single custodial capture, multi-direction custodial capture, shield wall along all four edges.
  - King capture: four cardinal sides, flanked at throne, edge immunity.
  - Win conditions: king on each of the four corners, king captured, defenders out of legal moves.
  - `applyMove` purity: input state not mutated.
- `ai.test.ts`:
  - Evaluator returns sensible scores for known positions (king one step from corner = strong defender score, etc.).
  - Thrall picks the highest-value capture when one is available.
  - Karl and Jarl pick a legal move from the right side.
  - Determinism: same seed → same moves.
  - Performance ceiling: Karl <50ms median over 20 runs, Jarl <150ms median over 20 runs.

### Integration tests

- **Replay parity test:** record at least one full game from the prototype (move list), feed the move list through the ported engine, assert state equality at each step. This is the gold-standard "faithful port" check.

### Manual testing checklist

Not really applicable in Phase 2 — there's no UI. But:
- [ ] Spot-check a few AI games by writing a small script that loops `getAIMove` for both sides and prints the board to console. Confirm games end in a reasonable number of moves (not infinite, not in 3 moves).

---

## Pre-commit checklist

- [ ] All engine + AI tests passing
- [ ] Coverage ≥95% lines/functions/statements, ≥90% branches on `src/shared/game/**`
- [ ] Replay parity test passing for at least one recorded prototype game
- [ ] Type checking passes
- [ ] No `Math.random()` calls outside the AI module (RNG is injected, not scattered)
- [ ] No `console.log` left in `src/shared/game/`
- [ ] AI performance assertions still passing (Karl <50ms, Jarl <150ms median)

---

## PR workflow

### Branch naming
`feature/phase-2-engine-and-ai`

### PR title
`Phase 2: Game engine + AI`

### Review requirements
- Run `/review-pr`. Triage will likely route to **standard** tier (substantial new code but contained, no infrastructure or security surface). If the diff is unusually large, it may auto-escalate to team — fine either way.

### Deployment steps
None — Phase 2 doesn't deploy anything. The engine + AI sit in `src/shared/game/` and aren't imported by the Worker or the placeholder page yet.

---

## Edge cases and considerations

### Known risks

- **Capture-order subtlety:** the prototype documents the capture order as custodial → shield wall → dedupe → remove. Getting this wrong produces hard-to-spot bugs where, e.g., a piece is counted as both custodially and shield-wall captured. **Mitigation:** explicit test cases for overlapping captures; replay parity test against the prototype.

- **King edge immunity:** the king cannot be captured against the board edge — only four-sided custodial works, or flanked-at-throne. Easy to get backwards. **Mitigation:** dedicated tests for king on each edge surrounded by three attackers (must NOT be captured) and king at throne surrounded on all four sides (MUST be captured).

- **AI determinism with `Math.random` default:** if any test path hits the default RNG it'll fail intermittently. **Mitigation:** lint rule or test setup that asserts the RNG is explicitly passed in test code.

- **Performance regression:** if a future "improvement" to the evaluator slows Karl above the threshold, the AI starts feeling sluggish in the UI. **Mitigation:** the performance assertions in tests fail loudly if this happens.

### Performance considerations

- Engine functions are called from a hot loop in the AI search; allocations matter. Prefer flat arrays and primitive comparisons over object juggling.
- Avoid `JSON.parse(JSON.stringify(state))` for state cloning — write a typed `cloneState` helper.

### Security considerations

- None in Phase 2 (no I/O). Becomes relevant when Phase 4 introduces server-side result recording — at that point, the engine being importable in the Worker lets us validate submitted game results against a replay.

### Future optimisation opportunities

- Alpha-beta pruning + transposition table — could enable a "Konungr" difficulty later if Magnus wants a step above Jarl.
- WASM port of the AI for further speedup — likely overkill but technically possible.
- Move ordering heuristics (search captures first) — would make the same minimax stronger at the same depth.

---

## Technical debt introduced

**TD-001: No alpha-beta pruning, fixed-width minimax**
- **Location:** `src/shared/game/ai.ts`
- **Issue:** AI uses brute-force minimax with per-ply width limits, no pruning. Faithful to the prototype but theoretically inefficient.
- **Why accepted:** Faithful port; the prototype's AI feel is what Magnus wants.
- **Risk:** Low. Doesn't affect correctness; only relevant if AI feel needs to change.
- **Future fix:** Add alpha-beta as an opt-in mode if a stronger difficulty is ever added.

See [technical-debt.md](../REFERENCE/technical-debt.md).

---

## Related documentation

- [Phase 1 — Foundation](./01-foundation.md)
- [Master specification](./ORIGINAL_IDEA/project-outline.md)
- [Prototype engine spec](./ORIGINAL_IDEA/ClaudeShipSource/spec-game-engine.md) — **design source of truth**
- [Prototype AI spec](./ORIGINAL_IDEA/ClaudeShipSource/spec-ai.md) — **design source of truth**
- [Prototype engine source](./ORIGINAL_IDEA/ClaudeShipSource/src/lib/game/engine.ts)
- [Prototype AI source](./ORIGINAL_IDEA/ClaudeShipSource/src/lib/game/ai.ts)
- [testing-strategy.md](../REFERENCE/testing-strategy.md)

---

## Notes

The replay parity test is the single most valuable test in this phase. If we have one recorded prototype game that the ported engine reproduces move-for-move, we have strong evidence the port is faithful. If something diverges in production later, the same fixture format makes regression testing trivial.

Resist the temptation to "improve" the AI heuristic during this phase. Port first, evaluate later. Any deviation from the prototype's evaluator weights or search widths should be documented and justified in an ADR.
