# Technical Specification: Frontend — Hooks & State Management

## Overview

Custom hooks live in `src/hooks/`. They manage authentication, game state, data fetching (via TanStack React Query), piece styling, texture loading, and responsive breakpoints.

## useAuth (`src/hooks/useAuth.ts`)

Manages Supabase authentication state with PKCE flow.

**Returns**:
```ts
{
  user: User | null;
  loading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}
```

**Behavior**:
- Subscribes to `supabase.auth.onAuthStateChange` on mount
- Exposes the current `User` object (or `null` for anonymous)
- `signInWithMagicLink` calls `supabase.auth.signInWithOtp({ email })` with PKCE flow
- `loading` is `true` until the initial auth state resolves

## useGame (`src/hooks/useGame.ts`)

Wraps the pure-function game engine in React state management with AI scheduling.

**Parameters**: `{ playerSide: Side, difficulty: Difficulty }`

**Returns**:
```ts
{
  gameState: GameState;
  isAIThinking: boolean;
  resetGame: () => void;
  handlePieceClick: (piece: Piece) => void;
  handleSquareClick: (pos: Position) => void;
  gameDuration: number;
}
```

**State management**:
- `gameState` held in `useState`, initialized via `createInitialState()`
- `handlePieceClick` calls `selectPiece` or `deselectPiece` based on current selection
- `handleSquareClick` calls `makeMove` if the position is in `validMoves`

**AI scheduling**:
- A `useEffect` fires when `gameState.currentTurn` changes to the AI's side
- Combined delay: 700ms slide animation + difficulty think delay (Thrall 300ms, Karl 500ms, Jarl 800ms)
- `getAIMove` is called inside a `setTimeout`; result is applied via `makeMove`
- A `gameStateRef` keeps the latest state accessible inside the callback (avoids stale closures)
- `isAIThinking` state prevents player interaction during AI turn

**Reset**: `resetGame` clears the timeout, resets thinking state, creates a fresh initial state

**Duration**: `gameDuration` is computed as `Math.floor((Date.now() - gameState.startTime) / 1000)` when the game ends

## useLeaderboard (`src/hooks/useLeaderboard.ts`)

Central data-fetching module for profiles, stats, leaderboard, and game recording. All hooks use TanStack React Query.

### Types

```ts
type DifficultyKey = 'thrall' | 'karl' | 'jarl';

interface DifficultyStats {
  wins: number;
  losses: number;
  attackerWins: number;
  attackerLosses: number;
  defenderWins: number;
  defenderLosses: number;
}

interface MyGameStats {
  total: DifficultyStats;
  thrall: DifficultyStats;
  karl: DifficultyStats;
  jarl: DifficultyStats;
}

interface RecentGame {
  id: string;
  won: boolean;
  player_side: string;
  difficulty: DifficultyKey;
  duration_seconds: number;
  played_at: string;
}
```

### Query Hooks

| Hook | Query Key | Purpose |
|------|-----------|---------|
| `useLeaderboard()` | `['leaderboard']` | Public profiles ordered by wins, limit 50 |
| `useMyGameStats(userId)` | `['my-game-stats', userId]` | Aggregates `game_results` into per-difficulty, per-side breakdown |
| `useMyRecentGames(userId, limit)` | `['my-recent-games', userId, limit]` | Last N games ordered by `played_at` desc |
| `useMyProfile(userId)` | `['my-profile', userId]` | Single profile row with `maybeSingle()` |

### Mutation Hooks

| Hook | Purpose | Invalidates |
|------|---------|-------------|
| `useCreateProfile()` | Inserts new profile | `my-profile`, `leaderboard` |
| `useUpdateProfile()` | Updates display name + visibility | `my-profile`, `leaderboard` |
| `useRecordGame()` | Calls `record_game_result` RPC | `my-profile`, `my-game-stats`, `my-recent-games`, `leaderboard` |
| `useIncrementAnonymousGames()` | Calls `increment_anonymous_games` RPC | (none) |

### Stats Aggregation

`useMyGameStats` selects `won`, `difficulty`, `player_side` from `game_results` and aggregates client-side:

