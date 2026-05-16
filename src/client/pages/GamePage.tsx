// ABOUT: Game page — wires useGame hook and renders the game layout.
// ABOUT: Board3D, GameStatus, and GameOverDialog are added in PR C. This stub renders a placeholder.

import type { Side, Difficulty } from '@/shared/game/types';
import { useGame } from '@/client/hooks/useGame';

interface GamePageProps {
  playerSide: Side;
  difficulty: Difficulty;
  onBackToMenu: () => void;
}

export default function GamePage({ playerSide, difficulty, onBackToMenu }: GamePageProps) {
  const { gameState, isAIThinking } = useGame({ playerSide, difficulty });

  return (
    <div className="h-screen flex flex-col bg-[#ebe4d6] overflow-hidden">
      {/* Top bar */}
      <div className="flex-none flex items-center justify-between px-4 py-2 border-b border-[#c4b8a8]">
        <button
          onClick={onBackToMenu}
          className="text-[#8b7a68] hover:text-[#3a2a1a] transition-colors text-sm tracking-wider uppercase"
        >
          &larr; Leave Game
        </button>
        <span
          className="text-[#3a2a1a] text-sm tracking-[0.2em] uppercase font-semibold"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Hnefatafl
        </span>
        <div className="text-[#8b7a68] text-sm">
          {isAIThinking ? 'Thinking…' : gameState.gameOver ? 'Game over' : 'Your turn'}
        </div>
      </div>

      {/* Board placeholder — replaced by Board3D in PR C */}
      <div className="flex-1 flex items-center justify-center">
        <p
          className="text-[#8b7a68] text-sm tracking-wider uppercase"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Board coming in next update
        </p>
      </div>
    </div>
  );
}
