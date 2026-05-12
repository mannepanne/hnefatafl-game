# Technical Specification: Database & Backend

## Overview

The backend uses Supabase for PostgreSQL database, authentication, file storage, and serverless Edge Functions. The Supabase client is initialized in `src/lib/supabase.ts` with PKCE auth flow, reading `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env`.

## Database Schema

### `game_results`

Stores individual game outcomes for registered users.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `uuid` | FK → `auth.users(id)` ON DELETE CASCADE, NOT NULL |
| `won` | `boolean` | NOT NULL |
| `player_side` | `text` | CHECK IN (`'attackers'`, `'defenders'`), NOT NULL |
| `difficulty` | `text` | CHECK IN (`'thrall'`, `'karl'`, `'jarl'`), NOT NULL |
| `duration_seconds` | `integer` | NOT NULL |
| `move_count` | `integer` | NOT NULL |
| `played_at` | `timestamptz` | DEFAULT `now()`, NOT NULL |

**RLS Policies:**
- Users can SELECT their own rows (`auth.uid() = user_id`)
- Users can INSERT their own rows (`auth.uid() = user_id`)

### `leaderboard_profiles`

Denormalized profile with aggregate stats for the leaderboard.

| Column | Type | Constraints |
|--------|------|-------------|
| `user_id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| `display_name` | `text` | NOT NULL |
| `is_public` | `boolean` | DEFAULT `false`, NOT NULL |
| `is_admin` | `boolean` | DEFAULT `false`, NOT NULL |
| `total_wins` | `integer` | DEFAULT `0`, NOT NULL |
| `total_losses` | `integer` | DEFAULT `0`, NOT NULL |
| `best_time_seconds` | `integer` | NULLABLE |
| `best_difficulty` | `text` | NULLABLE |
| `created_at` | `timestamptz` | DEFAULT `now()`, NOT NULL |
| `updated_at` | `timestamptz` | DEFAULT `now()`, NOT NULL |

**RLS Policies:**
- Anyone can view public profiles (`is_public = true`)
- Users can view their own profile (`auth.uid() = user_id`)
- Users can insert their own profile (`auth.uid() = user_id`)
- Users can update their own profile (`auth.uid() = user_id`)

Note: An "admins can read all profiles" policy was created and then dropped (migration 4) to avoid RLS recursion — the policy checked `is_admin` on the same table it was gating. Admin reads go through the service-role Edge Function instead.

### `site_stats`

Singleton row tracking aggregate game counts.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `integer` | PK, DEFAULT `1`, CHECK `id = 1` |
| `total_anonymous_games` | `integer` | DEFAULT `0`, NOT NULL |
| `total_registered_games` | `integer` | DEFAULT `0`, NOT NULL |
| `updated_at` | `timestamptz` | DEFAULT `now()`, NOT NULL |

**RLS Policies:**
- Anyone (anon + authenticated) can SELECT
- No direct UPDATE policy — updates go through `SECURITY DEFINER` functions

## Database Functions (RPCs)

### `increment_anonymous_games()`

```sql
-- language: sql, security definer
UPDATE public.site_stats
SET total_anonymous_games = total_anonymous_games + 1,
    updated_at = now()
