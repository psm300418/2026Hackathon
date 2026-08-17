create table if not exists public.user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  usage_status text not null default 'past'
    check (usage_status in ('current', 'past', 'paused')),
  started_at date,
  is_past_experience boolean not null default true,
  past_reaction_memo text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists user_products_user_id_idx on public.user_products(user_id);
create index if not exists user_products_product_id_idx on public.user_products(product_id);
create index if not exists user_products_usage_status_idx on public.user_products(usage_status);

drop trigger if exists user_products_set_updated_at on public.user_products;
create trigger user_products_set_updated_at
before update on public.user_products
for each row
execute function public.set_updated_at();

alter table public.user_products enable row level security;

drop policy if exists "Users can read their user products" on public.user_products;
create policy "Users can read their user products"
on public.user_products
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their user products" on public.user_products;
create policy "Users can insert their user products"
on public.user_products
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their user products" on public.user_products;
create policy "Users can update their user products"
on public.user_products
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their user products" on public.user_products;
create policy "Users can delete their user products"
on public.user_products
for delete
to authenticated
using (auth.uid() = user_id);
