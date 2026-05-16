// ABOUT: Hnefatafl AI — evaluator, minimax search, per-difficulty dispatchers.
// ABOUT: All functions accept an explicit rng parameter; Math.random only at getAIMove.

import type { GameState, Piece, Position, Side, Difficulty, Move } from './types';
import { BOARD_SIZE, isCorner } from './constants';
import { getAllMovesForSide, makeMove, getValidMoves } from './engine';

interface ScoredMove {
  piece: Piece;
  to: Position;
  score: number;
}

// ---------------------------------------------------------------------------
// Evaluation helpers
// ---------------------------------------------------------------------------

function findKingInState(state: GameState): Piece | null {
  return state.pieces.find(p => p.type === 'king') ?? null;
}

function manhattanToNearestCorner(pos: Position): number {
  const corners = [
    { row: 0, col: 0 },
    { row: 0, col: 10 },
    { row: 10, col: 0 },
    { row: 10, col: 10 },
  ];
  return Math.min(...corners.map(c => Math.abs(c.row - pos.row) + Math.abs(c.col - pos.col)));
}

function kingHasCornerPath(board: (Piece | null)[][], king: Piece): boolean {
  const stateView = { board } as GameState;
  const moves = getValidMoves(stateView, king);
  return moves.some(m => isCorner(m));
}

function countAdjacentEnemies(board: (Piece | null)[][], pos: Position, side: Side): number {
  const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
  let count = 0;
  for (const { dr, dc } of dirs) {
    const r = pos.row + dr;
    const c = pos.col + dc;
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      const p = board[r]![c];
      if (p && p.side !== side) count++;
    }
  }
  return count;
}

function isOnEdge(pos: Position): boolean {
  return pos.row === 0 || pos.row === BOARD_SIZE - 1 || pos.col === 0 || pos.col === BOARD_SIZE - 1;
}

// ---------------------------------------------------------------------------
// Board evaluation — positive = good for forSide
// ---------------------------------------------------------------------------

export function evaluateBoard(state: GameState, forSide: Side): number {
  if (state.gameOver) {
    if (state.winner === forSide) return 100000;
    return -100000;
  }

  const king = findKingInState(state);
  if (!king) return forSide === 'attackers' ? 100000 : -100000;

  let score = 0;

  const defenders = state.pieces.filter(p => p.side === 'defenders').length;
  const attackers = state.pieces.filter(p => p.side === 'attackers').length;
  score += (attackers - defenders * 2) * 100;

  const kingCornerDist = manhattanToNearestCorner(king.position);
  score += kingCornerDist * 50;

  if (kingHasCornerPath(state.board, king)) {
    score -= 2000;
  }

  if (isOnEdge(king.position)) {
    score -= 300;
  }

  const kingAdjacentEnemies = countAdjacentEnemies(state.board, king.position, 'defenders');
  score += kingAdjacentEnemies * 150;

  const cornerAdjacent = [
    { row: 0, col: 1 }, { row: 1, col: 0 },
    { row: 0, col: 9 }, { row: 1, col: 10 },
    { row: 9, col: 0 }, { row: 10, col: 1 },
    { row: 9, col: 10 }, { row: 10, col: 9 },
  ];
  for (const pos of cornerAdjacent) {
    const p = state.board[pos.row]?.[pos.col];
    if (p && p.side === 'attackers') score += 80;
  }

  for (const piece of state.pieces) {
    if (piece.type === 'king') continue;
    const adj = countAdjacentEnemies(state.board, piece.position, piece.side);
    if (piece.side === 'attackers') {
      score -= adj * 20;
    } else {
      score += adj * 30;
    }
  }

  for (const piece of state.pieces) {
    if (piece.side === 'attackers') {
      const centerDist = Math.abs(piece.position.row - 5) + Math.abs(piece.position.col - 5);
      score -= centerDist * 5;
    }
  }

  return forSide === 'attackers' ? score : -score;
}

// Cheaper evaluator for per-ply pre-filtering — omits kingHasCornerPath,
// corner-adjacency, piece-in-danger, and attacker-centrality terms.
export function evaluateBoardFast(state: GameState, forSide: Side): number {
  if (state.gameOver) {
    if (state.winner === forSide) return 100000;
    return -100000;
  }

  const king = findKingInState(state);
  if (!king) return forSide === 'attackers' ? 100000 : -100000;

  let score = 0;

  const defenders = state.pieces.filter(p => p.side === 'defenders').length;
  const attackers = state.pieces.filter(p => p.side === 'attackers').length;
  score += (attackers - defenders * 2) * 100;

  const kingCornerDist = manhattanToNearestCorner(king.position);
  score += kingCornerDist * 50;

  if (isOnEdge(king.position)) {
    score -= 300;
  }

  const kingAdjacentEnemies = countAdjacentEnemies(state.board, king.position, 'defenders');
  score += kingAdjacentEnemies * 150;

  return forSide === 'attackers' ? score : -score;
}

// ---------------------------------------------------------------------------
// Search helpers
// ---------------------------------------------------------------------------

