# Phase 5: Magic-link authentication

## Phase overview

**Phase number:** 5
**Phase name:** Magic-link authentication
**Estimated timeframe:** 7–10 days
**Dependencies:** Phase 4 complete (D1 schema live, `leaderboard_profiles` and `game_results` tables exist).

**Brief description:**
Adds email-only sign-in via magic links. A user enters their email address, receives a one-time link, clicks it, and lands on the site authenticated. Authenticated users have their game results recorded to D1 against their account. This phase ships v0.2.

---

## Scope and deliverables

### In scope

- [ ] `POST /api/auth/request-link` — validate email, rate-limit (per email + per IP), generate token, store in KV, send magic-link email
- [ ] `GET /api/auth/verify?token=...` — constant-time token validation, look up or create `leaderboard_profiles` row, set session cookie, redirect to `/`
- [ ] `POST /api/auth/sign-out` — clear session cookie
- [ ] CSRF Origin middleware — reject POST requests where `Origin` does not match the site origin; applied to all state-mutating routes (closes TD-010)
- [ ] Worker middleware: read and verify session cookie, attach `user` to Hono context; `requireUser` helper for protected routes
- [ ] `POST /api/games` — record authenticated game result to `game_results` + increment `site_stats.total_registered_games` in a single `db.batch()`
- [ ] `DELETE /api/profile/me` — hard-delete the authenticated user's `leaderboard_profiles` row; `game_results` rows cascade-delete via FK (resolves TD-012)
- [ ] `Emailer` interface in `src/shared/email/` with `CloudflareEmailer` and `ResendEmailer` implementations and a shared contract test
- [ ] D1 migration: add `email TEXT NOT NULL UNIQUE` to `leaderboard_profiles`; add UNIQUE index on `display_name`; drop aggregate columns (`total_wins`, `total_losses`, `best_time_seconds`, `best_difficulty`) from `leaderboard_profiles`; add `FOREIGN KEY (user_id) REFERENCES leaderboard_profiles(user_id) ON DELETE CASCADE` to `game_results`
- [ ] `SignInPage.tsx` — email form + "check your email" confirmation state
- [ ] `UserMenu` component — "Signed in as [displayName]" indicator + sign-out button, visible in app shell for authenticated users
- [ ] Anonymous sign-in prompt — link/button in the menu for unauthenticated users to navigate to `SignInPage`
- [ ] DNS records (SPF/DKIM/DMARC) configured and verified for both email providers:
  - Cloudflare Email Sending: `hnefatafl.hultberg.org` send path configured
  - Resend: `hultberg.org` already configured; verify still valid
- [ ] Privacy policy updated for v0.2 (accounts, email storage, session cookies)
- [ ] `REFERENCE/environment-setup.md` updated with new secrets, `EMAIL_PROVIDER` variable, and provider switchover playbook
- [ ] Tests for all new functionality (see Testing strategy)

### Out of scope

- OAuth (Google, GitHub, etc.)
- Username editing — Phase 6 (profile page)
- Server-side game result validation (move-history replay) — deferred to Phase 6; revisit whether needed at all
- Turnstile bot challenge — deferred; re-add if email quota abuse is observed in production
- Multiple device / session management UI
- Password recovery (no passwords)
- Email open/click tracking

### Acceptance criteria

- [ ] A new user can enter their email, receive a magic link, click it, and land authenticated
- [ ] A returning user going through the same flow lands authenticated with the same profile
- [ ] The session cookie survives a page refresh and browser restart (90-day persistent cookie)
- [ ] Sign-out clears the cookie and returns to anonymous state
- [ ] Requesting a link more than 5× from the same email in one hour returns a rate-limit error
- [ ] Requesting a link more than 20× from the same IP in one hour returns a rate-limit error
- [ ] Clicking a magic link a second time returns an error (single-use)
- [ ] Clicking an expired magic link (>15 min) returns a clear error
- [ ] An authenticated game result appears in `game_results` with the correct `user_id`
- [ ] `site_stats.total_registered_games` increments correctly alongside a recorded game result
- [ ] Anonymous game counter is unaffected by authenticated flows
- [ ] Switching `EMAIL_PROVIDER` to `resend` sends via Resend with no code changes
- [ ] All state-mutating POST endpoints return 403 when the `Origin` header is present and does not match the site's origin (TD-010 closed)
- [ ] An authenticated user can call `DELETE /api/profile/me`; their `leaderboard_profiles` row and all associated `game_results` rows are removed from D1 (TD-012 resolved)
- [ ] All tests passing, 95%+ coverage, type checking passes

