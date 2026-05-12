-- Drop the self-referencing admin policy that causes RLS recursion
drop policy "Admins can read all profiles" on public.leaderboard_profiles;

