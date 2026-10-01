alter table public.clients
  add column if not exists public_slug text;

with normalized as (
  select
    client_id,
    coalesce(
      nullif(
        trim(both '-' from regexp_replace(lower(company_name), '[^a-z0-9]+', '-', 'g')),
        ''
      ),
      'client'
    ) as raw_slug
  from public.clients
  where public_slug is null
),
safe_slugs as (
  select
    client_id,
    case
      when raw_slug in ('admin', 'api', 'login', 'assets', 'auth', 'functions', 'static') then raw_slug || '-client'
      when length(raw_slug) = 1 then raw_slug || '-agency'
      else raw_slug
    end as base_slug
  from normalized
),
numbered as (
  select
    client_id,
    base_slug,
    row_number() over (partition by base_slug order by client_id) as duplicate_index
  from safe_slugs
)
update public.clients as clients
set public_slug = case
  when numbered.duplicate_index = 1 then numbered.base_slug
  else numbered.base_slug || '-' || numbered.duplicate_index
end
from numbered
where clients.client_id = numbered.client_id
  and clients.public_slug is null;

alter table public.clients
  alter column public_slug set not null;

create unique index if not exists clients_public_slug_key
  on public.clients (public_slug);

alter table public.clients
  drop constraint if exists clients_public_slug_format;

alter table public.clients
  add constraint clients_public_slug_format
  check (public_slug ~ '^[a-z0-9][a-z0-9_-]{1,80}$');