---

## Technical approach

### Auth flow

```
User enters email
  → POST /api/auth/request-link
      normalise: email.trim().toLowerCase()
      rate-limit check (normalised email + IP)
      generate 256-bit token (crypto.getRandomValues, base64url)
      KV.put("magic:" + token, JSON({ email: normalisedEmail }), { expirationTtl: 900 })
      url = `${APP_URL}/api/auth/verify?token=${token}`  [APP_URL from env]
      Emailer.sendMagicLink(normalisedEmail, url)
      → 200 { ok: true }

User clicks link: GET /api/auth/verify?token=...
  → KV.get("magic:" + token)  [returns null if expired or already used]
  → if null: redirect to /sign-in?error=invalid
  → KV.delete("magic:" + token)  [single-use: delete before any further work]
  → SELECT userId FROM leaderboard_profiles WHERE email = ?
  → if not found: INSERT new profile (userId = crypto.randomUUID(), displayName = localpart, email)
      handle UNIQUE violation on displayName: retry with _2, _3 suffix
  → set session cookie (HMAC-signed, HttpOnly, Secure, SameSite=Lax, 90-day Max-Age)
  → redirect to /

User visits site with valid cookie
  → middleware reads cookie, verifies HMAC, attaches { userId, displayName } to context
  → protected routes call requireUser(c) — returns 401 if not present

User signs out: POST /api/auth/sign-out
  → set cookie with Max-Age=0 (clears it)
  → redirect to /
```

### Session cookie design

| Property | Value |
|---|---|
| Name | `hs` (hnefatafl session) |
| Value | `<base64url(payload)>.<base64url(HMAC-SHA256 signature)>` |
| Payload | `{ uid: string, exp: number }` — user ID + Unix expiry |
| HMAC key | `SESSION_SECRET` Wrangler secret |
| Max-Age | 7 776 000 seconds (90 days) |
| Sliding | Refresh cookie if remaining TTL < 45 days (half-life) |
| Flags | `HttpOnly; Secure; SameSite=Lax; Path=/` |

The cookie is not a JWT — it's a simple two-part structure signed with HMAC-SHA256 using the Web Crypto API (available natively in Workers).

### Magic-link token design

| Property | Value |
|---|---|
| Entropy | 256 bits (`crypto.getRandomValues(new Uint8Array(32))`) |
| Encoding | base64url (URL-safe, no padding) |
| KV key | `magic:<token>` |
| KV value | `{ email: string }` |
| TTL | 900 seconds (15 minutes) |
| Single-use | `KV.delete` immediately on successful retrieval, before DB work |

### Emailer interface

```typescript
// src/shared/email/emailer.ts
export interface Emailer {
  sendMagicLink(to: string, magicLinkUrl: string): Promise<void>;
}
```

Phase 8 will extend this with `sendContactNotification`. Both implementations must pass the same contract test. Provider is selected at Worker boot from `EMAIL_PROVIDER` env var (`"cloudflare"` | `"resend"`).

**`CloudflareEmailer`** — uses the Cloudflare Email Sending Workers binding. From address: `hnefatafl@hnefatafl.hultberg.org`.

**`ResendEmailer`** — uses the Resend REST API with `RESEND_API_KEY`. From address: `hnefatafl@hultberg.org`.

**Dev / local:** set `EMAIL_PROVIDER=dev` in `.dev.vars`. A `DevEmailer` logs the magic link URL to the Worker console (`console.log`) instead of sending anything. This is a test-only provider and must never appear in production.

### D1 schema changes

**Migration file:** `0002_phase5_auth.sql` (Drizzle-generated + manual SQL for constraints)

Changes to `leaderboard_profiles`:
- Add `email TEXT NOT NULL UNIQUE` — the user's email address; serves as the account identifier
- Add `UNIQUE INDEX idx_leaderboard_profiles_display_name` on `display_name`
- Drop `total_wins`, `total_losses`, `best_time_seconds`, `best_difficulty` — Phase 6 computes these on read from `game_results` via GROUP BY; pre-aggregated columns are unused dead weight now that `game_results` is the source of truth

