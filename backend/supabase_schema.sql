create extension if not exists pgcrypto;

create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('active', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists league_agents (
  id text primary key,
  persona_name text not null unique,
  display_title text not null,
  accent text not null,
  avatar_url text,
  default_provider text not null,
  default_model text not null,
  persona_contract jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references seasons(id),
  league_type text not null check (league_type in ('official', 'custom')),
  game_type text not null check (game_type in ('debate', 'joke', 'scenario')),
  status text not null check (status in ('queued', 'running', 'judging', 'completed', 'failed')),
  prompt text not null,
  topic text,
  winner text,
  summary text,
  judge_model text,
  participant_model text,
  total_estimated_requests int not null default 0,
  failure_reason text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'matches'
      and constraint_name = 'matches_status_check'
  ) then
    alter table matches drop constraint matches_status_check;
  end if;

  alter table matches
    add constraint matches_status_check
    check (status in ('queued', 'running', 'judging', 'completed', 'failed'));
end $$;

create table if not exists match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  persona_name text not null,
  seed int not null,
  final_rank int,
  total_score int not null default 0,
  points_awarded int not null default 0,
  bonus_points int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists match_rounds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  round_index int not null,
  round_type text not null,
  pair_key text,
  prompt text not null,
  entries jsonb not null,
  judge_result jsonb,
  created_at timestamptz not null default now()
);

create table if not exists leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references seasons(id),
  persona_name text not null,
  game_type text not null,
  matches_played int not null default 0,
  wins int not null default 0,
  podiums int not null default 0,
  total_points int not null default 0,
  average_score numeric not null default 0,
  current_streak int not null default 0,
  updated_at timestamptz not null default now(),
  unique (season_id, persona_name, game_type)
);

create table if not exists api_usage_ledger (
  id uuid primary key default gen_random_uuid(),
  usage_date date not null,
  provider text not null,
  model text not null,
  request_count int not null default 0,
  estimated_input_tokens int not null default 0,
  estimated_output_tokens int not null default 0,
  last_429_at timestamptz,
  paused_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (usage_date, provider, model)
);

create table if not exists league_locks (
  id text primary key,
  locked_by text,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

insert into seasons (name, starts_at, ends_at, status)
select 'Season 1', date_trunc('month', now()), date_trunc('month', now()) + interval '1 month', 'active'
where not exists (select 1 from seasons where status = 'active');

insert into league_agents (id, persona_name, display_title, accent, default_provider, default_model, persona_contract)
values
  ('aria', 'Aria', 'Empathetic Systems Thinker', 'aria', 'groq', 'llama-3.3-70b-versatile', '{"voice":"Warm, vivid, socially aware, emotionally sharp."}'::jsonb),
  ('lex', 'Lex', 'Tactical Optimizer', 'lex', 'groq', 'llama-3.1-8b-instant', '{"voice":"Blunt, efficient, data-first, slightly smug."}'::jsonb),
  ('sage', 'Sage', 'Paradox Philosopher', 'sage', 'groq', 'llama-3.1-8b-instant', '{"voice":"Calm, reflective, premise-breaking, surprising."}'::jsonb),
  ('rex', 'Rex', 'Old-School Competitor', 'rex', 'groq', 'llama-3.1-8b-instant', '{"voice":"Bold, practical, forceful, old-school."}'::jsonb)
on conflict (id) do nothing;

insert into league_locks (id, locked_by, locked_until)
values
  ('official_match_generation', null, null),
  ('groq_provider', null, null),
  ('gemini_provider', null, null)
on conflict (id) do nothing;
