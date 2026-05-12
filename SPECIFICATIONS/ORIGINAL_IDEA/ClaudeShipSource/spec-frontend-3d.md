# Technical Specification: Frontend — 3D Rendering

## Overview

The 3D game board lives in `src/components/game/Board3D.tsx` (874 lines) with two companion piece components: `OrnatePiece.tsx` (290 lines) and `TexturedPiece.tsx` (286 lines). The rendering stack is Three.js via `@react-three/fiber` (React renderer) and `@react-three/drei` (helpers).

## Board3D Component

### Architecture

The component is split into an outer React wrapper (`Board3D`) and an inner R3F scene (`Scene`), plus several sub-components:

| Sub-component | Lines | Purpose |
|---------------|-------|---------|
| `BoardSquare` | 33–116 | Single board tile with hover/click handling |
| `GamePiece` | 120–257 | Classic cylindrical piece with crown |
| `BoardFrame` | 261–300 | Decorative frame, base, corner ornaments |
| `Lighting` | 304–320 | Fixed lighting rig |
| `LastMoveIndicator` | 324–337 | Gold rings at from/to of last move |
| `MoveTrail` | 341–408 | Animated dotted path during piece slide |
| `CapturedPieceEffect` | 410–608 | Topple + fade animation for captured pieces |
| `ResizeHandler` | 612–650 | Responsive canvas sizing via ResizeObserver |
| `Scene` | 654–824 | Inner R3F scene composing all of the above |
| `Board3D` | 828–878 | Outer wrapper with Canvas + camera config |

### Props

```ts
interface Board3DProps {
  gameState: GameState;
  onSquareClick: (pos: Position) => void;
  onPieceClick: (piece: Piece) => void;
  playerSide: 'attackers' | 'defenders';
  pieceStyle: PieceStyle;
}
```

### Color Constants

| Constant | Hex | Usage |
|----------|-----|-------|
| `WOOD_LIGHT` | `#c4a87a` | Default board square |
| `WOOD_DARK` | `#5c4a32` | Frame border |
| `WOOD_FRAME` | `#4a3c28` | Frame base platform |
| `IVORY` | `#f0e6d0` | Defender piece |
| `IVORY_HIGHLIGHT` | `#f5edd8` | Defender hover |
| `DARK_WOOD_PIECE` | `#8b6842` | Attacker piece |
| `GOLD` | `#d4a843` | Crown, corners, ornaments |
| `THRONE_COLOR` | `#6d5a3e` | Throne and corner squares |

### Camera

- **Type**: PerspectiveCamera, FOV 45, near 0.1, far 100
- **Defenders view**: `[0, 12, 10]` (looking from the south)
- **Attackers view**: `[0, 12, -10]` (looking from the north)
- **Canvas**: `antialias: true`, `alpha: true`, transparent background, shadows enabled

### Orbit Controls

- Pan disabled
- Zoom: `minDistance=8`, `maxDistance=20`
- Vertical angle: `PI/8` to `PI/2.5`
- Target: `[0, 0, 0]`
- Damping: enabled, factor `0.05`

### Lighting Rig

| Light | Position | Intensity | Color | Notes |
|-------|----------|-----------|-------|-------|
| Ambient | — | 0.4 | `#ffe8cc` | Warm fill |
| Key directional | `[8, 12, 6]` | 1.2 | `#fff5e0` | Casts shadows (1024×1024) |
| Fill directional | `[-5, 8, -5]` | 0.3 | `#e8d0b0` | Soft fill |
| Point | `[0, 6, 0]` | 0.4 | `#ffd080` | Distance 20 |

## Board Squares

Each square is a `boxGeometry [0.92, 0.1, 0.92]` positioned at `[col-5, 0.05, row-5]`.

**Color logic** (priority order):
1. Selected piece's square → `#7d9c4a` (green)
2. Valid move + hovered → `#8aad55` (bright green)
3. Valid move → `rgba(122, 156, 74, 0.8)` (semi-transparent green)
4. Throne or corner → `THRONE_COLOR`
5. Default → `WOOD_LIGHT`

**Special square markers**:
- Throne: gold `ringGeometry [0.15, 0.25, 32]` (circle, 32 segments)
- Corner: gold `ringGeometry [0.15, 0.25, 4]` (diamond, 4 segments)
- Valid move dot: green `circleGeometry [0.12, 16]`

## Piece Styles

Three visual styles are supported, selected per the `pieceStyle` prop and texture availability:

