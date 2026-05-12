export type PieceType = 'king' | 'defender' | 'attacker';
export type Side = 'defenders' | 'attackers';
export type SquareType = 'normal' | 'throne' | 'corner';
export type Difficulty = 'thrall' | 'karl' | 'jarl';

/** Structured reason the game ended — the dialog turns this into
 *  a headline + explanation. `stuckSide` is the side that ran out
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

export interface CaptureResult {
  capturedPieces: Piece[];
  capturedPositions: Position[];
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
  selectedPiece: Piece | null;
  validMoves: Position[];
  moveCount: number;
  startTime: number;
}

export interface GameConfig {
  playerSide: Side;
  difficulty: Difficulty;
}
