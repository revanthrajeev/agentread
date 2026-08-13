-- AgentRead — schema v6 (white-label shared reports)
-- Run in the Supabase SQL Editor AFTER schema_v5.sql.
-- Safe to re-run.
--
-- Agency use case from the competitive research (ZipTie-style white-label reporting):
-- an agency running AgentRead on a client's site wants to hand over the report without
-- "AgentRead" branding on it. Nullable — every existing share keeps showing full branding
-- until a user explicitly sets an org name on their own share.

alter table public.audit_shares add column if not exists white_label_org text;
