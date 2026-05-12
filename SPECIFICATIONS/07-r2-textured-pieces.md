# Phase 7: R2 + textured pieces (stub)

> **Stub spec.** Re-draft in full at the start of Phase 7 using `00-TEMPLATE-phase.md`.

## Overview

**Phase number:** 7
**Working name:** R2-hosted textured piece style
**Dependencies:** Phase 6 complete (auth + profile in place — needed for admin texture upload).

**What it does:** Adds the second piece style. Textures (PNGs from `SPECIFICATIONS/ORIGINAL_IDEA/Gamepieces/`) are hosted on Cloudflare R2; the `TexturedPiece` component (with the prototype's GLSL fragment shader using `gl_FrontFacing`) renders pieces as cross-plane billboards. Settings UI lets the user pick `ornate` or `textured`; choice persists to `localStorage` under `hnefatafl-piece-style` (key already used in Phase 3).

## Deliverables (sketch)

- R2 bucket `hnefatafl-piece-textures` created. Public-readable for now (matches prototype's public Supabase storage bucket).
- Upload script: pushes the existing PNGs from `SPECIFICATIONS/ORIGINAL_IDEA/Gamepieces/` to R2 under a stable path scheme (`{piece-type}/{view}.png` where view ∈ `front|back|left|right`).
- Worker route `GET /api/textures/manifest` — returns a JSON manifest listing which piece-type / view combinations have textures (used by `useTextureAvailability` to fall back to ornate when a texture is missing).
- `TexturedPiece` component ported verbatim (~286 lines) including the GLSL fragment shader.
- `usePieceTextures` hook — fetches manifest, caches in memory.
- `useTextureAvailability` hook — exposes per-piece-type availability for UI fallback.
- Piece-style toggle in settings (or menu page).
- Phase 3's v0.1 `usePieceStyle` is upgraded to accept `textured` as a valid value.

## Out of scope

- User-uploaded custom textures (admin upload only — see Phase 8 admin TextureManager).
- Variants per piece (only one texture set per piece type for v1.0).
- WebGL fallback for browsers without shader support.

## Open questions for this phase

- **Public R2 vs signed URLs:** public is fine for static textures; the prototype's bucket is also public. Default: public.
- **Custom domain on R2:** `textures.hnefatafl.hultberg.org` or just R2's default URL? Default: use a CDN-fronted custom domain for cleaner CSP and lower latency.
- **Texture preloading:** preload at first game start to avoid flash-of-untextured-pieces. Default: yes; show a tiny "loading textures" splash on first game with textured style selected.

## Prototype references
- [`TexturedPiece.tsx`](./ORIGINAL_IDEA/ClaudeShipSource/src/components/game/TexturedPiece.tsx)
- [`usePieceTextures.ts`](./ORIGINAL_IDEA/ClaudeShipSource/src/hooks/usePieceTextures.ts)
- [`useTextureAvailability.ts`](./ORIGINAL_IDEA/ClaudeShipSource/src/hooks/useTextureAvailability.ts)
- [`spec-frontend-3d.md`](./ORIGINAL_IDEA/ClaudeShipSource/spec-frontend-3d.md)
- [`SPECIFICATIONS/ORIGINAL_IDEA/Gamepieces/`](./ORIGINAL_IDEA/Gamepieces/) — source PNGs.
