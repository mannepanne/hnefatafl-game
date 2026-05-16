# ADR: `getValidMoves` and `getAllMovesForSide` accept `GameState`, not raw board

**Date:** 2026-05-16
**Status:** Active

---

## Decision

`getValidMoves(state: GameState, piece: Piece)` and `getAllMovesForSide(state: GameState, side: Side)` take a full `GameState` rather than the raw `(Piece | null)[][]` board used in the prototype.

## Context

The Phase 2 engine port needed movement functions. The prototype (`ClaudeShipSource/`) passes a raw board array:

```typescript
// Prototype signature
getValidMoves(board: (Piece | null)[][], piece: Piece): Position[]
getAllMovesForSide(board: (Piece | null)[][], side: Side): ...
```

Internally, `getValidMoves` only reads `board` from the state. However, taking a full `GameState` is the cleaner API boundary.

## Alternatives considered

- **Prototype: raw board parameter** — `getValidMoves(board, piece)`. Means callers that have a full `GameState` must reach into `.board`, and callers that have only a board (like `getAllMovesForSide` internally) can pass it directly. But it forces unsound casts whenever the board was built locally (e.g. during `makeMove` after captures) rather than extracted from a live state. Three unsound `{ board } as GameState` casts resulted in an early draft.
- **Chosen: full `GameState` parameter** — `getValidMoves(state, piece)`. Callers with a full state pass it directly. The one call site in `makeMove` that has only a locally-built board uses a single explicit `{ board } as GameState` cast at the call site, making the compromise visible rather than hidden inside the helper.

## Reasoning

Taking `GameState` matches the rest of the engine's API (e.g. `makeMove`, `checkWinCondition`), keeps the type boundary consistent, and avoids spreading unsound casts across helper implementations. The `getValidMoves` implementation destructures only `board` from state today; if future rules need more state (e.g. move history for repetition detection) the signature already accommodates that.

## Trade-offs accepted

- Callers that have only a raw board must construct a minimal state view (`{ board } as GameState`). There is one such call site in `makeMove` (the no-legal-moves check on the post-capture board).
- The cast in `makeMove` is unsound but safe in practice: `getValidMoves` reads only `board` from the state object. A stricter approach would introduce a separate `BoardView` type, but that is over-engineering at this stage.

## Implications

- All move-generation callers (engine and AI) pass a `GameState` directly — no `.board` extraction needed at call sites.
- The single `{ board } as GameState` cast in `makeMove` documents exactly where the compromise lives.

---

## References

- Related ADRs: [2026-05-16-phase2-purity-boundary.md](./2026-05-16-phase2-purity-boundary.md)
- Prototype reference: `SPECIFICATIONS/ORIGINAL_IDEA/ClaudeShipSource/`
