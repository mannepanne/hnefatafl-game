// ABOUT: Factory that selects the Emailer implementation from the EMAIL_PROVIDER env var.
// ABOUT: Cloudflare = primary; Resend = fallback (requires RESEND_API_KEY secret).

import { CloudflareEmailer } from "./cloudflare-emailer.js";
import { ResendEmailer } from "./resend-emailer.js";
import { DevEmailer } from "./dev-emailer.js";
import type { Emailer } from "./emailer.js";

export type { Emailer };

export function createEmailer(env: Env): Emailer {
  // Cast needed: wrangler types vars as their default literal ("cloudflare"), but the
  // value can be overridden at deploy time via wrangler.toml or wrangler secret.
  if ((env.EMAIL_PROVIDER as string) === "resend") {
    if (!env.RESEND_API_KEY) {
      throw new Error("EMAIL_PROVIDER=resend but RESEND_API_KEY secret is not set");
    }
    return new ResendEmailer(env.RESEND_API_KEY, env.FROM_EMAIL);
  }
  // Default: cloudflare
  return new CloudflareEmailer(env.SEND_EMAIL, env.FROM_EMAIL);
}

export function createDevEmailer(): Emailer {
  return new DevEmailer();
}