Changes to `game_results`:
- Add `FOREIGN KEY (user_id) REFERENCES leaderboard_profiles(user_id) ON DELETE CASCADE` — when a profile is deleted, all game results cascade-delete. D1 FK enforcement requires `PRAGMA foreign_keys = ON` per-connection; verify this is enabled in the Drizzle client during implementation.

SQLite does not allow `ADD COLUMN NOT NULL` without a default, so Drizzle will generate a full table rebuild migration for `leaderboard_profiles` (create new → copy → drop old → rename). This is safe because the table is empty in production.

Run `bun run db:generate` after editing `src/db/schema.ts` to produce the migration, then review the generated SQL before committing.

**Drizzle schema changes (`src/db/schema.ts`):**
- Add `email: text("email").notNull().unique()` to `leaderboard_profiles`
- Add unique index on `displayName`
- Remove `totalWins`, `totalLosses`, `bestTimeSeconds`, `bestDifficulty` from `leaderboard_profiles`
- Add FK constraint on `game_results.userId` referencing `leaderboard_profiles.userId` with `ON DELETE CASCADE`

### CSRF protection

All state-mutating POST endpoints (request-link, sign-out, games, profile deletion) check the `Origin` header before processing:

- If `Origin` is present and does not match `APP_URL`, return `403 Forbidden`
- If `Origin` is absent (non-browser clients): allow — cross-site cookie-bearing requests cannot omit `Origin` in modern browsers, so absence means a legitimate non-browser caller
- `APP_URL` is the canonical origin from the environment variable (e.g. `https://hnefatafl.hultberg.org`)

Implemented as a Hono middleware in `src/worker/middleware/csrf.ts`, mounted before all state-mutating route handlers. Closes TD-010.

### `POST /api/games` payload

**Request body (JSON):**

```typescript
{
  playerSide:      'attacker' | 'defender';
  winnerSide:      'attacker' | 'defender';
  difficulty:      'thrall' | 'karl' | 'jarl';
  durationSeconds: number;   // integer, 1–86400
  moveCount:       number;   // integer, 1–10000
}
```

**Server-side behaviour:**
1. CSRF middleware runs first (see above)
2. `requireUser(c)` — return 401 if not authenticated
3. Validate payload with Zod schema; return 400 on invalid input
4. `db.batch([INSERT INTO game_results ..., UPDATE site_stats SET total_registered_games = total_registered_games + 1 ...])`
5. Return `201 { ok: true }`

**Client integration:**
- Called from `useGame.ts` (or equivalent hook) when the game ends and the user is authenticated
- Fire-and-forget in the UI: a failed write logs a console error but does not block the result screen
- Anonymous users: check auth state client-side before calling; do not trigger a 401 round-trip

**Aggregate strategy:** `leaderboard_profiles` no longer holds pre-aggregated stats after the Phase 5 migration drops those columns. Phase 6's leaderboard query will GROUP BY directly on `game_results`. This is correct at the expected scale; Phase 6 can add a covering index on `game_results(user_id)` if needed.

### Rate limiting

Reuses the existing KV rate-limit pattern from Phase 3.

| Bucket | KV key | Limit | Window |
|---|---|---|---|
| Per email | `ratelimit:magic:email:<email>` | 5 | 1 hour |
| Per IP | `ratelimit:magic:ip:<ip>` | 20 | 1 hour |

Returns HTTP 429 with `{ error: "rate_limit_exceeded" }` when exceeded.

### Key files and components

**New files:**
```
src/
  shared/
    email/
      emailer.ts                  # Emailer interface
      cloudflare-emailer.ts       # CloudflareEmailer implementation
      resend-emailer.ts           # ResendEmailer implementation
      dev-emailer.ts              # DevEmailer (console.log only)
      index.ts                    # factory: createEmailer(env) → Emailer
  worker/
    routes/
      auth.ts                     # /api/auth/* routes (Hono router)
      games.ts                    # POST /api/games
      profile.ts                  # DELETE /api/profile/me (account deletion)
    middleware/
      session.ts                  # cookie read + HMAC verify + context attach
      require-user.ts             # requireUser(c) helper
      csrf.ts                     # Origin check middleware (closes TD-010)
  client/
    pages/
      SignInPage.tsx               # email form + confirmation state
    components/
      UserMenu.tsx                 # auth indicator + sign-out button

tests/
  worker/
    auth.test.ts                  # request-link, verify, sign-out routes
    games.test.ts                 # POST /api/games (authenticated + anonymous)
    profile.test.ts               # DELETE /api/profile/me
    csrf.test.ts                  # CSRF Origin middleware
  shared/
    email/
      emailer-contract.test.ts    # shared contract for both implementations
```

