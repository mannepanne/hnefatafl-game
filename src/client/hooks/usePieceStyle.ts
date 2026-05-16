// ABOUT: Persists the user's chosen piece style to localStorage.
// ABOUT: Type union is 'ornate' | 'textured' (not prototype's 'classic' | 'ornate').

import { useState, useCallback } from 'react';

export type PieceStyle = 'ornate' | 'textured';

const STORAGE_KEY = 'hnefatafl-piece-style';

const VALID_STYLES = new Set<string>(['ornate', 'textured']);

export function usePieceStyle() {
  const [style, setStyleState] = useState<PieceStyle>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VALID_STYLES.has(stored)) return stored as PieceStyle;
    } catch {
      // localStorage unavailable
    }
    return 'ornate';
  });

  const setStyle = useCallback((newStyle: PieceStyle) => {
    setStyleState(newStyle);
    try {
      localStorage.setItem(STORAGE_KEY, newStyle);
    } catch {
      // localStorage unavailable
    }
  }, []);

  return { style, setStyle };
}
