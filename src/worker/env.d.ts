// ABOUT: Augments the wrangler-generated Env with runtime secrets (SESSION_SECRET, RESEND_API_KEY).
// ABOUT: These are set via `wrangler secret put` and do not appear in wrangler.toml.

declare interface Env {
  SESSION_SECRET: string;
}
