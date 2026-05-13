// ABOUT: Verifies routing precedence between the Hono API and the ASSETS binding.
// ABOUT: /api/* is handled by Hono (JSON 404 on miss); other paths fall through to ASSETS.

import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("routing precedence", () => {
  it("returns JSON 404 from the API on an unknown /api/* path", async () => {
    const response = await SELF.fetch("https://example.com/api/nonexistent");
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toMatch(/application\/json/);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it("delegates non-API paths to the ASSETS binding", async () => {
    // The ASSETS binding is not populated in unit tests (no dist/client/ during
    // test runs). Hitting it should still produce a Response — the binding
    // exists and the request reaches it. We assert it returned *something*,
    // not the JSON 404 from the Hono /api notFound handler.
    const response = await SELF.fetch("https://example.com/some/path");
    const contentType = response.headers.get("content-type") ?? "";
    expect(contentType).not.toMatch(/application\/json/);
  });
});
