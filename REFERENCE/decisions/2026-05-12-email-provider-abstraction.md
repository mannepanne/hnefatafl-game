# ADR: Send email through an Emailer interface — Cloudflare Email Sending primary, Resend fallback

**Date:** 2026-05-12
**Status:** Active

---

## Decision

All outbound email is sent through a single `Emailer` interface implemented by two concrete providers: `CloudflareEmailer` (the primary, using Cloudflare Email Sending in beta) and `ResendEmailer` (the fallback, sending from `hultberg.org` via Magnus's existing Resend account). The active provider is selected per-environment by a Wrangler binding/secret, with no caller code changes needed to switch. Both providers must pass the same contract tests.

## Context

Phase 5 introduces magic-link authentication, which depends on transactional email being reliably delivered. Phase 8 adds a contact-form notification, also email.

Magnus's preference is to stay pure-Cloudflare wherever possible (see ADR `2026-05-12-cloudflare-only-stack.md`). Cloudflare Email Sending is the natural choice — it's first-party, free at our volume, and aligned with the broader stack decision.

However, **Cloudflare Email Sending is in beta**. The published guidance in `.claude/COLLABORATION/technology-preferences.md` says to "avoid experimental/beta unless nothing else available." We're knowingly going against that guidance because:

1. The product feature (transactional email for a hobby game) is low-stakes.
2. A magic-link email taking an extra few seconds, or failing once in a while, is recoverable — the user clicks "resend".
3. Magnus already has a Resend account configured to send from `hultberg.org`, so a working fallback exists today.

The risk is real but mitigable: we just need to be able to swap providers without touching every site that sends email. An `Emailer` interface costs almost nothing to add upfront and removes the lock-in.

## Alternatives considered

- **Option A: Cloudflare Email Sending only, no abstraction.** Call the Email Sending API directly from the auth and contact routes. Rejected because if Email Sending degrades, hits a beta-period bug, or gets discontinued, we'd be doing a scattered refactor while users are stuck unable to sign in.

- **Option B: Resend only.** Skip Email Sending entirely and use Resend from day one. Rejected because (a) the whole point of this project is to minimise external dependencies (see the Cloudflare-only-stack ADR), and (b) Resend's free tier has lower headroom than Cloudflare Email Sending's beta limits for our use case.

- **Option C (chosen): Interface with two implementations.** A single `Emailer` interface (`sendMagicLink(...)`, `sendContactNotification(...)`, etc.), with `CloudflareEmailer` as the default and `ResendEmailer` available behind a config flag. Provider chosen at Worker boot from environment binding. Both implementations covered by the same contract tests.

- **Option D: Try Cloudflare, fall back to Resend on failure.** Auto-failover at runtime — if Cloudflare returns 5xx, retry via Resend. Rejected because (a) it doubles the failure modes we need to think about, (b) it means both providers must be configured and authenticated in every environment, and (c) silent fallback masks the very degradation signal we'd want to act on. Manual switchover (change config, redeploy) is clearer.

## Reasoning

**Why an interface, not a wrapper class:** an interface is the smallest possible abstraction — it codifies what every email-sending function takes and returns, nothing more. Each provider is a separate file with a small adapter. New providers can be added later (Postmark, AWS SES, SMTP) without touching callers.

**Why Cloudflare Email Sending as primary, despite beta:** stack coherence. Every other backend primitive is Cloudflare; using Cloudflare for email keeps billing, logging, identity, and operational surface area in one place. The beta caveat is a real risk we're accepting, but the mitigation (the fallback) is in place from day one.

**Why Resend on `hultberg.org` as fallback:** Magnus already has the account, the domain is already authenticated (SPF/DKIM/DMARC), and Resend is the documented fallback in `.claude/COLLABORATION/technology-preferences.md`. Sending from `hultberg.org` for a fallback is fine — users will still recognise the sender, and the From address can be `hnefatafl@hultberg.org` for clarity.

**Why manual switchover, not auto-failover:** if Email Sending degrades, we want to know about it (the failed sign-in attempts are the signal). Auto-failover removes that signal. A deliberate `EMAIL_PROVIDER=resend` flip — pushed via `wrangler secret put` and redeployed — takes a couple of minutes and leaves a clear paper trail.

**A/B capability matters too, not just emergency failover:** the interface lets us route a fraction of traffic through each provider in dev/staging if we want to measure deliverability or open rates. That's a useful side-effect, not the headline goal.

**Deliverability is its own problem, separate from this ADR:** whichever provider sends the email, the domain it sends *from* needs SPF, DKIM, and DMARC configured correctly. For the Cloudflare path, `hnefatafl.hultberg.org` (or the chosen send-from subdomain) needs the appropriate DNS records via Cloudflare's Email Sending setup flow. For the Resend path, `hultberg.org` is already configured. Both providers should be warmed up in staging before being relied on in production.

## Trade-offs accepted

- **Slightly more code than calling an API directly.** One interface + two implementations + a tiny factory. Trivial cost.
- **Two providers to keep configured.** Both sets of credentials/bindings must exist in dev/staging/prod environments, even if only one is active at a time. Operationally minor — Wrangler secret storage handles it.
- **Contract tests must be kept in sync.** When the interface gains a new method (e.g. when we add Phase 8's contact-notification email), both implementations and the contract test must be updated together. Standard interface discipline.
- **Beta-provider risk still exists.** We can switch, but switching takes a redeploy. If Email Sending fails catastrophically during a busy moment we wear some downtime until the switch is rolled out. Acceptable for a hobby game.

## Implications

- Phase 5 (magic-link auth) implements the `Emailer` interface, both providers, and the contract test as part of its scope.
- Phase 8 (contact form) extends the interface with a `sendContactNotification` method and updates both providers + the contract test.
- The Wrangler config (`wrangler.toml` / `wrangler.jsonc`) carries `EMAIL_PROVIDER` as an environment variable (`cloudflare` | `resend`). The Worker boot reads it and instantiates the right `Emailer`.
- Provider credentials live in Wrangler secrets (`RESEND_API_KEY`, plus whatever Email Sending requires). Never committed.
- Both `From` addresses are reserved at the start: `hnefatafl@hnefatafl.hultberg.org` for Cloudflare Email Sending, `hnefatafl@hultberg.org` for Resend. DNS records (SPF/DKIM/DMARC) get set up for both during Phase 5 so the fallback is genuinely ready, not just theoretically ready.
- Operational playbook for switching providers lives in `REFERENCE/environment-setup.md` once the implementation lands.

## References

- Related ADR: [`2026-05-12-cloudflare-only-stack.md`](./2026-05-12-cloudflare-only-stack.md) — why Cloudflare-first is the default.
- Technology preferences: [`.claude/COLLABORATION/technology-preferences.md`](../../.claude/COLLABORATION/technology-preferences.md) — the "avoid beta" guidance this ADR consciously departs from, with reasoning.
- External: [Cloudflare blog — Send email from Workers](https://blog.cloudflare.com/email-service/).
- External: Resend dashboard (account configured for `hultberg.org`).
