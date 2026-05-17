# ADR: Pin React Three Fiber, Drei, and three.js to known-good versions for React 18

**Date:** 2026-05-17
**Status:** Active

---

## Decision

Pin `@react-three/fiber` to `8.18.0`, `@react-three/drei` to `9.122.0`, and `three` to `0.176.0` as exact versions rather than caret ranges, until the project migrates to React 19.

## Context

Phase 3 (3D board) was initially installed with `@react-three/fiber@^9.6.1` (the then-latest). The dev server rendered a blank page with:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'S')
  at Tt.exports (chunk-ANNXN7OP.js:8136:528)
  at createReconciler (react-reconciler...)
```

The root cause: R3F v9 calls `createReconciler` at module evaluation time and accesses a React 19 internal (`S`) that does not exist in React 18. The project is on `react@^18.3.1`.

A separate issue: `three@^0.184.0` introduced deprecation warnings in r183 (`THREE.Clock deprecated` × 1, `PCFSoftShadowMap deprecated` × 21) that R3F v8 triggers through its own internals — cannot be patched without upgrading R3F.

## Alternatives considered

- **Upgrade to React 19:** Deferred to v0.2 alongside the magic-link auth work (Phase 5). React 19 carries a non-trivial migration surface (concurrent features, `use()` hook, server component model changes) that is better scoped separately from the 3D board work. Also, `@cloudflare/vite-plugin` and `@cloudflare/vitest-pool-workers` have not been validated against React 19 at pin time.
- **Use caret `^8` on fiber, `^9` on drei:** `@react-three/drei` v10 requires fiber v9, which requires React 19. A caret range on drei would float to v10.x where the peer-dep breakage recurs silently. Exact pins on all three packages form a coherent, tested set.
- **Chosen: Exact pins on the entire trio:** `@react-three/fiber@8.18.0`, `@react-three/drei@9.122.0`, `three@0.176.0`. This is the last stable set known to work with React 18 before the deprecations and peer-dep requirement changes.

## Reasoning

The three packages form a tight peer-dep graph:
- `@react-three/fiber@8.x` requires `react@>=18 <19` and `three@>=0.132`
- `@react-three/drei@9.x` requires `@react-three/fiber@>=8 <9`
- `three@0.176.0` is the last version before the r183 deprecation wave that R3F v8 triggers

Floating any of the three creates a gap: fiber alone can safely use `^8`, but drei's `^9` would resolve to the v10.x line. Exact-pinning the trio prevents silent breakage on the next `bun install` or Renovate PR.

`bun audit` run on 2026-05-17 reported no known CVEs in the pinned set.

## Trade-offs accepted

- Renovate / Dependabot will open update PRs for these packages; each must be reviewed manually against the peer-dep constraint.
- three.js security patches between 0.176 and the current line are not automatically picked up. The risk is low: three.js has a minimal attack surface in a client-only 3D game with no user-supplied geometry or shader inputs.
- `@types/three@^0.184.1` in devDependencies is newer than the pinned runtime; this is intentional — types lag or lead the runtime without runtime impact, and the API surface between 0.176 and 0.184 is backward-compatible.

## Implications

**Unlock conditions:** Re-evaluate the pin when either:
1. The project migrates to React 19 (planned for v0.2 alongside Phase 5 auth work).
2. A R3F v8.x patch release explicitly adds React 19 support (unlikely — the v9 line owns that).

At that point, upgrade the trio together: fiber v9, drei v10, three latest.

---

## References

- Related ADRs: none
- Phase 5 spec: [SPECIFICATIONS/05-magic-link-auth.md](../../SPECIFICATIONS/05-magic-link-auth.md) — the natural unlock window
- `bun audit` baseline: clean on 2026-05-17
