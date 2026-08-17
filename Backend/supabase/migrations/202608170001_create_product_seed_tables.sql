create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('seed', 'community', 'admin')),
  external_id text unique,
  name text not null,
  normalized_name text not null,
  brand text not null,
  category text,
  ingredients_text text,
  verification_status text not null default 'community'
    check (verification_status in ('community', 'verified', 'needs_review')),
  source_url text,
  source_checked_at date,
  region text,
  formula_version text,
  seed_batch text,
  created_from_submission_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'mfds',
  external_id text unique,
  name text not null,
  normalized_name text not null,
  english_name text,
  cas_no text,
  definition text,
  synonyms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, normalized_name)
);

create table if not exists public.product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  ingredient_id uuid references public.ingredients(id) on delete set null,
  raw_name text not null,
  display_order integer not null check (display_order > 0),
  amount_text text,
  amount_status text not null default 'unknown'
    check (amount_status in ('unknown', 'known', 'not_provided')),
  match_status text not null default 'unmatched'
    check (match_status in ('matched', 'unmatched', 'manual')),
  created_at timestamptz not null default now(),
  unique (product_id, display_order)
);

create index if not exists products_source_idx on public.products(source);
create index if not exists products_brand_idx on public.products(brand);
create index if not exists products_category_idx on public.products(category);
create index if not exists products_normalized_name_idx on public.products(normalized_name);
create index if not exists products_search_idx on public.products(brand, normalized_name);
create index if not exists ingredients_normalized_name_idx on public.ingredients(normalized_name);
create index if not exists product_ingredients_product_id_idx
  on public.product_ingredients(product_id);
create index if not exists product_ingredients_ingredient_id_idx
  on public.product_ingredients(ingredient_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists ingredients_set_updated_at on public.ingredients;
create trigger ingredients_set_updated_at
before update on public.ingredients
for each row
execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.ingredients enable row level security;
alter table public.product_ingredients enable row level security;

drop policy if exists "Public products are readable" on public.products;
create policy "Public products are readable"
on public.products
for select
to anon, authenticated
using (true);

drop policy if exists "Public ingredients are readable" on public.ingredients;
create policy "Public ingredients are readable"
on public.ingredients
for select
to anon, authenticated
using (true);

drop policy if exists "Public product ingredients are readable" on public.product_ingredients;
create policy "Public product ingredients are readable"
on public.product_ingredients
for select
to anon, authenticated
using (true);
