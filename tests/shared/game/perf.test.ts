// ABOUT: Performance smoke tests — Karl <100ms median, Jarl <250ms median.
// ABOUT: Opt-in via RUN_PERF=1 bun run test (skipped in the default suite).

import { describe, it, expect } from 'vitest';
import { getKarlMove, getJarlMove } from '../../../src/shared/game/ai';
import { createInitialState } from '../../../src/shared/game/engine';
import { makeSeedRng } from './fixtures/seeds';

declare const process: { env: Record<string, string | undefined> };
const RUN_PERF = process.env['RUN_PERF'] === '1';

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

describe.skipIf(!RUN_PERF)('perf — opt-in via RUN_PERF=1', () => {
  it('Karl move < 100ms median over 20 runs', () => {
    const state = createInitialState();
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      getKarlMove(state, 'attackers', makeSeedRng(i));
      times.push(performance.now() - start);
    }
    expect(median(times)).toBeLessThan(100);
  });

  it('Jarl move < 250ms median over 20 runs', () => {
    const state = createInitialState();
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      getJarlMove(state, 'attackers', makeSeedRng(i));
      times.push(performance.now() - start);
    }
    expect(median(times)).toBeLessThan(250);
  });
});