**Modified files:**
```
src/worker/index.ts                 — mount auth + games routes; wire session middleware
src/client/App.tsx (or router)      — add /sign-in route; render UserMenu in app shell
src/db/schema.ts                    — add email column + UNIQUE index on displayName
src/db/migrations/                  — new Drizzle-generated migration
wrangler.toml                       — add EMAIL_PROVIDER variable
src/client/pages/PrivacyPage.tsx    — update for v0.2 (accounts, email storage, cookies)
REFERENCE/environment-setup.md      — new secrets + provider switchover playbook
```

### Wrangler config additions

```toml
[vars]
EMAIL_PROVIDER = "cloudflare"   # override to "resend" via wrangler secret put or .dev.vars
APP_URL = "https://hnefatafl.hultberg.org"   # override in .dev.vars to http://localhost:5173

# Existing bindings DB and KV already cover Phase 5 needs.
# Email Sending binding added if Cloudflare Email Sending requires a named binding.
```

---

## Testing strategy

### Coverage targets

- Lines: 95%+
- Functions: 95%+
- Branches: 90%+
- Statements: 95%+

### Unit / integration tests (workers pool)

**`tests/worker/auth.test.ts`**
- `POST /api/auth/request-link` — valid email stores token in KV, calls `Emailer.sendMagicLink`
- `POST /api/auth/request-link` — invalid email format returns 400
- `POST /api/auth/request-link` — rate limit per email (6th request returns 429)
- `POST /api/auth/request-link` — rate limit per IP (21st request returns 429)
- `GET /api/auth/verify` — valid token: creates profile, sets cookie, redirects
- `GET /api/auth/verify` — valid token for existing user: updates session, redirects
- `GET /api/auth/verify` — token not in KV (expired or reused): redirects with error
- `GET /api/auth/verify` — second call with same token: redirects with error (single-use)
- `POST /api/auth/sign-out` — clears cookie
- Session middleware — valid cookie attaches user to context
- Session middleware — tampered cookie returns 401
- Session middleware — missing cookie: unauthenticated context (not 401 — middleware is additive)
- `requireUser` — returns 401 if no user in context

**`tests/worker/games.test.ts`**
- Authenticated user: game result written to `game_results`, `total_registered_games` incremented
- Anonymous user posting to `/api/games`: returns 401
- Invalid payload (missing fields, bad values): returns 400

**`tests/worker/profile.test.ts`**
- `DELETE /api/profile/me` — authenticated user: profile and game results removed from D1
- `DELETE /api/profile/me` — unauthenticated: returns 401

**`tests/worker/csrf.test.ts`**
- POST with matching Origin: passes through
- POST with mismatched Origin: returns 403
- POST with no Origin header: passes through (non-browser client)

**`tests/shared/email/emailer-contract.test.ts`**
- Both `CloudflareEmailer` and `ResendEmailer` satisfy the interface contract (via mocked HTTP)
- `DevEmailer` logs to console and resolves

### Manual testing checklist

- [ ] Full magic-link flow works end to end in production (real email received and link works)
- [ ] Both email providers tested in staging before production (confirm deliverability)
- [ ] Session persists across page refreshes and browser restart
- [ ] Sign-out clears cookie and returns to anonymous state
- [ ] Authenticated game result visible in D1 via `wrangler d1 execute`
- [ ] Rate limit triggers correctly (5 same-email requests in 1 hour)
- [ ] Expired link (wait 16 min) shows error
- [ ] Reused link shows error
- [ ] Account deletion via `DELETE /api/profile/me` removes profile and all game results from D1

---

## Pre-commit checklist

