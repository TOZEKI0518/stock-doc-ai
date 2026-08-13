-- Run once in Supabase SQL Editor BEFORE deploying the app update.
alter table public.etf_snapshots add column if not exists short_term_score numeric;
alter table public.etf_snapshots add column if not exists short_term_signal text;
alter table public.etf_snapshots add column if not exists short_term_breakdown jsonb not null default '{}'::jsonb;
alter table public.etf_snapshots add column if not exists short_term_overheat_penalty numeric;
alter table public.etf_snapshots add column if not exists short_term_score_version text;
create index if not exists etf_snapshots_short_term_score_idx on public.etf_snapshots (snapshot_date desc, short_term_score desc);
