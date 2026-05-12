# Hnefatafl game — project outline

**Status:** Planning complete, ready to begin Phase 1
**Target production URL:** `hnefatafl.hultberg.org`
**Codename / repo name:** `hnefatafl-game`

---

## What this is

A faithful port of an existing Hnefatafl game prototype to a pure Cloudflare stack. The prototype (under `ClaudeShipSource/`) was built on Vite + React + Supabase and is fun to play; this project rebuilds the same game on Cloudflare Workers + D1 + R2 + KV + Email Sending, dropping Supabase entirely.

Hnefatafl ("king's table") is a thousand-year-old Viking-age asymmetric board game. The defender side controls a king and twelve men, starting in the centre, and tries to get the king to one of the four corners. The attacker side controls twenty-four men, starting along the four edges, and tries to capture the king before he escapes.

This implementation uses the **Copenhagen** ruleset on an **11×11** board.

---

## Why this exists

The prototype works and is enjoyable. The motivation to rebuild is purely operational:

- Magnus no longer has a free Supabase database tier available — running this on Supabase would cost money each month.
- Cloudflare's Workers Free plan covers everything this game needs (Workers, D1, R2, KV, Email Sending beta) at zero ongoing cost for traffic of this size.
- Reduces vendor count from two (Cloudflare hosting + Supabase backend) to one.

Secondary motivation: the prototype's Supabase Row-Level Security policies have been a recurring source of bugs (see `fix_admin_rls_recursion.sql` in the prototype). Replacing them with explicit Worker-side authorisation is cleaner to reason about for a solo maintainer.

---

## Who it's for

- **Primary:** Magnus and friends — people who enjoy slow, thoughtful, asymmetric board games and want to play Hnefatafl against an AI opponent in a browser, with a low-friction sign-in if they want their results tracked.
- **Secondary:** anyone curious about Hnefatafl who stumbles onto `hnefatafl.hultberg.org`. The Rules page and Thrall (easy) difficulty should be enough to onboard a brand-new player.

Not aimed at competitive over-the-board players, tournament organisers, or app-store mobile users.

---

## Core features (in scope)

Three release milestones, each independently shippable:

### v0.1 — Anonymous play (Phases 1–3)
- Pick side (attacker / defender) and difficulty (Thrall / Karl / Jarl).
- Play a complete game of Copenhagen-rules 11×11 Hnefatafl against the AI.
- 3D board with one of two piece visual styles (ornate lathe-geometry default; textured cross-plane billboards as an option once Phase 7 lands — for v0.1, ornate-only is acceptable).
- See the result (win/loss + game duration + move count).
- A global "anonymous games played" counter on the menu page.

### v0.2 — Accounts (Phases 4–5)
- Magic-link sign-in (no passwords).
- Authenticated users get their game results recorded against their account.
- D1 schema covers `game_results`, `leaderboard_profiles`, `site_stats`.

### v1.0 — Full game (Phases 6–8)
- Leaderboard page with side/difficulty filters.
- Profile page with personal stats (donut chart, side and difficulty filters).
- Textured piece style backed by R2-hosted PNGs.
- Admin panel for listing/exporting/deleting/updating users.
- Contact form (Turnstile-protected, rate-limited, emails to Magnus).
- Privacy page.

---

## Explicitly out of scope

- **Multiplayer over the network** (human vs human). Single-player vs AI only, same as prototype.
- **Mobile native apps.** Web only — responsive across screen sizes, but no React Native, no app stores.
- **Internationalisation.** English only.
- **Alternative rulesets** (Tablut, Tawlbwrdd, Brandubh, etc.). Copenhagen 11×11 only.
- **Saved games / mid-game resume.** One game at a time, ends when it ends.
- **Online tournaments, matchmaking, ELO.** Leaderboard is a simple win-count table.
- **AI training / ML-based opponent.** Hand-tuned minimax with the prototype's evaluator. No learning.

---

## What "good" looks like

- Magnus uses it himself, on `hnefatafl.hultberg.org`, regularly enough to enjoy it.
- A friend who has never played Hnefatafl can land on the site, read the Rules page, and finish a game against Thrall without help.
- The game behaviour (movement, captures, AI feel) is indistinguishable from the prototype in a blind comparison.
- Monthly Cloudflare bill stays at £0 for the foreseeable traffic profile.
- No production incident lasts longer than "swap email provider + redeploy" or "fix and ship a hotfix PR".

---

## Constraints and assumptions

**Constraints:**
- **Cost:** zero ongoing spend. This is a hobby project; recurring bills would kill it. Drives the Cloudflare-only decision.
- **Solo maintainer:** Magnus is the only person who will operate this. Anything that needs a team to keep running (complex on-call, multi-region failover, etc.) is out.
- **Hosting:** must run on Cloudflare's Free plan limits indefinitely.
- **Domain:** Magnus owns `hultberg.org`. Production lives at `hnefatafl.hultberg.org`.

**Assumptions:**
- Cloudflare Email Sending (beta) is reliable enough for transactional email in our volume. **De-risked by the email-provider-abstraction ADR — Resend is a one-config-flip away.**
- Cloudflare D1 storage and request limits will not be exceeded by realistic traffic.
- The prototype's design (Copenhagen rules, three AI difficulties, two piece styles, parchment palette, Cinzel + Cormorant Garamond fonts) is genuinely good and worth porting verbatim. Magnus has played it a lot and confirmed.
- Magic-link auth via email is acceptable UX for the target audience. No demand for OAuth providers (Google, GitHub, etc.).

---

## Open questions

- **AI think delays:** prototype uses 300/500/800ms by difficulty. Worth revisiting? — defer until Phase 2 and re-evaluate after playing the ported AI.
- **Textured piece style as v0.1:** the prototype offers both styles from the start. Phase plan has textures landing in Phase 7. Is it acceptable to ship v0.1 with ornate-only? **Tentative answer: yes, but worth re-checking before v0.1 release.**
- **Cloudflare Email Sending deliverability:** open until tested in staging — SPF/DKIM/DMARC need to be configured on `hnefatafl.hultberg.org` and the provider warmed up. **De-risked by fallback ADR.**
- **Custom-domain SSL provisioning timing:** Cloudflare's Custom Domain SSL usually takes minutes but can take longer. Phase 1 needs to allow for this.
- **R2 public bucket vs signed URLs for piece textures:** prototype uses a public Supabase storage bucket. Likely fine to mirror with a public R2 bucket. Confirm in Phase 7.

---

## Naming and inspiration

**Hnefatafl** ("hnef-uh-tah-fl", roughly "king's table") is a real historical game — the most documented of the Tafl family. Played across Northern Europe from roughly the 4th to the 12th century, eventually displaced by chess. The Copenhagen ruleset is a modern reconstruction (the original rules weren't fully preserved); it's the most widely played form today.

The three AI personalities are named after Old Norse social classes from the Rígsþula:
- **Thrall** — the slave, the lowest tier. Plays accordingly: random with a touch of capture awareness.
- **Karl** — the free farmer, the middle. Thinks two ply ahead with some jitter.
- **Jarl** — the noble, the warrior-lord. Thinks three ply ahead with minimal jitter.

Visual inspiration: aged parchment palette, Cinzel display font (carved-stone feel), Cormorant Garamond for body text (manuscript feel). No swords-and-shields kitsch, no fake runes; restrained and historically respectful.

The full prototype design lives in [`ClaudeShipSource/`](./ClaudeShipSource/). Treat those `spec-*.md` files as the design source of truth for game behaviour and visuals.

---

*Last updated: 2026-05-12*
