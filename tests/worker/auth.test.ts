// ABOUT: Integration tests for magic-link auth routes: request-link, verify, sign-out.
// ABOUT: Uses SELF (real Worker) + D1/KV bindings from cloudflare:test.

import { SELF, env, applyD1Migrations } from "cloudflare:test";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { phase5Migrations } from "../helpers/migrations";

// Tests hit the worker at https://example.com (cloudflare:test default).
// APP_URL in wrangler.toml is https://hnefatafl.hultberg.org — redirects go there.
const BASE = "https://example.com";
const APP_URL = "https://hnefatafl.hultberg.org";
const REQUEST_LINK_URL = `${BASE}/api/auth/request-link`;
const SIGN_OUT_URL = `${BASE}/api/auth/sign-out`;

// No Origin header: absent Origin passes CSRF (server-to-server / test callers).
// CSRF behaviour itself is covered in csrf.test.ts.
async function requestLink(email: string, ip = "1.2.3.4"): Promise<Response> {
  return SELF.fetch(REQUEST_LINK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": ip,
    },
    body: JSON.stringify({ email }),
  });
}

async function getStoredToken(email: string): Promise<string | null> {
  const keys = await env.KV.list({ prefix: "magic:" });
  for (const k of keys.keys) {
    const val = await env.KV.get(k.name);
    if (val === email.trim().toLowerCase()) return k.name.slice("magic:".length);
  }
  return null;
}

async function clearRateLimits() {
  const list = await env.KV.list({ prefix: "ratelimit:magic:" });
  for (const k of list.keys) await env.KV.delete(k.name);
}

async function clearMagicTokens() {
  const list = await env.KV.list({ prefix: "magic:" });
  for (const k of list.keys) await env.KV.delete(k.name);
}

describe("POST /api/auth/request-link", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, phase5Migrations);
  });

  beforeEach(async () => {
    await clearRateLimits();
    await clearMagicTokens();
  });

  it("returns 200 { ok: true } for a valid email", async () => {
    const res = await requestLink("user@example.com");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("stores a magic token in KV", async () => {
    await requestLink("user@example.com");
    const token = await getStoredToken("user@example.com");
    expect(token).not.toBeNull();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("normalises email to lowercase", async () => {
    await requestLink("USER@EXAMPLE.COM");
    const token = await getStoredToken("user@example.com");
    expect(token).not.toBeNull();
  });

  it("returns 400 for an invalid email", async () => {
    const res = await requestLink("not-an-email");
    expect(res.status).toBe(400);
  });

  it("returns 429 when email rate limit is already at max", async () => {
    // Pre-seed the rate-limit counter to the max (5) via direct KV write.
    // This avoids triggering actual email sends for the setup calls.
    const email = "rate@example.com";
    await env.KV.put(`ratelimit:magic:email:${email}`, "5", { expirationTtl: 3600 });

    const res = await requestLink(email);
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("rate_limit_exceeded");
  });

  it("returns 429 when IP rate limit is already at max", async () => {
    // Pre-seed the IP rate-limit counter to the max (20) via direct KV write.
    const ip = "5.5.5.5";
    await env.KV.put(`ratelimit:magic:ip:${ip}`, "20", { expirationTtl: 3600 });

    const res = await requestLink("newuser@example.com", ip);
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("rate_limit_exceeded");
  });
});

describe("GET /api/auth/verify", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, phase5Migrations);
  });

  beforeEach(async () => {
    await clearMagicTokens();
    // Remove test profiles between tests
    await env.DB.prepare("DELETE FROM leaderboard_profiles WHERE email LIKE '%@verify-test.com'").run();
  });

  async function putToken(token: string, email: string) {
    await env.KV.put(`magic:${token}`, email, { expirationTtl: 900 });
  }

  it("redirects to / and sets session cookie for a valid token (new user)", async () => {
    const token = "a".repeat(64);
    const email = "newuser@verify-test.com";
    await putToken(token, email);

    const res = await SELF.fetch(`${BASE}/api/auth/verify?token=${token}`, {
      redirect: "manual",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(APP_URL);

    const setCookieHeader = res.headers.get("Set-Cookie");
    expect(setCookieHeader).not.toBeNull();
    expect(setCookieHeader).toContain("hs=");
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("SameSite=Lax");
  });

  it("creates a leaderboard_profiles row for a new user", async () => {
    const token = "b".repeat(64);
    const email = "profilecreate@verify-test.com";
    await putToken(token, email);

    await SELF.fetch(`${BASE}/api/auth/verify?token=${token}`, { redirect: "manual" });

    const row = await env.DB.prepare(
      "SELECT email, display_name FROM leaderboard_profiles WHERE email = ?",
    )
      .bind(email)
      .first<{ email: string; display_name: string }>();

    expect(row).not.toBeNull();
    expect(row!.email).toBe(email);
    expect(row!.display_name).toBe("profilecreate");
  });

  it("reuses existing profile for a returning user", async () => {
    const email = "returning@verify-test.com";
    const userId = "existing-user-id";
    await env.DB.prepare(
      "INSERT INTO leaderboard_profiles (user_id, email, display_name) VALUES (?, ?, ?)",
    )
      .bind(userId, email, "returning")
      .run();

    const token = "c".repeat(64);
    await putToken(token, email);

    const res = await SELF.fetch(`${BASE}/api/auth/verify?token=${token}`, { redirect: "manual" });
    expect(res.status).toBe(302);

    // No new row created
    const count = await env.DB.prepare(
      "SELECT COUNT(*) as n FROM leaderboard_profiles WHERE email = ?",
    )
      .bind(email)
      .first<{ n: number }>();
    expect(count!.n).toBe(1);
  });

  it("is single-use: second verify with same token redirects to sign-in?error=invalid", async () => {
    const token = "d".repeat(64);
    await putToken(token, "singleuse@verify-test.com");

    await SELF.fetch(`${BASE}/api/auth/verify?token=${token}`, { redirect: "manual" });
    const res2 = await SELF.fetch(`${BASE}/api/auth/verify?token=${token}`, { redirect: "manual" });

    expect(res2.status).toBe(302);
    expect(res2.headers.get("Location")).toContain("error=invalid");
  });

  it("redirects to sign-in?error=invalid for missing token", async () => {
    const res = await SELF.fetch(`${BASE}/api/auth/verify`, { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("error=invalid");
  });

  it("redirects to sign-in?error=invalid for unknown token", async () => {
    const res = await SELF.fetch(`${BASE}/api/auth/verify?token=${"z".repeat(64)}`, {
      redirect: "manual",
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("error=invalid");
  });
});

describe("POST /api/auth/sign-out", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, phase5Migrations);
  });

  it("redirects to APP_URL and clears the session cookie", async () => {
    const res = await SELF.fetch(SIGN_OUT_URL, {
      method: "POST",
      redirect: "manual",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(APP_URL);

    const setCookieHeader = res.headers.get("Set-Cookie");
    expect(setCookieHeader).toContain("hs=");
    expect(setCookieHeader).toContain("Max-Age=0");
  });
});
