import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_wins: number;
  total_losses: number;
  best_time_seconds: number | null;
  best_difficulty: string | null;
}

interface ProfileData {
  display_name: string;
  is_public: boolean;
  is_admin: boolean;
  total_wins: number;
  total_losses: number;
  best_time_seconds: number | null;
  best_difficulty: string | null;
}

export type DifficultyKey = 'thrall' | 'karl' | 'jarl';

interface DifficultyStats {
  wins: number;
  losses: number;
  // Wins and losses broken down by the side the player was on. Lets the
  // Win Rate donut filter by side without re-querying, and lets the
  // Mastery bar color each filled segment by the side that earned it.
  attackerWins: number;
  attackerLosses: number;
  defenderWins: number;
  defenderLosses: number;
}

export interface MyGameStats {
  total: DifficultyStats;
  thrall: DifficultyStats;
  karl: DifficultyStats;
  jarl: DifficultyStats;
}

function emptyDifficultyStats(): DifficultyStats {
  return {
    wins: 0,
    losses: 0,
    attackerWins: 0,
    attackerLosses: 0,
    defenderWins: 0,
    defenderLosses: 0,
  };
}

function emptyStats(): MyGameStats {
  return {
    total: emptyDifficultyStats(),
    thrall: emptyDifficultyStats(),
    karl: emptyDifficultyStats(),
    jarl: emptyDifficultyStats(),
  };
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from('leaderboard_profiles')
        .select('user_id, display_name, total_wins, total_losses, best_time_seconds, best_difficulty')
        .eq('is_public', true)
        .order('total_wins', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyGameStats(userId: string | null) {
  return useQuery({
    queryKey: ['my-game-stats', userId],
    queryFn: async (): Promise<MyGameStats> => {
      if (!userId) return emptyStats();
      const { data, error } = await supabase
        .from('game_results')
        .select('won, difficulty, player_side')
        .eq('user_id', userId);

      if (error) throw error;

      const stats = emptyStats();
      for (const row of data ?? []) {
        const key = row.difficulty as DifficultyKey;
        if (!stats[key]) continue;
        const isAttacker = row.player_side === 'attackers';
        const isDefender = row.player_side === 'defenders';
        if (row.won) {
          stats[key].wins++;
          stats.total.wins++;
          if (isAttacker) {
            stats[key].attackerWins++;
            stats.total.attackerWins++;
          } else if (isDefender) {
            stats[key].defenderWins++;
            stats.total.defenderWins++;
          }
        } else {
          stats[key].losses++;
          stats.total.losses++;
          if (isAttacker) {
            stats[key].attackerLosses++;
            stats.total.attackerLosses++;
          } else if (isDefender) {
            stats[key].defenderLosses++;
            stats.total.defenderLosses++;
          }
        }
      }
      return stats;
    },
    enabled: !!userId,
  });
}

export interface RecentGame {
  id: string;
  won: boolean;
  player_side: 'attackers' | 'defenders';
  difficulty: DifficultyKey;
  duration_seconds: number;
  played_at: string;
}

export function useMyRecentGames(userId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['my-recent-games', userId, limit],
    queryFn: async (): Promise<RecentGame[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('game_results')
        .select('id, won, player_side, difficulty, duration_seconds, played_at')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as RecentGame[];
    },
    enabled: !!userId,
  });
}

export function useMyProfile(userId: string | null) {
  return useQuery({
    queryKey: ['my-profile', userId],
    queryFn: async (): Promise<ProfileData | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('leaderboard_profiles')
        .select('display_name, is_public, is_admin, total_wins, total_losses, best_time_seconds, best_difficulty')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ displayName, isPublic }: { displayName: string; isPublic: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('leaderboard_profiles')
        .insert({
          user_id: user.id,
          display_name: displayName,
          is_public: isPublic,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ displayName, isPublic }: { displayName: string; isPublic: boolean }) => {
      const { error } = await supabase
        .from('leaderboard_profiles')
        .update({
          display_name: displayName,
          is_public: isPublic,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

export function useRecordGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      won: boolean;
      playerSide: string;
      difficulty: string;
      durationSeconds: number;
      moveCount: number;
    }) => {
      const { error } = await supabase.rpc('record_game_result', {
        p_won: params.won,
        p_player_side: params.playerSide,
        p_difficulty: params.difficulty,
        p_duration_seconds: params.durationSeconds,
        p_move_count: params.moveCount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['my-game-stats'] });
      queryClient.invalidateQueries({ queryKey: ['my-recent-games'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

export function useIncrementAnonymousGames() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('increment_anonymous_games');
      if (error) throw error;
    },
  });
}
