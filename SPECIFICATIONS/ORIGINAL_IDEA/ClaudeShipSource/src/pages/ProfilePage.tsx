import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import {
  useMyProfile,
  useUpdateProfile,
  useCreateProfile,
  useMyGameStats,
  useMyRecentGames,
  type DifficultyKey,
} from '@/hooks/useLeaderboard';
import { cn } from '@/lib/utils';
import { Shield, LogOut } from 'lucide-react';
import { toast } from 'sonner';

type StatFilter = 'total' | DifficultyKey;
type SideFilter = 'both' | 'attackers' | 'defenders';

const DIFFICULTY_META: Record<DifficultyKey, { label: string; sub: string; icon: string }> = {
  thrall: { label: 'Thrall', sub: 'easy', icon: '🛡️' },
  karl: { label: 'Karl', sub: 'medium', icon: '⚔️' },
  jarl: { label: 'Jarl', sub: 'hard', icon: '👑' },
};

function formatTime(seconds: number | null): string {
  if (seconds === null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface ProfilePageProps {
  onBack: () => void;
  onShowAdmin: () => void;
}

export default function ProfilePage({ onBack, onShowAdmin }: ProfilePageProps) {
  const { user, signOut } = useAuth();
  const { data: myProfile, isLoading } = useMyProfile(user?.id ?? null);
  const { data: gameStats } = useMyGameStats(user?.id ?? null);
  const { data: recentGames } = useMyRecentGames(user?.id ?? null, 10);
  const updateProfile = useUpdateProfile();
  const createProfile = useCreateProfile();

  const [displayName, setDisplayName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [statFilter, setStatFilter] = useState<StatFilter>('total');
  const [sideFilter, setSideFilter] = useState<SideFilter>('both');

  useEffect(() => {
    if (myProfile) {
      setDisplayName(myProfile.display_name);
      setIsPublic(myProfile.is_public);
    }
  }, [myProfile]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error('Display name cannot be empty.');
      return;
    }
    try {
      if (myProfile) {
        await updateProfile.mutateAsync({ displayName: displayName.trim(), isPublic });
      } else {
        await createProfile.mutateAsync({ displayName: displayName.trim(), isPublic });
      }
      setHasChanges(false);
      toast.success('Profile saved!');
    } catch {
      toast.error('Failed to save profile.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onBack();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex flex-col" style={{ fontFamily: 'Cinzel, serif' }}>
        <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-[#c4b8a8]">
          <button onClick={onBack} className="text-[#8b7a68] hover:text-[#3a2a1a] transition-colors text-sm tracking-wider uppercase">
            &larr; Back
          </button>
          <h1 className="text-[#3a2a1a] text-sm tracking-[0.2em] uppercase font-semibold">Profile</h1>
          <div className="w-16" />
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-[#8b7a68] text-sm">You need to be signed in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex flex-col" style={{ fontFamily: 'Cinzel, serif' }}>
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-[#c4b8a8]">
        <button onClick={onBack} className="text-[#8b7a68] hover:text-[#3a2a1a] transition-colors text-sm tracking-wider uppercase">
          &larr; Back
        </button>
        <h1 className="text-[#3a2a1a] text-sm tracking-[0.2em] uppercase font-semibold">Profile</h1>
        <div className="w-16" />
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-lg lg:max-w-5xl mx-auto px-6 py-8 space-y-6">
          {isLoading ? (
            <div className="text-center py-8 text-[#8b7a68] text-sm">Loading...</div>
          ) : (
            <>
              {/* Signed in as — session identity sits at the top */}
              <div className="bg-white/70 rounded-lg p-4 border border-[#c4b8a8]">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-[#8b4513] flex-none" />
                  <div className="min-w-0">
                    <div className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase">Signed in as</div>
                    <div className="text-[#3a2a1a] text-sm tracking-wider truncate">{user.email}</div>
                  </div>
                </div>
              </div>

              {/* Two-column on desktop: stats on the left, games + identity on the right */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left column: stats */}
                <div className="space-y-6">

              {/* Mastery — per-difficulty progress, bars split by side played */}
              {myProfile && gameStats && (
                <div className="bg-white/70 rounded-lg p-6 border border-[#c4b8a8]">
                  <h3 className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase mb-4">Mastery</h3>

                  {/* Legend — the two colors that make up each filled bar */}
                  <div className="flex gap-4 mb-5 text-[10px] text-[#8b7a68] tracking-wide">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-2 bg-[#8b4513] rounded-sm" />
                      <span>⚔️ Attacker</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-2 bg-[#d88550] rounded-sm" />
                      <span>🛡️ Defender</span>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {(['thrall', 'karl', 'jarl'] as const).map((key) => {
                      const meta = DIFFICULTY_META[key];
                      const { wins, losses, attackerWins, defenderWins } = gameStats[key];
                      const total = wins + losses;
                      const pct = total > 0 ? Math.round((wins / total) * 100) : 0;
                      // Each segment's width is its share of total games played,
                      // so attacker + defender segments together equal the overall win rate.
                      const attackerPct = total > 0 ? (attackerWins / total) * 100 : 0;
                      const defenderPct = total > 0 ? (defenderWins / total) * 100 : 0;
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{meta.icon}</span>
                              <span className="text-[#3a2a1a] text-sm tracking-wide">{meta.label}</span>
                              <span
                                className="text-[#8b7a68] text-[10px]"
                                style={{ fontFamily: 'Cormorant Garamond, serif' }}
                              >
                                {meta.sub}
                              </span>
                            </div>
                            <div className="tabular-nums text-xs">
                              <span className="text-[#8b4513] font-bold">{wins}W</span>
                              <span className="text-[#8b7a68] mx-1">·</span>
                              <span className="text-[#8b7a68]">{losses}L</span>
                            </div>
                          </div>
                          <div className="h-2.5 bg-[#ebe4d6] rounded-full overflow-hidden border border-[#c4b8a8]/30 flex">
                            <div
                              className="h-full bg-[#8b4513] transition-all duration-500"
                              style={{ width: `${attackerPct}%` }}
                            />
                            <div
                              className="h-full bg-[#d88550] transition-all duration-500"
                              style={{ width: `${defenderPct}%` }}
                            />
                          </div>
                          <div className="text-right text-[#8b7a68] text-[10px] mt-1 tabular-nums tracking-widest">
                            {total > 0 ? `${pct}%` : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer: best time + highest difficulty conquered */}
                  <div className="mt-6 pt-4 border-t border-[#c4b8a8]/40 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[#8b7a68] text-[10px] tracking-[0.15em] uppercase mb-1">Best Time</div>
                      <div className="text-[#5c4a38] text-base tabular-nums">
                        {formatTime(myProfile.best_time_seconds)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#8b7a68] text-[10px] tracking-[0.15em] uppercase mb-1">Highest Won</div>
                      <div className="text-[#8b4513] text-base">
                        {myProfile.best_difficulty && DIFFICULTY_META[myProfile.best_difficulty as DifficultyKey]
                          ? `${DIFFICULTY_META[myProfile.best_difficulty as DifficultyKey].icon} ${DIFFICULTY_META[myProfile.best_difficulty as DifficultyKey].label}`
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Win Rate — filterable donut */}
              {gameStats && (() => {
                // Combine the difficulty filter (row 1) with the side filter (row 2)
                // to pick the right slice of stats for the donut.
                const base = gameStats[statFilter];
                const wins =
                  sideFilter === 'attackers' ? base.attackerWins
                  : sideFilter === 'defenders' ? base.defenderWins
                  : base.wins;
                const losses =
                  sideFilter === 'attackers' ? base.attackerLosses
                  : sideFilter === 'defenders' ? base.defenderLosses
                  : base.losses;
                const total = wins + losses;
                const pct = total > 0 ? Math.round((wins / total) * 100) : 0;
                const circumference = 2 * Math.PI * 66;
                const dash = (pct / 100) * circumference;
                const filterOptions: { key: StatFilter; label: string }[] = [
                  { key: 'total', label: 'All' },
                  { key: 'thrall', label: 'Thrall' },
                  { key: 'karl', label: 'Karl' },
                  { key: 'jarl', label: 'Jarl' },
                ];
                const sideOptions: { key: SideFilter; label: string }[] = [
                  { key: 'both', label: 'Both' },
                  { key: 'attackers', label: '⚔️ Attacking' },
                  { key: 'defenders', label: '🛡️ Defending' },
                ];
                return (
                  <div className="bg-white/70 rounded-lg p-6 border border-[#c4b8a8]">
                    <h3 className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase mb-5">Win Rate</h3>

                    {/* Difficulty filter */}
                    <div className="flex gap-1 bg-[#ebe4d6]/60 rounded-full p-1 border border-[#c4b8a8]/40 mb-2">
                      {filterOptions.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => setStatFilter(opt.key)}
                          className={cn(
                            'flex-1 text-[10px] tracking-[0.15em] uppercase px-2 py-1.5 rounded-full transition-colors',
                            statFilter === opt.key
                              ? 'bg-[#8b4513] text-[#f5f0e8]'
                              : 'text-[#8b7a68] hover:text-[#3a2a1a]'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Side filter */}
                    <div className="flex gap-1 bg-[#ebe4d6]/60 rounded-full p-1 border border-[#c4b8a8]/40 mb-6">
                      {sideOptions.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => setSideFilter(opt.key)}
                          className={cn(
                            'flex-1 text-[10px] tracking-[0.15em] uppercase px-2 py-1.5 rounded-full transition-colors',
                            sideFilter === opt.key
                              ? 'bg-[#8b4513] text-[#f5f0e8]'
                              : 'text-[#8b7a68] hover:text-[#3a2a1a]'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Donut */}
                    <div className="relative flex items-center justify-center">
                      <svg width="170" height="170" viewBox="0 0 170 170">
                        <circle cx="85" cy="85" r="66" fill="none" stroke="#ebe4d6" strokeWidth="18" />
                        <circle
                          cx="85"
                          cy="85"
                          r="66"
                          fill="none"
                          stroke="#8b4513"
                          strokeWidth="18"
                          strokeDasharray={`${dash} ${circumference}`}
                          transform="rotate(-90 85 85)"
                          strokeLinecap="round"
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="text-[#3a2a1a] text-4xl font-bold tabular-nums">
                          {total > 0 ? `${pct}%` : '—'}
                        </div>
                        <div className="text-[#8b7a68] text-[9px] tracking-[0.2em] uppercase mt-1">Win Rate</div>
                        <div
                          className="text-[#8b7a68] text-xs mt-1"
                          style={{ fontFamily: 'Cormorant Garamond, serif' }}
                        >
                          {total > 0 ? `${wins} of ${total} games` : 'No games yet'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

                </div>
                {/* End left column */}

                {/* Right column: recent games + identity */}
                <div className="space-y-6">

              {/* Recent Games — latest matches first */}
              <div className="bg-white/70 rounded-lg p-6 border border-[#c4b8a8]">
                <h3 className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase mb-5">Recent Games</h3>
                {!recentGames || recentGames.length === 0 ? (
                  <div
                    className="text-[#8b7a68] text-sm text-center py-6"
                    style={{ fontFamily: 'Cormorant Garamond, serif' }}
                  >
                    No games yet. Play one to see it here.
                  </div>
                ) : (
                  <div className="divide-y divide-[#c4b8a8]/30">
                    {recentGames.map((game) => {
                      const meta = DIFFICULTY_META[game.difficulty];
                      return (
                        <div
                          key={game.id}
                          className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                        >
                          <div
                            className={cn(
                              'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-none border',
                              game.won
                                ? 'bg-[#8b4513] text-[#f5f0e8] border-[#8b4513]'
                                : 'bg-[#ebe4d6] text-[#8b7a68] border-[#c4b8a8]/50'
                            )}
                          >
                            {game.won ? 'W' : 'L'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[#3a2a1a] text-sm">
                              <span className="text-base leading-none">{meta.icon}</span>
                              <span className="tracking-wide">{meta.label}</span>
                            </div>
                            <div className="text-[#8b7a68] text-[10px] tracking-[0.15em] uppercase">
                              as {game.player_side}
                            </div>
                          </div>
                          <div className="text-right flex-none">
                            <div className="text-[#5c4a38] text-xs tabular-nums">
                              {formatTime(game.duration_seconds)}
                            </div>
                            <div
                              className="text-[#8b7a68] text-[10px]"
                              style={{ fontFamily: 'Cormorant Garamond, serif' }}
                            >
                              {formatRelativeTime(game.played_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Identity — editable profile fields, below the stats */}
              <div className="bg-white/70 rounded-lg p-6 border border-[#c4b8a8] space-y-4">
                <div>
                  <label className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase block mb-1.5">
                    Display Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Choose a Viking name..."
                    value={displayName}
                    onChange={(e) => { setDisplayName(e.target.value); setHasChanges(true); }}
                    className="bg-[#f5f0e8] border-[#c4b8a8] text-[#3a2a1a] placeholder:text-[#8b7a68]/50"
                    style={{ fontFamily: 'Cormorant Garamond, serif' }}
                    maxLength={30}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[#5c4a38] text-sm">Show on public leaderboard</div>
                    <p className="text-[#8b7a68] text-xs" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                      Your name and stats will be visible to all visitors
                    </p>
                  </div>
                  <Switch
                    checked={isPublic}
                    onCheckedChange={(v) => { setIsPublic(v); setHasChanges(true); }}
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || !displayName.trim() || updateProfile.isPending || createProfile.isPending}
                  className="w-full bg-[#8b4513] hover:bg-[#a0522d] text-[#f5f0e8] font-bold tracking-wider disabled:opacity-50"
                >
                  {updateProfile.isPending || createProfile.isPending ? 'Saving...' : myProfile ? 'Save Changes' : 'Create Profile'}
                </Button>
              </div>

                </div>
                {/* End right column */}
              </div>
              {/* End two-column grid */}

              {/* Privacy notice — contextual helper for the visibility toggle above */}
              <div className="bg-[#ebe4d6]/60 rounded-lg p-4 border border-[#c4b8a8]/60">
                <h4 className="text-[#8b7a68] text-[10px] tracking-[0.2em] uppercase mb-2">Privacy</h4>
                <p
                  className="text-[#6b5d4f] text-sm leading-relaxed"
                  style={{ fontFamily: 'Cormorant Garamond, serif' }}
                >
                  We only store your email (for authentication), display name, and game statistics.
                  Your leaderboard participation is entirely opt-in &mdash; toggle it off anytime
                  to hide your profile from other visitors.{' '}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#8b4513] underline underline-offset-2 hover:text-[#a0522d]"
                  >
                    Read our full privacy policy
                  </a>
                </p>
              </div>

              {/* Admin access */}
              {myProfile?.is_admin && (
                <div className="bg-[#8b4513]/5 rounded-lg p-4 border border-[#8b4513]/20">
                  <Button
                    onClick={onShowAdmin}
                    className="w-full bg-[#3a2a1a] hover:bg-[#5c4a38] text-[#f5f0e8] font-bold tracking-wider"
                  >
                    Admin Panel
                  </Button>
                  <p className="text-[#8b7a68] text-xs text-center mt-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    Manage users, export data, and administer the site.
                  </p>
                </div>
              )}

              {/* Sign out */}
              <div className="pt-2">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 text-[#8b7a68] hover:text-[#3a2a1a] transition-colors text-sm tracking-wider"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
