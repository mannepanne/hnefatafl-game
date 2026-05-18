// ABOUT: Magic-link auth routes: request-link, verify, sign-out.
// ABOUT: request-link rate-limits by email (5/hour) and IP (20/hour).

import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { z } from "zod/v4";
import { createEmailer } from "../email/index.js";
import { generateToken, storeToken, consumeToken } from "../auth/token.js";
import { createSession } from "../auth/session.js";

const COOKIE_NAME = "hs";
const MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
const RATE_WINDOW_TTL = 3600;
const EMAIL_RATE_LIMIT = 5;
const IP_RATE_LIMIT = 20;

const requestLinkSchema = z.object({
  email: z.email(),
});

export const auth = new Hono<{ Bindings: Env }>();

auth.post("/auth/request-link", async (c) => {
  let body: { email: string };
  try {
    const raw = await c.req.json();
    body = requestLinkSchema.parse(raw);
  } catch {
    return c.json({ error: "invalid_request" }, 400);
  }

  const email = body.email.trim().toLowerCase();

  // Rate-limit by email
  const emailKey = `ratelimit:magic:email:${email}`;
  const rawEmailHits = await c.env.KV.get(emailKey);
  const emailHits = rawEmailHits ? parseInt(rawEmailHits, 10) : 0;
  if (emailHits >= EMAIL_RATE_LIMIT) {
    return c.json({ error: "rate_limit_exceeded" }, 429);
  }

  // Rate-limit by IP
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  const ipKey = `ratelimit:magic:ip:${ip}`;
  const rawIpHits = await c.env.KV.get(ipKey);
  const ipHits = rawIpHits ? parseInt(rawIpHits, 10) : 0;
  if (ipHits >= IP_RATE_LIMIT) {
    return c.json({ error: "rate_limit_exceeded" }, 429);
  }

  const token = generateToken();
  await storeToken(c.env.KV, token, email);

  await c.env.KV.put(emailKey, String(emailHits + 1), { expirationTtl: RATE_WINDOW_TTL });
  await c.env.KV.put(ipKey, String(ipHits + 1), { expirationTtl: RATE_WINDOW_TTL });

  const url = `${c.env.APP_URL}/api/auth/verify?token=${token}`;
  const emailer = createEmailer(c.env);
  await emailer.sendMagicLink(email, url);

  return c.json({ ok: true });
});

auth.get("/auth/verify", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.redirect(`${c.env.APP_URL}/sign-in?error=invalid`);
  }

  const email = await consumeToken(c.env.KV, token);
  if (!email) {
    return c.redirect(`${c.env.APP_URL}/sign-in?error=invalid`);
  }

  // Look up or create the user profile
  let userId: string;
  const existing = await c.env.DB.prepare(
    "SELECT user_id FROM leaderboard_profiles WHERE email = ?",
  )
    .bind(email)
    .first<{ user_id: string }>();

  if (existing) {
    userId = existing.user_id;
  } else {
    userId = crypto.randomUUID();
    const localPart = email.split("@")[0]!.slice(0, 32);
    let displayName = localPart;
    let inserted = false;

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await c.env.DB.prepare(
          "INSERT INTO leaderboard_profiles (user_id, email, display_name) VALUES (?, ?, ?)",
        )
          .bind(userId, email, displayName)
          .run();
        inserted = true;
        break;
      } catch {
        // UNIQUE constraint on display_name — try next suffix
        displayName = `${localPart}_${attempt + 1}`.slice(0, 32);
      }
    }

    if (!inserted) {
      return c.json({ error: "server_error" }, 500);
    }
  }

  const sessionCookie = await createSession(userId, c.env.SESSION_SECRET);
  const secure = new URL(c.req.url).protocol === "https:";
  setCookie(c, COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return c.redirect(c.env.APP_URL);
});

auth.post("/auth/sign-out", async (c) => {
  const secure = new URL(c.req.url).protocol === "https:";
  setCookie(c, COOKIE_NAME, "", {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
  });
  return c.redirect(c.env.APP_URL);
});
