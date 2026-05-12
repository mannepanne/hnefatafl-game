# Technical Specification: Architecture

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Bun | 1.3.6 | JavaScript runtime and package manager |
| React | 18.3.1 | UI framework |
| TypeScript | 5.9.3 | Type safety (strict mode, `noUnusedLocals`, `noUnusedParameters`) |
| Vite | 6.4.1 | Build tool and dev server (port 3000) |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| shadcn/ui | — | Component library (Radix primitives + Tailwind) |
| Three.js | 0.183.2 | 3D graphics engine |
| @react-three/fiber | 8.17.12 | React renderer for Three.js |
| @react-three/drei | 9.120.3 | Three.js helpers (OrbitControls, loaders) |
| Supabase | ~2.99.2 | Backend: database, auth, storage, Edge Functions |
| TanStack React Query | ~5.91.2 | Data fetching, caching, mutations |
| lucide-react | ^0.577.0 | Icons |
| sonner | ^2.0.7 | Toast notifications |
| zod | ^4.3.6 | Schema validation |

## Project Structure

```
/
├── package.json
├── vite.config.ts              # Vite config (port 3000, @/ alias, inspector plugin)
├── tsconfig.json               # Strict TS config, @/ path alias
├── tailwind.config.js          # Tailwind with semantic color tokens
├── components.json             # shadcn/ui config
├── index.html                  # HTML entry point
│
├── src/
│   ├── App.tsx                 # Root component — state-machine router
│   ├── main.tsx                # Entry point (React.StrictMode + QueryClientProvider)
│   ├── index.css               # Tailwind base + light/dark theme tokens
│   ├── vite-env.d.ts           # Vite type declarations
│   │
│   ├── types/
│   │   ├── game.ts             # Core game types (Piece, GameState, Side, etc.)
│   │   └── turnstile.d.ts      # Cloudflare Turnstile widget type augmentation
│   │
│   ├── lib/
│   │   ├── utils.ts            # cn() class merging helper
│   │   ├── queryClient.ts      # TanStack React Query client instance
│   │   ├── supabase.ts         # Supabase client (PKCE auth flow)
│   │   ├── database.types.ts   # Auto-generated Supabase TypeScript types
│   │   └── game/
│   │       ├── index.ts        # Re-exports public game engine surface
│   │       ├── constants.ts    # Board size, positions, initial piece layout
│   │       ├── engine.ts       # Move validation, captures, win conditions, state
│   │       └── ai.ts           # AI opponents (Thrall, Karl, Jarl)
│   │
│   ├── hooks/
│   │   ├── useAuth.ts          # Supabase auth state + magic link sign-in
│   │   ├── useGame.ts          # Game state machine + AI turn scheduling
│   │   ├── useLeaderboard.ts   # Profile, stats, leaderboard, game recording
│   │   ├── usePieceStyle.ts    # Classic/ornate piece style (localStorage)
│   │   ├── usePieceTextures.ts # Supabase Storage texture URLs + uploads
│   │   ├── useTextureAvailability.ts # Check if custom textures exist
│   │   └── use-mobile.tsx      # 768px breakpoint hook
│   │
│   ├── pages/
│   │   ├── MenuPage.tsx        # Main menu (side + difficulty selection)
│   │   ├── GamePage.tsx        # Active game (Board3D + status panels)
│   │   ├── RulesPage.tsx       # Static rules reference
│   │   ├── LeaderboardPage.tsx # Public leaderboard table
│   │   ├── ProfilePage.tsx     # Player stats, mastery, settings
│   │   ├── SignInPage.tsx      # Magic link email sign-in
│   │   ├── AdminPage.tsx       # User management (admin-gated)
│   │   ├── PrivacyPage.tsx     # Privacy policy
│   │   └── ContactPage.tsx     # Contact form with Turnstile CAPTCHA
│   │
│   └── components/
│       ├── ui/                 # shadcn/ui primitives (30+ components)
│       ├── game/
│       │   ├── Board3D.tsx     # Three.js board, pieces, animations, lighting
│       │   ├── OrnatePiece.tsx # LatheGeometry piece with decorations
│       │   ├── TexturedPiece.tsx # Cross-plane billboard with GLSL shader
│       │   ├── GameStatus.tsx  # Side panel (turn, counts, captured pieces)
│       │   ├── GameOverDialog.tsx # End-of-game overlay + result recording
│       │   └── PlayerIdentity.tsx # Signed-in identity + piece style toggle
│       └── admin/
│           └── TextureManager.tsx # Drag-and-drop texture upload UI
│
├── supabase/
│   ├── migrations/             # 5 SQL migrations (schema, RLS, admin, storage)
│   └── functions/
│       ├── contact/index.ts    # Contact form email (Resend + Turnstile)
│       └── admin/index.ts      # Admin API (list/export/delete/update users)
│
└── public/
    └── clawd.svg               # Placeholder icon
```

## Routing

The app uses a custom state-machine router rather than `react-router-dom`. `App.tsx` manages a `view` state with the union type:

```ts
type AppView = 'menu' | 'game' | 'rules' | 'leaderboard' | 'privacy'
             | 'signin' | 'contact' | 'profile' | 'admin';
```

`getInitialView()` reads `window.location.pathname` to support direct-link navigation for `/privacy`, `/signin`, and `/contact`. All other paths default to `'menu'`.

Each page receives callback props (`onBack`, `onShowX`) for navigation — no URL changes occur during in-app navigation. The `GamePage` is keyed with a `gameKey` counter that increments on each new game, forcing a full React remount to reset all game state cleanly.

## Configuration

**TypeScript** (`tsconfig.json`): `target: ES2020`, `module: ESNext`, `jsx: react-jsx`, strict mode with `noUnusedLocals` and `noUnusedParameters` enabled. Path alias `@/*` maps to `./src/*`.

**Vite** (`vite.config.ts`): React plugin + platform inspector plugin. Dev server on `0.0.0.0:3000`. Path alias `@` maps to `./src`.

**Build**: `tsc -b && vite build` — TypeScript checks run before Vite bundling.

## Design System

The UI uses a consistent parchment/leather/gold palette rather than the default shadcn/ui CSS variable tokens:

| Color | Hex | Usage |
|-------|-----|-------|
| Parchment | `#f5f0e8` | Page backgrounds |
| Dark brown | `#3a2a1a` | Primary text |
| Warm brown | `#5c4a38` | Secondary text |
| Muted brown | `#8b7a68` | Tertiary text, labels |
| Sienna | `#8b4513` | Accents, buttons, active states |
| Light sienna | `#a0522d` | Hover states |
| Border | `#c4b8a8` | Card borders, dividers |
| Warm gray | `#ebe4d6` | Subtle backgrounds, empty bars |

Typography: Cinzel (serif) for headings and UI chrome, Cormorant Garamond (serif) for body text and descriptions. Both loaded from Google Fonts.
