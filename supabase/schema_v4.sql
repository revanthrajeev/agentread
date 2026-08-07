-- AgentRead — schema v4 (multi-gateway billing: Stripe + PayPal + Razorpay)
-- Run in the Supabase SQL Editor AFTER schema.sql, schema_v2.sql and schema_v3.sql.
-- Safe to re-run.

-- ------------------------------------------------------------------
-- 1. Provider-agnostic billing columns on profiles
--
--    schema_v2 modelled billing as Stripe-shaped (stripe_customer_id, stripe_subscription_id).
--    With three gateways the identifiers need to be generic. The Stripe-specific columns are
--    kept and still written, because Stripe's hosted billing portal is looked up by them and
--    dropping them would break every existing customer's "manage subscription" button.
-- ------------------------------------------------------------------
alter table public.profiles add column if not exists billing_provider text;
alter table public.profiles add column if not exists provider_customer_id text;
alter table public.profiles add column if not exists provider_subscription_id text;
alter table public.profiles add column if not exists billing_currency text not null default 'USD';

create index if not exists profiles_provider_customer_idx
  on public.profiles (provider_customer_id);
create index if not exists profiles_provider_subscription_idx
  on public.profiles (provider_subscription_id);

-- Backfill existing Stripe customers into the generic columns so a webhook arriving after
-- this migration can still resolve them.
update public.profiles
   set billing_provider = coalesce(billing_provider, 'stripe'),
       provider_customer_id = coalesce(provider_customer_id, stripe_customer_id),
       provider_subscription_id = coalesce(provider_subscription_id, stripe_subscription_id)
 where stripe_customer_id is not null;

-- ------------------------------------------------------------------
-- 2. Webhook idempotency
--
--    All three gateways retry on any non-2xx response, and all three can deliver the same
--    event twice unprompted. The dangerous case is a renewal: replaying it would grant a
--    second month of Autofix credits, which cost real money at the Anthropic API.
--
--    The primary key is the guard. A handler claims an event by inserting here; a duplicate
--    delivery loses the insert and skips its side effects. Doing this as a read-then-write in
--    application code would let two concurrent deliveries both pass the check.
-- ------------------------------------------------------------------
create table if not exists public.billing_events (
  provider text not null,
  event_id text not null,
  event_type text,
  user_id uuid references auth.users (id) on delete set null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

alter table public.billing_events enable row level security;
-- No policies: written only by the service-role client inside verified webhook handlers.
-- There is nothing here a user needs to read.

create index if not exists billing_events_received_idx
  on public.billing_events (received_at desc);

-- ------------------------------------------------------------------
-- 3. Unified payment ledger
--
--    Revenue arrives in three dashboards and two currencies. Without one table, answering
--    "what did we make last month" means adding three reports by hand — and that number is
--    the one an investor or accelerator asks for first.
--
--    `amount_minor` is in the smallest currency unit (paise, cents) because that is what
--    every gateway reports; `amount_usd` is a reporting convenience at a fixed rate and is
--    never used to price a checkout.
-- ------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  provider text not null,
  provider_payment_id text not null,
  amount_minor bigint not null,
  currency text not null,
  amount_usd numeric(12, 2),
  plan text,
  status text not null,
  created_at timestamptz not null default now(),
  -- The ledger's own idempotency: a replayed payment event cannot double-count revenue.
  unique (provider, provider_payment_id)
);

alter table public.payments enable row level security;

-- A user may read their own payment history; nobody may write from the client.
drop policy if exists "payments are readable by owner" on public.payments;
create policy "payments are readable by owner"
  on public.payments for select
  using (auth.uid() = user_id);

create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists payments_created_idx on public.payments (created_at desc);

-- ------------------------------------------------------------------
-- 4. Revenue reporting
--
--    Monthly revenue per gateway, normalised to USD. This is the query that answers
--    "is this working", so it lives in the database rather than being re-derived ad hoc.
-- ------------------------------------------------------------------
create or replace view public.revenue_by_month as
select
  date_trunc('month', created_at)          as month,
  provider,
  currency,
  count(*)                                 as payments,
  sum(amount_minor) / 100.0                as gross_in_currency,
  sum(amount_usd)                          as gross_usd
from public.payments
where status in ('paid', 'succeeded', 'captured', 'completed')
group by 1, 2, 3
order by 1 desc, 6 desc;

-- Active paying customers per gateway — the denominator for churn and ARPU.
create or replace view public.subscribers_by_provider as
select
  billing_provider                         as provider,
  billing_currency                         as currency,
  plan,
  count(*)                                 as subscribers
from public.profiles
where plan is not null
  and plan <> 'free'
  and billing_provider is not null
group by 1, 2, 3
order by 4 desc;
