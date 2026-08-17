create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.routine_products (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  user_product_id uuid not null references public.user_products(id) on delete cascade,
  display_order integer not null check (display_order > 0),
  created_at timestamptz not null default now(),
  unique (routine_id, user_product_id),
  unique (routine_id, display_order)
);

create table if not exists public.daily_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null,
  logged_at timestamptz not null default now(),
  dryness integer not null check (dryness between 0 and 5),
  oiliness integer not null check (oiliness between 0 and 5),
  redness integer not null check (redness between 0 and 5),
  trouble integer not null check (trouble between 0 and 5),
  sleep_hours numeric(3, 1) not null check (sleep_hours >= 0 and sleep_hours <= 24),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, record_date)
);

create table if not exists public.daily_record_products (
  id uuid primary key default gen_random_uuid(),
  daily_record_id uuid not null references public.daily_records(id) on delete cascade,
  user_product_id uuid not null references public.user_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (daily_record_id, user_product_id)
);

create table if not exists public.daily_record_presets (
  id uuid primary key default gen_random_uuid(),
  daily_record_id uuid not null references public.daily_records(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (daily_record_id, routine_id)
);

create table if not exists public.skin_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_record_id uuid not null references public.daily_records(id) on delete cascade,
  storage_path text not null unique,
  original_file_name text,
  content_type text not null,
  file_size integer not null check (file_size > 0),
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists routines_user_id_idx on public.routines(user_id);
create index if not exists routine_products_routine_id_idx on public.routine_products(routine_id);
create index if not exists routine_products_user_product_id_idx on public.routine_products(user_product_id);
create index if not exists daily_records_user_id_record_date_idx
  on public.daily_records(user_id, record_date);
create index if not exists daily_record_products_daily_record_id_idx
  on public.daily_record_products(daily_record_id);
create index if not exists daily_record_products_user_product_id_idx
  on public.daily_record_products(user_product_id);
create index if not exists daily_record_presets_daily_record_id_idx
  on public.daily_record_presets(daily_record_id);
create index if not exists daily_record_presets_routine_id_idx
  on public.daily_record_presets(routine_id);
create index if not exists skin_photos_user_id_idx on public.skin_photos(user_id);
create index if not exists skin_photos_daily_record_id_idx on public.skin_photos(daily_record_id);

drop trigger if exists routines_set_updated_at on public.routines;
create trigger routines_set_updated_at
before update on public.routines
for each row
execute function public.set_updated_at();

drop trigger if exists daily_records_set_updated_at on public.daily_records;
create trigger daily_records_set_updated_at
before update on public.daily_records
for each row
execute function public.set_updated_at();

alter table public.routines enable row level security;
alter table public.routine_products enable row level security;
alter table public.daily_records enable row level security;
alter table public.daily_record_products enable row level security;
alter table public.daily_record_presets enable row level security;
alter table public.skin_photos enable row level security;

drop policy if exists "Users can manage their routines" on public.routines;
create policy "Users can manage their routines"
on public.routines
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their routine products" on public.routine_products;
create policy "Users can manage their routine products"
on public.routine_products
for all
to authenticated
using (
  exists (
    select 1 from public.routines
    where routines.id = routine_products.routine_id
      and routines.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.routines
    where routines.id = routine_products.routine_id
      and routines.user_id = auth.uid()
  )
);

drop policy if exists "Users can manage their daily records" on public.daily_records;
create policy "Users can manage their daily records"
on public.daily_records
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their daily record products" on public.daily_record_products;
create policy "Users can manage their daily record products"
on public.daily_record_products
for all
to authenticated
using (
  exists (
    select 1 from public.daily_records
    where daily_records.id = daily_record_products.daily_record_id
      and daily_records.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.daily_records
    where daily_records.id = daily_record_products.daily_record_id
      and daily_records.user_id = auth.uid()
  )
);

drop policy if exists "Users can manage their daily record presets" on public.daily_record_presets;
create policy "Users can manage their daily record presets"
on public.daily_record_presets
for all
to authenticated
using (
  exists (
    select 1 from public.daily_records
    where daily_records.id = daily_record_presets.daily_record_id
      and daily_records.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.daily_records
    where daily_records.id = daily_record_presets.daily_record_id
      and daily_records.user_id = auth.uid()
  )
);

drop policy if exists "Users can manage their skin photos" on public.skin_photos;
create policy "Users can manage their skin photos"
on public.skin_photos
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'skin-photos',
  'skin-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
