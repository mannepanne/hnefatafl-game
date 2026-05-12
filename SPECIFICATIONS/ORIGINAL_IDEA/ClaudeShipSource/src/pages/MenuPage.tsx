import { useState } from 'react';
import type { Side, Difficulty } from '@/types/game';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Swords, Settings } from 'lucide-react';

interface MenuPageProps {
  onStartGame: (side: Side, difficulty: Difficulty) => void;
  onShowRules: () => void;
  onShowLeaderboard: () => void;
  onShowPrivacy: () => void;
  onShowSignIn: () => void;
  onShowProfile: () => void;
}

const difficulties: { key: Difficulty; name: string; description: string; icon: string }[] = [
  { key: 'thrall', name: 'Thrall', description: 'A forgiving opponent. Good for learning the game.', icon: '🛡️' },
  { key: 'karl', name: 'Karl', description: 'A capable warrior who thinks ahead.', icon: '⚔️' },
  { key: 'jarl', name: 'Jarl', description: 'A cunning commander. Expect no mercy.', icon: '👑' },
];

export default function MenuPage({ onStartGame, onShowRules, onShowLeaderboard, onShowPrivacy, onShowSignIn, onShowProfile }: MenuPageProps) {
  const { user, loading: authLoading } = useAuth();
  const [selectedSide, setSelectedSide] = useState<Side>('defenders');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('karl');

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 L55 30 L30 55 L5 30Z' fill='none' stroke='%238b6914' stroke-width='1'/%3E%3Cpath d='M30 15 L45 30 L30 45 L15 30Z' fill='none' stroke='%238b6914' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, rgba(184,134,11,0.04) 0%, transparent 70%)'
      }} />

      {/* Settings icon for signed-in users */}
      {!authLoading && user && (
        <button
          onClick={onShowProfile}
          className="absolute top-4 right-4 z-20 text-[#8b7a68] hover:text-[#3a2a1a] transition-colors p-2"
          title="Profile & Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      )}

      <div className="relative z-10 max-w-lg w-full" style={{ fontFamily: 'Cinzel, serif' }}>
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-bold tracking-[0.15em] text-[#3a2a1a] mb-2">
            HNEFATAFL
          </h1>
          <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-[#b8860b]/40 to-transparent mb-2" />
          <p className="text-[#8b7a68] text-xs tracking-[0.3em] uppercase">
            The Viking Board Game
          </p>
        </div>

        {/* Side selection */}
        <div className="mb-6">
          <h3 className="text-[#8b7a68] text-[10px] tracking-[0.3em] uppercase mb-3 text-center">
            Choose your side
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedSide('defenders')}
              className={`relative p-4 rounded-lg border transition-all duration-300 text-left ${
                selectedSide === 'defenders'
                  ? 'border-[#b8860b]/50 bg-white shadow-lg shadow-[#b8860b]/10'
                  : 'border-[#c4b8a8] bg-white/60 hover:border-[#b8860b]/30'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f0e6d0] to-[#ddd0b8] border border-[#c4a87a]/40 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#8b7a5a]" />
                </div>
                <div>
                  <div className="text-[#3a2a1a] text-sm tracking-wider font-semibold">Defenders</div>
                  <div className="text-[#8b7a68] text-[10px] tracking-wider">The Swedes</div>
                </div>
              </div>
              <p className="text-[#6b5d4f] text-xs leading-relaxed">
                Escort your King to any corner of the board to win.
              </p>
              {selectedSide === 'defenders' && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#b8860b]" />
              )}
            </button>

            <button
              onClick={() => setSelectedSide('attackers')}
              className={`relative p-4 rounded-lg border transition-all duration-300 text-left ${
                selectedSide === 'attackers'
                  ? 'border-[#b8860b]/50 bg-white shadow-lg shadow-[#b8860b]/10'
                  : 'border-[#c4b8a8] bg-white/60 hover:border-[#b8860b]/30'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7d5a3a] to-[#6b4c30] border border-[#8b6845]/40 flex items-center justify-center">
                  <Swords className="w-4 h-4 text-[#d4c8b8]" />
                </div>
                <div>
                  <div className="text-[#3a2a1a] text-sm tracking-wider font-semibold">Attackers</div>
                  <div className="text-[#8b7a68] text-[10px] tracking-wider">The Muscovites</div>
                </div>
              </div>
              <p className="text-[#6b5d4f] text-xs leading-relaxed">
                Surround and capture the enemy King before he escapes.
              </p>
              {selectedSide === 'attackers' && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#b8860b]" />
              )}
            </button>
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-8">
          <h3 className="text-[#8b7a68] text-[10px] tracking-[0.3em] uppercase mb-3 text-center">
            Choose your opponent
          </h3>
          <div className="space-y-2">
            {difficulties.map(d => (
              <button
                key={d.key}
                onClick={() => setSelectedDifficulty(d.key)}
                className={`w-full p-3 rounded-lg border transition-all duration-300 flex items-center gap-4 text-left ${
                  selectedDifficulty === d.key
                    ? 'border-[#b8860b]/50 bg-white shadow-lg shadow-[#b8860b]/10'
                    : 'border-[#c4b8a8] bg-white/60 hover:border-[#b8860b]/30'
                }`}
              >
                <span className="text-xl w-8 text-center">{d.icon}</span>
                <div className="flex-1">
                  <div className="text-[#3a2a1a] text-sm tracking-wider font-semibold">{d.name}</div>
                  <div className="text-[#6b5d4f] text-xs">{d.description}</div>
                </div>
                {selectedDifficulty === d.key && (
                  <div className="w-2 h-2 rounded-full bg-[#b8860b]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <Button
          onClick={() => onStartGame(selectedSide, selectedDifficulty)}
          className="w-full py-6 bg-[#8b4513] hover:bg-[#a0522d] text-[#f5f0e8] font-bold text-lg tracking-[0.2em] rounded-lg transition-all duration-300 shadow-lg shadow-[#8b4513]/20 hover:shadow-[#8b4513]/30"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Begin Battle
        </Button>

        {/* Secondary links */}
        <div className="flex flex-col items-center gap-3 mt-6">
          <div className="flex justify-center gap-6">
            <button
              onClick={onShowRules}
              className="text-[#8b7a68] hover:text-[#3a2a1a] text-xs tracking-[0.2em] uppercase transition-colors"
            >
              How to Play
            </button>
            <span className="text-[#c4b8a8]">|</span>
            <button
              onClick={onShowLeaderboard}
              className="text-[#8b7a68] hover:text-[#3a2a1a] text-xs tracking-[0.2em] uppercase transition-colors"
            >
              Leaderboard
            </button>
          </div>
          <div className="flex justify-center gap-6">
            <button
              onClick={onShowSignIn}
              className="text-[#8b7a68] hover:text-[#3a2a1a] text-xs tracking-[0.2em] uppercase transition-colors"
            >
              Sign In / Register
            </button>
            <span className="text-[#c4b8a8]">|</span>
            <button
              onClick={onShowPrivacy}
              className="text-[#8b7a68] hover:text-[#3a2a1a] text-xs tracking-[0.2em] uppercase transition-colors"
            >
              Privacy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
