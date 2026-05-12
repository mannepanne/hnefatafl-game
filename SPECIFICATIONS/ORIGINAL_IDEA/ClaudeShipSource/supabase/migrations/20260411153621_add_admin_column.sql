-- Add is_admin flag to leaderboard_profiles
alter table public.leaderboard_profiles
  add column is_admin boolean not null default false;

-- Set admin for magnus.hultberg@gmail.com
update public.leaderboard_profiles
set is_admin = true
where user_id = (
  select id from auth.users where email = 'magnus.hultberg@gmail.com' limit 1
);

-- RLS: admins can read all profiles (needed for admin panel)
create policy "Admins can read all profiles"
  on public.leaderboard_profiles
  for select
  using (
    exists (
      select 1 from public.leaderboard_profiles lp
      where lp.user_id = (select auth.uid()) and lp.is_admin = true
    )
  );

