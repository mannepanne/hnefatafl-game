// ABOUT: Unit tests for HMAC-SHA256 session cookie helpers.
// ABOUT: Covers createSession, verifySession, and sliding-window refresh logic.

import { describe, it, expect } from "vitest";
import { createSession, verifySession } from "@/worker/auth/session";

const SECRET = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
const USER_ID = "user-abc-123";

describe("createSession", () => {
  it("returns a string with exactly one dot separator", async () => {
    const cookie = await createSession(USER_ID, SECRET);
    const parts = cookie.split(".");
    expect(parts).toHaveLength(2);
  });

  it("encodes payload as base64url-safe JSON", async () => {
    const cookie = await createSession(USER_ID, SECRET);
    const [payloadB64] = cookie.split(".");
    const decoded = JSON.parse(atob(payloadB64!.replace(/-/g, "+").replace(/_/g, "/")));
    expect(decoded.uid).toBe(USER_ID);
    expect(typeof decoded.exp).toBe("number");
  });

  it("sets expiry ~90 days in the future", async () => {
    const before = Date.now();
    const cookie = await createSession(USER_ID, SECRET);
    const after = Date.now();
    const [payloadB64] = cookie.split(".");
    const { exp } = JSON.parse(atob(payloadB64!.replace(/-/g, "+").replace(/_/g, "/")));
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    expect(exp).toBeGreaterThanOrEqual(before + ninetyDaysMs - 1000);
    expect(exp).toBeLessThanOrEqual(after + ninetyDaysMs + 1000);
  });

  it("produces different signatures for different user IDs", async () => {
    const c1 = await createSession("user-A", SECRET);
    const c2 = await createSession("user-B", SECRET);
    expect(c1).not.toBe(c2);
    const [, sig1] = c1.split(".");
    const [, sig2] = c2.split(".");
    expect(sig1).not.toBe(sig2);
  });
});

describe("verifySession", () => {
  it("returns the userId for a valid cookie", async () => {
    const cookie = await createSession(USER_ID, SECRET);
    const result = await verifySession(cookie, SECRET);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe(USER_ID);
  });

  it("returns null for a tampered payload", async () => {
    const cookie = await createSession(USER_ID, SECRET);
    const [, sig] = cookie.split(".");
    const fakePayload = btoa(JSON.stringify({ uid: "attacker", exp: Date.now() + 999999 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const tampered = `${fakePayload}.${sig}`;
    const result = await verifySession(tampered, SECRET);
    expect(result).toBeNull();
  });

  it("returns null for a tampered signature", async () => {
    const cookie = await createSession(USER_ID, SECRET);
    const [payload] = cookie.split(".");
    const tampered = `${payload}.invalidsignatureXXXX`;
    const result = await verifySession(tampered, SECRET);
    expect(result).toBeNull();
  });

  it("returns null for a cookie signed with a different secret", async () => {
    const cookie = await createSession(USER_ID, SECRET);
    const result = await verifySession(cookie, "a-different-secret-that-is-not-the-same");
    expect(result).toBeNull();
  });

  it("returns null for an expired cookie", async () => {
    // Build a cookie whose expiry is in the past
    const expiredPayload = {
      uid: USER_ID,
      exp: Date.now() - 1000,
    };
    const payloadB64 = btoa(JSON.stringify(expiredPayload))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBuf = await crypto.subtle.sign("HMAC", keyMaterial, enc.encode(payloadB64));
    const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const expired = `${payloadB64}.${sig}`;
    const result = await verifySession(expired, SECRET);
    expect(result).toBeNull();
  });

  it("returns null for a malformed cookie (no dot)", async () => {
    const result = await verifySession("nodothere", SECRET);
    expect(result).toBeNull();
  });

  it("returns null for a malformed cookie (bad JSON payload)", async () => {
    const badPayload = btoa("not-json").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const result = await verifySession(`${badPayload}.somesig`, SECRET);
    expect(result).toBeNull();
  });

  it("returns needsRefresh=false when expiry is more than 45 days away", async () => {
    const cookie = await createSession(USER_ID, SECRET);
    const result = await verifySession(cookie, SECRET);
    expect(result).not.toBeNull();
    expect(result!.needsRefresh).toBe(false);
  });

  it("returns needsRefresh=true when expiry is within 45 days", async () => {
    // Build a cookie expiring in 44 days
    const expiry = Date.now() + 44 * 24 * 60 * 60 * 1000;
    const payload = { uid: USER_ID, exp: expiry };
    const payloadB64 = btoa(JSON.stringify(payload))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBuf = await crypto.subtle.sign("HMAC", keyMaterial, enc.encode(payloadB64));
    const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const cookie = `${payloadB64}.${sig}`;
    const result = await verifySession(cookie, SECRET);
    expect(result).not.toBeNull();
    expect(result!.needsRefresh).toBe(true);
  });
});
