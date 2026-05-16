// ABOUT: Round-trips a put/get against the KV binding.
// ABOUT: Confirms the binding declared in wrangler.toml is reachable from tests.

import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("KV binding", () => {
  it("round-trips a string", async () => {
    await env.KV.put("pipeline-check", "ok");
    const value = await env.KV.get("pipeline-check");
    expect(value).toBe("ok");
  });
});
