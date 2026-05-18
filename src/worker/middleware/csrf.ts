// ABOUT: CSRF protection via Origin header check for state-mutating requests.
// ABOUT: Absent Origin is allowed (server-to-server / curl); mismatched Origin returns 403.

import type { MiddlewareHandler } from "hono";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function csrfMiddleware(appUrl: string): MiddlewareHandler {
  const allowedOrigin = new URL(appUrl).origin;
  return async (c, next) => {
    if (!SAFE_METHODS.has(c.req.method)) {
      const origin = c.req.header("Origin");
      if (origin !== undefined && origin !== allowedOrigin) {
        return c.json({ error: "forbidden" }, 403);
      }
    }
    return next();
  };
}
