# Phase 8: Admin + contact (stub)

> **Stub spec.** Re-draft in full at the start of Phase 8 using `00-TEMPLATE-phase.md`. **v1.0 ships at the end of this phase** — final feature-parity check vs prototype goes here.

## Overview

**Phase number:** 8
**Working name:** Admin panel + contact form
**Dependencies:** Phases 1–7 complete.

**What it does:** Adds the prototype's two server-privileged surfaces. Admin panel lets Magnus list/export/delete/update users and upload piece textures. Contact form lets visitors message Magnus, gated by Turnstile and rate-limited.

## Deliverables (sketch)

**Admin:**
- `is_admin` column on `leaderboard_profiles` (single boolean; Magnus is the only admin).
- `requireAdmin` middleware on `/api/admin/*` routes.
- `GET /api/admin/users` — list with pagination, search.
- `GET /api/admin/users/export` — CSV download.
- `DELETE /api/admin/users/:id` — hard delete (cascades game results).
- `PATCH /api/admin/users/:id` — admin can flip flags, ban, rename.
- Texture upload route (R2 PUT, admin-only) — admin can replace the texture set without redeploying.
- `AdminPage.tsx` ported from prototype.
- `TextureManager.tsx` ported from prototype.

**Contact:**
- `POST /api/contact` — Turnstile token validated server-side, message sent via `Emailer` (subject: "Hnefatafl contact"), rate-limited 3 requests per IP per hour (matches prototype).
- `ContactPage.tsx` ported from prototype.
- `Emailer` interface extended with `sendContactNotification` method; both providers implement it; contract test updated.
- Turnstile widget on the contact form.

**Bonus / v1.0 polish:**
- Privacy page text updated to final wording (covers accounts, cookies, R2-hosted textures, contact form retention).
- README.md final pass.
- All template-placeholder text and "coming soon" stubs removed.
- Final feature-parity sweep against the prototype: walk through every prototype page and confirm we have an equivalent.

## Out of scope

- Multiple admins. Just Magnus.
- Soft-delete / restore. Hard-delete is fine — game results are not personally meaningful enough to need recovery.
- Activity log / audit trail.
- Admin 2FA. Single-trusted-contributor threat model per the project's PR-review ADR; admin access already gated by the magic-link cookie.

## Open questions for this phase

- **Turnstile site key / secret rotation:** how often? Default: only if compromised. Document in `environment-setup.md`.
- **Contact form retention:** emails are sent to Magnus's inbox; no DB row for the message body. Confirm at draft time.
- **CSV export PII:** the export includes email addresses. Document this clearly in the privacy page.
- **Admin delete cascade:** delete `game_results` rows when the parent user is deleted? Yes — keep the database tidy. Document in the privacy page.

## Prototype references
- [`AdminPage.tsx`](./ORIGINAL_IDEA/ClaudeShipSource/src/pages/AdminPage.tsx)
- [`TextureManager.tsx`](./ORIGINAL_IDEA/ClaudeShipSource/src/components/admin/TextureManager.tsx)
- [`ContactPage.tsx`](./ORIGINAL_IDEA/ClaudeShipSource/src/pages/ContactPage.tsx)
- [`PrivacyPage.tsx`](./ORIGINAL_IDEA/ClaudeShipSource/src/pages/PrivacyPage.tsx)
- [`supabase/functions/admin/index.ts`](./ORIGINAL_IDEA/ClaudeShipSource/supabase/functions/admin/index.ts)
- [`supabase/functions/contact/index.ts`](./ORIGINAL_IDEA/ClaudeShipSource/supabase/functions/contact/index.ts)
- [`spec-database.md`](./ORIGINAL_IDEA/ClaudeShipSource/spec-database.md) — Edge Functions section.

## Definition of "v1.0 done"

- Every page from the prototype has a working equivalent on the new stack.
- Magnus has played at least one full game on each difficulty with the textured piece style.
- Tagged `v1.0.0`. Magnus links it from `hultberg.org` or wherever he likes.
