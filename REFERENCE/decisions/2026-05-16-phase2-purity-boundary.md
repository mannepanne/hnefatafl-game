# ADR: Phase 2 purity boundary — injectable dependencies, dropped UI state

**Date:** 2026-05-16
**Status:** Active

---

## Decision

The Phase 2 engine and AI modules eliminate four impurities from the prototype: `Math.random` is injectable via an explicit `rng` parameter; `Date.now()` is injectable via `createInitialState({ now })`; `IdCounter` is injectable via `createInitialState({ idCounter })`; and UI-only state fields (`selectedPiece`, `validMoves`, `lastMove`) are removed from `GameState`.

## Context

The prototype (`ClaudeShipSource/`) was built as a single-page app where the game engine and UI state lived together. It used `Math.random()` directly in the AI, `Date.now()` directly in `createInitialState`, a module-level ID counter, and carried selected-piece/highlighted-move state inside `GameState`.

The Phase 2 spec required a pure-TypeScript engine with 100% test coverage and deterministic replay tests. Impure functions make tests non-repeatable and coverage fragile.

## Alternatives considered

- **Keep prototype structure (no injectable dependencies)** — Tests would need `vi.spyOn(Math, 'random')` and similar hacks. Module-level state makes test isolation difficult (counters don't reset between tests without explicit reset logic). UI state in `GameState` would pollute the engine's API and create coupling to the React layer.
- **Chosen: injectable dependencies + clean `GameState`** — Each impure dependency gets a default that matches production behaviour (`Math.random`, `Date.now()`, a module-level counter) and an optional parameter for tests. `GameState` carries only the engine state needed to replay a game; UI state moves to the React component layer.

## Reasoning

The injectable pattern is minimal: callers that don't care pass nothing, callers that need determinism (tests, replay regression suite) inject a seeded RNG and a reset-able counter. No test-only globals, no module mocking.

Dropping UI state from `GameState` makes the engine/UI boundary explicit. Phase 3 (3D board) will manage `selectedPiece` and `validMoves` in React state or a UI-layer wrapper — the engine doesn't need to know about them.

## Trade-offs accepted

- `createInitialState` has an `opts?` parameter; callers must explicitly pass `idCounter` in tests. The `resetIds()` fixture helper in tests handles this.
- `getAIMove` has a `rng` default parameter (`Math.random`). This is the only remaining `Math.random` reference in the AI module; all internal search functions thread `rng` explicitly.
- UI state removal means Phase 3 cannot read `state.selectedPiece` — it must manage that in component state. This is the correct coupling anyway.

## Implications

- Replay regression tests are deterministic: same seed → same move sequence.
- Tests run in Vitest's shared pool (no Worker sandbox needed) because there are no globals to isolate.
- Phase 3 will manage `selectedPiece`, `validMoves`, and `lastMove` in React state, not in `GameState`.

---

## References

- Related ADRs: [2026-05-16-getvalidmoves-state-signature.md](./2026-05-16-getvalidmoves-state-signature.md)
- Prototype reference: `SPECIFICATIONS/ORIGINAL_IDEA/ClaudeShipSource/`
- Testing strategy: `REFERENCE/testing-strategy.md`
