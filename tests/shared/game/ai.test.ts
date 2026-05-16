// ABOUT: AI tests — evaluator, Thrall/Karl/Jarl behaviour, minimax, dispatcher.
// ABOUT: All tests use explicit seeded RNGs; Math.random is never called.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateBoard,
  evaluateBoardFast,
  minimax,
  searchFromRoot,
  getThrallMove,
  getKarlMove,
  getJarlMove,
  getAIMove,
} from '../../../src/shared/game/ai';
import { createInitialState, getAllMovesForSide } from '../../../src/shared/game/engine';
import {
  makeState,
  king,
  attacker,
  resetIds,
} from './fixtures/boards';
import { makeSeedRng } from './fixtures/seeds';

// ---------------------------------------------------------------------------
// evaluateBoard
// ---------------------------------------------------------------------------

describe('evaluateBoard', () => {
  beforeEach(resetIds);

  it('returns 100000 for the winning side in a terminal state', () => {
    const s = makeState([], 'attackers', {
      gameOver: true,
      winner: 'defenders',
      winReason: { kind: 'king-escaped' },
    });
    expect(evaluateBoard(s, 'defenders')).toBe(100000);
    expect(evaluateBoard(s, 'attackers')).toBe(-100000);
  });

  it('returns ±100000 when no king is on the board', () => {
    const s = makeState([attacker(5, 5, 'a1')], 'attackers');
    expect(evaluateBoard(s, 'attackers')).toBe(100000);
    expect(evaluateBoard(s, 'defenders')).toBe(-100000);
  });

  it('strongly favours defenders when king is one step from a corner', () => {
    // King at {0,1}: corner dist=1, has corner path to {0,0}, on top edge
    const k = king(0, 1, 'king');
    const s = makeState([k], 'defenders');
    // Attacker view: material(0-1*2)*100=-200, dist 1*50=50, corner path -2000, edge -300 → -2450
    expect(evaluateBoard(s, 'attackers')).toBe(-2450);
    expect(evaluateBoard(s, 'defenders')).toBe(2450);
  });

  it('favours attackers when king is surrounded by attackers', () => {
    const k = king(3, 3, 'king');
    const a1 = attacker(3, 2, 'a1');
    const a2 = attacker(3, 4, 'a2');
    const a3 = attacker(2, 3, 'a3');
    const s = makeState([k, a1, a2, a3], 'attackers');
    expect(evaluateBoard(s, 'attackers')).toBeGreaterThan(0);
    expect(evaluateBoard(s, 'defenders')).toBeLessThan(0);
  });

  it('is symmetric: score for attackers == -(score for defenders)', () => {
    const s = createInitialState();
    const atkScore = evaluateBoard(s, 'attackers');
    const defScore = evaluateBoard(s, 'defenders');
    expect(atkScore).toBe(-defScore);
  });

  it('fast and full agree when all omitted terms are zero', () => {
    // King at {5,3}: not on edge, no corner path from col 3 or row 5, no attackers
    const k = king(5, 3, 'king');
    const s = makeState([k], 'attackers');
    expect(evaluateBoardFast(s, 'attackers')).toBe(evaluateBoard(s, 'attackers'));
  });
});

// ---------------------------------------------------------------------------
// evaluateBoardFast
// ---------------------------------------------------------------------------

describe('evaluateBoardFast', () => {
  beforeEach(resetIds);

  it('returns same terminal scores as evaluateBoard', () => {
    const s = makeState([], 'attackers', {
      gameOver: true,
      winner: 'attackers',
      winReason: { kind: 'king-captured' },
    });
    expect(evaluateBoardFast(s, 'attackers')).toBe(100000);
    expect(evaluateBoardFast(s, 'defenders')).toBe(-100000);
  });

  it('returns ±100000 when no king on board', () => {
    const s = makeState([attacker(1, 1, 'a1')], 'attackers');
    expect(evaluateBoardFast(s, 'attackers')).toBe(100000);
    expect(evaluateBoardFast(s, 'defenders')).toBe(-100000);
  });

  it('omits the corner-path penalty (king one step from corner)', () => {
    const k = king(0, 1, 'king');
    const s = makeState([k], 'defenders');
    const full = evaluateBoard(s, 'attackers');
    const fast = evaluateBoardFast(s, 'attackers');
    // Fast misses the -2000 corner-path penalty → less negative than full
    expect(fast).toBeGreaterThan(full);
    // Fast: material -200, dist +50, edge -300 → -450
    expect(fast).toBe(-450);
  });
});

