// ABOUT: Unit tests for magic-link token generation and KV storage helpers.
// ABOUT: Covers generateToken, storeToken, consumeToken.

import { describe, it, expect, vi } from "vitest";
import { generateToken, storeToken, consumeToken } from "@/worker/auth/token";

const TOKEN_TTL_SECONDS = 15 * 60;

function makeKv(store: Record<string, string> = {}): KVNamespace {
  return {
    async get(key: string) {
      return store[key] ?? null;
    },
    async put(key: string, value: string, _opts?: { expirationTtl?: number }) {
      store[key] = value;
    },
    async delete(key: string) {
      delete store[key];
    },
  } as unknown as KVNamespace;
}

describe("generateToken", () => {
  it("returns a 64-character hex string (32 bytes)", () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a different token each call", () => {
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
  });
});

describe("storeToken", () => {
  it("stores the email under the magic:<token> key with 15-min TTL", async () => {
    const store: Record<string, string> = {};
    const kv = makeKv(store);
    const putSpy = vi.spyOn(kv, "put");

    await storeToken(kv, "abc123", "user@example.com");

    expect(putSpy).toHaveBeenCalledWith("magic:abc123", "user@example.com", {
      expirationTtl: TOKEN_TTL_SECONDS,
    });
  });
});

describe("consumeToken", () => {
  it("returns the email and deletes the key on first use", async () => {
    const store: Record<string, string> = { "magic:tok1": "user@example.com" };
    const kv = makeKv(store);

    const email = await consumeToken(kv, "tok1");
    expect(email).toBe("user@example.com");
    expect(store["magic:tok1"]).toBeUndefined();
  });

  it("returns null for an unknown token", async () => {
    const kv = makeKv({});
    const email = await consumeToken(kv, "notexist");
    expect(email).toBeNull();
  });

  it("is single-use: returns null on second call", async () => {
    const store: Record<string, string> = { "magic:tok2": "user@example.com" };
    const kv = makeKv(store);

    await consumeToken(kv, "tok2");
    const second = await consumeToken(kv, "tok2");
    expect(second).toBeNull();
  });
});