function flattenMoves(allMoves: { piece: Piece; moves: Position[] }[]): { piece: Piece; to: Position }[] {
  const flat: { piece: Piece; to: Position }[] = [];
  for (const { piece, moves } of allMoves) {
    for (const to of moves) {
      flat.push({ piece, to });
    }
  }
  return flat;
}

// ---------------------------------------------------------------------------
// Minimax (rng threaded for API symmetry; not used internally)
// ---------------------------------------------------------------------------

export function minimax(
  state: GameState,
  widths: number[],
  ply: number,
  toMove: Side,
  aiSide: Side,
  _rng: () => number,
): number {
  if (state.gameOver) {
    return state.winner === aiSide ? 100000 : -100000;
  }
  if (ply >= widths.length) {
    return evaluateBoard(state, aiSide);
  }

  const allMoves = getAllMovesForSide(state.board, toMove);
  if (allMoves.length === 0) {
    return toMove === aiSide ? -100000 : 100000;
  }

  const flat = flattenMoves(allMoves);
  const scored = flat.map(m => {
    const next = makeMove(state, m.piece.position, m.to);
    return { next, score: evaluateBoardFast(next, toMove) };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.min(widths[ply]!, scored.length));

  const enemySide: Side = toMove === 'attackers' ? 'defenders' : 'attackers';
  const isMaximizing = toMove === aiSide;
  let best = isMaximizing ? -Infinity : Infinity;

  for (const m of top) {
    const val = minimax(m.next, widths, ply + 1, enemySide, aiSide, _rng);
    if (isMaximizing) {
      if (val > best) best = val;
    } else {
      if (val < best) best = val;
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Root search
// ---------------------------------------------------------------------------

export function searchFromRoot(
  state: GameState,
  side: Side,
  opts: { widths: number[]; jitter: number; rng?: () => number },
): Move | null {
  const rng = opts.rng ?? Math.random;
  const { widths, jitter } = opts;

  const allMoves = getAllMovesForSide(state.board, side);
  if (allMoves.length === 0) return null;

  const enemySide: Side = side === 'attackers' ? 'defenders' : 'attackers';
  const flat = flattenMoves(allMoves);

  const rootScored = flat.map(m => {
    const next = makeMove(state, m.piece.position, m.to);
    const score = next.gameOver && next.winner === side
      ? 100000
      : evaluateBoardFast(next, side);
    return { piece: m.piece, to: m.to, next, score };
  });
  rootScored.sort((a, b) => b.score - a.score);

  if (rootScored[0]?.score === 100000) {
    const m = rootScored[0]!;
    return { from: m.piece.position, to: m.to, pieceId: m.piece.id };
  }

  const top = rootScored.slice(0, Math.min(widths[0]!, rootScored.length));

  let bestMove: Move | null = null;
  let bestScore = -Infinity;

  for (const aiMove of top) {
    let val: number;
    if (aiMove.next.gameOver) {
      val = aiMove.next.winner === side ? 100000 : -100000;
    } else if (widths.length === 1) {
      val = evaluateBoard(aiMove.next, side);
    } else {
      val = minimax(aiMove.next, widths, 1, enemySide, side, rng);
    }

    const noisy = val + (rng() - 0.5) * jitter;
    if (noisy > bestScore) {
      bestScore = noisy;
      bestMove = { from: aiMove.piece.position, to: aiMove.to, pieceId: aiMove.piece.id };
    }
  }

  return bestMove;
}

// ---------------------------------------------------------------------------
// Difficulty dispatchers
// ---------------------------------------------------------------------------

export function getThrallMove(state: GameState, side: Side, rng: () => number): Move | null {
  const allMoves = getAllMovesForSide(state.board, side);
  if (allMoves.length === 0) return null;

  const candidates: ScoredMove[] = [];

  for (const { piece, moves } of allMoves) {
    for (const to of moves) {
      let score = rng() * 100;

      const simState = makeMove(state, piece.position, to);
      const capturesBefore = side === 'attackers'
        ? state.capturedByAttackers.length
        : state.capturedByDefenders.length;
      const capturesAfter = side === 'attackers'
        ? simState.capturedByAttackers.length
        : simState.capturedByDefenders.length;

      if (capturesAfter > capturesBefore) score += 200;
      if (simState.gameOver && simState.winner === side) score += 10000;
      if (simState.gameOver && simState.winner !== side) score -= 10000;

      candidates.push({ piece, to, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const topN = candidates.slice(0, Math.min(5, candidates.length));
  const picked = topN[Math.floor(rng() * topN.length)]!;
  return { from: picked.piece.position, to: picked.to, pieceId: picked.piece.id };
}

export function getKarlMove(state: GameState, side: Side, rng: () => number): Move | null {
  return searchFromRoot(state, side, { widths: [15, 6], jitter: 15, rng });
}

export function getJarlMove(state: GameState, side: Side, rng: () => number): Move | null {
  return searchFromRoot(state, side, { widths: [12, 6, 4], jitter: 2, rng });
}

export function getAIMove(
  state: GameState,
  difficulty: Difficulty,
  side: Side,
  rng: () => number = Math.random,
): Move | null {
  switch (difficulty) {
    case 'thrall': return getThrallMove(state, side, rng);
    case 'karl': return getKarlMove(state, side, rng);
    case 'jarl': return getJarlMove(state, side, rng);
  }
}
