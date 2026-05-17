// ABOUT: Tests for /api/stats/anonymous-games — GET count, POST increment, IP rate limit.
// ABOUT: Counter backed by D1 site_stats; rate-limit keys remain in KV.

import { SELF, env, applyD1Migrations } from "cloudflare:test";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { phase4Migrations } from "../helpers/migrations";

const URL = "https://example.com/api/stats/anonymous-games";

async function getCount(): Promise<number> {
  const res = await SELF.fetch(URL);
  expect(res.status).toBe(200);
  const body = (await res.json()) as { count: number };
  return body.count;
}

async function postIncrement(ip = "1.2.3.4"): Promise<Response> {
  return SELF.fetch(URL, {
    method: "POST",
    headers: { "CF-Connecting-IP": ip },
  });
}

describe("GET /api/stats/anonymous-games", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, phase4Migrations);
  });

  beforeEach(async () => {
    // Reset counter between tests
    await env.DB.prepare(
      "UPDATE site_stats SET total_anonymous_games = 0 WHERE id = 1",
    ).run();
  });

  it("returns 200 with count=0 when no games recorded", async () => {
    const count = await getCount();
    expect(count).toBe(0);
  });

  it("returns the current count after a direct D1 update", async () => {
    await env.DB.prepare(
      "UPDATE site_stats SET total_anonymous_games = 42 WHERE id = 1",
    ).run();
    const count = await getCount();
    expect(count).toBe(42);
  });
});

describe("POST /api/stats/anonymous-games", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, phase4Migrations);
  });

  beforeEach(async () => {
    // Reset D1 counter
    await env.DB.prepare(
      "UPDATE site_stats SET total_anonymous_games = 0 WHERE id = 1",
    ).run();
    // Clear rate-limit keys for test IPs
    const list = await env.KV.list({ prefix: "ratelimit:stats:" });
    for (const key of list.keys) {
      await env.KV.delete(key.name);
    }
  });

  it("returns 200 and increments the counter", async () => {
    const res = await postIncrement();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number };
    expect(body.count).toBe(1);
  });

  it("increments multiple times from different IPs", async () => {
    await postIncrement("1.1.1.1");
    await postIncrement("2.2.2.2");
    const count = await getCount();
    expect(count).toBe(2);
  });

  it("returns 429 when the same IP exceeds the rate limit (exercises increment + TTL path)", async () => {
    const ip = "9.9.9.9";
    // Hit the endpoint RATE_LIMIT times — all should succeed
    for (let i = 0; i < 10; i++) {
      const res = await postIncrement(ip);
      expect(res.status).toBe(200);
    }
    // 11th request from the same IP must be rejected
    const res = await postIncrement(ip);
    expect(res.status).toBe(429);
  });

  it("allows a different IP after one is rate-limited", async () => {
    await env.KV.put("ratelimit:stats:9.9.9.9", "10", { expirationTtl: 3600 });

    const res = await postIncrement("8.8.8.8");
    expect(res.status).toBe(200);
  });
});
