// ABOUT: Anonymous-games stats route. GET returns the current counter; POST increments it.
// ABOUT: Rate-limited to 10 increments per IP per hour via KV TTL'd keys. Counter stored in D1.

import { Hono } from "hono";

const RATE_LIMIT = 10;
const RATE_WINDOW_TTL = 3600; // seconds

export const stats = new Hono<{ Bindings: Env }>();

stats.get("/stats/anonymous-games", async (c) => {
  const row = await c.env.DB.prepare(
    "SELECT total_anonymous_games FROM site_stats WHERE id = 1",
  ).first<{ total_anonymous_games: number }>();
  const count = row?.total_anonymous_games ?? 0;
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

  // Atomic batch: increment then read in a single D1 round-trip.
  const now = new Date().toISOString();
  const batchResults = await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE site_stats SET total_anonymous_games = total_anonymous_games + 1, updated_at = ? WHERE id = 1",
    ).bind(now),
    c.env.DB.prepare(
      "SELECT total_anonymous_games FROM site_stats WHERE id = 1",
    ),
  ]);
  const count =
    (batchResults[1]?.results[0] as { total_anonymous_games: number } | undefined)
      ?.total_anonymous_games ?? 0;
  return c.json({ count });
});
