// ABOUT: Seeded deterministic RNG factory for AI tests.
// ABOUT: Uses a simple LCG so tests are self-contained with no external deps.

/** Linear congruential generator — deterministic, good enough for AI tests. */
export function makeSeedRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223;
    s >>>= 0;
    return s / 0x100000000;
  };
}
