# Technical Specification: Game Engine

## Overview

The game engine lives in `src/lib/game/` and implements the Copenhagen variant of Hnefatafl (11×11 board). It is a pure-function state machine — every operation takes a `GameState` and returns a new `GameState` with no side effects.

## Core Types (`src/types/game.ts`)

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
  pieces: Piece[]                 // flat list of living pieces
  currentTurn: Side
  moveHistory: Move[]
  capturedByAttackers: Piece[]
  capturedByDefenders: Piece[]
  gameOver: boolean
  winner: Side | null
  winReason: WinReason | null
  selectedPiece: Piece | null     // UI selection state
  validMoves: Position[]          // precomputed for selected piece
  moveCount: number
  startTime: number               // Date.now() at game creation
}
```

## Board Setup (`constants.ts`)

- **Board size**: 11×11 (`BOARD_SIZE = 11`)
- **Special squares**:
  - Throne: `{row: 5, col: 5}` (center)
  - Corners: `{0,0}`, `{0,10}`, `{10,0}`, `{10,10}`
- **Initial pieces** (37 total):
  - **1 king** at center `{5,5}`
  - **12 defenders** in a diamond/cross around the king: 4 cardinal extensions at 2–3 squares out (`{3,5}`, `{4,5}`, `{6,5}`, `{7,5}`, `{5,3}`, `{5,4}`, `{5,6}`, `{5,7}`) plus 4 diagonal adjacents (`{4,4}`, `{4,6}`, `{6,4}`, `{6,6}`)
  - **24 attackers** in 4 T-shaped groups at each edge: 5 pieces across (columns/rows 3–7) plus 1 piece one step inward at the midpoint

Piece IDs are generated with a monotonic counter: `king_0`, `def_1`, `def_2`, ..., `atk_13`, etc.

## Movement Rules (`engine.ts → getValidMoves`)

All pieces move like a chess rook — any number of squares along a row or column, blocked by other pieces.

**Restricted square rules:**
- Only the king may stop on the throne or corners
- Non-king pieces may pass through the empty throne (slide over it) but cannot stop there
- Non-king pieces cannot enter corners at all

**Implementation**: For each of 4 cardinal directions, walk outward from the piece's position. Stop when hitting another piece or going out of bounds. Skip restricted squares for non-king pieces (throne is passable, corners terminate the ray).

## Capture Logic

### Custodial Capture (`checkCustodialCapture`)

A piece (not the king) is captured when, after a move, it is sandwiched between two hostile entities on a single axis (row or column).

**Hostile entities:**
- An enemy piece
- A corner square (hostile to both sides)
- The throne square (always hostile to attackers; hostile to defenders only when empty)

The function checks both axes (horizontal + vertical) for each of the 4 neighbors of the destination square.

### King Capture (`checkKingCapture`)

The king has special capture rules based on its position:

| King position | Capture requirement |
|---------------|-------------------|
| On the throne | All 4 adjacent squares occupied by attackers |
| Adjacent to the throne | 3 attackers + the throne counts as the 4th hostile side |
| Elsewhere (not edge) | All 4 adjacent squares occupied by attackers |
| On a board edge | **Cannot be captured** (immune) |

### Shield Wall Capture (`checkShieldWallCaptures`)

A contiguous group of 2+ enemy pieces along a board edge is captured when:
1. Every piece in the group has a friendly (moving side's) piece directly inward (one step toward center)
2. Both ends of the group are bracketed by either a corner square or a friendly piece

The king is never removed by shield wall capture, even if part of the group.

## Capture Processing Order

After a move, captures are checked in this order:
1. Custodial captures for all 4 neighbors of the destination
2. Shield wall captures along all 4 edges
3. Duplicates are deduplicated by piece ID
4. All captured pieces are removed simultaneously

## Win Conditions

| Condition | Winner | WinReason |
|-----------|--------|-----------|
| King reaches a corner square | Defenders | `{ kind: 'king-escaped' }` |
| King is surrounded per capture rules | Attackers | `{ kind: 'king-captured' }` |
| Fewer than 3 attackers remain | Defenders | `{ kind: 'attackers-insufficient' }` |
| Next player has no legal moves | Current player | `{ kind: 'no-legal-moves', stuckSide }` |

Win conditions are checked in order: attacker win (king capture) → defender win (escape or insufficient material) → stalemate.

## State Transitions

### `createInitialState(): GameState`
Creates a fresh game. Attackers move first. `startTime` is set to `Date.now()`.

### `selectPiece(state, piece): GameState`
Sets `selectedPiece` and precomputes `validMoves` via `getValidMoves`. Only allows selecting pieces belonging to `currentTurn`.

### `deselectPiece(state): GameState`
Clears `selectedPiece` and `validMoves`.

### `makeMove(state, from, to): GameState`
The core transition:
1. Validates the move is legal
2. Updates piece position (immutable — creates new piece objects)
3. Rebuilds the board
4. Processes all captures (custodial + shield wall)
5. Removes captured pieces, rebuilds board again
6. Updates `capturedByAttackers` / `capturedByDefenders` lists
7. Checks win conditions
8. Toggles `currentTurn`
9. Checks if the next player has any legal moves (stalemate)
10. Returns new state with `moveCount + 1`, cleared selection

### `getAllMovesForSide(board, side): { piece, moves }[]`
Iterates the board, collects all pieces for the given side, and returns their valid moves. Used by the AI to enumerate candidate moves.

## Game Hook (`src/hooks/useGame.ts`)

Wraps the engine in React state management:
- `gameState` held in `useState`
- `handlePieceClick` / `handleSquareClick` call `selectPiece`, `deselectPiece`, or `makeMove`
- AI moves fire in a `useEffect` triggered by `gameState.currentTurn` changing to the AI's side
- A `gameStateRef` keeps the latest state accessible inside the setTimeout callback (avoids stale closures)
- AI timing: 700ms slide animation + difficulty-dependent think delay (Thrall 300ms, Karl 500ms, Jarl 800ms)
- `resetGame` clears the timeout, resets thinking state, and creates a fresh initial state
