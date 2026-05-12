import type { Position, Piece, Side, GameState, Difficulty } from '@/types/game';
import { BOARD_SIZE, isCorner } from './constants';
import { getAllMovesForSide, makeMove, getValidMoves } from './engine';

interface ScoredMove {
  piece: Piece;
  to: Position;
  score: number;
}

// ─── Evaluation helpers ──────────────────────────────────────

function findKing(state: GameState): Piece | null {
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
  const moves = getValidMoves(board, king);
  return moves.some(m => isCorner(m));
}

function countAdjacentEnemies(board: (Piece | null)[][], pos: Position, side: Side): number {
  const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
  let count = 0;
  for (const { dr, dc } of dirs) {
    const r = pos.row + dr;
    const c = pos.col + dc;
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      const p = board[r][c];
      if (p && p.side !== side) count++;
    }
  }
  return count;
}

function isOnEdge(pos: Position): boolean {
  return pos.row === 0 || pos.row === BOARD_SIZE - 1 || pos.col === 0 || pos.col === BOARD_SIZE - 1;
}

// ─── Board evaluation ─────────────────────────────────────────
// Positive = good for the specified side

function evaluateBoard(state: GameState, forSide: Side): number {
  if (state.gameOver) {
    if (state.winner === forSide) return 100000;
    return -100000;
  }

  const king = findKing(state);
  if (!king) return forSide === 'attackers' ? 100000 : -100000;

  let score = 0;

  // Material count
  const defenders = state.pieces.filter(p => p.side === 'defenders').length;
  const attackers = state.pieces.filter(p => p.side === 'attackers').length;
  score += (attackers - defenders * 2) * 100;

  // King distance to nearest corner (lower is better for defenders)
  const kingCornerDist = manhattanToNearestCorner(king.position);
  score += kingCornerDist * 50;

  // King can directly reach a corner - very dangerous for attackers
  if (kingHasCornerPath(state.board, king)) {
    score -= 2000;
  }

  // King on edge is strong for defenders (can't be captured)
  if (isOnEdge(king.position)) {
    score -= 300;
  }

  // Attackers surrounding the king
  const kingAdjacentEnemies = countAdjacentEnemies(state.board, king.position, 'defenders');
  score += kingAdjacentEnemies * 150;

  // Control of escape routes - attackers on edge/corner adjacent squares
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

  // Pieces in danger (adjacent to 2+ enemies)
  for (const piece of state.pieces) {
    if (piece.type === 'king') continue;
    const adj = countAdjacentEnemies(state.board, piece.position, piece.side);
    if (piece.side === 'attackers') {
      score -= adj * 20;
    } else {
      score += adj * 30;
    }
  }

  // Centrality bonus for attackers (control center)
  for (const piece of state.pieces) {
    if (piece.side === 'attackers') {
      const centerDist = Math.abs(piece.position.row - 5) + Math.abs(piece.position.col - 5);
      score -= centerDist * 5;
    }
  }

  return forSide === 'attackers' ? score : -score;
}

// ─── Fast evaluation (skips expensive kingHasCornerPath) ──────

