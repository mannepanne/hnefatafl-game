// ABOUT: Game page — wires useGame hook and renders the full 3D gameplay layout.
// ABOUT: Focus mode collapses the side panel for mobile; timer ticks while the game runs.

import { useState, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { Side, Difficulty } from '@/shared/game/types';
import { useGame } from '@/client/hooks/useGame';
import { cn } from '@/client/lib/utils';
import Board3D from '@/client/components/game/Board3D';
import GameStatus from '@/client/components/game/GameStatus';
import GameOverDialog from '@/client/components/game/GameOverDialog';
import WandererLabel from '@/client/components/game/WandererLabel';

interface GamePageProps {
  playerSide: Side;
  difficulty: Difficulty;
  onBackToMenu: () => void;
}

export default function GamePage({ playerSide, difficulty, onBackToMenu }: GamePageProps) {
  const {
    gameState,
    uiState,
    isAIThinking,
    aiError,
    newGame,
    handlePieceClick,
    handleSquareClick,
    gameDuration,
  } = useGame({ playerSide, difficulty });

  const [elapsedTime, setElapsedTime] = useState(0);
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    if (gameState.gameOver) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - gameState.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState.gameOver, gameState.startTime]);

  // Auto-exit focus mode when the viewport grows to desktop — the side panel
  // fits alongside the board there and focus mode would leave UI hidden.
  useEffect(() => {
    if (!focusMode) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    if (mq.matches) {
      setFocusMode(false);
      return;
    }
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setFocusMode(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [focusMode]);

  const defenderCount = gameState.pieces.filter(p => p.side === 'defenders').length;
  const attackerCount = gameState.pieces.filter(p => p.side === 'attackers').length;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const displayTime = gameDuration !== null ? gameDuration : elapsedTime;
  const isPlayerTurn = gameState.currentTurn === playerSide && !gameState.gameOver;

  return (
    <div className="h-screen flex flex-col bg-[#ebe4d6] overflow-hidden">
      {/* Top bar — hidden on mobile when focus mode is on */}
      <div
        className={cn(
          'flex-none items-center justify-between px-4 py-2 border-b border-[#c4b8a8]',
          focusMode ? 'hidden lg:flex' : 'flex',
        )}
      >
        <button
          onClick={onBackToMenu}
          className="text-[#8b7a68] hover:text-[#3a2a1a] transition-colors text-sm tracking-wider uppercase"
        >
          &larr; Leave Game
        </button>
        <div className="text-center">
          <span className="text-[#3a2a1a] text-sm tracking-[0.2em] uppercase font-semibold" style={{ fontFamily: 'Cinzel, serif' }}>
            Hnefatafl
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[#8b7a68] text-sm tabular-nums">
            {formatTime(displayTime)}
          </div>
          <button
            onClick={() => setFocusMode(true)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md text-[#8b7a68] hover:text-[#3a2a1a] hover:bg-white/60 active:bg-white/80 transition-colors"
            aria-label="Expand board"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Game area */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        {/* Board */}
        <div className="flex-1 min-h-0 relative">
          {aiError && (
            <div className="absolute top-0 left-0 right-0 z-30 px-4 py-2.5 bg-[#3a1a0a]/90 backdrop-blur-sm text-[#f5e6d0] text-sm flex items-center justify-between gap-3">
              <span>{aiError}</span>
              <button
                onClick={newGame}
                className="shrink-0 px-3 py-1 bg-[#5a2a0a]/80 hover:bg-[#6b3a1a] border border-[#c4a87a]/40 rounded text-xs tracking-wider uppercase font-semibold transition-colors"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                New Game
              </button>
            </div>
          )}

          <Board3D
            gameState={gameState}
            uiState={uiState}
            onSquareClick={handleSquareClick}
            onPieceClick={handlePieceClick}
            playerSide={playerSide}
          />

          {/* Focus-mode HUD — floating score bar, mobile only */}
          {focusMode && (
            <div
              className="lg:hidden absolute top-0 left-0 right-0 z-20 px-3 py-2 flex items-center justify-between gap-3 bg-[#ebe4d6]/85 backdrop-blur-sm border-b border-[#c4b8a8]/60"
              style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
            >
              <div className="text-[#8b7a68] text-xs tabular-nums font-medium tracking-wider min-w-[3rem]">
                {formatTime(displayTime)}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full bg-gradient-to-br from-[#f0e6d0] to-[#ddd0b8] border border-[#c4a87a]/60 transition-shadow',
                      gameState.currentTurn === 'defenders' && !gameState.gameOver &&
                        'ring-2 ring-[#8b4513]/60 ring-offset-1 ring-offset-[#ebe4d6] animate-pulse',
                    )}
                  />
                  <span className="text-[#3a2a1a] text-sm tabular-nums font-semibold">
                    {defenderCount}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full bg-gradient-to-br from-[#7d5a3a] to-[#6b4c30] border border-[#8b6845]/60 transition-shadow',
                      gameState.currentTurn === 'attackers' && !gameState.gameOver &&
                        'ring-2 ring-[#8b4513]/60 ring-offset-1 ring-offset-[#ebe4d6] animate-pulse',
                    )}
                  />
                  <span className="text-[#3a2a1a] text-sm tabular-nums font-semibold">
                    {attackerCount}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setFocusMode(false)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-[#8b7a68] hover:text-[#3a2a1a] hover:bg-white/60 active:bg-white/80 transition-colors"
                aria-label="Exit expanded view"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Turn status pill — shows near bottom in focus mode */}
          {focusMode && (
            <div
              className="lg:hidden absolute left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-[#ebe4d6]/85 backdrop-blur-sm border border-[#c4b8a8]/60 pointer-events-none"
              style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <span
                className={cn(
                  'text-xs tracking-widest uppercase font-semibold',
                  isPlayerTurn ? 'text-[#8b4513]' : 'text-[#8b7a68]',
                )}
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {gameState.gameOver
                  ? 'Game Over'
                  : isAIThinking
                    ? 'Thinking…'
                    : isPlayerTurn
                      ? 'Your turn'
                      : 'Opponent'}
              </span>
            </div>
          )}
        </div>

        {/* Side panel — hidden on mobile when focus mode is on */}
        <div
          className={cn(
            'flex-none w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-[#c4b8a8] p-4 flex-col gap-4 overflow-y-auto bg-[#f5f0e8]',
            focusMode ? 'hidden lg:flex' : 'flex',
          )}
        >
          <GameStatus
            gameState={gameState}
            playerSide={playerSide}
            difficulty={difficulty}
            isAIThinking={isAIThinking}
          />
          <WandererLabel />
        </div>
      </div>

      {gameState.gameOver && (
        <GameOverDialog
          winner={gameState.winner!}
          winReason={gameState.winReason!}
          playerSide={playerSide}
          difficulty={difficulty}
          duration={gameDuration ?? 0}
          moveCount={gameState.moveCount}
          onPlayAgain={newGame}
          onBackToMenu={onBackToMenu}
        />
      )}
    </div>
  );
}
