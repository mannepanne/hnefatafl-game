// ABOUT: Typed fetch wrappers for the Worker API.
// ABOUT: Centralises base URL handling and response parsing.

export async function fetchAnonymousGamesCount(): Promise<number> {
  const res = await fetch('/api/stats/anonymous-games');
  if (!res.ok) throw new Error(`Failed to fetch anonymous games count: ${res.status}`);
  const data = (await res.json()) as { count: unknown };
  return typeof data?.count === 'number' ? data.count : 0;
}

export async function incrementAnonymousGamesCount(): Promise<void> {
  await fetch('/api/stats/anonymous-games', { method: 'POST' }).catch(() => {});
}

export async function requestMagicLink(email: string): Promise<{ ok: true } | { error: string }> {
  const res = await fetch('/api/auth/request-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (res.status === 429) return { error: 'rate_limit_exceeded' };
  if (!res.ok) return { error: 'server_error' };
  return { ok: true };
}
