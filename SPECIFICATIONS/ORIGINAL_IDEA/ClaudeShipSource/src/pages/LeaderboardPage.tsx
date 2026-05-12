import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { Trophy, Settings } from 'lucide-react';

interface LeaderboardPageProps {
  onBack: () => void;
  onShowProfile: () => void;
}

const difficultyEmoji: Record<string, string> = {
  thrall: '🛡️',
  karl: '⚔️',
  jarl: '👑',
};

export default function LeaderboardPage({ onBack, onShowProfile }: LeaderboardPageProps) {
  const { user } = useAuth();
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard();

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex flex-col" style={{ fontFamily: 'Cinzel, serif' }}>
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-[#c4b8a8]">
        <button
          onClick={onBack}
          className="text-[#8b7a68] hover:text-[#3a2a1a] transition-colors text-sm tracking-wider uppercase"
        >
          &larr; Back
        </button>
        <h1 className="text-[#3a2a1a] text-sm tracking-[0.2em] uppercase font-semibold">
          Leaderboard
        </h1>
        <div className="w-16" />
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          {/* Leaderboard table */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-5 h-5 text-[#b8860b]" />
              <h2 className="text-[#3a2a1a] tracking-wider">Top Players</h2>
            </div>

            {lbLoading ? (
              <div className="text-center py-8 text-[#8b7a68] text-sm">Loading...</div>
            ) : !leaderboard || leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#5c4a38] text-base mb-2">No one has joined the leaderboard yet.</p>
                <p className="text-[#8b7a68] text-sm">Be the first to claim your place in history!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-4 p-3 rounded-lg border ${
                      index === 0
                        ? 'border-[#b8860b]/30 bg-white/80'
                        : 'border-[#c4b8a8]/60 bg-white/50'
                    }`}
                  >
                    <div className={`w-8 text-center font-bold tabular-nums ${
                      index === 0 ? 'text-[#b8860b]' : index < 3 ? 'text-[#8b4513]' : 'text-[#8b7a68]'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[#3a2a1a] text-sm tracking-wider truncate">{entry.display_name}</div>
                      <div className="text-[#8b7a68] text-xs">
                        {entry.total_wins}W / {entry.total_losses}L
                        {entry.best_difficulty && ` · Best: ${difficultyEmoji[entry.best_difficulty] || ''} ${entry.best_difficulty}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#8b4513] font-bold tabular-nums">{entry.total_wins}</div>
                      <div className="text-[#8b7a68] text-[10px] tracking-wider">WINS</div>
                    </div>
                    {entry.best_time_seconds && (
                      <div className="text-right">
                        <div className="text-[#5c4a38] text-sm tabular-nums">{formatTime(entry.best_time_seconds)}</div>
                        <div className="text-[#8b7a68] text-[10px] tracking-wider">BEST</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Visibility hint — only relevant once signed in */}
          {user && (
            <button
              onClick={onShowProfile}
              className="w-full flex items-center justify-center gap-2 text-[#8b7a68] hover:text-[#8b4513] transition-colors text-xs tracking-wider pt-2"
              style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '13px' }}
            >
              <Settings className="w-3.5 h-3.5" />
              Manage your leaderboard visibility in Settings
            </button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
