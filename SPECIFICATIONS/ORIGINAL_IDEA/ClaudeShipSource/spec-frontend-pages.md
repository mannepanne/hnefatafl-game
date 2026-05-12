# Technical Specification: Frontend — Pages

## Overview

The app has 9 page components in `src/pages/`, rendered by a state-machine router in `App.tsx`. All pages share a consistent parchment/leather visual language with Cinzel headings and Cormorant Garamond body text.

## App.tsx — Router

`App.tsx` manages a `view` state with type:

```ts
type AppView = 'menu' | 'game' | 'rules' | 'leaderboard' | 'privacy'
             | 'signin' | 'contact' | 'profile' | 'admin';
```

`getInitialView()` reads `window.location.pathname` to support direct-link navigation for `/privacy`, `/signin`, and `/contact`. All other paths default to `'menu'`.

Each page receives callback props (`onBack`, `onShowX`) for navigation — no URL changes occur during in-app navigation. The `GamePage` is keyed with a `gameKey` counter that increments on each new game, forcing a full React remount to reset all game state cleanly.

The `Toaster` (from sonner) is rendered at the root level with custom parchment styling.

## MenuPage (196 lines)

**Props**: `onStartGame`, `onShowRules`, `onShowLeaderboard`, `onShowPrivacy`, `onShowSignIn`, `onShowProfile`

**Purpose**: Main menu — side and difficulty selection, entry point to all other views.

**Layout**:
- Centered column on parchment background with a subtle SVG diamond pattern overlay (`opacity-[0.06]`)
- Settings gear icon (top-right) for signed-in users → navigates to profile
- Title block: "HNEFATAFL" in 5xl/6xl Cinzel, gold divider, "The Viking Board Game" subtitle

**Side Selection**:
- 2-column grid of cards (Defenders/Attackers)
- Each card shows a colored circle icon, side name, historical name ("The Swedes" / "The Muscovites"), and objective description
- Active card has gold border, white background, shadow; inactive has muted border
- Gold dot indicator on active card

**Difficulty Selection**:
- Vertical stack of 3 cards: Thrall (🛡️), Karl (⚔️), Jarl (👑)
- Each shows icon, name, and description
- Same active/inactive styling as side selection

**Actions**:
- "Begin Battle" button (full-width, sienna bg)
- Secondary links: How to Play | Leaderboard, Sign In / Register | Privacy

**State**: `selectedSide: Side` (default: `'defenders'`), `selectedDifficulty: Difficulty` (default: `'karl'`)

## GamePage (232 lines)

**Props**: `playerSide`, `difficulty`, `onBackToMenu`

**Purpose**: Active game — 3D board with side panel showing status and identity.

**Layout**:
- Full viewport height (`h-screen`), flex column
- Top bar: "← Leave Game", "Hnefatafl" title, elapsed timer, expand button (mobile)
- Game area: flex row on desktop (board + 272px side panel), flex column on mobile

**Board Area**:
- `Board3D` component fills available space (`flex-1 min-h-0 relative`)
- Piece style: signed-in users use their `usePieceStyle` preference; anonymous users always see `'classic'`

**Focus Mode** (mobile only):
- Toggled via Maximize2/Minimize2 icons
- Hides top bar and side panel
- Shows floating HUD bar: timer, piece counts with pulsing turn indicator, exit button
- Shows floating turn status pill at bottom: "Your turn" / "Thinking…" / "Game Over"
- Auto-exits when viewport grows to desktop width (1024px media query)

**Side Panel** (`w-72` on desktop, full-width strip on mobile):
- `GameStatus` component (turn indicator, difficulty, playing as, piece counts, captured pieces, move counter)
- `PlayerIdentity` component (signed-in identity + ornate toggle, or anonymous Wanderer with inline registration)

**Game Over**:
- `GameOverDialog` overlay when `gameState.gameOver` is true
- Passes winner, winReason, playerSide, difficulty, duration, moveCount

**State**: `elapsedTime` (1s interval timer), `focusMode` (boolean)

**Hooks**: `useGame` (game state + AI), `useAuth` (user), `usePieceStyle` (piece style preference)

## RulesPage (208 lines)

**Props**: `onBack`

**Purpose**: Static rules reference explaining how to play Hnefatafl.

**Sections**:
1. The Game of Kings — introduction and historical context
2. The Board — throne and corner square explanations with colored square indicators
3. The Sides — 2-column grid: Defenders (12 warriors + 1 King) and Attackers (24 warriors)
4. Movement — rook-style movement, restricted squares
5. Capture — custodial capture mechanics
6. Capturing the King — position-dependent rules (throne, adjacent, elsewhere, edge)
7. Victory Conditions — 2-column grid: Defenders Win / Attackers Win
8. Historical Note — Copenhagen rules, Linnaeus/Tablut, Poetic Edda references
9. "Ready to Play" button

## LeaderboardPage (114 lines)