WHERE id = 1;
```

Called from the client when an anonymous player finishes a game.

### `record_game_result(p_won, p_player_side, p_difficulty, p_duration_seconds, p_move_count)`

```sql
-- language: plpgsql, security definer
```

1. Gets `auth.uid()` (raises exception if null)
2. Inserts a row into `game_results`
3. If the player won:
   - Increments `total_wins` on `leaderboard_profiles`
   - Updates `best_time_seconds` if the new time is faster
   - Updates `best_difficulty` if the new difficulty ranks higher (jarl=3 > karl=2 > thrall=1)
4. If the player lost:
   - Increments `total_losses`
5. Increments `total_registered_games` on `site_stats`

## Migrations

| # | File | Purpose |
|---|------|---------|
| 1 | `20260411100142_create_game_tables.sql` | Creates all 3 tables, RLS policies, and both RPC functions |
| 2 | `20260411130545_fix_site_stats_rls.sql` | Drops the `site_stats` UPDATE policy (RPCs use SECURITY DEFINER) |
| 3 | `20260411153621_add_admin_column.sql` | Adds `is_admin` column, sets admin for initial user |
| 4 | `20260411160256_fix_admin_rls_recursion.sql` | Drops the self-referencing admin SELECT policy |
| 5 | `20260411164609_create_piece_textures_bucket.sql` | Creates Storage bucket for custom piece textures |

## Storage

### `piece-textures` Bucket

- **Public**: yes (textures load in the game for all players)
- **File size limit**: 5MB
- **Allowed MIME types**: `image/png`, `image/jpeg`, `image/webp`
- **Structure**: `king/{front|back|left|right}.png`, `warrior/{front|back|left|right}.png`

**RLS Policies:**
- anon + authenticated can SELECT (public read)
- authenticated can INSERT, UPDATE, DELETE (upload gated to admin in the UI)

## Authentication

- **Method**: Magic link (passwordless email OTP)
- **Flow**: PKCE (code verifier stored in iframe localStorage)
- **Hook**: `useAuth` manages `User | null` state, exposes `signInWithMagicLink(email)` and `signOut()`
- **Anonymous play**: Fully supported — no sign-in required to play. Anonymous games increment a site-wide counter via `increment_anonymous_games()`.
- **Signed-in benefits**: Game results are recorded, stats tracked, profile on leaderboard, ornate piece style unlocked.

## Edge Functions

### `contact` (`supabase/functions/contact/index.ts`)

**Purpose**: Processes the contact form — validates CAPTCHA, sends email.

**Secrets**: `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `CONTACT_RECIPIENT_EMAIL`

**Flow:**
1. Rate limit: 3 requests per IP per hour (in-memory Map, resets on cold start)
2. Parse `{ email, message, turnstileToken }` from request body
3. Verify Turnstile token with Cloudflare's siteverify endpoint
4. Send email via Resend API (from: `hnefatafl-noreply@hultberg.org`, reply-to: sender)
5. Return `{ success: true }` or error JSON with appropriate status

### `admin` (`supabase/functions/admin/index.ts`)

**Purpose**: Admin API for user management. Uses the service role key to bypass RLS.

**Secrets**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Auth gate**: Every request passes through `verifyAdmin(req)`:
1. Extract JWT from `Authorization` header
2. Create a user-scoped Supabase client, call `getUser()` to verify the JWT
3. Query `leaderboard_profiles.is_admin` with the service client
4. Return the user ID if admin, `null` otherwise

**Actions:**

| Action | Method | Description |
|--------|--------|-------------|
| `list-users` | POST | Parallel-fetches `auth.admin.listUsers`, all profiles, all game result user_ids. Merges into enriched user list with game counts. |
| `export-user` | POST | Parallel-fetches auth user, profile, and game results for a single user. Returns complete data export. |
| `delete-user` | POST | Guards against self-deletion. Parallel-deletes game_results + profile, then deletes auth user. |
| `update-user` | POST | Updates `display_name` and/or `is_public` on a user's profile. |

## Data Fetching Hooks (`src/hooks/useLeaderboard.ts`)

All hooks use TanStack React Query for caching and automatic refetching.

| Hook | Query Key | Purpose |
|------|-----------|---------|
| `useLeaderboard()` | `['leaderboard']` | Public profiles ordered by wins, limit 50 |
| `useMyGameStats(userId)` | `['my-game-stats', userId]` | Aggregates `game_results` into per-difficulty, per-side breakdown |
| `useMyRecentGames(userId, limit)` | `['my-recent-games', userId, limit]` | Last N games ordered by `played_at` desc |
| `useMyProfile(userId)` | `['my-profile', userId]` | Single profile row with `maybeSingle()` |
| `useCreateProfile()` | — (mutation) | Inserts new profile, invalidates `my-profile` + `leaderboard` |
| `useUpdateProfile()` | — (mutation) | Updates display name + visibility, invalidates `my-profile` + `leaderboard` |
| `useRecordGame()` | — (mutation) | Calls `record_game_result` RPC, invalidates `my-profile` + `my-game-stats` + `my-recent-games` + `leaderboard` |
| `useIncrementAnonymousGames()` | — (mutation) | Calls `increment_anonymous_games` RPC |

### `MyGameStats` Shape

```ts
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
```

Aggregated client-side from raw `game_results` rows (selecting `won`, `difficulty`, `player_side`).
