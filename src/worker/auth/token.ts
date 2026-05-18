// ABOUT: Magic-link token generation and KV storage helpers.
// ABOUT: Tokens are 32-byte random hex strings stored as magic:<token> -> email.

const TTL_SECONDS = 15 * 60;

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function storeToken(kv: KVNamespace, token: string, email: string): Promise<void> {
  await kv.put(`magic:${token}`, email, { expirationTtl: TTL_SECONDS });
}

export async function consumeToken(kv: KVNamespace, token: string): Promise<string | null> {
  const email = await kv.get(`magic:${token}`);
  if (!email) return null;
  await kv.delete(`magic:${token}`);
  return email;
}
