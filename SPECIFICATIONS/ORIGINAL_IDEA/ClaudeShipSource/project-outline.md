# Hnefatafl — Project Outline

## The Idea

A browser-based implementation of Hnefatafl, the Viking board game, with a 3D rendered board, three AI difficulty levels, user accounts, and a public leaderboard. The goal was to make an ancient and relatively obscure game accessible to modern players through polished presentation, clear rules explanation, and a progressively challenging AI — while staying faithful to the Copenhagen ruleset used by the competitive Hnefatafl community.

## Historical Background

Hnefatafl (pronounced "NEF-ah-tah-fel") is a family of asymmetric strategy board games that were played across Scandinavia, Britain, and Ireland from roughly 400 CE until chess supplanted them in the 11th century. The name translates loosely to "fist table" or "king's table."

Unlike chess, the two sides are unequal. A small defending force with a King at its center must break through a surrounding army of attackers. The defenders win if the King escapes to a corner; the attackers win by capturing the King. This asymmetry — more pieces versus a positional advantage — creates fundamentally different strategic challenges for each side.

The game was deeply embedded in Norse culture. It appears in the Poetic Edda, where the gods play with golden pieces. Jarl Rognvald of Orkney listed mastery of Hnefatafl among his nine great accomplishments. Our best primary source comes from Carl Linnaeus, the Swedish botanist, who documented a variant called "Tablut" during his 1732 expedition to Lapland. The Sámi people played it on embroidered reindeer hide, calling the defenders "Swedes" and the attackers "Muscovites" — a reference to Sweden's rivalry with the Grand Duchy of Moscow.

This implementation uses the Copenhagen rules, the most widely adopted modern reconstruction. It features the 11×11 board, custodial capture, shield wall capture, and the king-on-edge immunity rule that creates interesting tactical dynamics.

## Key Design Decisions

### Visual Identity

The app uses a parchment/leather/gold palette that evokes the historical period without feeling like a museum exhibit. Typography is Cinzel (serif) for headings and UI chrome, Cormorant Garamond for body text — both chosen for their historical resonance without sacrificing readability. The design avoids the "medieval fantasy" cliché (no dragons, no blackletter) in favour of understated craft.

### 3D Board

The board is rendered in Three.js via React Three Fiber rather than 2D canvas or SVG. This decision was motivated by the desire for piece animations (sliding, lifting, spinning on selection, toppling on capture) that feel tactile and satisfying. The camera perspective can be orbited and zoomed, and the viewpoint flips based on which side the player chose, so each player "sits" on their own side of the board.

Three piece styles are supported:
- **Classic**: Simple stacked cylinders — clean and performant
- **Ornate**: Lathe-turned pieces with decorative bands, emblems, and a crowned king — unlocked for registered users
- **Textured**: Custom artwork rendered on cross-plane billboards using a GLSL shader for alpha masking and side-specific tinting — activated when an admin uploads piece textures

### AI Design

Rather than a single difficulty that can be adjusted, three distinct AI personalities were created:

- **Thrall** (beginner): Mostly random with capture awareness. Picks from the top 5 candidates with heavy randomisation. Designed to lose often enough that new players learn the rules without frustration.
- **Karl** (intermediate): 2-ply minimax with width pruning (15 × 6 = 90 max leaf evaluations). Thinks one move ahead — "my move → your best reply." Never hangs pieces to obvious captures. ±15 jitter keeps play varied.
- **Jarl** (advanced): 3-ply minimax (12 × 6 × 4 = 288 max leaf evaluations). Plans one move beyond the immediate trade. Near-deterministic (±2 jitter). Finds multi-move tactical sequences that Karl misses.

The AI uses per-ply width limits rather than alpha-beta pruning to control branching. This is less theoretically optimal but simpler to tune and produces more natural-feeling play at the target depths. Both Karl and Jarl complete well within their think-delay windows (~19ms and ~79ms respectively).

### Asymmetric Evaluation

The board evaluation function is designed around the asymmetry of Hnefatafl. Key factors:
- Defenders are worth twice as much as attackers in the material count (fewer pieces, each more valuable)
- King distance to the nearest corner is heavily weighted — the closer the king, the more dangerous for attackers
- A king with a direct path to a corner triggers a large penalty for the attacker side
- King on the board edge is a significant defender advantage (king is immune to capture there)
- Attacker centrality is rewarded — controlling the center prevents king escape routes

### State-Machine Router

The app uses a simple `useState<AppView>` router rather than React Router. This was a deliberate choice: the game is a single-purpose application where deep linking is only needed for three pages (privacy, sign-in, contact). The state-machine approach avoids URL management complexity and makes the game page's lifecycle cleaner — a new game triggers a `key` increment that forces a full React remount, guaranteeing clean state without manual cleanup.

### Authentication Model

The app supports full anonymous play — no sign-in is required to play the game. This was a core design principle: the game should be immediately accessible. Registration (via passwordless magic link) unlocks:
- Game result recording and stat tracking
- Profile page with mastery progress and win rate analytics
- Public leaderboard participation (opt-in)
- Ornate piece style

Anonymous games still contribute to a site-wide counter via a `SECURITY DEFINER` RPC, so the total game count reflects all activity.

### Privacy-First Profile

Leaderboard participation is opt-in. Profiles are private by default — a user must explicitly toggle "Show on public leaderboard" to appear. This respects player privacy while still allowing competitive players to showcase their achievements.

## High-Level Implementation Summary

### Frontend (~4,400 lines across pages and components)

- **React 18** with TypeScript in strict mode
- **Tailwind CSS** with a custom parchment colour palette (not the default shadcn/ui tokens)
- **shadcn/ui** for form controls, dialogs, and layout primitives
- **Three.js** via `@react-three/fiber` for the game board
- **TanStack React Query** for all server data fetching with cache invalidation

### Game Engine (~480 lines, pure functions)

- Immutable state machine: every operation takes a `GameState` and returns a new one
- Copenhagen ruleset: custodial capture, king capture (position-dependent), shield wall capture
- Win conditions: king escape, king capture, insufficient attackers (< 3), stalemate

### AI (~200 lines)

- Shared minimax infrastructure with per-difficulty configuration
- Fast evaluation (cheap pre-filter) + full evaluation (leaf nodes)
- No alpha-beta pruning; width limits control branching budget

### Backend (Supabase)

- **PostgreSQL**: 3 tables (game_results, leaderboard_profiles, site_stats) with row-level security
- **Auth**: Passwordless magic link via PKCE flow
- **Storage**: Public bucket for custom piece textures (king + warrior, 4 views each)
- **Edge Functions**: Contact form (Resend + Turnstile CAPTCHA) and admin API (service-role user management)
- **RPCs**: `record_game_result` (atomic stats update) and `increment_anonymous_games`

### Documentation (this project)

| File | Content |
|------|---------|
| `project-outline.md` | This file — idea, history, design decisions, implementation summary |
| `spec-architecture.md` | Tech stack, project structure, routing, configuration, design system |
| `spec-game-engine.md` | Core types, board setup, movement, capture logic, win conditions, state transitions |
| `spec-ai.md` | Difficulty levels, minimax, evaluation functions, timing |
| `spec-database.md` | Schema, RLS policies, RPCs, migrations, storage, auth, Edge Functions, data hooks |
| `spec-frontend-pages.md` | All 9 page components with layout, state, and behavior details |
| `spec-frontend-3d.md` | Board3D, piece styles, GLSL shaders, animation system, game components |
| `spec-frontend-hooks.md` | Custom hooks for auth, game state, data fetching, piece styling, textures |
