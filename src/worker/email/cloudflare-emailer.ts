// ABOUT: Emailer implementation using Cloudflare Email Sending (cloudflare:email Workers API).
// ABOUT: Primary provider — free on Cloudflare Free plan.

import { EmailMessage } from "cloudflare:email";
import type { Emailer } from "./emailer.js";
import { buildRawEmail, magicLinkEmailBody } from "./emailer.js";

export class CloudflareEmailer implements Emailer {
  constructor(
    private readonly sendEmail: SendEmail,
    private readonly fromEmail: string,
  ) {}

  async sendMagicLink(to: string, url: string): Promise<void> {
    const raw = buildRawEmail(
      this.fromEmail,
      to,
      "Your Hnefatafl sign-in link",
      magicLinkEmailBody(url),
    );
    const msg = new EmailMessage(this.fromEmail, to, raw);
    await this.sendEmail.send(msg);
  }
}
