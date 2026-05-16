# Environment setup

**When to read this:** Setting up local development, provisioning Cloudflare resources, configuring secrets, or deploying to production.

**Related documents:**
- [CLAUDE.md](./../CLAUDE.md) — Project navigation index
- [troubleshooting.md](./troubleshooting.md) — Common issues and solutions
- [ADR: Cloudflare-only stack](./decisions/2026-05-12-cloudflare-only-stack.md) — Why everything is on Cloudflare
- [ADR: Email provider abstraction](./decisions/2026-05-12-email-provider-abstraction.md) — Cloudflare Email Sending primary, Resend fallback

---

## At a glance

Everything runs on Cloudflare. There are no external services to wire up in Phase 1.

| Resource | Used for | Added in |
|---|---|---|
| Cloudflare Worker | SPA host + API | Phase 1 |
| Static Assets binding | Serves the built React SPA | Phase 1 |
| D1 database | SQLite, primary data store | Phase 1 (schema fills out in Phase 4) |
| KV namespace | Magic-link tokens, rate-limit buckets, anonymous counters | Phase 1 (smoke binding only; real keys land in Phase 4/5) |
| Custom Domain | `hnefatafl.hultberg.org` | Phase 1 |
| R2 bucket | Piece textures | Phase 7 |
| Email Sending (beta) | Magic-link emails | Phase 5 |
| Resend (`hultberg.org`) | Email fallback | Phase 5 |
| Turnstile | Bot challenge on magic-link request | Phase 5 |

**Cost:** Cloudflare Free plan only. Anything that would push us off the free tier needs an ADR.

---

## Prerequisites

Install once on your dev machine:

```bash
# Bun (package manager + script runner)
curl -fsSL https://bun.sh/install | bash

# Wrangler (Cloudflare CLI) is installed as a project dev dependency.
# Run it as `bunx wrangler ...` from the project root — no global install needed
# (and `bunx` guarantees the version matches CI). Global install is optional.

# GitHub CLI (for PR workflow)
brew install gh
```

You also need:

- A Cloudflare account (Free plan is fine) with Workers enabled.
- The `hultberg.org` zone on Cloudflare DNS (already in place).
- `gh auth login` completed.

---

## First-time Cloudflare setup

These commands provision the Cloudflare resources Phase 1 needs. Run them **once**, from the project root, while authenticated.

### 1. Authenticate

```bash
bunx wrangler login
```

Opens a browser, asks you to authorise Wrangler against your account. The session is stored in `~/.wrangler/`.

### 2. Create the D1 database

```bash
bunx wrangler d1 create hnefatafl-db
```

Output looks like:

```toml
[[d1_databases]]
binding = "DB"
database_name = "hnefatafl-db"
database_id = "abcdef12-3456-7890-abcd-ef1234567890"
```

Copy the `database_id` into `wrangler.toml` (replacing the placeholder). The `binding = "DB"` and `database_name = "hnefatafl-db"` should already match.

### 3. Create the KV namespace

```bash
bunx wrangler kv namespace create "hnefatafl-kv"
```

Output:

```toml
[[kv_namespaces]]
binding = "hnefatafl_kv"
id = "0123456789abcdef0123456789abcdef"
```

Copy **only** `id` into `wrangler.toml` (replacing the placeholder). Keep our `binding = "KV"` line — Cloudflare's auto-derived snake_case suggestion is ignored. The string `"hnefatafl-kv"` is the dashboard display title; it disambiguates this namespace from any other Worker on the same account.

### 4. Apply the initial D1 migration

The migration in `src/db/migrations/0000_pipeline_check.sql` creates the `_pipeline_check` table so we can prove the binding works end to end. (It gets dropped in Phase 4 once the real schema lands.)

```bash
# Apply locally (Miniflare-backed D1, file under .wrangler/state/)
bunx wrangler d1 migrations apply DB --local

# Apply to remote (production D1)
bunx wrangler d1 migrations apply DB --remote
```

`DB` is the **binding** (matches `wrangler.toml`), which is what wrangler resolves against. `hnefatafl-db` (the database name) also works.

### 5. Deploy the Worker

```bash
bun run deploy
```

This builds the SPA (`vite build`) and deploys the Worker plus its static assets to `hnefatafl-game.<account-subdomain>.workers.dev`.

Hit the health endpoint to confirm:

```bash
curl https://hnefatafl-game.<account-subdomain>.workers.dev/api/health
# {"ok":true}
```

### 6. Wire the Custom Domain

In the Cloudflare dashboard:

1. **Workers & Pages → hnefatafl-game → Settings → Triggers → Custom Domains → Add Custom Domain**
2. Enter `hnefatafl.hultberg.org`.
3. Cloudflare provisions the cert and adds the DNS record automatically (because `hultberg.org` is already on Cloudflare DNS).

The `*.workers.dev` URL remains live and serves as the SSL fallback if the custom domain misbehaves.

Verify:

```bash
curl https://hnefatafl.hultberg.org/api/health
# {"ok":true}
```

---

## Local development

### `.dev.vars`

Phase 1 doesn't need any secrets. The file lives at the project root and is gitignored. Add variables as they're introduced:

```bash
# Phase 5 onward — placeholders, not committed
# EMAIL_PROVIDER=cloudflare        # or "resend"
# RESEND_API_KEY=re_...
# TURNSTILE_SECRET_KEY=0x4A...
```

Wrangler auto-loads `.dev.vars` when running `wrangler dev` or `vite dev` with the Cloudflare plugin.

### Running the dev server

```bash
bun install
bun run dev
```

