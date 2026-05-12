# Phase 5: Magic-link authentication (stub)

> **Stub spec.** Re-draft in full at the start of Phase 5 using `00-TEMPLATE-phase.md`. The stub captures shape, dependencies, and known unknowns; details will firm up after Phase 4 lands.

## Overview

**Phase number:** 5
**Working name:** Magic-link authentication (v0.2 ships at the end of this phase)
**Dependencies:** Phase 4 complete (D1 schema live).

**What it does:** Implements email-only sign-in. User enters their email, gets a magic link, clicks it, lands on the site authenticated. Authenticated users have their game results recorded against their account. Implements the `Emailer` interface (both Cloudflare Email Sending and Resend) per ADR `2026-05-12-email-provider-abstraction.md`.

## Deliverables (sketch)

- Sign-in page with email form.
- `POST /api/auth/request-link` — generates a high-entropy token, stores it in KV with 15-min TTL, sends magic-link email. Rate-limited per email **and** per IP.
- `GET /api/auth/verify?token=...` — validates token (constant-time comparison), looks up/creates `leaderboard_profiles` row, sets HMAC-signed HttpOnly + Secure + SameSite=Lax session cookie, redirects to `/`.
- `POST /api/auth/sign-out` — clears cookie.
- Worker middleware: read cookie, verify signature, attach `user` to context. Routes that need auth call `requireUser`.
- `Emailer` interface in `src/shared/email/`, with `CloudflareEmailer` and `ResendEmailer` implementations and a contract test.
- DNS records (SPF/DKIM/DMARC) configured on `hnefatafl.hultberg.org` (Cloudflare side) and confirmed working on `hultberg.org` (Resend side, already exists).
- Sign-in page + sign-out button + "signed in as X" indicator in the app shell.
- Authenticated game results recorded to `game_results` after game-over, validated by replaying the submitted move history through the engine (server-side anti-cheat).
- Per-user profile placeholder (real profile UI is Phase 6).

## Out of scope

- OAuth (Google, GitHub, etc.).
- Username changes — username is the email-local-part on first sign-in; not editable in this phase.
- Password recovery (no passwords).
- Multiple devices / session management UI.

## Open questions for this phase

- **Session length:** how long does the cookie last? Default: 30 days, sliding (refreshed on each authenticated request).
- **Magic-link reuse:** single-use only (deleted from KV on first verify). Confirmed.
- **Token entropy:** 256-bit random, base64url-encoded. Confirmed.
- **Rate-limit thresholds:** 5 requests per email per hour, 20 per IP per hour. Re-validate at draft time.
- **Server-side game validation strictness:** if the replay disagrees with the submitted outcome, reject the submission silently or surface an error? Default: surface a clear error in dev/staging, log + reject silently in prod.

## ADRs that constrain this phase

- [`2026-05-12-email-provider-abstraction.md`](../REFERENCE/decisions/2026-05-12-email-provider-abstraction.md) — interface + two implementations + manual switchover.
- [`2026-05-12-cloudflare-only-stack.md`](../REFERENCE/decisions/2026-05-12-cloudflare-only-stack.md) — no third-party auth provider.

## Prototype references
- [`useAuth.ts`](./ORIGINAL_IDEA/ClaudeShipSource/src/hooks/useAuth.ts) — Supabase PKCE flow; we're not porting this verbatim but the UX shape (sign-in page, indicator, sign-out) carries over.
- [`SignInPage.tsx`](./ORIGINAL_IDEA/ClaudeShipSource/src/pages/SignInPage.tsx).
