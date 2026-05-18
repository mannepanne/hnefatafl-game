// ABOUT: Emailer implementation using the Resend API.
// ABOUT: Fallback provider — activate by setting EMAIL_PROVIDER=resend and RESEND_API_KEY secret.

import type { Emailer } from "./emailer.js";
import { magicLinkEmailBody } from "./emailer.js";

export class ResendEmailer implements Emailer {
  constructor(private readonly apiKey: string, private readonly fromEmail: string) {}

  async sendMagicLink(to: string, url: string): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to,
        subject: "Your Hnefatafl sign-in link",
        text: magicLinkEmailBody(url),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Resend API error ${res.status}: ${text}`);
    }
  }
}
