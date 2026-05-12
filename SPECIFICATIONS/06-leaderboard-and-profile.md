# Phase 6: Leaderboard + profile (stub)

> **Stub spec.** Re-draft in full at the start of Phase 6 using `00-TEMPLATE-phase.md`.

## Overview

**Phase number:** 6
**Working name:** Leaderboard + profile pages
**Dependencies:** Phase 5 complete (authenticated users + populated `game_results`).

**What it does:** Surfaces the data being recorded in Phase 5. Leaderboard page shows top players with side/difficulty filters; profile page shows per-user stats with a donut chart and the same filters.

## Deliverables (sketch)

- `GET /api/leaderboard?side=...&difficulty=...` — returns aggregated leaderboard rows (top 100). Cached at the edge for ~60s.
- `GET /api/profile/me` — returns the current user's aggregated stats. Authenticated only.
- `GET /api/profile/:username` — returns public stats for a user. Public.
- Leaderboard page (`LeaderboardPage.tsx`) ported from prototype, adapted to new API.
- Profile page (`ProfilePage.tsx`) ported from prototype, including the SVG donut chart.
- React Query (or a lighter alternative — confirm at draft time) for client-side caching.
- Mobile-responsive tables.

## Out of scope

- Public username pages reachable without an account.
- Following/friends.
- Leaderboard pagination beyond top 100.
- Real-time updates (polling/SSE/WebSocket).

## Open questions for this phase

- **React Query vs `swr` vs hand-rolled fetch + `useState`:** prototype uses React Query. Worth re-evaluating now that the API surface is small. Default: keep React Query for parity unless bundle size becomes a concern.
- **Username display:** prototype shows email-local-part. Confirm; consider opaque IDs if we're worried about email enumeration via leaderboard.
- **Edge caching policy:** which routes benefit, and what TTL? Default: 60s on leaderboard list; no cache on per-user profile.

## Prototype references
- [`LeaderboardPage.tsx`](./ORIGINAL_IDEA/ClaudeShipSource/src/pages/LeaderboardPage.tsx)
- [`ProfilePage.tsx`](./ORIGINAL_IDEA/ClaudeShipSource/src/pages/ProfilePage.tsx)
- [`useLeaderboard.ts`](./ORIGINAL_IDEA/ClaudeShipSource/src/hooks/useLeaderboard.ts)
- [`spec-frontend-pages.md`](./ORIGINAL_IDEA/ClaudeShipSource/spec-frontend-pages.md)
