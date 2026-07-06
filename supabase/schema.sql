-- AgentRead — Supabase schema
-- Run this in your Supabase project's SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: uses "if not exists" / "or replace" throughout.

-- ------------------------------------------------------------------
-- 1. Profiles — one row per authenticated user (mirrors auth.users)
-- ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  plan text not null default 'developer', -- developer | read_api | sdk_control | enterprise
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are viewable by owner" on public.profiles;
create policy "profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles are updatable by owner" on public.profiles;
create policy "profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up (incl. via Google OAuth)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------------
-- 2. API keys — issued per user, used by the Read API / MCP server
-- ------------------------------------------------------------------
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'default',
  key_prefix text not null,       -- e.g. "sk-ar-7f2a" (safe to display)
  key_hash text not null,         -- sha-256 of the full key; never store plaintext
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked boolean not null default false
);

alter table public.api_keys enable row level security;

drop policy if exists "keys are managed by owner" on public.api_keys;
create policy "keys are managed by owner"
  on public.api_keys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------------
-- 3. Reads — every URL read/scored, powers the dashboard + playground history
-- ------------------------------------------------------------------
create table if not exists public.reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  url text not null,
  agent text default 'playground',        -- ClaudeBot, GPTBot, playground, etc.
  html_bytes integer,
  markdown_bytes integer,
  tokens_before integer,
  tokens_after integer,
  read_score integer,                     -- 0-100
  hallucination_risk text,                -- low | medium | high
  flags jsonb default '[]'::jsonb,
  latency_ms integer,
  cache_state text default 'MISS',        -- HIT | MISS
  created_at timestamptz not null default now()
);

alter table public.reads enable row level security;

drop policy if exists "reads are managed by owner" on public.reads;
create policy "reads are managed by owner"
  on public.reads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists reads_user_created_idx on public.reads (user_id, created_at desc);

-- ------------------------------------------------------------------
-- 4. Waitlist — public landing-page email capture (no auth required)
-- ------------------------------------------------------------------
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

drop policy if exists "anyone can join the waitlist" on public.waitlist;
create policy "anyone can join the waitlist"
  on public.waitlist for insert
  with check (true);

-- No select policy on waitlist: only accessible via the Supabase dashboard
-- or a service-role key on the server — public visitors can insert, not read.
