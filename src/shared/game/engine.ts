// ABOUT: Hnefatafl game engine — movement, captures, win conditions.
// ABOUT: Pure functions; makeMove returns a new GameState, no mutation.

import type { GameState, Position, Piece, Side, Move, WinReason } from './types';
import {
  BOARD_SIZE,
  MAX_MOVES,
  isThrone,
  isCorner,
  isRestricted,
  samePos,
  createInitialPieces,
  type IdCounter,
} from './constants';

// ---------------------------------------------------------------------------
// Internal board helpers
// ---------------------------------------------------------------------------

function buildBoard(pieces: Piece[]): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null),
  );
  for (const p of pieces) {
    board[p.position.row]![p.position.col] = p;
  }
  return board;
}

function inBounds(pos: Position): boolean {
  return pos.row >= 0 && pos.row < BOARD_SIZE && pos.col >= 0 && pos.col < BOARD_SIZE;
}

function pieceAt(board: (Piece | null)[][], pos: Position): Piece | null {
  if (!inBounds(pos)) return null;
  return board[pos.row]![pos.col] ?? null;
}

function findKingOnBoard(board: (Piece | null)[][]): Piece | null {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r]![c];
      if (p && p.type === 'king') return p;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export function getPieceAt(board: (Piece | null)[][], pos: Position): Piece | null {
  if (!inBounds(pos)) return null;
  return board[pos.row]![pos.col] ?? null;
}

export function findKing(pieces: Piece[]): Piece | undefined {
  return pieces.find(p => p.type === 'king');
}

/** Returns true when a square counts as a hostile entity for capture purposes.
 *  Corners are hostile to both sides. Throne is always hostile to attackers.
 *  Throne is hostile to defenders only when unoccupied. Enemy pieces are hostile. */
export function isHostileSquare(
  board: (Piece | null)[][],
  pos: Position,
  targetSide: Side,
): boolean {
  if (isCorner(pos)) return true;
  if (isThrone(pos)) {
    if (targetSide === 'attackers') return true;
    return pieceAt(board, pos) === null;
  }
  const p = pieceAt(board, pos);
  if (!p) return false;
  return p.side !== targetSide;
}

export { isThrone, isCorner };

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export function createInitialState(opts?: {
  now?: () => number;
  idCounter?: IdCounter;
}): GameState {
  const now = opts?.now ?? (() => Date.now());
  const pieces = createInitialPieces(opts?.idCounter);
  const board = buildBoard(pieces);
  return {
    board,
    pieces,
    currentTurn: 'attackers',
    moveHistory: [],
    capturedByAttackers: [],
    capturedByDefenders: [],
    gameOver: false,
    winner: null,
    winReason: null,
    moveCount: 0,
    startTime: now(),
  };
}

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

export function getValidMoves(state: GameState, piece: Piece): Position[] {
  const { board } = state;
  const moves: Position[] = [];
  const dirs = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  for (const { dr, dc } of dirs) {
    let r = piece.position.row + dr;
    let c = piece.position.col + dc;

    while (inBounds({ row: r, col: c })) {
      const target = { row: r, col: c };
      if (pieceAt(board, target)) break;

      if (isRestricted(target) && piece.type !== 'king') {
        if (isThrone(target)) {
          // Non-king may pass through empty throne but not stop
          r += dr;
          c += dc;
          continue;
        }
        // Non-king cannot enter corners at all
        break;
      }

      moves.push(target);
      r += dr;
      c += dc;
    }
  }

  return moves;
}

