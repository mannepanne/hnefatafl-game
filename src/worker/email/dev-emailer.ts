// ABOUT: Emailer implementation for local development — logs magic-link URL to console instead of sending.

import type { Emailer } from "./emailer.js";

export class DevEmailer implements Emailer {
  async sendMagicLink(to: string, url: string): Promise<void> {
    console.log(`[DevEmailer] Magic link for ${to}:\n  ${url}`);
  }
}
