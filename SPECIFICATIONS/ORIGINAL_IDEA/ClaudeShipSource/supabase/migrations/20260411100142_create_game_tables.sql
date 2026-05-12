
-- Track individual game results for registered users
create table public.game_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  won boolean not null,
  player_side text not null check (player_side in ('attackers', 'defenders')),
  difficulty text not null check (difficulty in ('thrall', 'karl', 'jarl')),
  duration_seconds integer not null,
  move_count integer not null,
  played_at timestamptz default now() not null
);

-- Leaderboard profile for registered users
create table public.leaderboard_profiles (
  user_id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  is_public boolean default false not null,
  total_wins integer default 0 not null,
  total_losses integer default 0 not null,
  best_time_seconds integer,
  best_difficulty text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Anonymous game counter (simple aggregate stats)
create table public.site_stats (
  id integer primary key default 1 check (id = 1),
  total_anonymous_games integer default 0 not null,
  total_registered_games integer default 0 not null,
  updated_at timestamptz default now() not null
);

-- Insert initial stats row
insert into public.site_stats (id) values (1);

-- Enable RLS
alter table public.game_results enable row level security;
alter table public.leaderboard_profiles enable row level security;
alter table public.site_stats enable row level security;

-- RLS Policies for game_results
create policy "Users can view their own results"
  on public.game_results for select
  using (auth.uid() = user_id);

create policy "Users can insert their own results"
  on public.game_results for insert
  with check (auth.uid() = user_id);

-- RLS Policies for leaderboard_profiles
create policy "Anyone can view public profiles"
  on public.leaderboard_profiles for select
  using (is_public = true);

create policy "Users can view their own profile"
  on public.leaderboard_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on public.leaderboard_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.leaderboard_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS Policies for site_stats (anyone can read, only server/service role can write)
create policy "Anyone can read site stats"
  on public.site_stats for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can increment stats"
  on public.site_stats for update
  to anon, authenticated
  using (true)
  with check (true);

-- Function to increment anonymous game counter
create or replace function public.increment_anonymous_games()
returns void
language sql
security definer
as $$
  update public.site_stats 
  set total_anonymous_games = total_anonymous_games + 1,
      updated_at = now()
  where id = 1;
$$;

-- Function to record a game result and update leaderboard
create or replace function public.record_game_result(
  p_won boolean,
  p_player_side text,
  p_difficulty text,
  p_duration_seconds integer,
  p_move_count integer
)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_difficulty_rank integer;
  v_current_best_rank integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Insert game result
  insert into public.game_results (user_id, won, player_side, difficulty, duration_seconds, move_count)
  values (v_user_id, p_won, p_player_side, p_difficulty, p_duration_seconds, p_move_count);

  -- Update leaderboard profile
  if p_won then
    -- Difficulty ranking: jarl=3, karl=2, thrall=1
    v_difficulty_rank := case p_difficulty
      when 'jarl' then 3
      when 'karl' then 2
      when 'thrall' then 1
    end;

    update public.leaderboard_profiles
    set total_wins = total_wins + 1,
        best_time_seconds = case
          when best_time_seconds is null then p_duration_seconds
          when p_duration_seconds < best_time_seconds then p_duration_seconds
          else best_time_seconds
        end,
        best_difficulty = case
          when best_difficulty is null then p_difficulty
          when v_difficulty_rank > coalesce(
            case best_difficulty
              when 'jarl' then 3
              when 'karl' then 2
              when 'thrall' then 1
            end, 0
          ) then p_difficulty
          else best_difficulty
        end,
        updated_at = now()
    where user_id = v_user_id;
  else
    update public.leaderboard_profiles
    set total_losses = total_losses + 1,
        updated_at = now()
    where user_id = v_user_id;
  end if;

  -- Increment registered game counter
  update public.site_stats 
  set total_registered_games = total_registered_games + 1,
      updated_at = now()
  where id = 1;
end;
$$;

