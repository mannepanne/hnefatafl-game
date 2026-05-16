// ABOUT: Board constants and piece-factory for the Hnefatafl game engine.
// ABOUT: All position helpers and the initial 37-piece setup live here.

import type { Position, Piece } from './types';

export const BOARD_SIZE = 11;
export const CENTER = 5;
export const MAX_MOVES = 500;

export const THRONE: Position = { row: 5, col: 5 };

export const CORNERS: Position[] = [
  { row: 0, col: 0 },
  { row: 0, col: 10 },
  { row: 10, col: 0 },
  { row: 10, col: 10 },
];

export function isThrone(pos: Position): boolean {
  return pos.row === THRONE.row && pos.col === THRONE.col;
}

export function isCorner(pos: Position): boolean {
  return CORNERS.some(c => c.row === pos.row && c.col === pos.col);
}

export function isRestricted(pos: Position): boolean {
  return isThrone(pos) || isCorner(pos);
}

export function posKey(pos: Position): string {
  return `${pos.row},${pos.col}`;
}

export function samePos(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

/** Counter interface for piece ID generation — inject in tests, use default in production. */
export interface IdCounter {
  next(prefix: string): string;
}

export function makeIdCounter(): IdCounter {
  let n = 0;
  return { next: (prefix: string) => `${prefix}_${n++}` };
}

export function createInitialPieces(idCounter: IdCounter = makeIdCounter()): Piece[] {
  const pieces: Piece[] = [];

  // King at centre
  pieces.push({
    type: 'king',
    side: 'defenders',
    position: { row: 5, col: 5 },
    id: idCounter.next('king'),
  });

  // Defenders — diamond/cross around the king
  const defenderPositions: Position[] = [
    { row: 3, col: 5 }, { row: 4, col: 5 }, { row: 6, col: 5 }, { row: 7, col: 5 },
    { row: 5, col: 3 }, { row: 5, col: 4 }, { row: 5, col: 6 }, { row: 5, col: 7 },
    { row: 4, col: 4 }, { row: 4, col: 6 }, { row: 6, col: 4 }, { row: 6, col: 6 },
  ];

  for (const pos of defenderPositions) {
    pieces.push({
      type: 'defender',
      side: 'defenders',
      position: { ...pos },
      id: idCounter.next('def'),
    });
  }

  // Attackers — T-shaped groups at each edge
  const attackerPositions: Position[] = [
    // Top
    { row: 0, col: 3 }, { row: 0, col: 4 }, { row: 0, col: 5 }, { row: 0, col: 6 }, { row: 0, col: 7 },
    { row: 1, col: 5 },
    // Bottom
    { row: 10, col: 3 }, { row: 10, col: 4 }, { row: 10, col: 5 }, { row: 10, col: 6 }, { row: 10, col: 7 },
    { row: 9, col: 5 },
    // Left
    { row: 3, col: 0 }, { row: 4, col: 0 }, { row: 5, col: 0 }, { row: 6, col: 0 }, { row: 7, col: 0 },
    { row: 5, col: 1 },
    // Right
    { row: 3, col: 10 }, { row: 4, col: 10 }, { row: 5, col: 10 }, { row: 6, col: 10 }, { row: 7, col: 10 },
    { row: 5, col: 9 },
  ];

  for (const pos of attackerPositions) {
    pieces.push({
      type: 'attacker',
      side: 'attackers',
      position: { ...pos },
      id: idCounter.next('atk'),
    });
  }

  return pieces;
}
