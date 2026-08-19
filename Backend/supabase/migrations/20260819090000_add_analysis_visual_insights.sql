alter table public.analysis_runs
  add column if not exists trend_points jsonb not null default '[]'::jsonb,
  add column if not exists notable_events jsonb not null default '[]'::jsonb,
  add column if not exists factor_summaries jsonb not null default '[]'::jsonb;
