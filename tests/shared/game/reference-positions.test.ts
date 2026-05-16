// ABOUT: Reference-position suite — hand-built GameState fixtures for each key
// ABOUT: capture/win/stalemate scenario, asserting full state shape after makeMove.

import { describe, it, expect, beforeEach } from 'vitest';
import { makeMove, checkWinCondition, getValidMoves } from '../../../src/shared/game/engine';
import { evaluateBoard } from '../../../src/shared/game/ai';
import type { Position } from '../../../src/shared/game/types';
import {
  makeState,
  king,
  defender,
  attacker,
  resetIds,
} from './fixtures/boards';

function pos(row: number, col: number): Position {
  return { row, col };
}

// ---------------------------------------------------------------------------
// RP-01: King escape — each corner
// ---------------------------------------------------------------------------

describe('RP-01 king escape to each corner', () => {
  beforeEach(resetIds);

  it('{0,0}: king moves from {0,1} to corner', () => {
    const k = king(0, 1, 'king');
    const a1 = attacker(9, 9, 'a1');
    const s = makeState([k, a1], 'defenders');
    const s2 = makeMove(s, pos(0, 1), pos(0, 0));
    expect(s2.gameOver).toBe(true);
    expect(s2.winner).toBe('defenders');
    expect(s2.winReason).toEqual({ kind: 'king-escaped' });
    expect(s2.pieces.find(p => p.id === 'king')?.position).toEqual(pos(0, 0));
  });

  it('{0,10}: king moves from {0,9} to corner', () => {
    const k = king(0, 9, 'king');
    const a1 = attacker(9, 9, 'a1');
    const s = makeState([k, a1], 'defenders');
    const s2 = makeMove(s, pos(0, 9), pos(0, 10));
    expect(s2.gameOver).toBe(true);
    expect(s2.winner).toBe('defenders');
    expect(s2.winReason).toEqual({ kind: 'king-escaped' });
  });

  it('{10,0}: king moves from {10,1} to corner', () => {
    const k = king(10, 1, 'king');
    const a1 = attacker(9, 9, 'a1');
    const s = makeState([k, a1], 'defenders');
    const s2 = makeMove(s, pos(10, 1), pos(10, 0));
    expect(s2.gameOver).toBe(true);
    expect(s2.winner).toBe('defenders');
    expect(s2.winReason).toEqual({ kind: 'king-escaped' });
  });

  it('{10,10}: king moves from {10,9} to corner', () => {
    const k = king(10, 9, 'king');
    const a1 = attacker(9, 9, 'a1');
    const s = makeState([k, a1], 'defenders');
    const s2 = makeMove(s, pos(10, 9), pos(10, 10));
    expect(s2.gameOver).toBe(true);
    expect(s2.winner).toBe('defenders');
    expect(s2.winReason).toEqual({ kind: 'king-escaped' });
  });
});

// ---------------------------------------------------------------------------
// RP-02: King edge immunity — each edge, 3 attackers, not captured
// ---------------------------------------------------------------------------

