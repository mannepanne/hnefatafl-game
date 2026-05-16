// ABOUT: AppView union type — the single source of truth for top-level navigation state.
// ABOUT: Navigation is driven by useState in App.tsx; no router library needed.

export type AppView =
  | 'menu'
  | 'game'
  | 'rules'
  | 'privacy'
  | 'leaderboard'
  | 'signin'
  | 'contact'
  | 'profile'
  | 'admin';

// Views that are not yet implemented — renders a "coming soon" placeholder.
const PLACEHOLDER_VIEWS: ReadonlySet<AppView> = new Set([
  'leaderboard',
  'signin',
  'contact',
  'profile',
  'admin',
]);

export function isPlaceholderView(view: AppView): boolean {
  return PLACEHOLDER_VIEWS.has(view);
}
