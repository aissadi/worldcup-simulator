create extension if not exists pgcrypto;

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  champion text,
  picks jsonb not null,
  correct_picks integer default 0,
  total_completed_matches integer default 0,
  created_at timestamptz default now()
);

create index if not exists predictions_leaderboard_idx
  on public.predictions (correct_picks desc, created_at asc);