describe('RP-02 king edge immunity', () => {
  beforeEach(resetIds);

  it('top edge: king at {0,5} not captured with 3 attackers', () => {
    const k = king(0, 5, 'king');
    const a1 = attacker(0, 4, 'a1');
    const a2 = attacker(0, 6, 'a2');
    const a3 = attacker(2, 5, 'a3');
    const s = makeState([k, a1, a2, a3], 'attackers');
    const s2 = makeMove(s, pos(2, 5), pos(1, 5));
    // King on edge is not captured via king-captured rule — edge immunity prevents it.
    // Game ends via no-legal-moves (king boxed in) but king was never directly captured.
    expect(s2.winReason?.kind).not.toBe('king-captured');
    expect(s2.pieces.find(p => p.id === 'king')).toBeDefined();
  });

  it('bottom edge: king at {10,5} not captured with 3 attackers', () => {
    const k = king(10, 5, 'king');
    const a1 = attacker(10, 4, 'a1');
    const a2 = attacker(10, 6, 'a2');
    const a3 = attacker(8, 5, 'a3');
    const s = makeState([k, a1, a2, a3], 'attackers');
    const s2 = makeMove(s, pos(8, 5), pos(9, 5));
    expect(s2.winReason?.kind).not.toBe('king-captured');
    expect(s2.pieces.find(p => p.id === 'king')).toBeDefined();
  });

  it('left edge: king at {5,0} not captured with 3 attackers', () => {
    const k = king(5, 0, 'king');
    const a1 = attacker(4, 0, 'a1');
    const a2 = attacker(6, 0, 'a2');
    const a3 = attacker(5, 3, 'a3');
    const s = makeState([k, a1, a2, a3], 'attackers');
    const s2 = makeMove(s, pos(5, 3), pos(5, 1));
    expect(s2.winReason?.kind).not.toBe('king-captured');
    expect(s2.pieces.find(p => p.id === 'king')).toBeDefined();
  });

  it('right edge: king at {5,10} not captured with 3 attackers', () => {
    const k = king(5, 10, 'king');
    const a1 = attacker(4, 10, 'a1');
    const a2 = attacker(6, 10, 'a2');
    const a3 = attacker(5, 8, 'a3');
    const s = makeState([k, a1, a2, a3], 'attackers');
    const s2 = makeMove(s, pos(5, 8), pos(5, 9));
    expect(s2.winReason?.kind).not.toBe('king-captured');
    expect(s2.pieces.find(p => p.id === 'king')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// RP-03: King capture at throne — all 4 cardinal attackers required
// ---------------------------------------------------------------------------

describe('RP-03 king capture at throne', () => {
  beforeEach(resetIds);

  it('captures king on throne with all 4 cardinal attackers', () => {
    const k = king(5, 5, 'king');
    const a1 = attacker(5, 4, 'a1');
    const a2 = attacker(5, 6, 'a2');
    const a3 = attacker(4, 5, 'a3');
    const a4 = attacker(6, 6, 'a4');
    const s = makeState([k, a1, a2, a3, a4], 'attackers');
    const s2 = makeMove(s, pos(6, 6), pos(6, 5));
    expect(s2.gameOver).toBe(true);
    expect(s2.winner).toBe('attackers');
    expect(s2.winReason).toEqual({ kind: 'king-captured' });
    // King stays on board even when captured — engine sets gameOver/winner, does not remove piece
    expect(s2.pieces.find(p => p.id === 'king')).toBeDefined();
  });

  it('does NOT capture king on throne with only 3 attackers', () => {
    const k = king(5, 5, 'king');
    const a1 = attacker(5, 4, 'a1');
    const a2 = attacker(5, 6, 'a2');
    const a3 = attacker(4, 5, 'a3');
    // 4th side ({6,5}) empty — king not surrounded
    const s = makeState([k, a1, a2, a3], 'attackers');
    expect(checkWinCondition(s)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// RP-04: King adjacent to throne — 3 attackers + throne = 4th hostile
// ---------------------------------------------------------------------------

describe('RP-04 king adjacent to throne', () => {
  beforeEach(resetIds);

  it('captures king with 3 attackers and throne as 4th', () => {
    const k = king(5, 4, 'king');
    const a1 = attacker(5, 3, 'a1');
    const a2 = attacker(4, 4, 'a2');
    const a3 = attacker(6, 5, 'a3');
    const s = makeState([k, a1, a2, a3], 'attackers');
    const s2 = makeMove(s, pos(6, 5), pos(6, 4));
    expect(s2.gameOver).toBe(true);
    expect(s2.winner).toBe('attackers');
    expect(s2.winReason).toEqual({ kind: 'king-captured' });
  });
});

// ---------------------------------------------------------------------------
// RP-05: Custodial captures
// ---------------------------------------------------------------------------

describe('RP-05 custodial capture', () => {
  beforeEach(resetIds);

  it('attacker captured between two defenders', () => {
    const d1 = defender(5, 6, 'd1');
    const a1 = attacker(5, 7, 'a1');
    const d2 = defender(5, 9, 'd2');
    const k = king(9, 9, 'kk');
    const s = makeState([d1, a1, d2, k], 'defenders');
    const s2 = makeMove(s, pos(5, 9), pos(5, 8));
    expect(s2.pieces.find(p => p.id === 'a1')).toBeUndefined();
    expect(s2.capturedByDefenders.find(p => p.id === 'a1')).toBeDefined();
    expect(s2.capturedByDefenders).toHaveLength(1);
  });

  it('defender captured between two attackers', () => {
    const a1 = attacker(3, 2, 'a1');
    const d1 = defender(3, 3, 'd1');
    const a2 = attacker(3, 6, 'a2');
    const k = king(9, 9, 'kk');
    const s = makeState([a1, d1, a2, k], 'attackers');
    const s2 = makeMove(s, pos(3, 6), pos(3, 4));
    expect(s2.pieces.find(p => p.id === 'd1')).toBeUndefined();
    expect(s2.capturedByAttackers.find(p => p.id === 'd1')).toBeDefined();
  });

  it('defender captured against corner', () => {
    const d1 = defender(0, 1, 'd1');
    const a1 = attacker(0, 3, 'a1');
    const k = king(9, 9, 'kk');
    const s = makeState([d1, a1, k], 'attackers');
    const s2 = makeMove(s, pos(0, 3), pos(0, 2));
    expect(s2.pieces.find(p => p.id === 'd1')).toBeUndefined();
    expect(s2.capturedByAttackers.find(p => p.id === 'd1')).toBeDefined();
  });

  it('attacker captured against empty throne', () => {
    const d1 = defender(5, 2, 'd1');
    const a1 = attacker(5, 4, 'a1');
    const k = king(0, 0, 'kk');
    const s = makeState([d1, a1, k], 'defenders');
    const s2 = makeMove(s, pos(5, 2), pos(5, 3));
    expect(s2.pieces.find(p => p.id === 'a1')).toBeUndefined();
    expect(s2.capturedByDefenders.find(p => p.id === 'a1')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// RP-06: Shield wall capture
// ---------------------------------------------------------------------------

describe('RP-06 shield wall capture', () => {
  beforeEach(resetIds);

  it('captures 2 attackers pinned against top edge', () => {
    const a1 = attacker(0, 4, 'a1');
    const a2 = attacker(0, 5, 'a2');
    const d1 = defender(1, 4, 'd1');
    const d2 = defender(1, 5, 'd2');
    const d3 = defender(0, 3, 'd3');
    const d4 = defender(0, 8, 'd4');
    const k = king(9, 9, 'kk');
    const s = makeState([a1, a2, d1, d2, d3, d4, k], 'defenders');
    const s2 = makeMove(s, pos(0, 8), pos(0, 6));
    expect(s2.pieces.find(p => p.id === 'a1')).toBeUndefined();
    expect(s2.pieces.find(p => p.id === 'a2')).toBeUndefined();
    expect(s2.capturedByDefenders).toHaveLength(2);
    expect(s2.capturedByDefenders.map(p => p.id).sort()).toEqual(['a1', 'a2']);
  });

  it('king inside shield wall group is never removed', () => {
    const k = king(0, 5, 'king');
    const d1 = defender(0, 4, 'd1');
    const ai1 = attacker(1, 4, 'ai1');
    const ai2 = attacker(1, 5, 'ai2');
    const al = attacker(0, 3, 'al');
    const ar = attacker(0, 8, 'ar');
    const s = makeState([k, d1, ai1, ai2, al, ar], 'attackers');
    const s2 = makeMove(s, pos(0, 8), pos(0, 6));
    expect(s2.pieces.find(p => p.id === 'king')).toBeDefined();
    expect(s2.pieces.find(p => p.id === 'd1')).toBeUndefined();
    expect(s2.capturedByAttackers.find(p => p.id === 'd1')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// RP-07: Movement restrictions
// ---------------------------------------------------------------------------

describe('RP-07 movement restrictions', () => {
  beforeEach(resetIds);

  it('non-king cannot stop on throne', () => {
    const a1 = attacker(5, 0, 'a1');
    const s = makeState([a1, king(9, 9, 'kk')], 'attackers');
    const moves = getValidMoves(s, a1);
    expect(moves.some(m => m.row === 5 && m.col === 5)).toBe(false);
    // But can stop just past throne
    expect(moves.some(m => m.row === 5 && m.col === 6)).toBe(true);
  });

  it('non-king cannot enter any corner', () => {
    const a1 = attacker(0, 5, 'a1');
    const s = makeState([a1, king(9, 9, 'kk')], 'attackers');
    const moves = getValidMoves(s, a1);
    expect(moves.some(m => m.row === 0 && m.col === 0)).toBe(false);
    expect(moves.some(m => m.row === 0 && m.col === 10)).toBe(false);
  });

  it('makeMove is rejected when the move is invalid', () => {
    const a1 = attacker(0, 5, 'a1'); // blocked on edge
    const s = makeState([a1, king(9, 9, 'kk')], 'attackers');
    // Try to stop a1 on corner (not a valid move)
    const s2 = makeMove(s, pos(0, 5), pos(0, 0));
    expect(s2).toBe(s); // returns unchanged state
  });
});

// ---------------------------------------------------------------------------
// RP-08: No-legal-moves stalemate
// ---------------------------------------------------------------------------

describe('RP-08 no-legal-moves stalemate', () => {
  beforeEach(resetIds);

  it('defenders with no legal moves lose', () => {
    const k = king(0, 5, 'king');
    const a1 = attacker(0, 4, 'a1');
    const a2 = attacker(0, 6, 'a2');
    const a3 = attacker(1, 5, 'a3');
    const s = makeState([k, a1, a2, a3], 'defenders');
    const wc = checkWinCondition(s);
    expect(wc).toEqual({ kind: 'no-legal-moves', stuckSide: 'defenders' });
  });

  it('attackers with no legal moves lose', () => {
    // 3 attackers each completely boxed in by defenders — no attacker has a legal move
    const pieces = [
      attacker(1, 1, 'aa1'), defender(0, 1, 'dd1'), defender(2, 1, 'dd2'), defender(1, 0, 'dd3'), defender(1, 2, 'dd4'),
      attacker(1, 9, 'aa2'), defender(0, 9, 'dd5'), defender(2, 9, 'dd6'), defender(1, 8, 'dd7'), defender(1, 10, 'dd8'),
      attacker(9, 1, 'aa3'), defender(8, 1, 'dd9'), defender(10, 1, 'dd10'), defender(9, 0, 'dd11'), defender(9, 2, 'dd12'),
      king(5, 5, 'kkk'),
    ];
    const sAll = makeState(pieces, 'attackers');
    const wc = checkWinCondition(sAll);
    expect(wc).toEqual({ kind: 'no-legal-moves', stuckSide: 'attackers' });
  });
});

// ---------------------------------------------------------------------------
// RP-09: Attackers-insufficient win
// ---------------------------------------------------------------------------

describe('RP-09 attackers-insufficient win', () => {
  beforeEach(resetIds);

  it('defenders win when attackers drop below 3 (to 2)', () => {
    const k = king(5, 5, 'king');
    const a1 = attacker(5, 4, 'a1');
    const a2 = attacker(5, 7, 'a2');
    const d1 = defender(5, 6, 'd1');
    const d2 = defender(5, 9, 'd2');
    const s = makeState([k, a1, a2, d1, d2], 'defenders');
    const s2 = makeMove(s, pos(5, 9), pos(5, 8)); // d2 moves: sandwiches a2 between d1 and d2
    expect(s2.pieces.filter(p => p.side === 'attackers')).toHaveLength(1);
    expect(s2.gameOver).toBe(true);
    expect(s2.winner).toBe('defenders');
    expect(s2.winReason).toEqual({ kind: 'attackers-insufficient' });
    expect(s2.capturedByDefenders.find(p => p.id === 'a2')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// RP-10: Evaluator reference positions
// ---------------------------------------------------------------------------

describe('RP-10 evaluator reference positions', () => {
  beforeEach(resetIds);

  it('king one step from corner: strong defender advantage', () => {
    // evaluateBoard uses corner distance + corner-path bonus + edge bonus
    const k = king(0, 1, 'king');
    const s = makeState([k], 'defenders');
    expect(evaluateBoard(s, 'defenders')).toBeGreaterThan(2000);
    expect(evaluateBoard(s, 'attackers')).toBeLessThan(-2000);
  });

  it('king at centre of board: advantage for attackers (far from corners)', () => {
    const k = king(5, 5, 'king'); // throne
    const s = makeState([k], 'attackers');
    // kingCornerDist = 10 (manhattan to {0,0}), score += 10*50 = 500 raw → attacker advantage
    expect(evaluateBoard(s, 'attackers')).toBeGreaterThan(0);
    expect(evaluateBoard(s, 'defenders')).toBeLessThan(0);
  });

  it('king surrounded by 4 attackers: high attacker advantage', () => {
    const k = king(3, 3, 'king');
    const a1 = attacker(3, 2, 'a1');
    const a2 = attacker(3, 4, 'a2');
    const a3 = attacker(2, 3, 'a3');
    const a4 = attacker(4, 3, 'a4');
    const s = makeState([k, a1, a2, a3, a4], 'attackers');
    const sNone = makeState([k], 'attackers');
    // More attackers adjacent → higher score
    expect(evaluateBoard(s, 'attackers')).toBeGreaterThan(evaluateBoard(sNone, 'attackers'));
  });

  it('king on edge: defenders get edge-immunity bonus (-300 from attacker view)', () => {
    const k1 = king(0, 5, 'king1');   // on edge
    const k2 = king(2, 5, 'king2');   // not on edge, same column distance from corners
    const s1 = makeState([k1], 'attackers');
    const s2 = makeState([k2], 'attackers');
    // Edge king gets -300 in attacker score → better for defenders
    expect(evaluateBoard(s1, 'attackers')).toBeLessThan(evaluateBoard(s2, 'attackers'));
  });

  it('material: more attackers benefits attackers', () => {
    const k = king(5, 5, 'king');
    const sMany = makeState([k, attacker(0, 0, 'a1'), attacker(0, 2, 'a2'), attacker(0, 4, 'a3')], 'attackers');
    const sFew = makeState([k, attacker(0, 0, 'a1')], 'attackers');
    expect(evaluateBoard(sMany, 'attackers')).toBeGreaterThan(evaluateBoard(sFew, 'attackers'));
  });
});
