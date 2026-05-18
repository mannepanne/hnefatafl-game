// ABOUT: Session middleware: reads the `hs` cookie, verifies HMAC signature, attaches user to context.
// ABOUT: Slides the cookie (refreshes Max-Age) when remaining TTL < 45 days.

import type { MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { verifySession, createSession } from "../auth/session.js";

const COOKIE_NAME = "hs";
const MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

export interface SessionUser {
  userId: string;
}

declare module "hono" {
  interface ContextVariableMap {
    user: SessionUser | null;
  }
}

export function sessionMiddleware(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    c.set("user", null);

    const raw = getCookie(c, COOKIE_NAME);
    if (raw) {
      const data = await verifySession(raw, c.env.SESSION_SECRET);
      if (data) {
        c.set("user", { userId: data.userId });

        if (data.needsRefresh) {
          const refreshed = await createSession(data.userId, c.env.SESSION_SECRET);
          const secure = new URL(c.req.url).protocol === "https:";
          setCookie(c, COOKIE_NAME, refreshed, {
            httpOnly: true,
            secure,
            sameSite: "Lax",
            path: "/",
            maxAge: MAX_AGE_SECONDS,
          });
        }
      }
    }

    return next();
  };
}

export function requireUser(c: { var: { user: SessionUser | null } }): SessionUser {
  const user = c.var.user;
  if (!user) throw new Error("unauthenticated");
  return user;
}