// ---------------------------------------------------------------------------
// getThrallMove
// ---------------------------------------------------------------------------

describe('getThrallMove', () => {
  beforeEach(resetIds);

  it('returns a legal move for initial state', () => {
    const s = createInitialState();
    const move = getThrallMove(s, 'attackers', makeSeedRng(1));
    expect(move).not.toBeNull();
    const all = getAllMovesForSide(s, 'attackers');
    const legal = all.some(e =>
      e.piece.position.row === move!.from.row &&
      e.piece.position.col === move!.from.col &&
      e.moves.some(m => m.row === move!.to.row && m.col === move!.to.col),
    );
    expect(legal).toBe(true);
  });

  it('always picks the only move when exactly one legal move exists', () => {
    // King at {0,1} blocked right and below — only move is {0,0} (corner win)
    const k = king(0, 1, 'king');
    const a1 = attacker(0, 2, 'a1');
    const a2 = attacker(1, 1, 'a2');
    const aX = attacker(8, 8, 'aX'); // keep attacker count up
    const s = makeState([k, a1, a2, aX], 'defenders');
    const move = getThrallMove(s, 'defenders', makeSeedRng(1));
    expect(move).not.toBeNull();
    expect(move?.to).toEqual({ row: 0, col: 0 });
  });

  it('is deterministic with the same seeded RNG', () => {
    const s = createInitialState();
    const move1 = getThrallMove(s, 'attackers', makeSeedRng(42));
    const move2 = getThrallMove(s, 'attackers', makeSeedRng(42));
    expect(move1).toEqual(move2);
  });

  it('returns null when the side has no legal moves', () => {
    // King boxed in completely — defenders have no moves
    const k = king(1, 1, 'king');
    const blockers = [
      attacker(0, 1, 'a1'), attacker(2, 1, 'a2'),
      attacker(1, 0, 'a3'), attacker(1, 2, 'a4'),
    ];
    const s = makeState([k, ...blockers], 'defenders');
    expect(getThrallMove(s, 'defenders', makeSeedRng(1))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getKarlMove
// ---------------------------------------------------------------------------

describe('getKarlMove', () => {
  it('returns a legal move for initial state', () => {
    const s = createInitialState();
    const move = getKarlMove(s, 'attackers', makeSeedRng(1));
    expect(move).not.toBeNull();
  });

  it('is deterministic with the same seeded RNG', () => {
    const s = createInitialState();
    const move1 = getKarlMove(s, 'attackers', makeSeedRng(42));
    const move2 = getKarlMove(s, 'attackers', makeSeedRng(42));
    expect(move1).toEqual(move2);
  });

  it('returns null when the side has no legal moves', () => {
    const k = king(1, 1, 'king');
    const blockers = [
      attacker(0, 1, 'a1'), attacker(2, 1, 'a2'),
      attacker(1, 0, 'a3'), attacker(1, 2, 'a4'),
    ];
    const s = makeState([k, ...blockers], 'defenders');
    expect(getKarlMove(s, 'defenders', makeSeedRng(1))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getJarlMove
// ---------------------------------------------------------------------------

describe('getJarlMove', () => {
  it('returns a legal move for initial state', () => {
    const s = createInitialState();
    const move = getJarlMove(s, 'attackers', makeSeedRng(1));
    expect(move).not.toBeNull();
  });

  it('is deterministic with the same seeded RNG', () => {
    const s = createInitialState();
    const move1 = getJarlMove(s, 'attackers', makeSeedRng(42));
    const move2 = getJarlMove(s, 'attackers', makeSeedRng(42));
    expect(move1).toEqual(move2);
  });

  it('returns null when the side has no legal moves', () => {
    const k = king(1, 1, 'king');
    const blockers = [
      attacker(0, 1, 'a1'), attacker(2, 1, 'a2'),
      attacker(1, 0, 'a3'), attacker(1, 2, 'a4'),
    ];
    const s = makeState([k, ...blockers], 'defenders');
    expect(getJarlMove(s, 'defenders', makeSeedRng(1))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// minimax
// ---------------------------------------------------------------------------

describe('minimax', () => {
  beforeEach(resetIds);

  it('returns 100000 for an already-won terminal state', () => {
    const s = makeState([], 'attackers', {
      gameOver: true,
      winner: 'attackers',
      winReason: { kind: 'king-captured' },
    });
    expect(minimax(s, [5], 0, 'attackers', 'attackers', makeSeedRng(1))).toBe(100000);
  });

  it('returns -100000 for an already-lost terminal state', () => {
    const s = makeState([], 'attackers', {
      gameOver: true,
      winner: 'defenders',
      winReason: { kind: 'king-escaped' },
    });
    expect(minimax(s, [5], 0, 'attackers', 'attackers', makeSeedRng(1))).toBe(-100000);
  });

  it('returns evaluateBoard when ply equals widths.length (leaf node)', () => {
    const s = createInitialState();
    // ply=1, widths=[5] → ply >= widths.length → leaf
    const score = minimax(s, [5], 1, 'attackers', 'attackers', makeSeedRng(1));
    expect(score).toBe(evaluateBoard(s, 'attackers'));
  });

  it('returns -100000 when the side to move has no legal moves', () => {
    const k = king(1, 1, 'king');
    const blockers = [
      attacker(0, 1, 'a1'), attacker(2, 1, 'a2'),
      attacker(1, 0, 'a3'), attacker(1, 2, 'a4'),
    ];
    // defenders (king) boxed in — minimax for defenders returns -100000 (they lose)
    const s = makeState([k, ...blockers], 'defenders');
    expect(minimax(s, [5, 3], 0, 'defenders', 'defenders', makeSeedRng(1))).toBe(-100000);
  });
});

// ---------------------------------------------------------------------------
// searchFromRoot
// ---------------------------------------------------------------------------

describe('searchFromRoot', () => {
  it('returns null when side has no legal moves', () => {
    const k = king(1, 1, 'king');
    const blockers = [
      attacker(0, 1, 'a1'), attacker(2, 1, 'a2'),
      attacker(1, 0, 'a3'), attacker(1, 2, 'a4'),
    ];
    const s = makeState([k, ...blockers], 'defenders');
    expect(searchFromRoot(s, 'defenders', { widths: [5], jitter: 0 })).toBeNull();
  });

  it('takes an instant win immediately (before jitter)', () => {
    // King at {0,1} blocked right and below — only defender move is to corner {0,0}
    const k = king(0, 1, 'king');
    const a1 = attacker(0, 2, 'a1');
    const a2 = attacker(1, 1, 'a2');
    const aX = attacker(8, 8, 'aX');
    const s = makeState([k, a1, a2, aX], 'defenders');
    const move = searchFromRoot(s, 'defenders', { widths: [5, 3], jitter: 0, rng: makeSeedRng(1) });
    expect(move?.to).toEqual({ row: 0, col: 0 });
  });
});

// ---------------------------------------------------------------------------
// getAIMove dispatcher
// ---------------------------------------------------------------------------

describe('getAIMove', () => {
  it('routes thrall → getThrallMove (same seed, same result)', () => {
    const s = createInitialState();
    const seed = 42;
    const direct = getThrallMove(s, 'attackers', makeSeedRng(seed));
    const via = getAIMove(s, 'thrall', 'attackers', makeSeedRng(seed));
    expect(via).toEqual(direct);
  });

  it('routes karl → getKarlMove (same seed, same result)', () => {
    const s = createInitialState();
    const seed = 42;
    const direct = getKarlMove(s, 'attackers', makeSeedRng(seed));
    const via = getAIMove(s, 'karl', 'attackers', makeSeedRng(seed));
    expect(via).toEqual(direct);
  });

  it('routes jarl → getJarlMove (same seed, same result)', () => {
    const s = createInitialState();
    const seed = 42;
    const direct = getJarlMove(s, 'attackers', makeSeedRng(seed));
    const via = getAIMove(s, 'jarl', 'attackers', makeSeedRng(seed));
    expect(via).toEqual(direct);
  });
});
