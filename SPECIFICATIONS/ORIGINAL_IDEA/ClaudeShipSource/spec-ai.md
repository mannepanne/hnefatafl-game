# Technical Specification: AI System

## Overview

The AI lives in `src/lib/game/ai.ts`. Three difficulty levels — Thrall, Karl, and Jarl — use progressively deeper search with a shared minimax infrastructure. The AI always plays one side (determined by the player's choice on the menu); the `getAIMove` entry point returns a `{ from, to }` move or `null` if no legal moves exist.

## Difficulty Levels

### Thrall (Beginner)

**Strategy**: Mostly random with basic capture awareness.

- Scores every legal move with a random base of `Math.random() * 100`
- +200 if the move results in at least one capture
- +10,000 for an immediate win; −10,000 for an immediate loss
- Picks randomly from the top 5 candidates

**Behavior**: Plays erratically but will grab obvious captures and never throw away a winning move.

### Karl (Intermediate — 2-ply minimax)

```ts
searchFromRoot(state, aiSide, widths=[15, 6], jitter=15)
```

- **Ply 0 (root)**: Fast-evaluate all legal moves, keep the top 15
- **Ply 1 (enemy reply)**: For each root candidate, fast-evaluate the enemy's legal replies, keep the top 6, then full-evaluate
- **Jitter**: ±15 points of random noise on the final score

**Behavior**: Thinks one move ahead — "my move → your best response." Never hangs pieces to obvious captures because it evaluates the position after the enemy's strongest reply. The jitter keeps play varied.

**Performance**: ~19ms average per move.

### Jarl (Advanced — 3-ply minimax)

```ts
searchFromRoot(state, aiSide, widths=[12, 6, 4], jitter=2)
```

- **Ply 0 (root)**: Fast-evaluate all legal moves, keep the top 12
- **Ply 1 (enemy reply)**: Top 6 replies
- **Ply 2 (AI follow-up)**: Top 4 follow-ups, then full-evaluate at leaves
- **Jitter**: ±2 points (near-deterministic)

**Behavior**: Plans one move beyond the immediate trade — sets up captures and escapes that Karl can't see. Plays almost deterministically.

**Performance**: ~79ms average per move.

## Minimax Implementation

### `searchFromRoot(state, aiSide, widths, jitter)`

1. Enumerate all legal moves via `getAllMovesForSide`
2. Fast-evaluate each move (`evaluateBoardFast`) and sort descending
3. **Instant-win shortcut**: if any move scores 100,000 (game over, AI wins), return it immediately
4. Keep the top `widths[0]` moves
5. For each candidate:
   - If the resulting state is terminal, score it directly (±100,000)
   - If `widths.length === 1`, full-evaluate the position (1-ply search)
   - Otherwise, recurse into `minimax` for deeper plies
6. Add `(Math.random() - 0.5) * jitter` to the score
7. Return the highest-scoring move

### `minimax(state, widths, ply, toMove, aiSide)`

Standard minimax without alpha-beta pruning, using per-ply width limits to control branching:

1. Terminal states return ±100,000
2. If `ply >= widths.length`, evaluate with `evaluateBoard` (leaf node)
3. Fast-evaluate all legal moves for `toMove`, keep top `widths[ply]`
4. Recurse for each candidate, alternating maximizing/minimizing based on whether `toMove === aiSide`
5. No legal moves = the side to move loses (return ±100,000)

**Branching budget:**
- Karl: 15 × 6 = 90 leaf evaluations (max)
- Jarl: 12 × 6 × 4 = 288 leaf evaluations (max)

## Board Evaluation

### Full Evaluation (`evaluateBoard`)

Returns a score from the perspective of `forSide`. Positive = good for that side.

Terminal positions score ±100,000.

| Factor | Weight | Notes |
|--------|--------|-------|
| Material balance | `(attackers − defenders × 2) × 100` | Defenders count double (fewer pieces, each more valuable) |
| King distance to nearest corner | `kingCornerDist × 50` | Manhattan distance; lower = better for defenders |
| King has direct corner path | `−2,000` | `getValidMoves` includes a corner square — very dangerous for attackers |
| King on board edge | `−300` | Edge king cannot be captured |
| Attackers adjacent to king | `adjacentCount × 150` | More siege pressure = better for attackers |
| Attacker on corner-adjacent square | `+80` per piece | 8 key positions: `{0,1}`, `{1,0}`, `{0,9}`, `{1,10}`, `{9,0}`, `{10,1}`, `{9,10}`, `{10,9}` |
| Piece in danger (adj to 2+ enemies) | Attacker: `−20`, Defender: `+30` | Per non-king piece |
| Attacker centrality | `−(centerDist × 5)` per attacker | Reward controlling the center |

The raw score is computed from the attacker's perspective, then negated if `forSide === 'defenders'`.

### Fast Evaluation (`evaluateBoardFast`)

A cheaper version used for per-ply pre-filtering. Omits:
- `kingHasCornerPath` check (requires computing all king moves)
- Corner-adjacency bonus loop
- Piece-in-danger loop
- Attacker centrality loop

Keeps: material balance, king corner distance, king on edge, king adjacent enemies.

## Helper Functions

| Function | Purpose |
|----------|---------|
| `findKing(state)` | Find the king piece in state.pieces |
| `manhattanToNearestCorner(pos)` | Min Manhattan distance to any of the 4 corners |
| `kingHasCornerPath(board, king)` | Whether any of the king's valid moves land on a corner |
| `countAdjacentEnemies(board, pos, side)` | Count of orthogonally adjacent enemy pieces |
| `isOnEdge(pos)` | Whether the position is on any board edge |
| `simulateMove(state, piece, to)` | Wrapper around `makeMove` for evaluation |
| `flattenMoves(allMoves)` | Convert `{ piece, moves[] }[]` to `{ piece, to }[]` |

## Timing Budget

The `useGame` hook schedules AI moves with a combined delay:
- **Slide animation**: 700ms (fixed — lets the player's piece animate to its destination)
- **Think delay**: Thrall 300ms, Karl 500ms, Jarl 800ms

Since Karl computes in ~19ms and Jarl in ~79ms, both complete well within their think-delay windows. The remaining time provides a natural "thinking" pause that makes the AI feel deliberate rather than instant.
