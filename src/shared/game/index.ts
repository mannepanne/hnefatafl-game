// ABOUT: Public API barrel for the Hnefatafl game engine and AI.
// ABOUT: Import from here in application code; import directly in tests.

export type { PieceType, Side, Difficulty, WinReason, Position, Piece, Move, GameState } from './types';
export {
  BOARD_SIZE,
  CENTER,
  MAX_MOVES,
  THRONE,
  CORNERS,
  isThrone,
  isCorner,
  isRestricted,
  posKey,
  samePos,
  makeIdCounter,
  createInitialPieces,
} from './constants';
export type { IdCounter } from './constants';
export {
  createInitialState,
  getValidMoves,
  getAllMovesForSide,
  makeMove,
  checkWinCondition,
  getPieceAt,
  findKing,
  isHostileSquare,
} from './engine';
export {
  evaluateBoard,
  evaluateBoardFast,
  minimax,
  searchFromRoot,
  getThrallMove,
  getKarlMove,
  getJarlMove,
  getAIMove,
} from './ai';