- [ ] `bun run test` — all tests passing
- [ ] `bun run typecheck` — no errors
- [ ] `bun run test:coverage` — 95%+ lines/functions/statements, 90%+ branches
- [ ] Manual checklist above completed
- [ ] Cloudflare Email Sending tested end-to-end in dev before relying on it in production (confirmed accessible and free — verified in account)
- [ ] `SESSION_SECRET` set in production via `bunx wrangler secret put SESSION_SECRET`
- [ ] `RESEND_API_KEY` set in production via `bunx wrangler secret put RESEND_API_KEY`
- [ ] DNS records verified (SPF/DKIM/DMARC for both send paths)
- [ ] `DevEmailer` unreachable in production (guarded by `EMAIL_PROVIDER` check)
- [ ] No secrets or tokens in committed code
- [ ] `REFERENCE/environment-setup.md` updated
- [ ] Privacy policy updated

---

## PR workflow

### Branch naming

```
feature/phase-5-magic-link-auth
```

Split into sub-branches if helpful (e.g. `feature/phase-5-emailer`, `feature/phase-5-session`), but aim for one final PR that ships the complete working feature.

### Review

Use `/review-pr-team` directly — this phase touches auth, session cookies, KV token storage, and email. Skip triage.

### Deployment runbook

Run in order:

1. **Apply D1 migration to production:**
   ```bash
   bun run db:apply
   ```
2. **Set secrets** (one-time; skip if already set from a prior attempt):
   ```bash
   bunx wrangler secret put SESSION_SECRET   # generate: openssl rand -base64 32
   bunx wrangler secret put RESEND_API_KEY
   ```
3. **Deploy Worker:**
   ```bash
   bun run deploy
   ```
4. **Smoke test:** navigate to `https://hnefatafl.hultberg.org/sign-in`, enter a real email, confirm link arrives and auth works.
5. **Verify D1:** `bunx wrangler d1 execute hnefatafl-db --remote --command="SELECT COUNT(*) FROM leaderboard_profiles"`

**To switch to Resend:**
```bash
# In production:
bunx wrangler secret put EMAIL_PROVIDER   # enter: resend
bun run deploy
# Verify by completing a sign-in and checking the email arrived via Resend dashboard
```

---

## Edge cases and considerations

### Security

- **Constant-time session cookie verification** — when verifying the HMAC signature on the session cookie, use `await crypto.subtle.verify('HMAC', key, storedSignature, encodedPayload)` rather than a string comparison. This function is constant-time by design in the Web Crypto API. Note: `crypto.subtle.timingSafeEqual` does not exist in the Workers runtime — it is a Node.js-only API. For the magic-link token, `KV.get("magic:" + token)` is a direct key lookup (not a string comparison), so no timing attack surface applies there.
- **Email normalisation** — apply `email.trim().toLowerCase()` before all KV lookups, DB queries, and storage. Prevents duplicate accounts from address variants like `User@Example.com` vs `user@example.com`.
- **Token deletion before DB work** — delete the KV key before creating/looking up the profile row. If the DB write fails after deletion, the user must request a new link. This is safer than leaving a used token in KV while doing DB work.
- **Session secret rotation** — rotating `SESSION_SECRET` invalidates all active sessions. Document this in the switchover playbook. For a hobby project, this is acceptable; just warn the user in the playbook.
- **Email enumeration** — `POST /api/auth/request-link` returns the same `{ ok: true }` response regardless of whether the email is known. Never reveal whether an email is registered.
- **Cookie scope** — `Path=/` (not path-restricted). `SameSite=Lax` prevents CSRF on cross-site navigations while allowing top-level GET links (the magic-link redirect) to land authenticated.
- **HTTPS only** — `Secure` flag on cookie. No plain-HTTP fallback.

### Username collision handling

On first sign-in, derive `displayName` from the email local-part (everything before `@`). Truncate to 28 characters to leave room for a `_NNN` suffix. If the derived name is taken:
1. Attempt `<name>_2`, `<name>_3`, ... up to `<name>_99`
2. If all taken (extremely unlikely): fall back to a random 8-character alphanumeric string

### Dev email flow

In local dev (`EMAIL_PROVIDER=dev`), the magic link URL is logged to the Worker console. Open the Wrangler dev terminal to see the URL, then paste it into the browser. This keeps the local dev loop fast without sending real emails.

### Resend fallback readiness

Both providers must be configured and tested in staging before production. "Theoretically ready" is not acceptable — the ADR requires the fallback to be *genuinely* ready from day one. Confirm a real email is received via Resend before shipping.

### Privacy policy

