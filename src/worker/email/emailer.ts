// ABOUT: Emailer interface and helpers shared by all email provider implementations.

export interface Emailer {
  sendMagicLink(to: string, url: string): Promise<void>;
}

export function magicLinkEmailBody(url: string): string {
  return (
    `Click the link below to sign in to Hnefatafl. ` +
    `The link expires in 15 minutes and can only be used once.\r\n\r\n${url}\r\n\r\n` +
    `If you did not request this, you can safely ignore this email.`
  );
}

export function buildRawEmail(from: string, to: string, subject: string, body: string): string {
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ].join("\r\n");
}