function evaluateBoardFast(state: GameState, forSide: Side): number {
  if (state.gameOver) {
    if (state.winner === forSide) return 100000;
    return -100000;
  }

  const king = findKing(state);
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

// ─── Simulate a move for evaluation ──────────────────────────

function simulateMove(state: GameState, piece: Piece, to: Position): GameState {
  return makeMove(state, piece.position, to);
}

// ─── Flatten all moves into a single array ───────────────────

function flattenMoves(allMoves: { piece: Piece; moves: Position[] }[]): { piece: Piece; to: Position }[] {
  const flat: { piece: Piece; to: Position }[] = [];
  for (const { piece, moves } of allMoves) {
    for (const to of moves) {
      flat.push({ piece, to });
    }
  }
  return flat;
}

// ─── AI difficulty levels ─────────────────────────────────────

function getAIMove_Thrall(state: GameState, aiSide: Side): ScoredMove | null {
  // Beginner: mostly random with basic capture awareness
  const allMoves = getAllMovesForSide(state.board, aiSide);
  if (allMoves.length === 0) return null;

  const candidates: ScoredMove[] = [];

  for (const { piece, moves } of allMoves) {
    for (const to of moves) {
      let score = Math.random() * 100;

      const simState = simulateMove(state, piece, to);
      const capturesBefore = aiSide === 'attackers'
        ? state.capturedByAttackers.length
        : state.capturedByDefenders.length;
      const capturesAfter = aiSide === 'attackers'
        ? simState.capturedByAttackers.length
        : simState.capturedByDefenders.length;

      if (capturesAfter > capturesBefore) score += 200;
      if (simState.gameOver && simState.winner === aiSide) score += 10000;
      if (simState.gameOver && simState.winner !== aiSide) score -= 10000;

      candidates.push({ piece, to, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const topN = candidates.slice(0, Math.min(5, candidates.length));
  return topN[Math.floor(Math.random() * topN.length)];
}

function getAIMove_Karl(state: GameState, aiSide: Side): ScoredMove | null {
  // Intermediate: 2-ply minimax. "My move → your best response".
  // Never hangs pieces to obvious captures because it evaluates the
  // position after the enemy's strongest reply.
  return searchFromRoot(state, aiSide, [15, 6], 15);
}

function getAIMove_Jarl(state: GameState, aiSide: Side): ScoredMove | null {
  // Advanced: 3-ply minimax. "My move → your response → my follow-up".
  // Plans one move beyond the immediate trade, so it sets up captures
  // and escapes that Karl can't see.
  return searchFromRoot(state, aiSide, [12, 6, 4], 2);
}

// ─── Minimax search ──────────────────────────────────────────
//
// Generic alpha-less minimax with per-ply width pruning. `widths[i]`
// is the maximum number of moves to explore at ply i (0 = root).
// At each ply we fast-evaluate all legal moves, keep the top N, then
// recurse. Full evaluation only runs at leaves so the branching cost
// is dominated by cheap fast-evals.

function searchFromRoot(
  state: GameState,
  aiSide: Side,
  widths: readonly number[],
  jitter: number,
): ScoredMove | null {
  const allMoves = getAllMovesForSide(state.board, aiSide);
  if (allMoves.length === 0) return null;

  const enemySide: Side = aiSide === 'attackers' ? 'defenders' : 'attackers';
  const flat = flattenMoves(allMoves);

  // Root pre-filter: fast-evaluate every legal move.
  const rootScored = flat.map(m => {
    const next = simulateMove(state, m.piece, m.to);
    const score = next.gameOver && next.winner === aiSide
      ? 100000
      : evaluateBoardFast(next, aiSide);
    return { piece: m.piece, to: m.to, next, score };
  });
  rootScored.sort((a, b) => b.score - a.score);

  // Instant-win shortcut.
  if (rootScored[0]?.score === 100000) {
    const m = rootScored[0];
    return { piece: m.piece, to: m.to, score: 100000 };
  }

  const top = rootScored.slice(0, Math.min(widths[0], rootScored.length));

  let bestMove: ScoredMove | null = null;
  let bestScore = -Infinity;

  for (const aiMove of top) {
    let val: number;
    if (aiMove.next.gameOver) {
      val = aiMove.next.winner === aiSide ? 100000 : -100000;
    } else if (widths.length === 1) {
      // 1-ply search: just full-eval the resulting position.
      val = evaluateBoard(aiMove.next, aiSide);
    } else {
      // Recurse into the enemy's reply.
      val = minimax(aiMove.next, widths, 1, enemySide, aiSide);
    }

    const noisy = val + (Math.random() - 0.5) * jitter;
    if (noisy > bestScore) {
      bestScore = noisy;
      bestMove = { piece: aiMove.piece, to: aiMove.to, score: noisy };
    }
  }

  return bestMove;
}

function minimax(
  state: GameState,
  widths: readonly number[],
  ply: number,
  toMove: Side,
  aiSide: Side,
): number {
  if (state.gameOver) {
    return state.winner === aiSide ? 100000 : -100000;
  }
  if (ply >= widths.length) {
    return evaluateBoard(state, aiSide);
  }

  const allMoves = getAllMovesForSide(state.board, toMove);
  if (allMoves.length === 0) {
    // Side to move has no legal moves — they lose.
    return toMove === aiSide ? -100000 : 100000;
  }

  const flat = flattenMoves(allMoves);

  // Fast pre-filter at this ply. `toMove` is whose perspective we
  // order by — each side picks its own best-looking replies first.
  const scored = flat.map(m => {
    const next = simulateMove(state, m.piece, m.to);
    return { next, score: evaluateBoardFast(next, toMove) };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.min(widths[ply], scored.length));

  const enemySide: Side = toMove === 'attackers' ? 'defenders' : 'attackers';
  const isMaximizing = toMove === aiSide;
  let best = isMaximizing ? -Infinity : Infinity;

  for (const m of top) {
    const val = minimax(m.next, widths, ply + 1, enemySide, aiSide);
    if (isMaximizing) {
      if (val > best) best = val;
    } else {
      if (val < best) best = val;
    }
  }

  return best;
}

// ─── Main AI entry point ─────────────────────────────────────

export function getAIMove(
  state: GameState,
  aiSide: Side,
  difficulty: Difficulty,
): { from: Position; to: Position } | null {
  let move: ScoredMove | null = null;

  switch (difficulty) {
    case 'thrall':
      move = getAIMove_Thrall(state, aiSide);
      break;
    case 'karl':
      move = getAIMove_Karl(state, aiSide);
      break;
    case 'jarl':
      move = getAIMove_Jarl(state, aiSide);
      break;
  }

  if (!move) return null;

  return {
    from: move.piece.position,
    to: move.to,
  };
}