Accounts introduce email storage and session cookies — the privacy policy must be updated before v0.2 ships:
- Email is stored (associated with a `leaderboard_profiles` row)
- A session cookie is set on sign-in (HttpOnly, 90-day persistent)
- Game results are stored per-user
- Users can request account deletion by contacting the admin email (the `DELETE /api/profile/me` endpoint exists but has no UI until Phase 8; the policy should include the admin contact address)

---

## Technical debt introduced

**TD-012: No self-service account-deletion UI in Phase 5 (server endpoint added)**
- **Location:** `DELETE /api/profile/me` route added in Phase 5; no user-facing UI until Phase 8
- **Issue:** Users can delete their account via a direct API call but there is no "Delete my account" button in the UI. The privacy policy will include a contact address for manual deletion requests in the interim.
- **Why accepted:** Account-management UI is Phase 8 scope. The server-side endpoint and cascade-delete FK are implemented in Phase 5; the UI gap is minor for a non-commercial hobby project.
- **Risk:** Low — the deletion path exists; it just requires a direct API call or admin action in Phase 5.
- **Future fix:** Phase 8 profile page: add a "Delete account" button that calls `DELETE /api/profile/me`.

See [technical-debt.md](../REFERENCE/technical-debt.md) for full tracker.

---

## ADRs that constrain this phase

- [`2026-05-12-email-provider-abstraction.md`](../REFERENCE/decisions/2026-05-12-email-provider-abstraction.md) — `Emailer` interface, two implementations, manual provider switchover
- [`2026-05-12-cloudflare-only-stack.md`](../REFERENCE/decisions/2026-05-12-cloudflare-only-stack.md) — no third-party auth provider; session management in Workers

## Decisions made during planning

| Topic | Decision | Notes |
|---|---|---|
| Session length | 90 days sliding (refresh if < 45 days remaining) | Balances security with not annoying returning players |
| Server-side game validation | Deferred to Phase 6 | Revisit whether needed at all — significant complexity |
| Turnstile | Dropped | Rate limiting per email + IP is sufficient at this scale; re-add if abuse observed |
| `is_admin` placement | Stays on `leaderboard_profiles` | Phase 8 admin panel will have an explicit decision point |
| Username uniqueness | UNIQUE constraint on `display_name`; suffix `_2`/`_3` on collision | Editable in Phase 6 (profile page). Suffix approach may surprise users; Phase 6 can revisit with Discord-style `name#id` if collisions become common. |
| Username source | Email local-part, truncated to 28 chars to allow suffix room | Not editable in Phase 5 |
| FK on `game_results.user_id` | Hard FK (`REFERENCES leaderboard_profiles(user_id) ON DELETE CASCADE`) | `PRAGMA foreign_keys = ON` required per-connection in D1 — verify during implementation |
| Aggregate columns | Drop `total_wins`, `total_losses`, `best_time_seconds`, `best_difficulty` from `leaderboard_profiles` in Phase 5 migration | Phase 6 computes aggregates on read from `game_results` via GROUP BY |
| Account deletion | Hard-delete: profile row + cascade game results | Cleanest for GDPR; no leaderboard history preservation |
| CSRF protection | Origin check middleware on all state-mutating POSTs | Closes TD-010; returns 403 on mismatch |

## Prototype references

- [`SignInPage.tsx`](./ORIGINAL_IDEA/ClaudeShipSource/src/pages/SignInPage.tsx) — UX shape (not ported verbatim; Supabase auth replaced with magic-link form)
- [`useAuth.ts`](./ORIGINAL_IDEA/ClaudeShipSource/src/hooks/useAuth.ts) — Supabase PKCE flow; reference only for the UX pattern
- [`spec-frontend-pages.md`](./ORIGINAL_IDEA/ClaudeShipSource/spec-frontend-pages.md) — sign-in page layout and copy

---

## Related documentation

- [Root CLAUDE.md](../CLAUDE.md) — project navigation
- [testing-strategy.md](../REFERENCE/testing-strategy.md) — testing approach and coverage requirements
- [environment-setup.md](../REFERENCE/environment-setup.md) — secrets, Cloudflare resource setup
- [technical-debt.md](../REFERENCE/technical-debt.md) — debt tracker
- [Phase 4 (archived)](./ARCHIVE/04-d1-schema-and-anonymous-stats.md) — D1 schema reference
- [Phase 6 (stub)](./06-leaderboard-and-profile.md) — next phase; editable username lives here
