// ABOUT: Unit tests for the CSRF Origin-check middleware.
// ABOUT: Verifies that state-mutating requests from disallowed origins are rejected.

import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { csrfMiddleware } from "@/worker/middleware/csrf";

function makeApp(appUrl: string) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", csrfMiddleware(appUrl));
  app.post("/test", (c) => c.json({ ok: true }));
  app.get("/test", (c) => c.json({ ok: true }));
  return app;
}

const APP_URL = "https://hnefatafl.hultberg.org";

async function post(app: ReturnType<typeof makeApp>, origin?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin !== undefined) headers["Origin"] = origin;
  return app.request("/test", { method: "POST", headers });
}

describe("csrfMiddleware", () => {
  it("allows POST from matching origin", async () => {
    const app = makeApp(APP_URL);
    const res = await post(app, APP_URL);
    expect(res.status).toBe(200);
  });

  it("rejects POST from different origin", async () => {
    const app = makeApp(APP_URL);
    const res = await post(app, "https://evil.example.com");
    expect(res.status).toBe(403);
  });

  it("allows POST with no Origin header (server-to-server / curl)", async () => {
    const app = makeApp(APP_URL);
    const res = await post(app);
    expect(res.status).toBe(200);
  });

  it("allows GET regardless of origin", async () => {
    const app = makeApp(APP_URL);
    const res = await app.request("/test", {
      method: "GET",
      headers: { Origin: "https://evil.example.com" },
    });
    expect(res.status).toBe(200);
  });

  it("is case-sensitive and rejects origin with trailing slash", async () => {
    const app = makeApp(APP_URL);
    const res = await post(app, APP_URL + "/");
    expect(res.status).toBe(403);
  });
});
