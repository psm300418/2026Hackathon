create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  confidence_level text not null
    check (confidence_level in ('strong', 'medium', 'weak', 'data_insufficient')),
  summary text not null,
  limitations jsonb not null default '[]'::jsonb,
  next_records_to_add jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.analysis_findings (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  finding_type text not null check (finding_type in ('positive_suspect', 'negative_suspect')),
  ingredient_id uuid references public.ingredients(id) on delete set null,
  ingredient_name text not null,
  evidence_level text not null
    check (evidence_level in ('strong', 'medium', 'weak', 'data_insufficient')),
  reason text not null,
  supporting_logs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analysis_runs_user_id_requested_at_idx
  on public.analysis_runs(user_id, requested_at desc);
create index if not exists analysis_findings_analysis_run_id_idx
  on public.analysis_findings(analysis_run_id);

alter table public.analysis_runs enable row level security;
alter table public.analysis_findings enable row level security;

drop policy if exists "Users can manage their analysis runs" on public.analysis_runs;
create policy "Users can manage their analysis runs"
on public.analysis_runs
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their analysis findings" on public.analysis_findings;
create policy "Users can manage their analysis findings"
on public.analysis_findings
for all
to authenticated
using (
  exists (
    select 1 from public.analysis_runs
    where analysis_runs.id = analysis_findings.analysis_run_id
      and analysis_runs.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.analysis_runs
    where analysis_runs.id = analysis_findings.analysis_run_id
      and analysis_runs.user_id = auth.uid()
  )
);
