# Game engine and AI — how it works

**When to read:** Understanding the game engine internals, investigating a capture or win-condition bug, extending AI difficulty, or archiving the Phase 2 spec.

**Source files:**
- `src/shared/game/engine.ts` — movement, captures, win conditions, state machine
- `src/shared/game/ai.ts` — evaluators, minimax search, difficulty dispatchers
- `src/shared/game/types.ts` — shared types (`GameState`, `Piece`, `Side`, `WinReason`, etc.)
- `src/shared/game/constants.ts` — board constants, `IdCounter`, helper predicates

---

## Module layout

All game logic lives in `src/shared/game/` and is pure TypeScript with no browser or Worker dependencies. It can run in any environment including Vitest's shared pool.

```
src/shared/game/
  constants.ts   — BOARD_SIZE, MAX_MOVES, corner/throne/restricted predicates, IdCounter
  types.ts       — GameState, Piece, Side, Difficulty, Move, WinReason
  engine.ts      — createInitialState, getValidMoves, getAllMovesForSide,
                   checkWinCondition, makeMove
  ai.ts          — evaluateBoard, evaluateBoardFast, minimax, searchFromRoot,
                   getThrallMove, getKarlMove, getJarlMove, getAIMove
```

---

## Pure functional state machine

`makeMove` is the only function that produces a new `GameState`. It never mutates the incoming state. All other functions are read-only.

```
makeMove(state, from, to) → GameState
```

The returned state always has:
- `board` — rebuilt from `pieces` via `buildBoard`
- `pieces` — captured pieces removed
- `currentTurn` — toggled to the other side
- `moveHistory` — `from/to/pieceId` appended
- `capturedByAttackers` / `capturedByDefenders` — updated
- `gameOver` / `winner` / `winReason` — set when a terminal condition fires

---

## Injectable dependencies

Four impurities are injectable so tests can be deterministic:

| Dependency | Default | Injectable via |
|---|---|---|
| `Date.now()` | `Date.now()` | `createInitialState({ now })` |
| `IdCounter` | module-level counter | `createInitialState({ idCounter })` |
| RNG (AI search) | `Math.random` | `getAIMove(state, difficulty, side, rng)` |
| RNG (difficulty dispatchers) | — | `getThrallMove / getKarlMove / getJarlMove(state, side, rng)` |

`Math.random` only appears at the default parameter of `getAIMove`. All internal search functions thread an explicit `rng` parameter.

---

## Capture rules

Captures fire inside `makeMove` after the piece is moved, before win conditions are checked.

### Custodial capture (`checkCustodialCapture`)

A non-king piece is captured when both squares on one axis (row or column) are hostile. Hostile means: an enemy piece, a corner, or the throne (which is always hostile to attackers; hostile to defenders only when unoccupied).

The king is exempt from custodial capture — it is handled separately.

### Shield wall capture (`checkShieldWallCaptures`)

A contiguous group of ≥2 enemy pieces along a board edge is captured when:
1. Every piece in the group has a friendly piece directly inward.
2. Both ends of the group are bracketed by a friendly piece or corner.

The king cannot be shield-wall captured.

---

## King capture modes (`checkKingCapture`)

Returns `true` only when the king is not on any board edge (edge immunity) and:

| King position | Required to capture |
|---|---|
| On the throne | All 4 adjacent squares are attackers |
| Adjacent to the throne | 3 attackers + throne counts as the 4th |
| Anywhere else (interior) | All 4 adjacent squares are attackers |

**Edge immunity:** If the king is on row 0, row 10, col 0, or col 10, `checkKingCapture` returns `false` regardless of surrounding pieces.

---

## Win condition ordering in `makeMove`

Win conditions are checked in this order on the post-capture board:

1. **King captured** — attacker win via `checkKingCapture`
2. **King escaped** — defender win when king reaches a corner
3. **Attackers insufficient** — defender win when fewer than 3 attackers remain
4. **No legal moves** — the player whose turn it would be next has no moves; the moving side wins
5. **Draw cap** — `MAX_MOVES` (500) reached with no winner; returns `winner: null`

The draw cap fires last. A decisive win on exactly move 500 is recorded correctly.

`checkWinCondition` (the public helper used by `checkWinCondition`) uses the same order except it checks against `currentTurn` (the player who is about to move) rather than `nextTurn`.

---

## AI overview

### Difficulty dispatch

| Difficulty | Function | Search |
|---|---|---|
| Thrall | `getThrallMove` | Scored random selection — captures weighted +200, winning moves +10000, shuffled top-5 |
| Karl | `getKarlMove` | `searchFromRoot` with widths `[15, 6]`, jitter 15 |
| Jarl | `getJarlMove` | `searchFromRoot` with widths `[12, 6, 4]`, jitter 2 |

### Minimax with beam search (`minimax`)

`searchFromRoot` uses a two-phase approach:

1. **Root ply:** score all root moves with `evaluateBoardFast`, sort descending, take top `widths[0]`.
2. **Deeper plies:** recurse with `minimax`, which at each ply takes top `widths[ply]` moves by `evaluateBoardFast` score.
3. **Leaf:** evaluate with the full `evaluateBoard`.

Jitter (random noise on root-ply scores) prevents deterministic play from always choosing the same move in equivalent positions.

No alpha-beta pruning is implemented — see [TD-004](./technical-debt.md#td-004-no-alpha-beta-pruning-in-minimax).

### Evaluator factors (`evaluateBoard`)

Eight factors, positive = good for `forSide`:

1. Piece count ratio `(attackers − defenders × 2) × 100`
2. King distance to nearest corner `× 50` (high = attacker advantage)
3. King has a direct corner path `−2000` (big defender advantage)
4. King on any edge `−300`
5. Adjacent enemies around king `× 150` (attacker advantage)
6. Corner-adjacent attacker positions `× 80` each
7. Adjacent enemies around each non-king piece `× 20/30` (pressure)
8. Attacker centrality — distance from centre `× 5` (lower = better for attacker)

`evaluateBoardFast` omits factors 3, 6, 7, 8 for speed; used for pre-filtering at non-leaf plies.

---

## Performance targets

Measured from `tests/shared/game/perf.test.ts` (opt-in via `RUN_PERF=1`):

- Karl: median < 100 ms over 20 runs from initial state
- Jarl: median < 250 ms over 20 runs from initial state
