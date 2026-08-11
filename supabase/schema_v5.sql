-- AgentRead — schema v5 (service_role grants)
-- Run in the Supabase SQL Editor AFTER schema.sql, schema_v2.sql, schema_v3.sql, schema_v4.sql.
-- Safe to re-run.
--
-- schema.sql through schema_v4.sql granted table access to `authenticated` and `anon` but
-- never to `service_role` — a table created via the raw SQL Editor (not the dashboard Table
-- Editor) has no default grants for any role, including service_role. RLS is bypassed for
-- service_role, but the base table GRANT is checked first regardless of RLS, so every
-- server-side code path using SUPABASE_SERVICE_ROLE_KEY (webhook handlers, admin/dashboard
-- reads, cron jobs) has been failing with 42501 permission denied since the schema was
-- first created.
--
-- Granted on the whole schema plus a default-privileges rule so this doesn't recur for any
-- table added later without a matching explicit grant.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on routines to service_role;
