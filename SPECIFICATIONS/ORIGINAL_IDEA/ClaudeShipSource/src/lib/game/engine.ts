import type { Position, Piece, Side, GameState, Move, WinReason } from '@/types/game';
import {
  BOARD_SIZE, isThrone, isCorner, isRestricted, samePos,
  createInitialPieces,
} from './constants';

// ─── Board helpers ────────────────────────────────────────────

function buildBoard(pieces: Piece[]): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
  );
  for (const p of pieces) {
    board[p.position.row][p.position.col] = p;
  }
  return board;
}

function pieceAt(board: (Piece | null)[][], pos: Position): Piece | null {
  if (pos.row < 0 || pos.row >= BOARD_SIZE || pos.col < 0 || pos.col >= BOARD_SIZE) return null;
  return board[pos.row][pos.col];
}

function inBounds(pos: Position): boolean {
  return pos.row >= 0 && pos.row < BOARD_SIZE && pos.col >= 0 && pos.col < BOARD_SIZE;
}

// ─── Movement ─────────────────────────────────────────────────

export function getValidMoves(board: (Piece | null)[][], piece: Piece): Position[] {
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
      // Blocked by another piece
      if (pieceAt(board, target)) break;

      // Only king can land on restricted squares
      if (isRestricted(target) && piece.type !== 'king') {
        // Can pass through empty throne but not stop
        if (isThrone(target)) {
          r += dr;
          c += dc;
          continue;
        }
        // Can't enter corners at all
        break;
      }

      moves.push(target);
      r += dr;
      c += dc;
    }
  }

  return moves;
}

// ─── Capture logic ────────────────────────────────────────────

function isHostileFor(board: (Piece | null)[][], pos: Position, targetSide: Side): boolean {
  // Corners are hostile to both sides
  if (isCorner(pos)) return true;

  // Throne is always hostile to attackers
  // Throne is hostile to defenders only when empty
  if (isThrone(pos)) {
    if (targetSide === 'attackers') return true;
    return !pieceAt(board, pos); // hostile to defenders when empty
  }

  // Check if there's an enemy piece
  const p = pieceAt(board, pos);
  if (!p) return false;

  return p.side !== targetSide;
}

function checkCustodialCapture(
  board: (Piece | null)[][],
  pos: Position,
  _movingSide: Side,
): Piece | null {
  const target = pieceAt(board, pos);
  if (!target) return null;
  if (target.type === 'king') return null; // King has special capture rules

  // Check both axes
  const targetSide = target.side;
  const dirs: [Position, Position][] = [
    [{ row: pos.row - 1, col: pos.col }, { row: pos.row + 1, col: pos.col }],
    [{ row: pos.row, col: pos.col - 1 }, { row: pos.row, col: pos.col + 1 }],
  ];

  for (const [a, b] of dirs) {
    if (!inBounds(a) || !inBounds(b)) continue;
    if (isHostileFor(board, a, targetSide) && isHostileFor(board, b, targetSide)) {
      return target;
    }
  }

  return null;
}

function checkKingCapture(board: (Piece | null)[][]): boolean {
  const king = findKing(board);
  if (!king) return false;
  const pos = king.position;

  // King cannot be captured on the board edge
  if (pos.row === 0 || pos.row === BOARD_SIZE - 1 || pos.col === 0 || pos.col === BOARD_SIZE - 1) {
    return false;
  }

  const adjacent: Position[] = [
    { row: pos.row - 1, col: pos.col },
    { row: pos.row + 1, col: pos.col },
    { row: pos.row, col: pos.col - 1 },
    { row: pos.row, col: pos.col + 1 },
  ];

  // On throne: all 4 sides must be attackers
  if (isThrone(pos)) {
    return adjacent.every(a => {
      const p = pieceAt(board, a);
      return p && p.side === 'attackers';
    });
  }

  // Adjacent to throne: 3 attackers + throne as 4th side
  const adjacentToThrone = adjacent.some(a => isThrone(a));
  if (adjacentToThrone) {
    return adjacent.every(a => {
      if (isThrone(a)) return true; // throne counts as hostile
      const p = pieceAt(board, a);
      return p && p.side === 'attackers';
    });
  }

  // Elsewhere: all 4 sides must be attackers
  return adjacent.every(a => {
    if (!inBounds(a)) return false;
    const p = pieceAt(board, a);
    return p && p.side === 'attackers';
  });
}

