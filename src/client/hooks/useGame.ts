// ABOUT: Core game hook — manages engine state + UI state as two separate slices.
// ABOUT: AI think-delay lives here (300/500/800ms per difficulty) not in the AI module.

import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState, Position, Piece, Side } from '@/shared/game/types';
import type { Difficulty } from '@/shared/game/types';
import { createInitialState, makeMove, getValidMoves } from '@/shared/game/engine';
import { getAIMove } from '@/shared/game/ai';

export interface UIState {
  selectedPiece: Piece | null;
  validMoves: Position[];
}

export interface GameConfig {
  playerSide: Side;
  difficulty: Difficulty;
}

const INITIAL_UI_STATE: UIState = {
  selectedPiece: null,
  validMoves: [],
};

const THINK_DELAY: Record<Difficulty, number> = {
  thrall: 300,
  karl: 500,
  jarl: 800,
};

const SLIDE_DELAY = 700;

export function useGame(config: GameConfig) {
  const [gameState, setGameState] = useState<GameState>(() => createInitialState());
  const [uiState, setUiState] = useState<UIState>(INITIAL_UI_STATE);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  // gameKey increments on every newGame() call so the AI effect always re-fires,
  // even when currentTurn is structurally identical before and after the reset.
  const [gameKey, setGameKey] = useState(0);

  const playerSide = config.playerSide;
  const aiSide: Side = playerSide === 'attackers' ? 'defenders' : 'attackers';

  // Refs to avoid stale closures inside setTimeout and event handlers
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const uiStateRef = useRef(uiState);
  uiStateRef.current = uiState;

  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const newGame = useCallback(() => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    setIsAIThinking(false);
    setAiError(null);
    setGameKey(k => k + 1);
    setGameState(createInitialState());
    setUiState(INITIAL_UI_STATE);
  }, []);

  const handlePieceClick = useCallback((piece: Piece) => {
    setUiState(prev => {
      const gs = gameStateRef.current;
      if (gs.gameOver) return prev;
      if (gs.currentTurn !== playerSide) return prev;
      if (piece.side !== playerSide) return prev;

      // Clicking the already-selected piece deselects
      if (prev.selectedPiece?.id === piece.id) {
        return { ...prev, selectedPiece: null, validMoves: [] };
      }

      // Select new piece
      const moves = getValidMoves(gs, piece);
      return { ...prev, selectedPiece: piece, validMoves: moves };
    });
  }, [playerSide]);

  const handleSquareClick = useCallback((pos: Position) => {
    // Read current values from refs — safe to call both setters at the top level
    // (not inside each other's updater, which would be unsafe under concurrent React).
    const gs = gameStateRef.current;
    const prevUi = uiStateRef.current;

    if (gs.gameOver) return;
    if (gs.currentTurn !== playerSide) return;
    if (!prevUi.selectedPiece) return;

    const isValid = prevUi.validMoves.some(m => m.row === pos.row && m.col === pos.col);
    if (!isValid) {
      setUiState(prev => ({ ...prev, selectedPiece: null, validMoves: [] }));
      return;
    }

    const from = prevUi.selectedPiece.position;
    setGameState(current => makeMove(current, from, pos));
    setUiState({ selectedPiece: null, validMoves: [] });
  }, [playerSide]);

  // AI turn — gameKey in deps so effect re-fires after newGame() even when
  // currentTurn is structurally identical (e.g. defender config: attackers → reset → attackers).
  useEffect(() => {
    if (gameState.gameOver || gameState.currentTurn !== aiSide) {
      return;
    }

    setIsAIThinking(true);

    const delay = SLIDE_DELAY + THINK_DELAY[config.difficulty];

    const id = setTimeout(() => {
      try {
        const current = gameStateRef.current;
        const move = getAIMove(current, config.difficulty, aiSide);
        if (move) {
          setGameState(prev => makeMove(prev, move.from, move.to));
        } else {
          setAiError('AI could not find a move. Please start a new game.');
        }
      } catch (err) {
        console.error('AI move error:', err);
        setAiError('An error occurred during the AI turn. Please start a new game.');
      } finally {
        setIsAIThinking(false);
      }
    }, delay);

    aiTimeoutRef.current = id;

    return () => {
      clearTimeout(id);
      setIsAIThinking(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentTurn, gameState.gameOver, gameKey, aiSide, config.difficulty]);

  const gameDuration = gameState.gameOver
    ? Math.floor((Date.now() - gameState.startTime) / 1000)
    : null;

  return {
    gameState,
    uiState,
    isAIThinking,
    aiError,
    newGame,
    handlePieceClick,
    handleSquareClick,
    gameDuration,
  };
}
