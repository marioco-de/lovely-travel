create table if not exists album_photos (
  public_hash text not null,
  photo_id text not null,
  mime text not null default 'image/jpeg',
  bytes bytea not null,
  updated_at timestamptz not null default now(),
  primary key (public_hash, photo_id)
);