function checkShieldWallCaptures(
  board: (Piece | null)[][],
  movingSide: Side,
): Piece[] {
  const captured: Piece[] = [];
  const enemySide: Side = movingSide === 'attackers' ? 'defenders' : 'attackers';

  // Check all 4 edges
  const edges = [
    { fixed: 'row' as const, fixedVal: 0 },
    { fixed: 'row' as const, fixedVal: BOARD_SIZE - 1 },
    { fixed: 'col' as const, fixedVal: 0 },
    { fixed: 'col' as const, fixedVal: BOARD_SIZE - 1 },
  ];

  for (const edge of edges) {
    // Find contiguous groups of enemy pieces along this edge
    const len = BOARD_SIZE;
    let i = 0;

    while (i < len) {
      const pos = edge.fixed === 'row'
        ? { row: edge.fixedVal, col: i }
        : { row: i, col: edge.fixedVal };

      const p = pieceAt(board, pos);
      if (!p || p.side !== enemySide) {
        i++;
        continue;
      }

      // Found start of a group, find the end
      const group: Piece[] = [];
      let j = i;
      let allFlanked = true;

      while (j < len) {
        const gPos = edge.fixed === 'row'
          ? { row: edge.fixedVal, col: j }
          : { row: j, col: edge.fixedVal };

        const gp = pieceAt(board, gPos);
        if (!gp || gp.side !== enemySide) break;

        group.push(gp);

        // Check if this piece has an enemy directly inward
        const inwardPos = edge.fixed === 'row'
          ? { row: edge.fixedVal + (edge.fixedVal === 0 ? 1 : -1), col: j }
          : { row: j, col: edge.fixedVal + (edge.fixedVal === 0 ? 1 : -1) };

        const inwardPiece = pieceAt(board, inwardPos);
        if (!inwardPiece || inwardPiece.side !== movingSide) {
          allFlanked = false;
        }

        j++;
      }

      if (group.length >= 2 && allFlanked) {
        // Check brackets at both ends
        const beforePos = edge.fixed === 'row'
          ? { row: edge.fixedVal, col: i - 1 }
          : { row: i - 1, col: edge.fixedVal };

        const afterPos = edge.fixed === 'row'
          ? { row: edge.fixedVal, col: j }
          : { row: j, col: edge.fixedVal };

        const beforeBracketed = !inBounds(beforePos)
          ? false
          : isCorner(beforePos) || (pieceAt(board, beforePos)?.side === movingSide);

        const afterBracketed = !inBounds(afterPos)
          ? false
          : isCorner(afterPos) || (pieceAt(board, afterPos)?.side === movingSide);

        if (beforeBracketed && afterBracketed) {
          for (const gp of group) {
            if (gp.type !== 'king') {
              captured.push(gp);
            }
          }
        }
      }

      i = j;
    }
  }

  return captured;
}

// ─── Win conditions ───────────────────────────────────────────

function findKing(board: (Piece | null)[][]): Piece | null {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (p && p.type === 'king') return p;
    }
  }
  return null;
}

function checkDefenderWin(board: (Piece | null)[][]): WinReason | null {
  const king = findKing(board);
  if (!king) return null;

  // King reached a corner
  if (isCorner(king.position)) {
    return { kind: 'king-escaped' };
  }

  // Insufficient material: the king is captured by being hemmed in on
  // all 4 sides by attackers. Adjacent to the throne, the throne itself
  // counts as one hostile side, so the minimum attackers that can ever
  // capture the king is 3. With fewer than 3 attackers left on the
  // board, the attackers can no longer possibly win.
  let attackerCount = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (p && p.side === 'attackers') attackerCount++;
    }
  }
  if (attackerCount < 3) {
    return { kind: 'attackers-insufficient' };
  }

  return null;
}

function checkAttackerWin(board: (Piece | null)[][]): WinReason | null {
  // King captured
  if (checkKingCapture(board)) {
    return { kind: 'king-captured' };
  }

  return null;
}

function hasLegalMoves(board: (Piece | null)[][], side: Side): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (p && p.side === side) {
        if (getValidMoves(board, p).length > 0) return true;
      }
    }
  }
  return false;
}

