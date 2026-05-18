// ABOUT: Factory that returns the appropriate Emailer for the current environment.
// ABOUT: EMAIL_PROVIDER=cloudflare (production default); EMAIL_PROVIDER=dev (local dev, set in .dev.vars).

import { CloudflareEmailer } from "./cloudflare-emailer.js";
import { DevEmailer } from "./dev-emailer.js";
import type { Emailer } from "./emailer.js";

export type { Emailer };

export function createEmailer(env: Env): Emailer {
  // Cast needed: wrangler types vars as their default literal ("cloudflare"), but the
  // value can be overridden at runtime (e.g. EMAIL_PROVIDER=dev in .dev.vars).
  if ((env.EMAIL_PROVIDER as string) === "dev") {
    return new DevEmailer();
  }
  return new CloudflareEmailer(env.SEND_EMAIL, env.FROM_EMAIL);
}
