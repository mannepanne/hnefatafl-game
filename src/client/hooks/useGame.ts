// ABOUT: Core game hook — manages engine state + UI state as two separate slices.
// ABOUT: AI think-delay lives here (300/500/800ms per difficulty) not in the AI module.

import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState, Position, Piece, Side, Move } from '@/shared/game/types';
import type { Difficulty } from '@/shared/game/types';
import { createInitialState, makeMove, getValidMoves } from '@/shared/game/engine';
import { getAIMove } from '@/shared/game/ai';

export interface UIState {
  selectedPiece: Piece | null;
  validMoves: Position[];
  lastMove: Move | null;
}

export interface GameConfig {
  playerSide: Side;
  difficulty: Difficulty;
}

const INITIAL_UI_STATE: UIState = {
  selectedPiece: null,
  validMoves: [],
  lastMove: null,
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

  const playerSide = config.playerSide;
  const aiSide: Side = playerSide === 'attackers' ? 'defenders' : 'attackers';

  // Refs to avoid stale closures inside setTimeout
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const newGame = useCallback(() => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    setIsAIThinking(false);
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
    setUiState(prev => {
      const gs = gameStateRef.current;
      if (gs.gameOver) return prev;
      if (gs.currentTurn !== playerSide) return prev;
      if (!prev.selectedPiece) return prev;

      const isValid = prev.validMoves.some(m => m.row === pos.row && m.col === pos.col);
      if (!isValid) {
        return { ...prev, selectedPiece: null, validMoves: [] };
      }

      const from = prev.selectedPiece.position;
      const move: Move = { from, to: pos, pieceId: prev.selectedPiece.id };
      setGameState(current => makeMove(current, from, pos));

      return { selectedPiece: null, validMoves: [], lastMove: move };
    });
  }, [playerSide]);

  // AI turn
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
          setUiState(prev => ({ ...prev, lastMove: move }));
        }
      } catch (err) {
        console.error('AI move error:', err);
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
  }, [gameState.currentTurn, gameState.gameOver, aiSide, config.difficulty]);

  const gameDuration = gameState.gameOver
    ? Math.floor((Date.now() - gameState.startTime) / 1000)
    : null;

  return {
    gameState,
    uiState,
    isAIThinking,
    newGame,
    handlePieceClick,
    handleSquareClick,
    gameDuration,
  };
}
