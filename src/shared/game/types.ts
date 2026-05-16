// ABOUT: Core type definitions for the Hnefatafl game engine.
// ABOUT: Shared between the engine, AI, and any future UI layer.

export type PieceType = 'king' | 'defender' | 'attacker';
export type Side = 'defenders' | 'attackers';
export type Difficulty = 'thrall' | 'karl' | 'jarl';

/** Structured reason the game ended. `stuckSide` is the side that ran out
 *  of legal moves (only set when `kind === 'no-legal-moves'`). */
export type WinReason =
  | { kind: 'king-captured' }
  | { kind: 'king-escaped' }
  | { kind: 'no-legal-moves'; stuckSide: Side }
  | { kind: 'attackers-insufficient' };

export interface Position {
  row: number;
  col: number;
}

export interface Piece {
  type: PieceType;
  side: Side;
  position: Position;
  id: string;
}

export interface Move {
  from: Position;
  to: Position;
  pieceId: string;
}

export interface GameState {
  board: (Piece | null)[][];
  pieces: Piece[];
  currentTurn: Side;
  moveHistory: Move[];
  capturedByAttackers: Piece[];
  capturedByDefenders: Piece[];
  gameOver: boolean;
  winner: Side | null;
  winReason: WinReason | null;
  moveCount: number;
  startTime: number;
}
