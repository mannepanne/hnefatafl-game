// ABOUT: Pure-Node Vitest pool smoke test.
// ABOUT: Confirms the second Vitest project is wired up and runnable.

import { describe, it, expect } from "vitest";

describe("shared pool smoke", () => {
  it("evaluates basic JS", () => {
    expect(1 + 1).toBe(2);
  });
});