export function getAllMovesForSide(
  board: (Piece | null)[][],
  side: Side,
): { piece: Piece; moves: Position[] }[] {
  const result: { piece: Piece; moves: Position[] }[] = [];
  // Build a minimal state view so getValidMoves can accept it
  const stateView = { board } as GameState;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r]![c];
      if (p && p.side === side) {
        const moves = getValidMoves(stateView, p);
        if (moves.length > 0) {
          result.push({ piece: p, moves });
        }
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Capture logic (internal)
// ---------------------------------------------------------------------------

function checkCustodialCapture(
  board: (Piece | null)[][],
  pos: Position,
): Piece | null {
  const target = pieceAt(board, pos);
  if (!target || target.type === 'king') return null;

  const targetSide = target.side;
  const axes: [Position, Position][] = [
    [{ row: pos.row - 1, col: pos.col }, { row: pos.row + 1, col: pos.col }],
    [{ row: pos.row, col: pos.col - 1 }, { row: pos.row, col: pos.col + 1 }],
  ];

  for (const [a, b] of axes) {
    if (!inBounds(a) || !inBounds(b)) continue;
    if (isHostileSquare(board, a, targetSide) && isHostileSquare(board, b, targetSide)) {
      return target;
    }
  }
  return null;
}

function checkKingCapture(board: (Piece | null)[][]): boolean {
  const king = findKingOnBoard(board);
  if (!king) return false;
  const pos = king.position;

  // Edge immunity — king cannot be captured on any board edge
  if (pos.row === 0 || pos.row === BOARD_SIZE - 1 || pos.col === 0 || pos.col === BOARD_SIZE - 1) {
    return false;
  }

  const adjacent: Position[] = [
    { row: pos.row - 1, col: pos.col },
    { row: pos.row + 1, col: pos.col },
    { row: pos.row, col: pos.col - 1 },
    { row: pos.row, col: pos.col + 1 },
  ];

  if (isThrone(pos)) {
    // On throne: all 4 adjacent squares must be attackers
    return adjacent.every(a => {
      const p = pieceAt(board, a);
      return p?.side === 'attackers';
    });
  }

  // Adjacent to throne: 3 attackers + throne counts as 4th
  if (adjacent.some(a => isThrone(a))) {
    return adjacent.every(a => {
      if (isThrone(a)) return true;
      const p = pieceAt(board, a);
      return p?.side === 'attackers';
    });
  }

  // Elsewhere: all 4 sides must be attackers
  return adjacent.every(a => {
    const p = pieceAt(board, a);
    return p?.side === 'attackers';
  });
}

function checkShieldWallCaptures(
  board: (Piece | null)[][],
  movingSide: Side,
): Piece[] {
  const captured: Piece[] = [];
  const enemySide: Side = movingSide === 'attackers' ? 'defenders' : 'attackers';

  const edges = [
    { fixed: 'row' as const, fixedVal: 0 },
    { fixed: 'row' as const, fixedVal: BOARD_SIZE - 1 },
    { fixed: 'col' as const, fixedVal: 0 },
    { fixed: 'col' as const, fixedVal: BOARD_SIZE - 1 },
  ];

  for (const edge of edges) {
    let i = 0;
    while (i < BOARD_SIZE) {
      const pos: Position = edge.fixed === 'row'
        ? { row: edge.fixedVal, col: i }
        : { row: i, col: edge.fixedVal };

      const p = pieceAt(board, pos);
      if (!p || p.side !== enemySide) { i++; continue; }

      // Collect contiguous group of enemy pieces along this edge
      const group: Piece[] = [];
      let j = i;
      let allFlanked = true;

      while (j < BOARD_SIZE) {
        const gPos: Position = edge.fixed === 'row'
          ? { row: edge.fixedVal, col: j }
          : { row: j, col: edge.fixedVal };

        const gp = pieceAt(board, gPos);
        if (!gp || gp.side !== enemySide) break;

        group.push(gp);

        // Each piece in the group must have a friendly piece directly inward
        const inwardPos: Position = edge.fixed === 'row'
          ? { row: edge.fixedVal + (edge.fixedVal === 0 ? 1 : -1), col: j }
          : { row: j, col: edge.fixedVal + (edge.fixedVal === 0 ? 1 : -1) };

        const inwardPiece = pieceAt(board, inwardPos);
        if (!inwardPiece || inwardPiece.side !== movingSide) {
          allFlanked = false;
        }

        j++;
      }

      if (group.length >= 2 && allFlanked) {
        // Check that both ends of the group are bracketed
        const beforePos: Position = edge.fixed === 'row'
          ? { row: edge.fixedVal, col: i - 1 }
          : { row: i - 1, col: edge.fixedVal };

        const afterPos: Position = edge.fixed === 'row'
          ? { row: edge.fixedVal, col: j }
          : { row: j, col: edge.fixedVal };

        const beforeBracketed = inBounds(beforePos)
          && (isCorner(beforePos) || pieceAt(board, beforePos)?.side === movingSide);

        const afterBracketed = inBounds(afterPos)
          && (isCorner(afterPos) || pieceAt(board, afterPos)?.side === movingSide);

        if (beforeBracketed && afterBracketed) {
          for (const gp of group) {
            if (gp.type !== 'king') captured.push(gp);
          }
        }
      }

      i = j;
    }
  }

  return captured;
}

// ---------------------------------------------------------------------------
// Win condition (public)
// ---------------------------------------------------------------------------

export function checkWinCondition(state: GameState): WinReason | null {
  const { board, currentTurn } = state;
  const king = findKingOnBoard(board);

  // King-escaped: king reached a corner
  if (king && isCorner(king.position)) {
    return { kind: 'king-escaped' };
  }

  // Attackers-insufficient: fewer than 3 attackers remain
  let attackerCount = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r]![c]?.side === 'attackers') attackerCount++;
    }
  }
  if (attackerCount < 3) {
    return { kind: 'attackers-insufficient' };
  }

  // King-captured
  if (checkKingCapture(board)) {
    return { kind: 'king-captured' };
  }

  // No legal moves for current player
  const stateView = { board } as GameState;
  const hasAnyMove = getAllMovesForSide(board, currentTurn).length > 0
    || (() => {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const p = board[r]![c];
          if (p && p.side === currentTurn && getValidMoves(stateView, p).length > 0) return true;
        }
      }
      return false;
    })();

  if (!hasAnyMove) {
    return { kind: 'no-legal-moves', stuckSide: currentTurn };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Move application
// ---------------------------------------------------------------------------

export function makeMove(state: GameState, from: Position, to: Position): GameState {
  const piece = pieceAt(state.board, from);
  if (!piece || piece.side !== state.currentTurn) return state;

  const validMoves = getValidMoves(state, piece);
  if (!validMoves.some(m => samePos(m, to))) return state;

  const move: Move = { from, to, pieceId: piece.id };
  const movingSide = piece.side;

  // Move piece to new position
  const newPieces = state.pieces.map(p =>
    p.id === piece.id ? { ...p, position: { ...to } } : { ...p },
  );
  let board = buildBoard(newPieces);

  // Custodial captures — check 4 neighbours of destination
  const neighbours: Position[] = [
    { row: to.row - 1, col: to.col },
    { row: to.row + 1, col: to.col },
    { row: to.row, col: to.col - 1 },
    { row: to.row, col: to.col + 1 },
  ];

  const allCaptured: Piece[] = [];
  for (const n of neighbours) {
    if (!inBounds(n)) continue;
    const c = checkCustodialCapture(board, n);
    if (c && c.side !== movingSide) allCaptured.push(c);
  }

  // Shield wall captures — deduplicated by ID
  for (const swc of checkShieldWallCaptures(board, movingSide)) {
    if (!allCaptured.some(c => c.id === swc.id)) allCaptured.push(swc);
  }

  // Remove captured pieces
  const capturedIds = new Set(allCaptured.map(c => c.id));
  const remainingPieces = newPieces.filter(p => !capturedIds.has(p.id));
  board = buildBoard(remainingPieces);

  const newCapturedByAttackers = [...state.capturedByAttackers];
  const newCapturedByDefenders = [...state.capturedByDefenders];
  for (const c of allCaptured) {
    if (c.side === 'defenders') newCapturedByAttackers.push(c);
    else newCapturedByDefenders.push(c);
  }

  const newMoveCount = state.moveCount + 1;
  const nextTurn: Side = movingSide === 'attackers' ? 'defenders' : 'attackers';

  // Draw on move limit
  if (newMoveCount >= MAX_MOVES) {
    return {
      ...state,
      board,
      pieces: remainingPieces,
      currentTurn: nextTurn,
      moveHistory: [...state.moveHistory, move],
      capturedByAttackers: newCapturedByAttackers,
      capturedByDefenders: newCapturedByDefenders,
      gameOver: true,
      winner: null,
      winReason: null,
      moveCount: newMoveCount,
    };
  }

  // Check win conditions on the post-capture board
  let winner: Side | null = null;
  let winReason: WinReason | null = null;

  // Attacker win (king captured) — checked before toggling turn
  if (checkKingCapture(board)) {
    winner = 'attackers';
    winReason = { kind: 'king-captured' };
  }

  // Defender win (king escaped or insufficient attackers)
  if (!winner) {
    const defenderWin = (() => {
      const king = findKingOnBoard(board);
      if (king && isCorner(king.position)) return { kind: 'king-escaped' as const };
      let atkCount = 0;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (board[r]![c]?.side === 'attackers') atkCount++;
        }
      }
      if (atkCount < 3) return { kind: 'attackers-insufficient' as const };
      return null;
    })();
    if (defenderWin) {
      winner = 'defenders';
      winReason = defenderWin;
    }
  }

  // No legal moves for the next player
  if (!winner) {
    const nextStateView = { board, currentTurn: nextTurn } as GameState;
    const nextHasMoves = getAllMovesForSide(board, nextTurn).length > 0
      || (() => {
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            const p = board[r]![c];
            if (p && p.side === nextTurn && getValidMoves(nextStateView, p).length > 0) return true;
          }
        }
        return false;
      })();
    if (!nextHasMoves) {
      winner = movingSide;
      winReason = { kind: 'no-legal-moves', stuckSide: nextTurn };
    }
  }

  return {
    ...state,
    board,
    pieces: remainingPieces,
    currentTurn: nextTurn,
    moveHistory: [...state.moveHistory, move],
    capturedByAttackers: newCapturedByAttackers,
    capturedByDefenders: newCapturedByDefenders,
    gameOver: winner !== null,
    winner,
    winReason,
    moveCount: newMoveCount,
  };
}
