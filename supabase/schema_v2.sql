-- AgentRead — schema v2 (Audit / llms.txt / Watch / Agent analytics / Billing)
-- Run this in the Supabase SQL Editor AFTER schema.sql.
-- Safe to re-run: "if not exists" / "or replace" throughout.

-- ------------------------------------------------------------------
-- 1. Audits — one row per site-wide crawl+score run
-- ------------------------------------------------------------------
create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  root_url text not null,
  host text not null,
  status text not null default 'running',   -- running | complete | failed
  pages_requested integer not null default 10,
  pages_crawled integer not null default 0,
  avg_score integer,                        -- 0-100, mean ReadScore across crawled pages
  min_score integer,
  max_score integer,
  total_html_bytes bigint default 0,
  total_markdown_bytes bigint default 0,
  tokens_before bigint default 0,
  tokens_after bigint default 0,
  has_llms_txt boolean default false,
  discovery text,                           -- sitemap | llms.txt | links | seed
  top_issues jsonb default '[]'::jsonb,     -- [{ text, severity, count }] rolled up across pages
  error text,
  duration_ms integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.audits enable row level security;

drop policy if exists "audits are managed by owner" on public.audits;
create policy "audits are managed by owner"
  on public.audits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.audits to authenticated;

create index if not exists audits_user_created_idx on public.audits (user_id, created_at desc);
create index if not exists audits_host_idx on public.audits (host);

-- ------------------------------------------------------------------
-- 2. Audit pages — per-URL result rows belonging to an audit
-- ------------------------------------------------------------------
create table if not exists public.audit_pages (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  url text not null,
  title text,
  read_score integer,
  hallucination_risk text,
  html_bytes integer,
  markdown_bytes integer,
  tokens_before integer,
  tokens_after integer,
  flags jsonb default '[]'::jsonb,
  markdown text,                            -- retained so llms-full.txt can be regenerated
  latency_ms integer,
  ok boolean not null default true,
  error text,
  created_at timestamptz not null default now()
);

alter table public.audit_pages enable row level security;

drop policy if exists "audit pages are managed by owner" on public.audit_pages;
create policy "audit pages are managed by owner"
  on public.audit_pages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.audit_pages to authenticated;

create index if not exists audit_pages_audit_idx on public.audit_pages (audit_id);

-- ------------------------------------------------------------------
-- 3. Watches — scheduled re-audits + score-regression alerting
-- ------------------------------------------------------------------
create table if not exists public.watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  root_url text not null,
  host text not null,
  frequency text not null default 'weekly',  -- daily | weekly
  pages integer not null default 10,
  alert_email text,
  webhook_url text,
  alert_threshold integer not null default 5, -- alert when avg score drops by >= this many points
  active boolean not null default true,
  last_run_at timestamptz,
  last_score integer,
  last_audit_id uuid references public.audits (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.watches enable row level security;

drop policy if exists "watches are managed by owner" on public.watches;
create policy "watches are managed by owner"
  on public.watches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.watches to authenticated;

create index if not exists watches_due_idx on public.watches (active, last_run_at);

-- ------------------------------------------------------------------
-- 4. Watch events — the score history + alert log behind a watch
-- ------------------------------------------------------------------
create table if not exists public.watch_events (
  id uuid primary key default gen_random_uuid(),
  watch_id uuid not null references public.watches (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  audit_id uuid references public.audits (id) on delete set null,
  score integer,
  previous_score integer,
  delta integer,
  alerted boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

alter table public.watch_events enable row level security;

drop policy if exists "watch events are managed by owner" on public.watch_events;
create policy "watch events are managed by owner"
  on public.watch_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.watch_events to authenticated;

create index if not exists watch_events_watch_idx on public.watch_events (watch_id, created_at desc);

-- ------------------------------------------------------------------
-- 5. Agent hits — which AI crawlers actually hit a Serve-enabled site
--    This is the data no competitor has: real agent traffic, not estimates.
-- ------------------------------------------------------------------
create table if not exists public.agent_hits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  host text not null,
  path text not null,
  crawler text not null,              -- GPTBot | ClaudeBot | PerplexityBot | ...
  user_agent text,
  read_score integer,
  markdown_bytes integer,
  tokens_saved integer,
  served boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.agent_hits enable row level security;

drop policy if exists "agent hits are managed by owner" on public.agent_hits;
create policy "agent hits are managed by owner"
  on public.agent_hits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.agent_hits to authenticated;

create index if not exists agent_hits_user_created_idx on public.agent_hits (user_id, created_at desc);
create index if not exists agent_hits_crawler_idx on public.agent_hits (crawler);

-- ------------------------------------------------------------------
-- 6. Usage — monthly metered counters, one row per user per period
--    Quota enforcement reads this; billing reports off it.
-- ------------------------------------------------------------------
create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null,                -- 'YYYY-MM'
  reads integer not null default 0,
  audits integer not null default 0,
  pages_crawled integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, period)
);

alter table public.usage_counters enable row level security;

drop policy if exists "usage is viewable by owner" on public.usage_counters;
create policy "usage is viewable by owner"
  on public.usage_counters for select
  using (auth.uid() = user_id);

-- Every write to this table actually goes through increment_usage() below via the
-- service-role client, which bypasses grants entirely — this SELECT grant exists only
-- so the policy above is reachable if a user-session client ever queries it directly.
grant select on public.usage_counters to authenticated;

-- Atomic increment: avoids the read-modify-write race two concurrent API calls would hit.
create or replace function public.increment_usage(
  p_user_id uuid,
  p_period text,
  p_reads integer default 0,
  p_audits integer default 0,
  p_pages integer default 0
)
returns public.usage_counters
language plpgsql
security definer set search_path = public
as $$
declare
  result public.usage_counters;
begin
  insert into public.usage_counters (user_id, period, reads, audits, pages_crawled, updated_at)
  values (p_user_id, p_period, p_reads, p_audits, p_pages, now())
  on conflict (user_id, period) do update
    set reads         = public.usage_counters.reads + excluded.reads,
        audits        = public.usage_counters.audits + excluded.audits,
        pages_crawled = public.usage_counters.pages_crawled + excluded.pages_crawled,
        updated_at    = now()
  returning * into result;
  return result;
end;
$$;

-- ------------------------------------------------------------------
-- 7. Billing — Stripe subscription mirror
-- ------------------------------------------------------------------
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists plan_status text default 'active';
alter table public.profiles add column if not exists plan_period_end timestamptz;

create index if not exists profiles_stripe_customer_idx on public.profiles (stripe_customer_id);

-- ------------------------------------------------------------------
-- 8. Public audit shares — a scored report anyone can view by token.
--    This is the growth loop: an audit is worth sharing, and the share page sells the product.
-- ------------------------------------------------------------------
create table if not exists public.audit_shares (
  token text primary key,
  audit_id uuid not null references public.audits (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.audit_shares enable row level security;

-- Shares are read through a service-role client on the server (the whole point is that an
-- unauthenticated visitor can view them), so no public select policy is granted here.
