import type { Position, Piece } from '@/types/game';

export const BOARD_SIZE = 11;
export const CENTER = 5;

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

let pieceIdCounter = 0;
export function resetPieceIdCounter(): void {
  pieceIdCounter = 0;
}
function nextPieceId(prefix: string): string {
  return `${prefix}_${pieceIdCounter++}`;
}

export function createInitialPieces(): Piece[] {
  resetPieceIdCounter();
  const pieces: Piece[] = [];

  // King at center
  pieces.push({
    type: 'king',
    side: 'defenders',
    position: { row: 5, col: 5 },
    id: nextPieceId('king'),
  });

  // Defenders - diamond/cross around the king
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
      id: nextPieceId('def'),
    });
  }

  // Attackers - T-shaped groups at each edge
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
      id: nextPieceId('atk'),
    });
  }

  return pieces;
}
