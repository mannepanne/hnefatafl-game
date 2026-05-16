// ABOUT: Engine tests — setup, legal moves, captures, win conditions, purity.
// ABOUT: Written before implementation (TDD); all cases should fail initially.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInitialState,
  getValidMoves,
  getAllMovesForSide,
  makeMove,
  checkWinCondition,
  getPieceAt,
  findKing,
  isHostileSquare,
} from '../../../src/shared/game/engine';
import { MAX_MOVES, BOARD_SIZE, makeIdCounter } from '../../../src/shared/game/constants';
import type { GameState, Piece, Position } from '../../../src/shared/game/types';
import {
  makeState,
  king,
  defender,
  attacker,
  resetIds,
} from './fixtures/boards';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pos(row: number, col: number): Position {
  return { row, col };
}

function moveTo(state: GameState, from: Position, to: Position): GameState {
  return makeMove(state, from, to);
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('createInitialState', () => {
  it('produces 37 pieces total', () => {
    const s = createInitialState();
    expect(s.pieces).toHaveLength(37);
  });

  it('places exactly 1 king at {5,5}', () => {
    const s = createInitialState();
    const kings = s.pieces.filter(p => p.type === 'king');
    expect(kings).toHaveLength(1);
    expect(kings[0]!.position).toEqual({ row: 5, col: 5 });
  });

  it('places 12 defenders', () => {
    const s = createInitialState();
    expect(s.pieces.filter(p => p.type === 'defender')).toHaveLength(12);
  });

  it('places 24 attackers', () => {
    const s = createInitialState();
    expect(s.pieces.filter(p => p.type === 'attacker')).toHaveLength(24);
  });

  it('sets attackers to move first', () => {
    const s = createInitialState();
    expect(s.currentTurn).toBe('attackers');
  });

  it('starts with moveCount = 0', () => {
    const s = createInitialState();
    expect(s.moveCount).toBe(0);
  });

  it('uses provided now() for startTime', () => {
    const s = createInitialState({ now: () => 12345 });
    expect(s.startTime).toBe(12345);
  });

  it('board cell matches pieces list', () => {
    const s = createInitialState();
    for (const p of s.pieces) {
      expect(s.board[p.position.row]![p.position.col]).toBe(p);
    }
  });

  it('produces deterministic IDs with injected idCounter', () => {
    const counter = makeIdCounter();
    const s1 = createInitialState({ idCounter: counter });
    const counter2 = makeIdCounter();
    const s2 = createInitialState({ idCounter: counter2 });
    expect(s1.pieces.map(p => p.id)).toEqual(s2.pieces.map(p => p.id));
  });
});

// ---------------------------------------------------------------------------
// Helpers: getPieceAt, findKing, isHostileSquare
// ---------------------------------------------------------------------------

describe('getPieceAt', () => {
  it('returns the piece at a valid occupied cell', () => {
    const s = createInitialState();
    const k = findKing(s.pieces)!;
    expect(getPieceAt(s.board, k.position)).toBe(k);
  });

  it('returns null for an empty cell', () => {
    const s = createInitialState();
    expect(getPieceAt(s.board, pos(0, 0))).toBeNull();
  });

  it('returns null for out-of-bounds positions', () => {
    const s = createInitialState();
    expect(getPieceAt(s.board, pos(-1, 0))).toBeNull();
    expect(getPieceAt(s.board, pos(0, 11))).toBeNull();
    expect(getPieceAt(s.board, pos(11, 5))).toBeNull();
  });
});

describe('findKing', () => {
  it('finds the king in initial state', () => {
    const s = createInitialState();
    const k = findKing(s.pieces);
    expect(k?.type).toBe('king');
  });

  it('returns undefined when king is absent', () => {
    const pieces = [attacker(2, 2)];
    expect(findKing(pieces)).toBeUndefined();
  });
});

describe('isHostileSquare', () => {
  let emptyBoard: (Piece | null)[][];
  beforeEach(() => {
    emptyBoard = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  });

  it('corners are hostile to both sides', () => {
    expect(isHostileSquare(emptyBoard, pos(0, 0), 'attackers')).toBe(true);
    expect(isHostileSquare(emptyBoard, pos(0, 0), 'defenders')).toBe(true);
    expect(isHostileSquare(emptyBoard, pos(10, 10), 'attackers')).toBe(true);
  });

  it('throne is always hostile to attackers', () => {
    expect(isHostileSquare(emptyBoard, pos(5, 5), 'attackers')).toBe(true);
  });

  it('throne is hostile to defenders when empty', () => {
    expect(isHostileSquare(emptyBoard, pos(5, 5), 'defenders')).toBe(true);
  });

  it('throne is NOT hostile to defenders when occupied', () => {
    const board = emptyBoard;
    const k = king(5, 5);
    board[5]![5] = k;
    expect(isHostileSquare(board, pos(5, 5), 'defenders')).toBe(false);
  });

  it('normal squares are not hostile', () => {
    expect(isHostileSquare(emptyBoard, pos(3, 3), 'attackers')).toBe(false);
    expect(isHostileSquare(emptyBoard, pos(3, 3), 'defenders')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getValidMoves
// ---------------------------------------------------------------------------

describe('getValidMoves', () => {
  beforeEach(resetIds);

  it('attacker on open board can reach entire row and column', () => {
    const atk = attacker(5, 0);
    const s = makeState([atk], 'attackers');
    const moves = getValidMoves(s, atk);
    // Can reach row 5 (cols 1-10) and col 0 (rows 0-4 and 6-10), but not corners on col 0 or row 5
    expect(moves.some(m => m.row === 5 && m.col === 10)).toBe(true);
    expect(moves.some(m => m.row === 0 && m.col === 0)).toBe(false); // corner blocked for non-king
  });

  it('piece cannot pass through another piece', () => {
    const atk1 = attacker(5, 0);
    const atk2 = attacker(5, 3);
    const s = makeState([atk1, atk2], 'attackers');
    const moves = getValidMoves(s, atk1);
    expect(moves.some(m => m.row === 5 && m.col === 3)).toBe(false); // blocked by atk2
    expect(moves.some(m => m.row === 5 && m.col === 5)).toBe(false); // beyond atk2
    expect(moves.some(m => m.row === 5 && m.col === 2)).toBe(true);  // can stop before atk2
  });

  it('non-king may pass through throne but not stop there', () => {
    const atk = attacker(5, 0);
    const s = makeState([atk], 'attackers');
    const moves = getValidMoves(s, atk);
    expect(moves.some(m => m.row === 5 && m.col === 5)).toBe(false); // throne blocked
    expect(moves.some(m => m.row === 5 && m.col === 6)).toBe(true);  // can stop beyond throne
  });

  it('non-king cannot stop at any corner', () => {
    const atk = attacker(0, 5);
    const s = makeState([atk], 'attackers');
    const moves = getValidMoves(s, atk);
    expect(moves.some(m => m.row === 0 && m.col === 0)).toBe(false);
    expect(moves.some(m => m.row === 0 && m.col === 10)).toBe(false);
    // But can stop adjacent to corner
    expect(moves.some(m => m.row === 0 && m.col === 1)).toBe(true);
  });

  it('king may stop on throne', () => {
    // Place king off-throne, throne empty
    const k = king(5, 3);
    const s = makeState([k], 'defenders');
    const moves = getValidMoves(s, k);
    expect(moves.some(m => m.row === 5 && m.col === 5)).toBe(true);
  });

  it('king may stop at a corner', () => {
    const k = king(0, 5);
    const s = makeState([k], 'defenders');
    const moves = getValidMoves(s, k);
    expect(moves.some(m => m.row === 0 && m.col === 0)).toBe(true);
    expect(moves.some(m => m.row === 0 && m.col === 10)).toBe(true);
  });

  it('piece cannot land on an occupied square', () => {
    const atk1 = attacker(5, 0);
    const atk2 = attacker(5, 4);
    const s = makeState([atk1, atk2], 'attackers');
    const moves = getValidMoves(s, atk1);
    expect(moves.some(m => m.row === 5 && m.col === 4)).toBe(false);
  });

  it('returns empty list when piece is entirely blocked', () => {
    const k = king(5, 5);
    const pieces = [
      k,
      attacker(5, 4), attacker(5, 6),
      attacker(4, 5), attacker(6, 5),
    ];
    const s = makeState(pieces, 'defenders');
    expect(getValidMoves(s, k)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getAllMovesForSide
// ---------------------------------------------------------------------------

describe('getAllMovesForSide', () => {
  it('returns only pieces with at least one legal move, all from the requested side', () => {
    const s = createInitialState();
    const result = getAllMovesForSide(s.board, 'attackers');
    // Some initial attackers are fully blocked (e.g. {0,5}, {10,5}, {5,0}, {5,10})
    expect(result.every(e => e.piece.side === 'attackers')).toBe(true);
    expect(result.every(e => e.moves.length > 0)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(24);
  });

  it('does not include pieces from the other side', () => {
    const s = createInitialState();
    const moves = getAllMovesForSide(s.board, 'defenders');
    expect(moves.every(m => m.piece.side === 'defenders')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// makeMove — basic transitions
// ---------------------------------------------------------------------------

describe('makeMove — basic transitions', () => {
  beforeEach(resetIds);

  // {1,5} (the top-T inward attacker) can slide left or down to {2,5} in the initial state.
  // {5,3} defender can slide up to {4,3} when it is defenders' turn.
  it('toggles currentTurn after a move', () => {
    const s = createInitialState();
    const s2 = moveTo(s, pos(1, 5), pos(1, 4));
    expect(s2.currentTurn).toBe('defenders');
    const s3 = moveTo(s2, pos(5, 3), pos(4, 3));
    expect(s3.currentTurn).toBe('attackers');
  });

  it('increments moveCount', () => {
    const s = createInitialState();
    const s2 = moveTo(s, pos(1, 5), pos(1, 4));
    expect(s2.moveCount).toBe(1);
  });

  it('updates the piece position in board and pieces list', () => {
    const s = createInitialState();
    const s2 = moveTo(s, pos(1, 5), pos(2, 5));
    expect(getPieceAt(s2.board, pos(1, 5))).toBeNull();
    const movedPiece = getPieceAt(s2.board, pos(2, 5));
    expect(movedPiece).not.toBeNull();
    expect(movedPiece?.position).toEqual(pos(2, 5));
  });

  it('does not mutate the input state (purity)', () => {
    const s = createInitialState();
    const boardSnapshot = JSON.stringify(s.board.map(row => row.map(p => p?.id ?? null)));
    const piecesSnapshot = JSON.stringify(s.pieces.map(p => ({ id: p.id, pos: p.position })));
    moveTo(s, pos(1, 5), pos(2, 5));
    expect(JSON.stringify(s.board.map(row => row.map(p => p?.id ?? null)))).toBe(boardSnapshot);
    expect(JSON.stringify(s.pieces.map(p => ({ id: p.id, pos: p.position })))).toBe(piecesSnapshot);
  });

  it('appends to moveHistory', () => {
    const s = createInitialState();
    const s2 = moveTo(s, pos(1, 5), pos(2, 5));
    expect(s2.moveHistory).toHaveLength(1);
    expect(s2.moveHistory[0]).toMatchObject({ from: pos(1, 5), to: pos(2, 5) });
  });
});

// ---------------------------------------------------------------------------
// Captures — custodial
// ---------------------------------------------------------------------------

describe('custodial capture', () => {
  beforeEach(resetIds);

  it('captures an attacker sandwiched between two defenders', () => {
    // def1 at {5,6}, atk at {5,7}, def2 at {5,9} moves to {5,8}
    // After move: def1–atk1–def2 on one axis → atk1 captured
    const def1 = defender(5, 6, 'def_0');
    const atk1 = attacker(5, 7, 'atk_1');
    const def2 = defender(5, 9, 'def_2');
    const pieces = [def1, atk1, def2, king(9, 9, 'king_3')];
    const s = makeState(pieces, 'defenders');
    const s2 = moveTo(s, pos(5, 9), pos(5, 8));
    expect(s2.pieces.find(p => p.id === 'atk_1')).toBeUndefined();
    expect(s2.capturedByDefenders.find(p => p.id === 'atk_1')).toBeDefined();
  });

  it('captures a defender sandwiched between two attackers', () => {
    // a1 at {3,2}, d1 at {3,3}, a2 at {3,6} — a2 moves to {3,4}, sandwiching d1
    const a1 = attacker(3, 2, 'a1');
    const d1 = defender(3, 3, 'd1');
    const a2 = attacker(3, 6, 'a2');
    const k = king(9, 9, 'kk');
    const s = makeState([a1, d1, a2, k], 'attackers');
    const s2 = moveTo(s, pos(3, 6), pos(3, 4));
    expect(s2.pieces.find(p => p.id === 'd1')).toBeUndefined();
    expect(s2.capturedByAttackers.find(p => p.id === 'd1')).toBeDefined();
  });

  it('does not capture the king via custodial', () => {
    // King flanked on two sides should not die (requires all 4 sides or special throne rules)
    const k = king(5, 5, 'king');
    const a1 = attacker(5, 4, 'a1');
    const a2 = attacker(5, 7, 'a2');
    // a2 moves to {5,6}, flanking king on two sides
    const s = makeState([k, a1, a2], 'attackers');
    const s2 = moveTo(s, pos(5, 7), pos(5, 6));
    expect(s2.pieces.find(p => p.id === 'king')).toBeDefined();
  });

  it('captures against a corner (corner counts as hostile)', () => {
    // Defender at {0,1}, attacker at {0,2}: def sandwiched between atk and corner {0,0}
    // Move attacker from {0,2} to ... wait, we need attacker to move to the other side.
    // Setup: def at {0,1}, attacker moves to {0,0} is a corner. Non-king can't stop there.
    // Better: def at {1,0}, atk at {2,0}, corner is {0,0} — atk moves to {1,0} — can't, occupied
    // def at {0,1}, empty corner at {0,0}; attacker at {0,3} moves to {0,2}
    // After: atk at {0,2}, def at {0,1}, corner at {0,0} — def captured (sandwiched)
    const def1 = defender(0, 1, 'd1');
    const atk1 = attacker(0, 3, 'a1');
    const k = king(9, 9, 'kk');
    const s = makeState([def1, atk1, k], 'attackers');
    const s2 = moveTo(s, pos(0, 3), pos(0, 2));
    expect(s2.pieces.find(p => p.id === 'd1')).toBeUndefined();
    expect(s2.capturedByAttackers.find(p => p.id === 'd1')).toBeDefined();
  });

  it('captures against empty throne (throne hostile to attackers)', () => {
    // Attacker sandwiched between defender and empty throne
    // atk at {5,4}, def at {5,3} moves to {5,3}—no, def moves to flank:
    // def at {5,2}, atk at {5,4} — def moves to {5,4}? No, atk is there.
    // def at {5,2}, atk at {5,4}, empty throne at {5,5} — move def from {5,2} to {5,3}
    // Now atk at {5,4} sandwiched between def at {5,3} and throne at {5,5} — captured
    const def1 = defender(5, 2, 'd1');
    const atk1 = attacker(5, 4, 'a1');
    const k = king(0, 0, 'kk');
    const s = makeState([def1, atk1, k], 'defenders');
    const s2 = moveTo(s, pos(5, 2), pos(5, 3));
    expect(s2.pieces.find(p => p.id === 'a1')).toBeUndefined();
    expect(s2.capturedByDefenders.find(p => p.id === 'a1')).toBeDefined();
  });

  it('throne occupied by king does NOT count as hostile to defenders', () => {
    // Defender sandwiched between attacker and occupied throne (king there) — should NOT be captured
    const k = king(5, 5, 'king');
    const def1 = defender(5, 4, 'd1');
    const atk1 = attacker(5, 2, 'a1');
    // Move atk1 to {5,3}: def1 at {5,4} would be sandwiched between atk at {5,3} and throne at {5,5}
    // But throne occupied by king is NOT hostile to defenders — so no capture
    const s = makeState([k, def1, atk1], 'attackers');
    const s2 = moveTo(s, pos(5, 2), pos(5, 3));
    expect(s2.pieces.find(p => p.id === 'd1')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// King capture
// ---------------------------------------------------------------------------

describe('king capture', () => {
  beforeEach(resetIds);

  it('king is NOT captured when flanked on two sides away from throne', () => {
    // King at {3,3}, attackers at {3,2} (left) and {3,5} moves to {3,4} (right).
    // Two sides only — not captured. Extra attackers ensure attackers-insufficient doesn't fire.
    const k = king(3, 3, 'king');
    const a1 = attacker(3, 2, 'a1');
    const a3 = attacker(3, 5, 'a3');
    const aX = attacker(8, 8, 'aX'); // keeps attacker count >= 3
    const aY = attacker(9, 8, 'aY');
    const s = makeState([k, a1, a3, aX, aY], 'attackers');
    const s2 = moveTo(s, pos(3, 5), pos(3, 4));
    expect(s2.pieces.find(p => p.id === 'king')).toBeDefined();
    expect(s2.gameOver).toBe(false);
  });

  it('king is captured when surrounded on all 4 sides away from throne and edge', () => {
    const k = king(3, 3, 'king');
    const a1 = attacker(3, 2, 'a1');
    const a2 = attacker(3, 4, 'a2');
    const a3 = attacker(2, 3, 'a3');
    const a4 = attacker(4, 4, 'a4');
    // a4 moves to {4,3} to complete the surround
    const s = makeState([k, a1, a2, a3, a4], 'attackers');
    const s2 = moveTo(s, pos(4, 4), pos(4, 3));
    expect(s2.gameOver).toBe(true);
    expect(s2.winner).toBe('attackers');
    expect(s2.winReason?.kind).toBe('king-captured');
  });

  it('king on any board edge cannot be captured (edge immunity)', () => {
    // King at top edge {0,5} — a2 moves to {1,5} completing below+left pressure.
    // King can still escape right ({0,6} is free), so no-legal-moves won't fire.
    const k = king(0, 5, 'king');
    const a1 = attacker(0, 4, 'a1');
    const a2 = attacker(2, 5, 'a2');
    const aX = attacker(8, 8, 'aX');
    const s = makeState([k, a1, a2, aX], 'attackers');
    const s2 = moveTo(s, pos(2, 5), pos(1, 5));
    // King flanked on left and below; top edge; can escape right — not captured
    expect(s2.gameOver).toBe(false);
    expect(s2.pieces.find(p => p.id === 'king')).toBeDefined();
  });

  it('king at left edge with 3 surrounding attackers is NOT captured', () => {
    // King at {5,0}: a1 above, a3 comes from right. King can still escape down.
    const k = king(5, 0, 'king');
    const a1 = attacker(4, 0, 'a1');
    const a3 = attacker(5, 3, 'a3');
    const aX = attacker(8, 8, 'aX');
    const s = makeState([k, a1, a3, aX], 'attackers');
    const s2 = moveTo(s, pos(5, 3), pos(5, 1));
    // King: above=a1, right=a3; can escape down or up past a1 — not captured
    expect(s2.gameOver).toBe(false);
    expect(s2.pieces.find(p => p.id === 'king')).toBeDefined();
  });

  it('king on throne requires all 4 cardinal attackers', () => {
    const k = king(5, 5, 'king');
    const a1 = attacker(5, 4, 'a1');
    const a2 = attacker(5, 6, 'a2');
    const a3 = attacker(4, 5, 'a3');
    const a4 = attacker(6, 6, 'a4');
    // a4 moves to {6,5} to complete the surround
    const s = makeState([k, a1, a2, a3, a4], 'attackers');
    const s2 = moveTo(s, pos(6, 6), pos(6, 5));
    expect(s2.gameOver).toBe(true);
    expect(s2.winner).toBe('attackers');
    expect(s2.winReason?.kind).toBe('king-captured');
  });

  it('king on throne with only 3 attackers is NOT captured', () => {
    const k = king(5, 5, 'king');
    const a1 = attacker(5, 4, 'a1');
    const a2 = attacker(5, 6, 'a2');
    const a3 = attacker(4, 5, 'a3');
    const a4 = attacker(6, 7, 'a4');
    const s = makeState([k, a1, a2, a3, a4], 'attackers');
    const s2 = moveTo(s, pos(6, 7), pos(6, 6));
    expect(s2.gameOver).toBe(false);
    expect(s2.pieces.find(p => p.id === 'king')).toBeDefined();
  });

  it('king adjacent to throne: 3 attackers + throne counts as 4th', () => {
    // King at {5,4}: adjacent squares are {4,4}, {6,4}, {5,3}, {5,5}=throne.
    // Throne counts as 4th side. Need attackers at {5,3}, {4,4}, and a3 moves to {6,4}.
    const k = king(5, 4, 'king');
    const a1 = attacker(5, 3, 'a1');  // left of king
    const a2 = attacker(4, 4, 'a2');  // above king
    const a3 = attacker(6, 5, 'a3');  // starts off, moves to {6,4} below king
    // a3 moves to {6,4}: surround = a1(left), a2(above), a3(below), throne(right) → captured
    const s = makeState([k, a1, a2, a3], 'attackers');
    const s2 = moveTo(s, pos(6, 5), pos(6, 4));
    expect(s2.gameOver).toBe(true);
    expect(s2.winner).toBe('attackers');
    expect(s2.winReason?.kind).toBe('king-captured');
  });
});

// ---------------------------------------------------------------------------
// Shield wall capture
// ---------------------------------------------------------------------------

describe('shield wall capture', () => {
  beforeEach(resetIds);

  it('captures a group of 2 attackers pinned against top edge', () => {
    // Two attackers at {0,4} and {0,5}, defenders inward at {1,4} and {1,5},
    // bracketing defender at {0,3} (or corner/friendly) moves to bracket the other end
    // Full shield wall: group {0,4},{0,5}; inward: def at {1,4} and {1,5}; bracket left: def at {0,3}; bracket right: def moves to {0,6}
    const a1 = attacker(0, 4, 'a1');
    const a2 = attacker(0, 5, 'a2');
    const d1 = defender(1, 4, 'd1');
    const d2 = defender(1, 5, 'd2');
    const d3 = defender(0, 3, 'd3');
    const d4 = defender(0, 8, 'd4');
    const k = king(9, 9, 'kk');
    // d4 moves from {0,8} to {0,6} — completing the bracket on the right
    const s = makeState([a1, a2, d1, d2, d3, d4, k], 'defenders');
    const s2 = moveTo(s, pos(0, 8), pos(0, 6));
    expect(s2.pieces.find(p => p.id === 'a1')).toBeUndefined();
    expect(s2.pieces.find(p => p.id === 'a2')).toBeUndefined();
    expect(s2.capturedByDefenders.find(p => p.id === 'a1')).toBeDefined();
    expect(s2.capturedByDefenders.find(p => p.id === 'a2')).toBeDefined();
  });

  it('does not remove king from shield wall group', () => {
    // Attackers perform shield wall on top edge against [d1@{0,4}, king@{0,5}].
    // King is exempt from shield wall removal; d1 is captured.
    // Group: d1+king inward-flanked by ai1+ai2; bracketed left by al, right by ar moving to {0,6}.
    const k = king(0, 5, 'king');
    const d1 = defender(0, 4, 'd1');
    const ai1 = attacker(1, 4, 'ai1');
    const ai2 = attacker(1, 5, 'ai2');
    const al = attacker(0, 3, 'al');
    const ar = attacker(0, 8, 'ar');
    const s = makeState([k, d1, ai1, ai2, al, ar], 'attackers');
    const s2 = moveTo(s, pos(0, 8), pos(0, 6));
    expect(s2.pieces.find(p => p.id === 'king')).toBeDefined();
    expect(s2.pieces.find(p => p.id === 'd1')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Win conditions
// ---------------------------------------------------------------------------

describe('checkWinCondition', () => {
  beforeEach(resetIds);

  it('returns null when game is ongoing', () => {
    const s = createInitialState();
    expect(checkWinCondition(s)).toBeNull();
  });

  it('king-escaped when king reaches corner {0,0}', () => {
    const k = king(0, 1, 'king');
    const s = makeState([k, attacker(9, 9, 'a1')], 'defenders');
    const s2 = moveTo(s, pos(0, 1), pos(0, 0));
    expect(s2.gameOver).toBe(true);
    expect(s2.winner).toBe('defenders');
    expect(s2.winReason?.kind).toBe('king-escaped');
  });

  it('king-escaped when king reaches corner {10,10}', () => {
    const k = king(10, 9, 'king');
    const s = makeState([k, attacker(9, 9, 'a1')], 'defenders');
    const s2 = moveTo(s, pos(10, 9), pos(10, 10));
    expect(s2.gameOver).toBe(true);
    expect(s2.winner).toBe('defenders');
    expect(s2.winReason?.kind).toBe('king-escaped');
  });

  it('attackers-insufficient when attackers drop below 3', () => {
    // Only 2 attackers remain; defenders win
    const k = king(5, 5, 'king');
    const a1 = attacker(5, 4, 'a1');
    const a2 = attacker(5, 7, 'a2');
    const d1 = defender(5, 6, 'd1');
    // d1 moves to {5,5}? No — king is there. Move to sandwich a2: d2 at {5,8}
    const d2 = defender(5, 9, 'd2');
    // d2 moves to {5,8}, sandwiching a2 between d1 at {5,6} and d2 at {5,8}
    const s = makeState([k, a1, a2, d1, d2], 'defenders');
    const s2 = moveTo(s, pos(5, 9), pos(5, 8));
    expect(s2.pieces.filter(p => p.side === 'attackers')).toHaveLength(1);
    expect(s2.gameOver).toBe(true);
    expect(s2.winner).toBe('defenders');
    expect(s2.winReason?.kind).toBe('attackers-insufficient');
  });

  it('no-legal-moves when current side has no moves', () => {
    // King at top-edge {0,5}: blocked left by a1, right by a2, below by a3 — no moves.
    // 3 attackers keeps attackers-insufficient from firing first.
    const k = king(0, 5, 'king');
    const a1 = attacker(0, 4, 'a1');
    const a2 = attacker(0, 6, 'a2');
    const a3 = attacker(1, 5, 'a3');
    const s = makeState([k, a1, a2, a3], 'defenders');
    const wc = checkWinCondition(s);
    expect(wc?.kind).toBe('no-legal-moves');
    if (wc?.kind === 'no-legal-moves') {
      expect(wc.stuckSide).toBe('defenders');
    }
  });
});

// ---------------------------------------------------------------------------
// makeMove — win condition integration
// ---------------------------------------------------------------------------

describe('makeMove win condition integration', () => {
  beforeEach(resetIds);

  it('game is not over on a normal move', () => {
    const s = createInitialState();
    const s2 = moveTo(s, pos(0, 5), pos(0, 4));
    expect(s2.gameOver).toBe(false);
    expect(s2.winner).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Draw on move limit
// ---------------------------------------------------------------------------

describe('draw on move limit', () => {
  it('returns gameOver=true winner=null winReason=null at MAX_MOVES', () => {
    const s = createInitialState();
    // Build a state just at the limit and make one more move
    const atk = s.pieces.find(p => p.side === 'attackers' && p.position.col === 5 && p.position.row === 1)!;
    const nearLimit: GameState = {
      ...s,
      moveCount: MAX_MOVES - 1,
    };
    const result = moveTo(nearLimit, atk.position, pos(2, 5));
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBeNull();
    expect(result.winReason).toBeNull();
  });
});
