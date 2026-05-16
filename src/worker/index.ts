// ABOUT: Worker entry. Mounts the Hono API under /api/* and falls through
// ABOUT: to the static-asset binding (ASSETS) for everything else.

import { Hono } from "hono";
import { health } from "./routes/health";
import { stats } from "./routes/stats";

const api = new Hono<{ Bindings: Env }>();
api.route("/", health);
api.route("/", stats);

const app = new Hono<{ Bindings: Env }>();
app.route("/api", api);
app.notFound((c) => c.json({ error: "not_found" }, 404));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return app.fetch(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
