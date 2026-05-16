// ABOUT: Tests for AppView union and isPlaceholderView helper.

import { describe, it, expect } from 'vitest';
import { isPlaceholderView, type AppView } from '../../../src/client/state/appView';

const REAL_VIEWS: AppView[] = ['menu', 'game', 'rules', 'privacy'];
const PLACEHOLDER_VIEWS: AppView[] = ['leaderboard', 'signin', 'contact', 'profile', 'admin'];

describe('isPlaceholderView', () => {
  it.each(REAL_VIEWS)('returns false for real view: %s', view => {
    expect(isPlaceholderView(view)).toBe(false);
  });

  it.each(PLACEHOLDER_VIEWS)('returns true for placeholder view: %s', view => {
    expect(isPlaceholderView(view)).toBe(true);
  });
});
