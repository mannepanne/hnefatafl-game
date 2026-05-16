// ABOUT: Typed fetch wrappers for the Worker API.
// ABOUT: Centralises base URL handling and response parsing.

export async function fetchAnonymousGamesCount(): Promise<number> {
  const res = await fetch('/api/stats/anonymous-games');
  if (!res.ok) throw new Error(`Failed to fetch anonymous games count: ${res.status}`);
  const data = (await res.json()) as { count: number };
  return data.count;
}
