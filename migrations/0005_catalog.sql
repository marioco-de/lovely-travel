-- Catalog: every imported photo, day membership, homepage highlights.
-- trips.payload still holds scrapbook blocks; these tables are source of truth
-- for the photo library, day albums, and highlight picks.

create table if not exists photos (
  id text primary key,
  trip_id text not null references trips (id) on delete cascade,
  blob_url text not null default '',
  source_url text,
  google_id text,
  taken_at timestamptz,
  lat double precision,
  lng double precision,
  place_label text not null default '',
  mime text not null default 'image/jpeg',
  created_at timestamptz not null default now()
);

create index if not exists photos_trip_idx on photos (trip_id, taken_at);

create table if not exists trip_days (
  id text primary key,
  trip_id text not null references trips (id) on delete cascade,
  sort_index int not null default 0,
  title text not null default '',
  place_label text not null default '',
  lat double precision,
  lng double precision
);

create index if not exists trip_days_trip_idx on trip_days (trip_id, sort_index);

create table if not exists day_photos (
  day_id text not null references trip_days (id) on delete cascade,
  photo_id text not null references photos (id) on delete cascade,
  in_day_album boolean not null default false,
  sort_index int not null default 0,
  primary key (day_id, photo_id)
);

create table if not exists album_highlights (
  trip_id text not null references trips (id) on delete cascade,
  photo_id text not null references photos (id) on delete cascade,
  sort_index int not null default 0,
  primary key (trip_id, photo_id)
);
