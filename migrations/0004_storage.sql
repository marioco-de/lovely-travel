-- Durable photo URLs + Google Photos OAuth tokens (edit-hash scoped).
alter table album_photos add column if not exists url text;
alter table album_photos add column if not exists storage text not null default 'db';

create index if not exists album_photos_url_idx on album_photos (public_hash);

create table if not exists google_accounts (
  edit_hash text primary key,
  refresh_token text not null,
  access_token text,
  access_expires_at timestamptz,
  picker_session_id text,
  updated_at timestamptz not null default now()
);