**Props**: `onBack`, `onShowProfile`

**Purpose**: Public leaderboard table showing top players.

**Data**: `useLeaderboard()` hook — fetches public profiles ordered by wins, limit 50.

**Layout**:
- Trophy icon + "Top Players" heading
- Vertical stack of player cards, each showing: rank number, display name, W/L record, best difficulty with emoji, win count, best time
- Rank 1 has gold text and brighter background; ranks 2–3 have sienna text
- Signed-in users see a "Manage your leaderboard visibility in Settings" link at the bottom

## ProfilePage (490 lines)

**Props**: `onBack`, `onShowAdmin`

**Purpose**: Player stats, mastery progress, recent games, and profile settings.

**Layout**: Two-column grid on desktop (`lg:grid-cols-2`), single column on mobile.

**Left Column — Stats**:

*Mastery Card*:
- Per-difficulty (Thrall/Karl/Jarl) progress bars
- Color legend: ⚔️ Attacker (dark brown `#8b4513`) / 🛡️ Defender (lighter orange `#d88550`)
- Each bar is a two-segment flex bar: attacker wins % + defender wins % = total win rate %
- Shows W/L counts and percentage per difficulty
- Footer: best time and highest difficulty conquered

*Win Rate Card*:
- Two rows of filter tabs (pill-style, rounded-full):
  - Row 1 — Difficulty: All | Thrall | Karl | Jarl
  - Row 2 — Side: Both | ⚔️ Attacking | 🛡️ Defending
- SVG donut chart (170×170, radius 66, stroke-width 18)
- Center text: percentage, "Win Rate" label, "X of Y games" subtitle
- Filters compose: e.g. "Jarl + Attacking" shows only Jarl games played as attackers

**Right Column — Games + Identity**:

*Recent Games Card*:
- Last 10 games via `useMyRecentGames`
- Each row: W/L badge (circle), difficulty icon + label, side played, duration, relative time
- Empty state: "No games yet. Play one to see it here."

*Identity Card*:
- Display name input (max 30 chars)
- Public leaderboard toggle (Switch component)
- Save/Create Profile button
- Admin Panel button (if `is_admin`)

**Other sections**: Privacy notice, Sign Out button

**State**: `displayName`, `isPublic`, `hasChanges`, `statFilter: StatFilter`, `sideFilter: SideFilter`

## SignInPage (132 lines)

**Props**: `onBack`

**Purpose**: Magic link email sign-in / registration.

**Layout**: Centered card with email input and "Send Magic Link" button.

**Flow**:
1. User enters email, clicks Send
2. `signInWithMagicLink(email)` via `useAuth`
3. Success: shows confirmation with the email address and a "Use a different email" link
4. Error: toast notification

**Info section**: "How it works" card explaining the magic link flow, privacy-by-default note, link to privacy policy.

## AdminPage (407 lines)

**Props**: `onBack`

**Purpose**: User management panel, admin-gated.

**Access Gate**: Checks `myProfile?.is_admin` — shows "Access denied" if not admin.

**Layout**:
- Texture Manager section (drag-and-drop piece texture uploads)
- Search bar with user count
- Filterable user list

**UserRow Component** (per-user card):
- Header: display name (editable inline), admin badge, email
- Stats: W/L record, game count, join date, public/private status
- Actions: Export (downloads JSON), Rename (inline edit), Show/Hide (toggle visibility), Delete (with confirmation)

**Admin Actions** (via Edge Function):
- `list-users`: parallel-fetches auth users, profiles, game results
- `export-user`: downloads complete user data as JSON file
- `delete-user`: confirmation dialog, then removes data + auth user
- `update-user`: inline display name edit, visibility toggle

## ContactPage (224 lines)

**Props**: `onBack`

**Purpose**: Contact form with Cloudflare Turnstile CAPTCHA.

**Layout**: Centered form with email input, message textarea, Turnstile widget, and Send button.

**Turnstile Integration**:
- Loads script dynamically with `?render=explicit&onload=` callback
- Renders widget into a ref div
- Stores token in state; submit button disabled until token acquired
- Resets widget on submission failure

**Flow**:
1. Fill email + message, complete CAPTCHA
2. Submit via `supabase.functions.invoke('contact', { body: { email, message, turnstileToken } })`
3. Success: shows "Message Sent" confirmation
4. Error: toast, reset Turnstile for retry

## PrivacyPage (208 lines)

**Props**: `onBack`, `onShowContact?`

**Purpose**: Privacy policy — static content.

**Sections**: Who We Are, What Data We Collect (email, game data), What We Do Not Collect, How Your Data Is Stored, Your Rights (export, delete, correct, withdraw visibility), Advertising (future plans), Cookies and Tracking, Changes to This Policy, Contact.

**Notable**: The contact link uses `onShowContact` callback for in-app navigation when available, falls back to `<a href="/contact">` for direct-link access.
