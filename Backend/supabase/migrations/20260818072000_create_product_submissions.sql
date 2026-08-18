alter table public.products
add column if not exists item_type text not null default 'cosmetic'
  check (item_type in ('cosmetic', 'shower_product', 'supplement'));

create table if not exists public.product_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  item_type text not null check (item_type in ('cosmetic', 'shower_product', 'supplement')),
  name text not null,
  normalized_name text not null,
  brand text not null,
  category text,
  ai_extracted_text text,
  confirmed_ingredients_text text,
  status text not null default 'draft'
    check (status in ('draft', 'community', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_item_type_idx on public.products(item_type);
create index if not exists product_submissions_submitted_by_idx
  on public.product_submissions(submitted_by);
create index if not exists product_submissions_product_id_idx
  on public.product_submissions(product_id);

drop trigger if exists product_submissions_set_updated_at on public.product_submissions;
create trigger product_submissions_set_updated_at
before update on public.product_submissions
for each row
execute function public.set_updated_at();

alter table public.product_submissions enable row level security;

drop policy if exists "Users can manage their product submissions" on public.product_submissions;
create policy "Users can manage their product submissions"
on public.product_submissions
for all
to authenticated
using (auth.uid() = submitted_by)
with check (auth.uid() = submitted_by);
