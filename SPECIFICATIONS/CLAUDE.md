# Implementation specifications library

Auto-loaded when working with files in this directory. Forward-looking plans for features being built.

---

**⚠️ TEMPLATE GUIDANCE** - This file explains how to use this folder. When starting a new project, update this file to list your actual implementation phases.

---

## Purpose of this folder

The SPECIFICATIONS folder contains **forward-looking plans** for features you're actively building. These are living documents that guide development and evolve as you learn more.

### Key principles

1. **Specifications are active work** - They describe what you're building *now* or *next*
2. **One phase at a time** - Focus on clear, sequential implementation phases
3. **Move completed specs to ARCHIVE/** - Keep this folder focused on current/upcoming work
4. **Reference ORIGINAL_IDEA/** - Link back to master vision for context

## How to structure implementation phases

Break your project into numbered sequential phases (e.g., 01-foundation.md, 02-authentication.md, etc.).

### What each phase file should include

1. **Phase overview**
   - Phase number and name
   - Brief description
   - Estimated timeframe
   - Dependencies on previous phases

2. **Scope and deliverables**
   - What will be built in this phase
   - What's explicitly out of scope
   - Acceptance criteria

3. **Technical approach**
   - Architecture decisions (document significant choices as ADRs in REFERENCE/decisions/)
   - Technology choices (check existing ADRs for precedent before deciding)
   - Key files and components
   - Database schema changes (if applicable)

4. **Testing strategy**
   - Unit test requirements
   - Integration test requirements
   - Coverage targets
   - Manual testing checklist

5. **Pre-commit checklist**
   - [ ] All tests passing
   - [ ] Type checking passes
   - [ ] Coverage meets targets
   - [ ] Manual verification complete
   - [ ] Documentation updated

6. **PR workflow**
   - Branch naming convention
   - PR review requirements
   - Deployment steps

7. **Edge cases and considerations**
   - Known risks or challenges
   - Alternative approaches considered
   - Future optimization opportunities

### Example phase structure

See [00-TEMPLATE-phase.md](./00-TEMPLATE-phase.md) for a complete example.

## Supporting folders

### ORIGINAL_IDEA/

Store your initial project concept documents here:
- Master specification and product vision
- Naming rationale and inspiration
- Early brainstorming and requirements
- Competitive analysis or market research

These documents are the "source of truth" for the project's intent and typically don't change during implementation.

### ARCHIVE/

Move completed phase files here after:
1. Phase implementation is complete
2. PR is merged to main
3. Features are deployed/verified

Archive serves as historical record. For current implementation details, see `REFERENCE/` documentation instead.

## Workflow example

**Starting a new project:**
1. Fill in the master specification stub at `ORIGINAL_IDEA/project-outline.md` (created during the orientation conversation)
2. Break project into phases (e.g., 01-foundation.md, 02-core-features.md)
3. Work through phases sequentially
4. Move completed specs to ARCHIVE/
5. Create how-it-works docs in REFERENCE/ for implemented features

**Current phase tracking:**
Update the "Current phase" indicator in both:
- Root CLAUDE.md (project navigation)
- This file (implementation library)

## When to update this file

Replace this template guidance with your actual phase list when you:
1. Complete project planning
2. Define your implementation phases
3. Are ready to begin development

**Keep it current** - Update phase status as you progress through development.

---

## Active implementation phases

Development is organised into eight sequential phases mapped to three shippable milestones. Each phase includes scope, acceptance criteria, testing strategy, and PR workflow.

**Current phase:** Phase 2 — Game engine + AI (engine, AI, and tests in progress on `feature/phase-2-game-engine-and-ai`).

### v0.1 — Anonymous play

1. **[01-foundation.md](./01-foundation.md)** — 3–5 days
   Worker + Vite + D1 + KV scaffolding. Production domain `hnefatafl.hultberg.org` live with placeholder page. No game logic.

2. **[02-game-engine-and-ai.md](./02-game-engine-and-ai.md)** — 5–8 days
   Pure-TypeScript engine + AI in `src/shared/game/`. 100%-tested. Includes replay parity tests against the prototype.

3. **[03-3d-board-and-gameplay-loop.md](./03-3d-board-and-gameplay-loop.md)** — 7–10 days
   3D board, gameplay loop, menu/game/rules/privacy pages, anonymous-games counter. **v0.1 ships at the end of this phase.**

### v0.2 — Accounts

4. **[04-d1-schema-and-anonymous-stats.md](./04-d1-schema-and-anonymous-stats.md)** — *stub spec*
   D1 schema (`game_results`, `leaderboard_profiles`, `site_stats`). Migrate anonymous counter from KV to D1.

5. **[05-magic-link-auth.md](./05-magic-link-auth.md)** — *stub spec*
   Magic-link sign-in, `Emailer` interface with two providers, per-user game results. **v0.2 ships at the end of this phase.**

### v1.0 — Full game

6. **[06-leaderboard-and-profile.md](./06-leaderboard-and-profile.md)** — *stub spec*
   Leaderboard page, profile page with donut chart.

7. **[07-r2-textured-pieces.md](./07-r2-textured-pieces.md)** — *stub spec*
   R2-hosted textured piece style with GLSL shader.

8. **[08-admin-and-contact.md](./08-admin-and-contact.md)** — *stub spec*
   Admin panel, contact form, Turnstile, final feature-parity sweep. **v1.0 ships at the end of this phase.**

**Stub specs (Phases 4–8)** are intentionally light. Each gets re-drafted in full using [`00-TEMPLATE-phase.md`](./00-TEMPLATE-phase.md) when its turn comes — details would go stale before then.

### Supporting documentation

**[ORIGINAL_IDEA/](./ORIGINAL_IDEA/)**
- `project-outline.md` - Master specification and product vision (always present as a stub)
- Optional additions: `naming-rationale.md`, brainstorms, competitive analysis, sketches, briefs

**[ARCHIVE/](./ARCHIVE/)**
- Completed specifications (moved here when phase is done)

**[REFERENCE/decisions/](../REFERENCE/decisions/)** - Architecture Decision Records
- Search here BEFORE making architectural decisions (library choice, patterns, API design)
- Follow existing ADRs unless new information invalidates reasoning
- Document new architectural decisions here (prevents re-debating settled choices)
- See [ADR guidance](../REFERENCE/decisions/CLAUDE.md) for when and how to create ADRs

## When specs move to archive

After completing a phase and merging the PR:
1. Move the phase file to `ARCHIVE/`
2. Update implementation docs in `REFERENCE/` if needed
3. Update this index to reflect current phase
