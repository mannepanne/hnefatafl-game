import { useEffect, useRef } from 'react';
import type { Side, Difficulty, WinReason } from '@/types/game';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useRecordGame, useIncrementAnonymousGames } from '@/hooks/useLeaderboard';

interface GameOverDialogProps {
  winner: Side;
  winReason: WinReason;
  playerSide: Side;
  difficulty: Difficulty;
  duration: number;
  moveCount: number;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

const difficultyNames: Record<Difficulty, string> = {
  thrall: 'Thrall',
  karl: 'Karl',
  jarl: 'Jarl',
};

/** Human-readable headline + explanation for each end condition. */
function describeReason(reason: WinReason): { headline: string; detail: string } {
  switch (reason.kind) {
    case 'king-captured':
      return {
        headline: 'The King is slain',
        detail: 'The attackers hemmed in the King on all four sides, capturing him where he stood.',
      };
    case 'king-escaped':
      return {
        headline: 'The King escapes',
        detail: 'The King reached one of the four corner strongholds and broke free from the siege.',
      };
    case 'no-legal-moves':
      return reason.stuckSide === 'attackers'
        ? {
            headline: 'The attackers are paralysed',
            detail: 'The attackers have no legal moves left — unable to act, they concede the field.',
          }
        : {
            headline: 'The defenders are paralysed',
            detail: 'The defenders have no legal moves left — unable to act, they concede the field.',
          };
    case 'attackers-insufficient':
      return {
        headline: 'The siege is broken',
        detail: 'Fewer than three attackers remain — not enough to ever surround the King. Victory is beyond their reach.',
      };
  }
}

export default function GameOverDialog({
  winner,
  winReason,
  playerSide,
  difficulty,
  duration,
  moveCount,
  onPlayAgain,
  onBackToMenu,
}: GameOverDialogProps) {
  const playerWon = winner === playerSide;
  const { user, loading: authLoading } = useAuth();
  const recordGame = useRecordGame();
  const incrementAnonymous = useIncrementAnonymousGames();
  const recorded = useRef(false);

  useEffect(() => {
    // Wait for auth to resolve — on first mount `user` is always null
    // because useAuth fetches async, so recording before loading=false
    // would always take the anonymous branch for signed-in users.
    if (authLoading) return;
    if (recorded.current) return;
    recorded.current = true;

    if (user) {
      recordGame.mutate({
        won: playerWon,
        playerSide,
        difficulty,
        durationSeconds: duration,
        moveCount,
      });
    } else {
      incrementAnonymous.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const { headline, detail } = describeReason(winReason);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="bg-[#f5f0e8] border border-[#c4b8a8] rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        {/* Result */}
        <div className="text-center mb-6">
          <h2
            className={`text-3xl tracking-wider font-bold mb-2 ${
              playerWon ? 'text-[#b8860b]' : 'text-[#8b4040]'
            }`}
          >
            {playerWon ? 'Victory!' : 'Defeat'}
          </h2>
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-[#c4b8a8] to-transparent mb-4" />
          <p
            className="text-[#3a2a1a] text-base tracking-wide mb-2"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {headline}
          </p>
          <p
            className="text-[#6b5d4f] text-sm leading-relaxed px-2"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {detail}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-[#8b4513] text-xl tabular-nums">{moveCount}</div>
            <div className="text-[#8b7a68] text-[10px] tracking-[0.15em] uppercase">Moves</div>
          </div>
          <div className="text-center">
            <div className="text-[#8b4513] text-xl tabular-nums">{formatTime(duration)}</div>
            <div className="text-[#8b7a68] text-[10px] tracking-[0.15em] uppercase">Time</div>
          </div>
          <div className="text-center">
            <div className="text-[#8b4513] text-xl">{difficultyNames[difficulty]}</div>
            <div className="text-[#8b7a68] text-[10px] tracking-[0.15em] uppercase">Level</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={onPlayAgain}
            className="w-full bg-[#8b4513] hover:bg-[#a0522d] text-[#f5f0e8] font-bold tracking-wider"
          >
            Play Again
          </Button>
          <Button
            onClick={onBackToMenu}
            variant="outline"
            className="w-full border-[#c4b8a8] text-[#5c4a38] hover:bg-[#ebe4d6] hover:text-[#3a2a1a]"
          >
            Back to Menu
          </Button>
        </div>
      </div>
    </div>
  );
}
