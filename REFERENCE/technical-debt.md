# Technical Debt Tracker

**When to read this:** Planning refactors, reviewing known issues, or documenting accepted shortcuts.

**Related Documents:**
- [CLAUDE.md](./../CLAUDE.md) - Project navigation index
- [testing-strategy.md](./testing-strategy.md) - Testing strategy
- [troubleshooting.md](./troubleshooting.md) - Common issues and solutions

---

Tracks known limitations, shortcuts, and deferred improvements in the codebase.
Items here are accepted risks or pragmatic choices made during development, not bugs.

---

## Active technical debt

### TD-001: No `environment: production` on deploy job
- **Location:** `.github/workflows/ci.yml` — `deploy` job
- **Issue:** Deploy job has no `environment: production` declaration. Missing: GitHub deployment history UI, optional required-reviewer gate, environment-scoped secrets.
- **Why accepted:** No real user data in Phase 1. Required-reviewer gate is irrelevant for a solo maintainer. Benefit materialises when accounts + magic-link tokens land.
- **Risk:** Low — no concrete attack vector or user impact in Phase 1.
- **Future fix:** Add `environment: production` to the deploy job before v0.2 ships (Phase 5).
- **Phase introduced:** Phase 1 (CD setup)

### TD-002: No staging environment
- **Location:** `.github/workflows/ci.yml`
- **Issue:** Every merge to `main` deploys straight to production at `hnefatafl.hultberg.org`. No staging or preview deploys for PRs.
- **Why accepted:** Phase 1 is anonymous-only with no real users. Blast radius near-zero.
- **Risk:** Low now; Medium before v0.2 ships (broken deploy = real users can't sign in).
- **Future fix:** Add a `staging` branch + `*.workers.dev` preview deploy before v0.2 ships.
- **Phase introduced:** Phase 1 (CD setup)

### TD-003: `workflow_dispatch` not enabled
- **Location:** `.github/workflows/ci.yml`
- **Issue:** No "Run workflow" button in GitHub Actions UI. Manual redeploy requires an empty commit (`git commit --allow-empty`) or `bunx wrangler rollback`.
- **Why accepted:** Workarounds are fast; adding `workflow_dispatch` speculatively means designing for a use case that hasn't happened yet (YAGNI).
- **Risk:** Low — workarounds are documented in `environment-setup.md`.
- **Future fix:** Add `workflow_dispatch:` under `on:` when the need arises.
- **Phase introduced:** Phase 1 (CD setup)

---

### Example Format: TD-001: Description
- **Location:** `src/path/to/file.ts` - `functionName()`
- **Issue:** Clear description of the limitation or shortcut
- **Why accepted:** Reason for accepting this debt (e.g., runtime constraints, time pressure, lack of alternative)
- **Risk:** Low/Medium/High - Impact assessment
- **Future fix:** Proposed solution when time/resources allow
- **Phase introduced:** Phase number when this was added

---

## Resolved items

*(Move items here when addressed, with resolution notes)*

---

## Notes

- Items are prefixed TD-NNN for easy reference in code comments and PR reviews
- When adding new debt, include: location, issue description, why accepted, risk level, and proposed future fix
- Review this list at the start of each development phase to see if any items should be addressed
- Low-risk items can remain indefinitely; High-risk items should be addressed within 2-3 phases
