create table if not exists public.skin_type_questionnaires (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  title text not null,
  description text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skin_type_questions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.skin_type_questionnaires(id) on delete cascade,
  dimension text not null check (
    dimension in (
      'oil_dry',
      'sensitive_resistant',
      'pigmented_non_pigmented',
      'wrinkled_tight'
    )
  ),
  question_key text not null,
  question_text text not null,
  display_order integer not null check (display_order > 0),
  special_rule text,
  created_at timestamptz not null default now(),
  unique (questionnaire_id, question_key),
  unique (questionnaire_id, display_order)
);

create table if not exists public.skin_type_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.skin_type_questions(id) on delete cascade,
  option_key text not null,
  option_text text not null,
  score numeric(4, 1) not null,
  display_order integer not null check (display_order > 0),
  created_at timestamptz not null default now(),
  unique (question_id, option_key),
  unique (question_id, display_order)
);

create table if not exists public.skin_type_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  questionnaire_id uuid not null references public.skin_type_questionnaires(id),
  skin_type_code text not null check (skin_type_code ~ '^[OD][SR][PN][WT]$'),
  oil_dry_code text not null check (oil_dry_code in ('O', 'D')),
  oil_dry_score numeric(5, 1) not null,
  sensitive_resistant_code text not null check (sensitive_resistant_code in ('S', 'R')),
  sensitive_resistant_score numeric(5, 1) not null,
  pigmented_non_pigmented_code text not null check (pigmented_non_pigmented_code in ('P', 'N')),
  pigmented_non_pigmented_score numeric(5, 1) not null,
  wrinkled_tight_code text not null check (wrinkled_tight_code in ('W', 'T')),
  wrinkled_tight_score numeric(5, 1) not null,
  result_notice text not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skin_type_responses (
  id uuid primary key default gen_random_uuid(),
  skin_type_result_id uuid not null references public.skin_type_results(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.skin_type_questions(id),
  option_id uuid not null references public.skin_type_options(id),
  score numeric(4, 1) not null,
  created_at timestamptz not null default now(),
  unique (skin_type_result_id, question_id)
);

create index if not exists skin_type_questionnaires_active_idx
  on public.skin_type_questionnaires(is_active);
create index if not exists skin_type_questions_questionnaire_id_idx
  on public.skin_type_questions(questionnaire_id);
create index if not exists skin_type_options_question_id_idx
  on public.skin_type_options(question_id);
create index if not exists skin_type_results_user_id_idx
  on public.skin_type_results(user_id, completed_at desc);
create index if not exists skin_type_responses_result_id_idx
  on public.skin_type_responses(skin_type_result_id);
create index if not exists skin_type_responses_user_id_idx
  on public.skin_type_responses(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists skin_type_questionnaires_set_updated_at
  on public.skin_type_questionnaires;
create trigger skin_type_questionnaires_set_updated_at
before update on public.skin_type_questionnaires
for each row
execute function public.set_updated_at();

drop trigger if exists skin_type_results_set_updated_at
  on public.skin_type_results;
create trigger skin_type_results_set_updated_at
before update on public.skin_type_results
for each row
execute function public.set_updated_at();

alter table public.skin_type_questionnaires enable row level security;
alter table public.skin_type_questions enable row level security;
alter table public.skin_type_options enable row level security;
alter table public.skin_type_results enable row level security;
alter table public.skin_type_responses enable row level security;

drop policy if exists "Skin type questionnaires are readable"
  on public.skin_type_questionnaires;
create policy "Skin type questionnaires are readable"
on public.skin_type_questionnaires
for select
to anon, authenticated
using (true);

drop policy if exists "Skin type questions are readable"
  on public.skin_type_questions;
create policy "Skin type questions are readable"
on public.skin_type_questions
for select
to anon, authenticated
using (true);

drop policy if exists "Skin type options are readable"
  on public.skin_type_options;
create policy "Skin type options are readable"
on public.skin_type_options
for select
to anon, authenticated
using (true);

drop policy if exists "Users can read own skin type results"
  on public.skin_type_results;
create policy "Users can read own skin type results"
on public.skin_type_results
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can read own skin type responses"
  on public.skin_type_responses;
create policy "Users can read own skin type responses"
on public.skin_type_responses
for select
to authenticated
using (user_id = auth.uid());
