// ABOUT: Health-check route. Returns 200 with a small JSON payload.
// ABOUT: Used by uptime checks and Phase 1 acceptance criteria.

import { Hono } from "hono";

export const health = new Hono<{ Bindings: Env }>();

health.get("/health", (c) => c.json({ ok: true }));
