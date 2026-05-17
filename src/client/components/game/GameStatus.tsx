// ABOUT: Side-panel status widget — turn indicator, difficulty, piece counts.
// ABOUT: Pure display component; no game-state mutation.

import type { GameState, Side, Difficulty } from '@/shared/game/types';

interface GameStatusProps {
  gameState: GameState;
  playerSide: Side;
  difficulty: Difficulty;
  isAIThinking: boolean;
}

const difficultyLabels: Record<Difficulty, { name: string; description: string }> = {
  thrall: { name: 'Thrall', description: 'Novice' },
  karl: { name: 'Karl', description: 'Warrior' },
  jarl: { name: 'Jarl', description: 'Commander' },
};

export default function GameStatus({ gameState, playerSide, difficulty, isAIThinking }: GameStatusProps) {
  const defenderCount = gameState.pieces.filter(p => p.side === 'defenders').length;
  const attackerCount = gameState.pieces.filter(p => p.side === 'attackers').length;
  const isPlayerTurn = gameState.currentTurn === playerSide && !gameState.gameOver;

  return (
    <div className="space-y-4" style={{ fontFamily: 'Cinzel, serif' }}>
      {/* Turn indicator */}
      <div className="text-center">
        <div className={`text-sm tracking-widest uppercase ${isPlayerTurn ? 'text-[#8b4513]' : 'text-[#8b7a68]'}`}>
          {gameState.gameOver
            ? 'Game Over'
            : isAIThinking
              ? `${difficultyLabels[difficulty].name} is thinking...`
              : isPlayerTurn
                ? 'Your turn'
                : 'Opponent\'s turn'
          }
        </div>
        {isAIThinking && (
          <div className="flex justify-center mt-2 gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-[#8b4513] rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Difficulty */}
      <div className="bg-white/60 rounded-lg p-3 border border-[#c4b8a8]">
        <div className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase mb-1">Difficulty</div>
        <div className="text-[#8b4513] text-sm tracking-wider">{difficultyLabels[difficulty].name}</div>
        <div className="text-[#8b7a68] text-xs">{difficultyLabels[difficulty].description}</div>
      </div>

      {/* Playing as */}
      <div className="bg-white/60 rounded-lg p-3 border border-[#c4b8a8]">
        <div className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase mb-1">Playing as</div>
        <div className="text-[#3a2a1a] text-sm tracking-wider">
          {playerSide === 'defenders' ? 'Defenders (Swedes)' : 'Attackers (Muscovites)'}
        </div>
        <div className="text-[#8b7a68] text-xs mt-1">
          {playerSide === 'defenders'
            ? 'Escort the King to a corner'
            : 'Capture the King'
          }
        </div>
      </div>

      {/* Piece counts */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`bg-white/60 rounded-lg p-3 border ${playerSide === 'defenders' ? 'border-[#b8860b]/30' : 'border-[#c4b8a8]'}`}>
          <div className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase mb-1">Swedes</div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#f0e6d0] to-[#ddd0b8] border border-[#c4a87a]/40" />
            <span className="text-[#3a2a1a] text-lg tabular-nums">{defenderCount}</span>
          </div>
        </div>
        <div className={`bg-white/60 rounded-lg p-3 border ${playerSide === 'attackers' ? 'border-[#b8860b]/30' : 'border-[#c4b8a8]'}`}>
          <div className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase mb-1">Muscovites</div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#7d5a3a] to-[#6b4c30] border border-[#8b6845]/40" />
            <span className="text-[#3a2a1a] text-lg tabular-nums">{attackerCount}</span>
          </div>
        </div>
      </div>

      {/* Captured pieces */}
      {(gameState.capturedByAttackers.length > 0 || gameState.capturedByDefenders.length > 0) && (
        <div className="bg-white/60 rounded-lg p-3 border border-[#c4b8a8]">
          <div className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase mb-2">Captured</div>
          {gameState.capturedByAttackers.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mb-1">
              {gameState.capturedByAttackers.map(p => (
                <div
                  key={p.id}
                  className="w-3 h-3 rounded-full bg-gradient-to-br from-[#f0e6d0] to-[#ddd0b8] opacity-50"
                />
              ))}
            </div>
          )}
          {gameState.capturedByDefenders.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {gameState.capturedByDefenders.map(p => (
                <div
                  key={p.id}
                  className="w-3 h-3 rounded-full bg-gradient-to-br from-[#7d5a3a] to-[#6b4c30] opacity-50"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Move counter */}
      <div className="text-center text-[#8b7a68] text-xs tracking-wider">
        Move {gameState.moveCount}
      </div>
    </div>
  );
}
