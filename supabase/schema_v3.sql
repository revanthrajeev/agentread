-- AgentRead — schema v3 (Autofix: GitHub connections, fix jobs, credits)
-- Run in the Supabase SQL Editor AFTER schema.sql and schema_v2.sql.
-- Safe to re-run.

-- ------------------------------------------------------------------
-- 1. GitHub connections — one repo the user has authorised us to open PRs against
--
--    `token_ciphertext` is AES-256-GCM, encrypted server-side before it ever reaches
--    Postgres (see src/lib/crypto/secrets.ts). The database never holds a usable token,
--    so a database compromise alone does not yield push access to customer repos.
-- ------------------------------------------------------------------
create table if not exists public.github_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  owner text not null,
  repo text not null,
  default_branch text,
  framework text,
  token_ciphertext text not null,
  token_iv text not null,
  token_tag text not null,
  -- Last 4 chars only, so the UI can show which token is connected without storing it.
  token_hint text,
  connected_at timestamptz not null default now(),
  last_used_at timestamptz,
  active boolean not null default true,
  unique (user_id, owner, repo)
);

alter table public.github_connections enable row level security;

drop policy if exists "github connections are managed by owner" on public.github_connections;
create policy "github connections are managed by owner"
  on public.github_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.github_connections to authenticated;

-- ------------------------------------------------------------------
-- 2. Fix jobs — one Autofix run against one audit
-- ------------------------------------------------------------------
create table if not exists public.fix_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  audit_id uuid references public.audits (id) on delete set null,
  connection_id uuid references public.github_connections (id) on delete set null,
  host text,
  status text not null default 'running',        -- running | complete | failed
  -- Plan shape, recorded so margin can be analysed per job without re-planning.
  deterministic_count integer default 0,
  llm_count integer default 0,
  advisory_count integer default 0,
  fixes_applied integer default 0,
  fixes_skipped integer default 0,
  -- Unit economics. cost_usd is what we actually spent; credits_consumed is what we billed.
  cost_usd numeric(10, 4) default 0,
  credits_consumed integer default 0,
  revenue_usd numeric(10, 4) default 0,
  pr_url text,
  pr_number integer,
  branch text,
  stopped_early boolean default false,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.fix_jobs enable row level security;

drop policy if exists "fix jobs are managed by owner" on public.fix_jobs;
create policy "fix jobs are managed by owner"
  on public.fix_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.fix_jobs to authenticated;

create index if not exists fix_jobs_user_created_idx on public.fix_jobs (user_id, created_at desc);

-- ------------------------------------------------------------------
-- 3. Fix attempts — per-issue outcome, with the token accounting behind it
-- ------------------------------------------------------------------
create table if not exists public.fix_attempts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.fix_jobs (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  issue_key text not null,
  strategy text not null,                        -- deterministic | llm | advisory
  title text,
  ok boolean not null default false,
  files_changed integer default 0,
  explanation text,
  error text,
  input_tokens integer default 0,
  output_tokens integer default 0,
  cache_read_tokens integer default 0,
  cache_write_tokens integer default 0,
  cost_usd numeric(10, 4) default 0,
  created_at timestamptz not null default now()
);

alter table public.fix_attempts enable row level security;

drop policy if exists "fix attempts are managed by owner" on public.fix_attempts;
create policy "fix attempts are managed by owner"
  on public.fix_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.fix_attempts to authenticated;

create index if not exists fix_attempts_job_idx on public.fix_attempts (job_id);
create index if not exists fix_attempts_strategy_idx on public.fix_attempts (strategy);

-- ------------------------------------------------------------------
-- 4. Autofix credits — metered separately from reads/audits
--    Only LLM-backed fixes consume a credit; deterministic fixes are always free.
-- ------------------------------------------------------------------
alter table public.profiles add column if not exists autofix_credits integer not null default 0;

-- Atomic decrement that refuses to go negative, so two concurrent jobs can't both
-- spend the last credit. Returns the remaining balance, or -1 when there wasn't enough.
create or replace function public.consume_autofix_credits(
  p_user_id uuid,
  p_amount integer
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  remaining integer;
begin
  update public.profiles
     set autofix_credits = autofix_credits - p_amount
   where id = p_user_id
     and autofix_credits >= p_amount
  returning autofix_credits into remaining;

  if not found then
    return -1;
  end if;

  return remaining;
end;
$$;

create or replace function public.grant_autofix_credits(
  p_user_id uuid,
  p_amount integer
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  total integer;
begin
  update public.profiles
     set autofix_credits = autofix_credits + p_amount
   where id = p_user_id
  returning autofix_credits into total;
  return coalesce(total, 0);
end;
$$;

-- ------------------------------------------------------------------
-- 5. Margin view — gross margin per job, so pricing is measured not assumed
-- ------------------------------------------------------------------
create or replace view public.fix_job_margin as
select
  j.id,
  j.user_id,
  j.host,
  j.created_at,
  j.credits_consumed,
  j.revenue_usd,
  j.cost_usd,
  j.revenue_usd - j.cost_usd as gross_profit_usd,
  case
    when j.revenue_usd > 0 then round(((j.revenue_usd - j.cost_usd) / j.revenue_usd) * 100, 1)
    else null
  end as gross_margin_pct,
  j.deterministic_count,
  j.llm_count
from public.fix_jobs j
where j.status = 'complete';