// ─── State management ─────────────────────────────────────────

export function createInitialState(): GameState {
  const pieces = createInitialPieces();
  const board = buildBoard(pieces);

  return {
    board,
    pieces,
    currentTurn: 'attackers', // Attackers move first
    moveHistory: [],
    capturedByAttackers: [],
    capturedByDefenders: [],
    gameOver: false,
    winner: null,
    winReason: null,
    selectedPiece: null,
    validMoves: [],
    moveCount: 0,
    startTime: Date.now(),
  };
}

export function selectPiece(state: GameState, piece: Piece): GameState {
  if (state.gameOver) return state;
  if (piece.side !== state.currentTurn) return state;

  const validMoves = getValidMoves(state.board, piece);
  return {
    ...state,
    selectedPiece: piece,
    validMoves,
  };
}

export function deselectPiece(state: GameState): GameState {
  return {
    ...state,
    selectedPiece: null,
    validMoves: [],
  };
}

export function makeMove(state: GameState, from: Position, to: Position): GameState {
  const piece = state.board[from.row][from.col];
  if (!piece) return state;
  if (piece.side !== state.currentTurn) return state;

  const validMoves = getValidMoves(state.board, piece);
  if (!validMoves.some(m => samePos(m, to))) return state;

  // Execute the move
  const newPieces = state.pieces.map(p =>
    p.id === piece.id ? { ...p, position: { ...to } } : { ...p }
  );

  let board = buildBoard(newPieces);
  const movingSide = piece.side;
  const move: Move = { from, to, pieceId: piece.id };

  // Check captures
  const allCaptured: Piece[] = [];

  // Check 4 neighbors of the destination for custodial captures
  const neighbors: Position[] = [
    { row: to.row - 1, col: to.col },
    { row: to.row + 1, col: to.col },
    { row: to.row, col: to.col - 1 },
    { row: to.row, col: to.col + 1 },
  ];

  for (const n of neighbors) {
    if (!inBounds(n)) continue;
    const captured = checkCustodialCapture(board, n, movingSide);
    if (captured && captured.side !== movingSide) {
      allCaptured.push(captured);
    }
  }

  // Check shield wall captures
  const shieldWallCaptured = checkShieldWallCaptures(board, movingSide);
  for (const swc of shieldWallCaptured) {
    if (!allCaptured.some(c => c.id === swc.id)) {
      allCaptured.push(swc);
    }
  }

  // Remove captured pieces
  const capturedIds = new Set(allCaptured.map(c => c.id));
  const remainingPieces = newPieces.filter(p => !capturedIds.has(p.id));
  board = buildBoard(remainingPieces);

  // Update captured lists
  const newCapturedByAttackers = [...state.capturedByAttackers];
  const newCapturedByDefenders = [...state.capturedByDefenders];

  for (const c of allCaptured) {
    if (c.side === 'defenders') {
      newCapturedByAttackers.push(c);
    } else {
      newCapturedByDefenders.push(c);
    }
  }

  // Check win conditions
  let winner: Side | null = null;
  let winReason: WinReason | null = null;

  // Check king capture (attacker win)
  const attackerWin = checkAttackerWin(board);
  if (attackerWin) {
    winner = 'attackers';
    winReason = attackerWin;
  }

  // Check king escape (defender win)
  if (!winner) {
    const defenderWin = checkDefenderWin(board);
    if (defenderWin) {
      winner = 'defenders';
      winReason = defenderWin;
    }
  }

  const nextTurn: Side = movingSide === 'attackers' ? 'defenders' : 'attackers';

  // Check if next player has legal moves
  if (!winner && !hasLegalMoves(board, nextTurn)) {
    winner = movingSide;
    winReason = { kind: 'no-legal-moves', stuckSide: nextTurn };
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
    selectedPiece: null,
    validMoves: [],
    moveCount: state.moveCount + 1,
  };
}

export function getAllMovesForSide(board: (Piece | null)[][], side: Side): { piece: Piece; moves: Position[] }[] {
  const result: { piece: Piece; moves: Position[] }[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (p && p.side === side) {
        const moves = getValidMoves(board, p);
        if (moves.length > 0) {
          result.push({ piece: p, moves });
        }
      }
    }
  }
  return result;
}
