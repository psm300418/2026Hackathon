alter table public.daily_records
add column if not exists outdoor_minutes integer check (outdoor_minutes is null or outdoor_minutes >= 0);

create table if not exists public.user_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  region_label text not null,
  weather_station_id integer not null,
  weather_station_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.daily_record_environment (
  id uuid primary key default gen_random_uuid(),
  daily_record_id uuid not null references public.daily_records(id) on delete cascade,
  source text not null default 'kma',
  region_label text,
  weather_station_id integer,
  weather_station_name text,
  observed_at timestamptz,
  temperature_celsius numeric(4, 1),
  humidity_percent numeric(5, 2),
  precipitation_amount_mm numeric(6, 2),
  wind_speed_mps numeric(5, 2),
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (daily_record_id)
);

create index if not exists user_locations_user_id_idx
  on public.user_locations(user_id);
create index if not exists daily_record_environment_daily_record_id_idx
  on public.daily_record_environment(daily_record_id);

drop trigger if exists user_locations_set_updated_at on public.user_locations;
create trigger user_locations_set_updated_at
before update on public.user_locations
for each row
execute function public.set_updated_at();

alter table public.user_locations enable row level security;
alter table public.daily_record_environment enable row level security;

drop policy if exists "Users can manage their location" on public.user_locations;
create policy "Users can manage their location"
on public.user_locations
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their daily record environment" on public.daily_record_environment;
create policy "Users can manage their daily record environment"
on public.daily_record_environment
for all
to authenticated
using (
  exists (
    select 1 from public.daily_records
    where daily_records.id = daily_record_environment.daily_record_id
      and daily_records.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.daily_records
    where daily_records.id = daily_record_environment.daily_record_id
      and daily_records.user_id = auth.uid()
  )
);
