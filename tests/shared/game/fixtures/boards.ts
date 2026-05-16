// ABOUT: Board-state factory helpers for engine and AI tests.
// ABOUT: Builds deterministic GameState snapshots from compact piece lists.

import type { GameState, Piece, Side } from '../../../../src/shared/game/types';
import { BOARD_SIZE } from '../../../../src/shared/game/constants';

/** Build an 11×11 board array from a piece list. */
export function buildBoard(pieces: Piece[]): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null),
  );
  for (const piece of pieces) {
    board[piece.position.row]![piece.position.col] = piece;
  }
  return board;
}

/** Minimal GameState for unit tests — caller supplies pieces and turn. */
export function makeState(
  pieces: Piece[],
  currentTurn: Side = 'attackers',
  overrides: Partial<GameState> = {},
): GameState {
  return {
    board: buildBoard(pieces),
    pieces,
    currentTurn,
    moveHistory: [],
    capturedByAttackers: [],
    capturedByDefenders: [],
    gameOver: false,
    winner: null,
    winReason: null,
    moveCount: 0,
    startTime: 0,
    ...overrides,
  };
}

let _id = 0;
/** Deterministic piece IDs — resets between test files via resetIds(). */
export function resetIds(): void {
  _id = 0;
}
export function pid(prefix: string): string {
  return `${prefix}_${_id++}`;
}

/** Convenience piece constructors. */
export const king = (row: number, col: number, id = pid('king')): Piece => ({
  type: 'king',
  side: 'defenders',
  position: { row, col },
  id,
});

export const defender = (row: number, col: number, id = pid('def')): Piece => ({
  type: 'defender',
  side: 'defenders',
  position: { row, col },
  id,
});

export const attacker = (row: number, col: number, id = pid('atk')): Piece => ({
  type: 'attacker',
  side: 'attackers',
  position: { row, col },
  id,
});
