create table if not exists trips (
  id text primary key,
  public_hash text not null unique,
  edit_hash text not null unique,
  title text not null default 'Untitled album',
  source_locale text not null default 'en',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trips_updated_idx on trips (updated_at desc);

create table if not exists trip_translations (
  trip_id text not null references trips (id) on delete cascade,
  locale text not null,
  field_key text not null,
  source_hash text not null,
  value text not null,
  primary key (trip_id, locale, field_key)
);
