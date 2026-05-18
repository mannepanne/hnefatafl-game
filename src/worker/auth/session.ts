// ABOUT: HMAC-SHA256 signed session cookie helpers.
// ABOUT: Cookie format: base64url(payload).base64url(HMAC-SHA256(payload, secret))

const REFRESH_THRESHOLD_MS = 45 * 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function toBase64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function strToBase64Url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSession(userId: string, secret: string): Promise<string> {
  const payload = strToBase64Url(JSON.stringify({ uid: userId, exp: Date.now() + SESSION_TTL_MS }));
  const key = await importKey(secret);
  const sig = toBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return `${payload}.${sig}`;
}

export interface SessionData {
  userId: string;
  needsRefresh: boolean;
}

export async function verifySession(cookie: string, secret: string): Promise<SessionData | null> {
  const dot = cookie.indexOf(".");
  if (dot === -1) return null;

  const payloadB64 = cookie.slice(0, dot);
  const sigB64 = cookie.slice(dot + 1);

  let parsed: { uid?: unknown; exp?: unknown };
  try {
    parsed = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }

  if (typeof parsed.uid !== "string" || typeof parsed.exp !== "number") return null;
  if (parsed.exp <= Date.now()) return null;

  const key = await importKey(secret);
  let sigBytes: Uint8Array;
  try {
    sigBytes = base64UrlToBytes(sigB64);
  } catch {
    return null;
  }

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes.buffer as ArrayBuffer,
    new TextEncoder().encode(payloadB64),
  );
  if (!valid) return null;

  return {
    userId: parsed.uid,
    needsRefresh: parsed.exp - Date.now() < REFRESH_THRESHOLD_MS,
  };
}