### Classic (`GamePiece`)

Simple stacked cylinders:
1. **Base**: `cylinderGeometry [baseRadius, baseRadius+0.05, 0.08, 24]`
2. **Body**: `cylinderGeometry [baseRadius-0.04, baseRadius, height, 24]`
3. **Cap**: `cylinderGeometry [baseRadius-0.06, baseRadius-0.04, 0.06, 24]`
4. **Shield emblem**: `circleGeometry [0.08, 16]` on the body front

King additions:
- Hexagonal crown: `cylinderGeometry [0.08, 0.15, 0.12, 6]`
- Crown sphere: `sphereGeometry [0.06, 12, 12]`

**Dimensions**: King `baseRadius=0.35, height=0.55`; non-king `baseRadius=0.28, height=0.40`.

### Ornate (`OrnatePiece`)

Lathe-turned piece with decorations. Uses `THREE.LatheGeometry` from a 21-point profile.

**Profile** (`createWarriorProfile`): Defines a silhouette with flared base, lower groove, tapered body, middle groove, neck, head bulge, and dome top. Total height: 0.66 units. King scale: 1.15× on radius only.

**Decorations**:
- Lower band: `torusGeometry` at y=0.11
- Middle band: `torusGeometry` at y=0.31
- King crown: base ring + 5 cone prongs + red jewel sphere
- Defender emblem: shield circle + gold boss
- Attacker emblem: gold cross (vertical + horizontal bars)

**Materials**: Defenders get `roughness=0.35, metalness=0.12`; attackers get `roughness=0.45, metalness=0.08`. Bands use `roughness=0.3, metalness=0.4`.

**Exports**: `OrnatePiece` (full piece with animation) and `OrnatePieceBody` (geometry only, for capture effects).

### Textured (`TexturedPiece`)

Cross-plane billboard using custom GLSL shaders. Two perpendicular planes create a pseudo-3D effect.

**Geometry**: Two `planeGeometry` meshes crossed at 90° (front/back plane + left/right plane). Bottom-aligned via `group position=[0, planeHeight/2, 0]`.

**Dimensions**:
- Warrior: `width=1.32, height=1.5` (scale 1.2)
- King: `width=1.584, height=1.8` (scale 1.2 × 1.2)

**GLSL Vertex Shader**: Minimal pass-through — sets `vUv` and standard projection.

**GLSL Fragment Shader**:
```glsl
uniform sampler2D uTextureFront;
uniform sampler2D uTextureBack;
uniform vec3 uTint;
uniform float uTintStrength;
uniform float uFlipH;
uniform float uOpacity;
```
- Uses `gl_FrontFacing` to switch between front/back textures on each side of the double-sided plane
- `uFlipH` controls horizontal UV flip to prevent mirroring on the cross-plane
- Discards fragments with `alpha < 0.01`
- Tint: `mix(texColor.rgb, texColor.rgb * uTint, uTintStrength)`

**Tint values**:
- Defenders: `tint=[1,1,1]`, strength `0.0` (no tint)
- Attackers: `tint=[0.55, 0.40, 0.28]`, strength `0.7` (warm brown darkening)

**Additional meshes**: Ground shadow disc (`circleGeometry`), hover glow ring, selection glow ring.

