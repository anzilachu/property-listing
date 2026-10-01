create extension if not exists pgcrypto;

create type public.app_role as enum ('admin');
create type public.location_type as enum ('PF', 'BAYUT');

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = required_role
  );
$$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique check (client_id ~ '^[a-z0-9][a-z0-9_]{2,80}$'),
  public_slug text not null unique check (public_slug ~ '^[a-z0-9][a-z0-9_-]{1,80}$'),
  company_name text not null,
  portal_host text not null,
  created_at timestamptz not null default now()
);

create table public.integration_settings (
  client_id text primary key references public.clients(client_id) on delete cascade,
  bitrix jsonb not null default '{}'::jsonb,
  pf jsonb not null default '{"accounts":[]}'::jsonb,
  bayut jsonb not null default '{"accounts":[]}'::jsonb,
  dubizzle jsonb not null default '{"accounts":[]}'::jsonb,
  general jsonb not null default '{"theme":"light","accent":"#0c8f65"}'::jsonb,
  field_mapping jsonb not null default '{}'::jsonb,
  field_dictionaries jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  type public.location_type not null,
  name text not null,
  location_id text not null,
  lat numeric,
  lng numeric,
  created_at timestamptz not null default now()
);

create index locations_name_idx on public.locations using gin (to_tsvector('simple', name));
create index locations_location_id_idx on public.locations (location_id);

create table public.developers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo text,
  created_at timestamptz not null default now()
);

create table public.edge_cache (
  cache_key text primary key,
  value jsonb not null,
  expires_at timestamptz not null
);

alter table public.user_roles enable row level security;
alter table public.clients enable row level security;
alter table public.integration_settings enable row level security;
alter table public.locations enable row level security;
alter table public.developers enable row level security;
alter table public.edge_cache enable row level security;

create policy "admins can read roles" on public.user_roles
  for select using (public.has_role('admin'));

create policy "admins can read clients" on public.clients
  for select using (public.has_role('admin'));
create policy "admins can insert clients" on public.clients
  for insert with check (public.has_role('admin'));
create policy "admins can update clients" on public.clients
  for update using (public.has_role('admin')) with check (public.has_role('admin'));
create policy "admins can delete clients" on public.clients
  for delete using (public.has_role('admin'));

create policy "admins can read integration metadata" on public.integration_settings
  for select using (public.has_role('admin'));
create policy "admins can insert integrations" on public.integration_settings
  for insert with check (public.has_role('admin'));
create policy "admins can update integrations" on public.integration_settings
  for update using (public.has_role('admin')) with check (public.has_role('admin'));
create policy "admins can delete integrations" on public.integration_settings
  for delete using (public.has_role('admin'));

create policy "admins can manage locations" on public.locations
  for all using (public.has_role('admin')) with check (public.has_role('admin'));
create policy "admins can manage developers" on public.developers
  for all using (public.has_role('admin')) with check (public.has_role('admin'));

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger integration_settings_updated_at
before update on public.integration_settings
for each row execute function public.touch_updated_at();

-- After creating the first Supabase Auth user in the dashboard, run:
-- insert into public.user_roles (user_id, role)
-- values ('00000000-0000-0000-0000-000000000000', 'admin');