The `@cloudflare/vite-plugin` runs Vite and the Worker together against a local Miniflare runtime. You get:

- Hot module reload for the React SPA.
- The real Worker (Hono) handling `/api/*`.
- Local D1 and KV bindings (state stored in `.wrangler/state/` — gitignored).

Open the URL it prints (typically `http://localhost:5173`).

### Useful commands

```bash
bun run dev            # Vite + Worker, HMR, local D1/KV
bun run build          # Vite build only (outputs dist/)
bun run deploy         # Build + wrangler deploy
bun run test           # Vitest, both pools (workers + node)
bun run test:watch     # Watch mode
bun run test:coverage  # Coverage report
bun run typecheck      # tsc --noEmit
bun run db:generate    # drizzle-kit generate (emits SQL into migrations dir)
bun run db:apply:local # wrangler d1 migrations apply --local
bun run db:apply       # wrangler d1 migrations apply --remote
```

---

## Production secrets

Use `bunx wrangler secret put` for anything sensitive. They're encrypted at rest in Cloudflare and surface as environment variables on the Worker.

```bash
# Phase 5 onward — examples, not needed in Phase 1
bunx wrangler secret put RESEND_API_KEY
bunx wrangler secret put TURNSTILE_SECRET_KEY
```

List what's currently set:

```bash
bunx wrangler secret list
```

**Never put secrets in `wrangler.toml`** — that file is committed to git. Secrets only live in `.dev.vars` (local, gitignored) or `bunx wrangler secret put` (production).

---

## CI / GitHub Actions secrets

CI runs `bun install && bun run typecheck && bun run test && bun run build`. It does **not** deploy in Phase 1 — deploys are manual via `bun run deploy`.

**Pre-flight: pin third-party actions to a commit SHA before adding secrets.** Floating `@v2`/`@v4` tags resolve to whatever the upstream maintainer points to; if any of those repos is ever compromised, a malicious release could exfiltrate `CLOUDFLARE_API_TOKEN` from CI. With secrets in place this matters; without secrets it doesn't. Edit `.github/workflows/ci.yml` and replace `oven-sh/setup-bun@v2` and `actions/checkout@v4` with their current full SHA (look up under each action's "Releases" page on GitHub), keeping the version as a trailing comment for readability:

```yaml
- uses: actions/checkout@<full-sha>          # v4.x.x
- uses: oven-sh/setup-bun@<full-sha>         # v2.x.x
```

Bump these alongside any other dependency-pin update — Dependabot/Renovate handles this automatically once configured.

Three repository secrets need to be set in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → right sidebar, "Account ID" |
| `CLOUDFLARE_DATABASE_ID` | Output of `wrangler d1 create` (step 2 above) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create Token |

For `CLOUDFLARE_API_TOKEN`, use a **Custom Token** with this minimum scope:

- **Permissions:**
  - Account → Workers Scripts → Edit
  - Account → D1 → Edit
  - Account → Workers KV Storage → Edit
- **Account Resources:** Include → \<your account\>
- **TTL:** leave unbounded, or pin it to a year and rotate annually

(Workers Scripts:Edit is required for CI to deploy. D1:Edit lets CI run remote migrations. Workers KV Storage:Edit covers future KV-touching migrations. No Zone resources needed — the Custom Domain attaches the Worker directly without DNS API calls at deploy time.)

---

## Project conventions

### Files that must stay out of git

`.gitignore` covers:

```
node_modules/
dist/
.wrangler/          # Miniflare state, includes local D1/KV data
.dev.vars           # local secrets
.dev.vars.*         # any variant
coverage/
.DS_Store
```

### Files that go in git

- `wrangler.toml` — contains binding **names** and **IDs** (IDs are not secrets; they're stable handles).
- `drizzle.config.ts` — schema location, dialect, out-dir for migrations.
- `src/db/migrations/*.sql` — checked-in, deterministic.

---

## Troubleshooting

### `wrangler dev` says "no D1 database with id …"

Run `bunx wrangler d1 migrations apply DB --local` once — local D1 only exists after the first migration runs.

### Custom Domain shows "522" or doesn't resolve

Wait 1–2 minutes after adding it; Cloudflare provisions the cert on first request. If it persists, fall back to the `*.workers.dev` URL and check **Workers & Pages → hnefatafl-game → Settings → Triggers**.

### Local secrets aren't being picked up

`.dev.vars` is read at process start. Restart `bun run dev` after changing it.

### `wrangler` is using the wrong account

```bash
bunx wrangler whoami
bunx wrangler logout && bunx wrangler login   # if you need to switch
```

### CI fails with "401 Unauthorized" against Cloudflare

The API token in `CLOUDFLARE_API_TOKEN` is missing one of `Workers Scripts:Edit`, `D1:Edit`, or `Workers KV Storage:Edit`, or has been rotated. Recreate it and update the GitHub secret.

---

## Reference: full Cloudflare resource list

For the curious or the future-self resurrecting this project:

```bash
# What's bound to the Worker
bunx wrangler types         # regenerates worker-configuration.d.ts from wrangler.toml

# D1
bunx wrangler d1 list
bunx wrangler d1 info hnefatafl-db
bunx wrangler d1 execute hnefatafl-db --remote --command="SELECT name FROM sqlite_master WHERE type='table'"

# KV
bunx wrangler kv namespace list
bunx wrangler kv key list --binding=KV --remote

# Secrets
bunx wrangler secret list

# Deployments
bunx wrangler deployments list
```

---

**Update this document** whenever a new Cloudflare resource is added, a new secret is introduced, or a setup step changes. The Phase-by-Phase table at the top is the canonical inventory.
