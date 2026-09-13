alter table trips
  add column if not exists edit_password_hash text;
