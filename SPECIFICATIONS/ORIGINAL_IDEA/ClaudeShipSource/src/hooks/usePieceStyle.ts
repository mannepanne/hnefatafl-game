import { useState, useCallback } from 'react';

export type PieceStyle = 'classic' | 'ornate';

const STORAGE_KEY = 'hnefatafl-piece-style';

export function usePieceStyle() {
  const [style, setStyleState] = useState<PieceStyle>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'ornate') return 'ornate';
    } catch {
      // localStorage unavailable
    }
    return 'classic';
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
