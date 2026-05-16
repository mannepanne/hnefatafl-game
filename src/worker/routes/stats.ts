// ABOUT: Anonymous-games stats route. GET returns the current counter; POST increments it.
// ABOUT: Rate-limited to 10 increments per IP per hour via KV TTL'd keys.

import { Hono } from "hono";

const COUNTER_KEY = "stats:anonymous-games";
const RATE_LIMIT = 10;
const RATE_WINDOW_TTL = 3600; // seconds

export const stats = new Hono<{ Bindings: Env }>();

stats.get("/stats/anonymous-games", async (c) => {
  const raw = await c.env.KV.get(COUNTER_KEY);
  const count = raw ? parseInt(raw, 10) : 0;
  return c.json({ count });
});

stats.post("/stats/anonymous-games", async (c) => {
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  const rateLimitKey = `ratelimit:stats:${ip}`;

  const rawHits = await c.env.KV.get(rateLimitKey);
  const hits = rawHits ? parseInt(rawHits, 10) : 0;

  if (hits >= RATE_LIMIT) {
    return c.json({ error: "rate_limited" }, 429);
  }

  // Sliding window — always write with TTL so the window resets on every request.
  const newHits = hits + 1;
  await c.env.KV.put(rateLimitKey, String(newHits), { expirationTtl: RATE_WINDOW_TTL });

  // Increment the global counter
  const rawCount = await c.env.KV.get(COUNTER_KEY);
  const count = (rawCount ? parseInt(rawCount, 10) : 0) + 1;
  await c.env.KV.put(COUNTER_KEY, String(count));

  return c.json({ count });
});
