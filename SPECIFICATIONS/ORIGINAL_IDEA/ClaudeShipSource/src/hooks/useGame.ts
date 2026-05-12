import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState, Position, Piece, Side, GameConfig } from '@/types/game';
import {
  createInitialState,
  makeMove,
  selectPiece,
  deselectPiece,
  samePos,
} from '@/lib/game';
import { getAIMove } from '@/lib/game/ai';

export function useGame(config: GameConfig) {
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const playerSide = config.playerSide;
  const aiSide: Side = playerSide === 'attackers' ? 'defenders' : 'attackers';

  const resetGame = useCallback(() => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    setIsAIThinking(false);
    setGameState(createInitialState());
  }, []);

  const handlePieceClick = useCallback((piece: Piece) => {
    setGameState(prev => {
      if (prev.gameOver) return prev;
      if (prev.currentTurn !== playerSide) return prev;
      if (piece.side !== playerSide) return prev;

      // If clicking the same piece, deselect
      if (prev.selectedPiece && prev.selectedPiece.id === piece.id) {
        return deselectPiece(prev);
      }

      return selectPiece(prev, piece);
    });
  }, [playerSide]);

  const handleSquareClick = useCallback((pos: Position) => {
    setGameState(prev => {
      if (prev.gameOver) return prev;
      if (prev.currentTurn !== playerSide) return prev;
      if (!prev.selectedPiece) return prev;

      // Check if this is a valid move
      if (!prev.validMoves.some(m => samePos(m, pos))) {
        return deselectPiece(prev);
      }

      return makeMove(prev, prev.selectedPiece.position, pos);
    });
  }, [playerSide]);

  // Keep a ref to the latest gameState so the timeout callback reads fresh data
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // AI turn
  useEffect(() => {
    if (gameState.gameOver || gameState.currentTurn !== aiSide) {
      return;
    }

    setIsAIThinking(true);

    // Wait for piece slide animation (~400ms) + thinking delay per difficulty
    const slideTime = 700;
    const thinkDelay = config.difficulty === 'jarl' ? 800 : config.difficulty === 'karl' ? 500 : 300;
    const delay = slideTime + thinkDelay;

    const id = setTimeout(() => {
      try {
        const currentState = gameStateRef.current;
        const move = getAIMove(currentState, aiSide, config.difficulty);

        if (move) {
          setGameState(prev => makeMove(prev, move.from, move.to));
        }
      } catch (err) {
        console.error('AI move error:', err);
      } finally {
        setIsAIThinking(false);
      }
    }, delay);

    return () => {
      clearTimeout(id);
      setIsAIThinking(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentTurn, gameState.gameOver, aiSide, config.difficulty]);

  const gameDuration = gameState.gameOver
    ? Math.floor((Date.now() - gameState.startTime) / 1000)
    : Math.floor((Date.now() - gameState.startTime) / 1000);

  return {
    gameState,
    isAIThinking,
    resetGame,
    handlePieceClick,
    handleSquareClick,
    gameDuration,
  };
}
