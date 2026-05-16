// ABOUT: Tests the /api/health endpoint inside the Workers runtime.
// ABOUT: Hits the Worker via SELF.fetch and asserts the JSON payload.

import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("GET /api/health", () => {
  it("returns 200 with ok=true", async () => {
    const response = await SELF.fetch("https://example.com/api/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