```ts
for (const row of data) {
  const bucket = stats[row.difficulty];
  stats.total[row.won ? 'wins' : 'losses']++;
  bucket[row.won ? 'wins' : 'losses']++;

  if (row.player_side === 'attackers') {
    stats.total[row.won ? 'attackerWins' : 'attackerLosses']++;
    bucket[row.won ? 'attackerWins' : 'attackerLosses']++;
  } else {
    stats.total[row.won ? 'defenderWins' : 'defenderLosses']++;
    bucket[row.won ? 'defenderWins' : 'defenderLosses']++;
  }
}
```

This per-side breakdown enables the profile page's side filter on the Win Rate donut chart.

## usePieceStyle (`src/hooks/usePieceStyle.ts`)

Manages piece visual style preference with localStorage persistence.

```ts
type PieceStyle = 'classic' | 'ornate';
```

**Storage key**: `hnefatafl-piece-style`

**Read**: Lazy `useState` initializer reads localStorage. Only accepts `'ornate'` explicitly; anything else defaults to `'classic'`.

**Write**: `setStyle` callback sets React state and writes to localStorage. Both read and write wrapped in `try/catch` for environments where localStorage is unavailable.

**Returns**: `{ style: PieceStyle, setStyle: (s: PieceStyle) => void }`

**Usage**: `GamePage` reads the style and passes it to `Board3D`. Anonymous users always see `'classic'` regardless of stored preference. The `PlayerIdentity` component renders the ornate toggle only for signed-in users.

## usePieceTextures (`src/hooks/usePieceTextures.ts`)

Manages texture uploads and URL generation for the textured piece style.

### Types

```ts
type PieceView = 'front' | 'back' | 'left' | 'right';
type PieceType = 'king' | 'warrior';
```

### Functions

**`getTextureUrl(pieceType, view, version?)`**: Returns the Supabase Storage public URL for `piece-textures/{pieceType}/{view}.png`. Appends `?v={version}` for cache busting when provided.

**`uploadPieceTexture(pieceType, view, file)`**: Uploads a file to Supabase Storage at `{pieceType}/{view}.png` with `upsert: true`. Returns `{ success, error? }`.

### `usePieceTextureStatus(pieceType)`

Checks which of the 4 view textures exist for a given piece type.

**Returns**:
```ts
{
  status: Record<PieceView, boolean>;  // which views exist
  loading: boolean;
  allUploaded: boolean;                // all 4 present
  refresh: () => void;
}
```

**Implementation**: Calls `supabase.storage.from('piece-textures').list(pieceType)`, builds a Set of filenames, checks for `front.png`, `back.png`, `left.png`, `right.png`.

## useTextureAvailability (`src/hooks/useTextureAvailability.ts`)

Checks whether all 4 required textures exist for king and warrior pieces. Used by `Board3D` to decide whether to render `TexturedPiece` or fall back to `OrnatePiece`.

**Required views**: `['front.png', 'back.png', 'left.png', 'right.png']`

**Implementation**: Fires once on mount. Runs two parallel `supabase.storage.from('piece-textures').list()` calls for `'king'` and `'warrior'`. For each:
- `ready = REQUIRED_VIEWS.every(v => names.has(v))`
- `version = maxVersion(files)` — latest `updated_at` timestamp across the 4 files, as an epoch-ms string

**Returns**:
```ts
{
  kingReady: boolean;
  warriorReady: boolean;
  kingVersion: string;
  warriorVersion: string;
  checked: boolean;
}
```

The `version` strings flow through to `TexturedPiece` → `TexturedPieceBody` → `getTextureUrl` → `useLoader(TextureLoader, url)`, ensuring Three.js texture cache is busted when textures are re-uploaded by the admin.

## useIsMobile (`src/hooks/use-mobile.tsx`)

Simple responsive breakpoint hook.

**Breakpoint**: 768px

**Implementation**: `window.matchMedia` listener, returns `boolean`. Initial value `undefined` (renders as `false` via `!!`).

**Usage**: Available for responsive logic; the primary responsive approach uses Tailwind breakpoint classes directly.