**Resting Y**: 0.12 (lower than ornate's 0.35 — sits flush on board).

**Texture URLs**: Built via `getTextureUrl(pieceType, view, version?)` from Supabase Storage public URLs. `version` param cache-busts when textures are re-uploaded.

**Exports**: `TexturedPiece` (full piece with animation) and `TexturedPieceBody` (cross-planes only, for capture effects).

### Style Selection Logic (in `Scene`)

```
if pieceStyle === 'ornate':
  if texture ready for this piece type:
    render TexturedPiece inside <Suspense fallback={OrnatePiece}>
  else:
    render OrnatePiece
else:
  render GamePiece (classic)
```

Texture readiness is checked via `useTextureAvailability()` which returns `kingReady`, `warriorReady`, `kingVersion`, `warriorVersion`.

## Animation System

All animations use `useFrame` (R3F per-frame callback). No spring libraries — pure lerp and manual easing.

### Piece Movement

Shared across all three piece styles (identical logic):

```ts
const moveSpeed = Math.min(delta * 8, 1);
pos.x += (targetX - pos.x) * moveSpeed;
pos.z += (targetZ - pos.z) * moveSpeed;
```

- **Slide**: Exponential lerp toward target position each frame
- **Lift**: When distance > 0.05, adds `min(dist * 0.12, 0.2)` Y offset (piece lifts during movement)
- **Y lerp**: Same exponential lerp toward resting or selected height
- **Selection spin**: `rotation.y += delta * 1.5` when selected; `rotation.y *= 0.95` decay otherwise

Initial position stored in `useRef` to prevent R3F from overwriting `useFrame` updates.

### Move Trail

Animated dotted path from origin to destination:
- Dot count: `max(3, ceil(pathLength * 3))`
- Each dot: `circleGeometry [0.06, 8]` with gold emissive material
- **Reveal**: Progressive via `1 - exp(-elapsed * 8)` — dots appear from origin to destination
- **Fade**: After 0.35s, linear fade over 1.2s. Per-dot delay `t * 0.3s` so origin dots disappear first
- **Cleanup**: Hidden after 2s total

### Capture Animation (`CapturedPieceEffect`)

Three-phase sequence over ~1.2 seconds:

| Phase | Time | Effect |
|-------|------|--------|
| Pop | 0–0.15s | Small upward displacement (0.15 units) |
| Topple | 0.08–0.53s | Ease-out cubic rotation to PI/2 on random axis (x or z) in random direction |
| Sink + Fade | 0.4–1.0s | Quadratic sink (`sinkProgress² × 0.5`) and linear opacity fade |

**Material handling**: Traverses group children, detects `ShaderMaterial` (textured) vs `MeshStandardMaterial` (ornate/classic) via `instanceof`, and sets opacity accordingly.

**Flash ring**: Gold/red ring at base that scales from 0.5 to 2.0 while fading out over 0.4s. Color: `#d4a843` for defender captures, `#c44040` for attacker captures.

**Style matching**: Renders the same piece body style that was active during gameplay (classic cylinders, ornate lathe, or textured cross-planes via Suspense).

### Last Move Indicator

Two gold rings (`ringGeometry [0.3, 0.38, 32]`) at from/to positions. Origin ring opacity 0.4, destination opacity 0.6.

## Game Components

### GameStatus (120 lines)

**Props**: `gameState`, `playerSide`, `difficulty`, `isAIThinking`

Displays in the side panel:
- Turn indicator with thinking dots animation (3 bouncing dots, 150ms stagger)
- Difficulty card (name + description)
- Playing as card (side name + objective)
- Piece counts (2-column grid with colored circles)
- Captured pieces (small faded circles, wrapped)
- Move counter

### GameOverDialog (166 lines)

**Props**: `winner`, `winReason`, `playerSide`, `difficulty`, `duration`, `moveCount`, `onPlayAgain`, `onBackToMenu`

Full-screen overlay (`fixed inset-0 z-50`) with backdrop blur.

**Win reason descriptions** (`describeReason`):
- `king-captured` → "The King is slain"
- `king-escaped` → "The King escapes"
- `no-legal-moves` → "The attackers/defenders are paralysed"
- `attackers-insufficient` → "The siege is broken"

**Game recording**: On mount, waits for auth to resolve (`authLoading`), then:
- Signed-in: calls `recordGame.mutate()` with game stats
- Anonymous: calls `incrementAnonymous.mutate()`
- Uses `useRef(false)` guard to prevent double-recording in StrictMode

**Stats grid**: Moves, Time (formatted), Difficulty level

### PlayerIdentity (168 lines)

**Props**: `pieceStyle`, `onPieceStyleChange`

Two render modes:

**Signed-in**: Shows warrior identity card (shield icon, display name, "Your victories are being recorded") + ornate piece style toggle (Switch component). Toggle only available to registered users.

**Anonymous ("Wanderer")**: Collapsible card with expand/collapse. Collapsed: "Scores won't be saved. Claim your name?" Expanded: email input + Register button for inline magic link registration. Privacy policy link.

### TextureManager (239 lines)

**Location**: `src/components/admin/TextureManager.tsx`

Admin-only component for uploading piece textures to Supabase Storage.

**DropSlot subcomponent**: Drag-and-drop or click-to-upload square for each view angle. Shows upload spinner, check mark when uploaded, preview thumbnail of uploaded image.

**Layout**: Two sections (King Piece, Warrior Piece), each with a 4-column grid of DropSlots (Front, Back, Left, Right). "Complete" badge when all 4 views uploaded.

**Upload**: Uses `uploadPieceTexture(pieceType, view, file)` with `upsert: true`. Refreshes status after each upload.
