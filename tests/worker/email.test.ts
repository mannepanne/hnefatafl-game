// ABOUT: Unit tests for the Emailer implementations and factory.
// ABOUT: CloudflareEmailer, ResendEmailer, DevEmailer, createEmailer.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CloudflareEmailer } from "@/worker/email/cloudflare-emailer";
import { ResendEmailer } from "@/worker/email/resend-emailer";
import { DevEmailer } from "@/worker/email/dev-emailer";
import { magicLinkEmailBody, buildRawEmail } from "@/worker/email/emailer";

const FROM = "noreply@hnefatafl.hultberg.org";
const TO = "user@example.com";
const URL = "https://hnefatafl.hultberg.org/auth/verify?token=abc123";

// --- Pure helper functions ---

describe("magicLinkEmailBody", () => {
  it("includes the magic link URL", () => {
    const body = magicLinkEmailBody(URL);
    expect(body).toContain(URL);
  });

  it("mentions 15-minute expiry", () => {
    const body = magicLinkEmailBody(URL);
    expect(body).toContain("15 minutes");
  });

  it("includes a safety note for unsolicited emails", () => {
    const body = magicLinkEmailBody(URL);
    expect(body).toContain("safely ignore");
  });
});

describe("buildRawEmail", () => {
  it("produces a valid RFC 2822 message with the expected headers", () => {
    const raw = buildRawEmail(FROM, TO, "Test subject", "Hello body");
    expect(raw).toContain(`From: ${FROM}`);
    expect(raw).toContain(`To: ${TO}`);
    expect(raw).toContain("Subject: Test subject");
    expect(raw).toContain("MIME-Version: 1.0");
    expect(raw).toContain("Content-Type: text/plain");
  });

  it("separates headers from body with a blank line", () => {
    const raw = buildRawEmail(FROM, TO, "Subject", "Body text");
    expect(raw).toContain("\r\n\r\nBody text");
  });
});

// --- CloudflareEmailer ---

describe("CloudflareEmailer", () => {
  it("calls sendEmail.send with an EmailMessage", async () => {
    const mockSend = vi.fn().mockResolvedValue(undefined);
    const mockSendEmail = { send: mockSend } as unknown as SendEmail;
    const emailer = new CloudflareEmailer(mockSendEmail, FROM);

    await emailer.sendMagicLink(TO, URL);

    expect(mockSend).toHaveBeenCalledOnce();
    // EmailMessage exposes from/to but not raw (raw is a ReadableStream in workerd).
    // The raw content is covered by buildRawEmail + magicLinkEmailBody unit tests above.
    const [msg] = mockSend.mock.calls[0] as [EmailMessage];
    expect(msg.from).toBe(FROM);
    expect(msg.to).toBe(TO);
  });

  it("propagates send failures", async () => {
    const mockSend = vi.fn().mockRejectedValue(new Error("CF send error"));
    const mockSendEmail = { send: mockSend } as unknown as SendEmail;
    const emailer = new CloudflareEmailer(mockSendEmail, FROM);

    await expect(emailer.sendMagicLink(TO, URL)).rejects.toThrow("CF send error");
  });
});

// --- ResendEmailer ---

describe("ResendEmailer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("posts to api.resend.com with the correct payload", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    const emailer = new ResendEmailer("re_test_key", FROM);
    await emailer.sendMagicLink(TO, URL);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer re_test_key");
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.to).toBe(TO);
    expect((body.text as string)).toContain(URL);
  });

  it("throws on non-2xx response", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response("Unauthorized", { status: 401 }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const emailer = new ResendEmailer("bad_key", FROM);
    await expect(emailer.sendMagicLink(TO, URL)).rejects.toThrow("401");
  });
});

// --- DevEmailer ---

describe("DevEmailer", () => {
  it("logs the magic link URL to console without throwing", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const emailer = new DevEmailer();
    await expect(emailer.sendMagicLink(TO, URL)).resolves.toBeUndefined();
    expect(logSpy).toHaveBeenCalledOnce();
    expect(logSpy.mock.calls[0]?.join(" ")).toContain(URL);
    logSpy.mockRestore();
  });
});
