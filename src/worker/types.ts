// ABOUT: Type definitions for the Worker's environment bindings.
// ABOUT: Mirrors the wrangler.toml binding declarations.

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  KV: KVNamespace;
}
