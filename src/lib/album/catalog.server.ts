import type { Sql } from "@/lib/db";

export type CatalogPhoto = {
  id: string;
  blobUrl: string;
  sourceUrl?: string;
  googleId?: string;
  takenAt?: string;
  lat?: number;
  lng?: number;
  placeLabel: string;
};

export type CatalogDay = {
  id: string;
  sortIndex: number;
  title: string;
  placeLabel: string;
  lat?: number;
  lng?: number;
  photos: { photoId: string; inDayAlbum: boolean; sortIndex: number }[];
};

export type Catalog = {
  days: CatalogDay[];
  highlights: { photoId: string; sortIndex: number }[];
  photos: CatalogPhoto[];
};

export async function ensureCatalog(sql: Sql) {
  await sql.query(`
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
    )
  `);
  await sql.query(`
    create table if not exists trip_days (
      id text primary key,
      trip_id text not null references trips (id) on delete cascade,
      sort_index int not null default 0,
      title text not null default '',
      place_label text not null default '',
      lat double precision,
      lng double precision
    )
  `);
  await sql.query(`
    create table if not exists day_photos (
      day_id text not null references trip_days (id) on delete cascade,
      photo_id text not null references photos (id) on delete cascade,
      in_day_album boolean not null default false,
      sort_index int not null default 0,
      primary key (day_id, photo_id)
    )
  `);
  await sql.query(`
    create table if not exists album_highlights (
      trip_id text not null references trips (id) on delete cascade,
      photo_id text not null references photos (id) on delete cascade,
      sort_index int not null default 0,
      primary key (trip_id, photo_id)
    )
  `);
}

export async function loadCatalog(sql: Sql, tripId: string): Promise<Catalog> {
  await ensureCatalog(sql);
  const photos = await sql<{
    id: string;
    blob_url: string;
    source_url: string | null;
    google_id: string | null;
    taken_at: string | null;
    lat: number | null;
    lng: number | null;
    place_label: string;
  }>`
    select id, blob_url, source_url, google_id, taken_at::text, lat, lng, place_label
    from photos where trip_id = ${tripId}
  `;
  const days = await sql<{
    id: string;
    sort_index: number;
    title: string;
    place_label: string;
    lat: number | null;
    lng: number | null;
  }>`
    select id, sort_index, title, place_label, lat, lng from trip_days
    where trip_id = ${tripId} order by sort_index
  `;
  const members = await sql<{
    day_id: string;
    photo_id: string;
    in_day_album: boolean;
    sort_index: number;
  }>`
    select dp.day_id, dp.photo_id, dp.in_day_album, dp.sort_index
    from day_photos dp
    join trip_days d on d.id = dp.day_id
    where d.trip_id = ${tripId}
  `;
  const highlights = await sql<{ photo_id: string; sort_index: number }>`
    select photo_id, sort_index from album_highlights where trip_id = ${tripId} order by sort_index
  `;
  const byDay = new Map<string, CatalogDay["photos"]>();
  for (const row of members) {
    const list = byDay.get(row.day_id) ?? [];
    list.push({ photoId: row.photo_id, inDayAlbum: row.in_day_album, sortIndex: row.sort_index });
    byDay.set(row.day_id, list);
  }
  return {
    photos: photos.map((row) => ({
      id: row.id,
      blobUrl: row.blob_url,
      sourceUrl: row.source_url ?? undefined,
      googleId: row.google_id ?? undefined,
      takenAt: row.taken_at ?? undefined,
      lat: row.lat ?? undefined,
      lng: row.lng ?? undefined,
      placeLabel: row.place_label,
    })),
    days: days.map((day) => ({
      id: day.id,
      sortIndex: day.sort_index,
      title: day.title,
      placeLabel: day.place_label,
      lat: day.lat ?? undefined,
      lng: day.lng ?? undefined,
      photos: (byDay.get(day.id) ?? []).sort((a, b) => a.sortIndex - b.sortIndex),
    })),
    highlights: highlights.map((row) => ({ photoId: row.photo_id, sortIndex: row.sort_index })),
  };
}

export async function replaceCatalog(sql: Sql, tripId: string, catalog: Catalog) {
  await ensureCatalog(sql);
  await sql.query(`delete from album_highlights where trip_id = $1`, [tripId]);
  await sql.query(
    `delete from day_photos where day_id in (select id from trip_days where trip_id = $1)`,
    [tripId],
  );
  await sql.query(`delete from trip_days where trip_id = $1`, [tripId]);
  for (const photo of catalog.photos) {
    await sql.query(
      `insert into photos (id, trip_id, blob_url, source_url, google_id, taken_at, lat, lng, place_label)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (id) do update set
         blob_url = excluded.blob_url,
         source_url = excluded.source_url,
         google_id = excluded.google_id,
         taken_at = excluded.taken_at,
         lat = excluded.lat,
         lng = excluded.lng,
         place_label = excluded.place_label`,
      [
        photo.id,
        tripId,
        photo.blobUrl,
        photo.sourceUrl ?? null,
        photo.googleId ?? null,
        photo.takenAt ?? null,
        photo.lat ?? null,
        photo.lng ?? null,
        photo.placeLabel,
      ],
    );
  }
  for (const day of catalog.days) {
    await sql.query(
      `insert into trip_days (id, trip_id, sort_index, title, place_label, lat, lng)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id) do update set
         sort_index = excluded.sort_index,
         title = excluded.title,
         place_label = excluded.place_label,
         lat = excluded.lat,
         lng = excluded.lng`,
      [day.id, tripId, day.sortIndex, day.title, day.placeLabel, day.lat ?? null, day.lng ?? null],
    );
    for (const member of day.photos) {
      await sql.query(
        `insert into day_photos (day_id, photo_id, in_day_album, sort_index)
         values ($1, $2, $3, $4)
         on conflict (day_id, photo_id) do update set in_day_album = excluded.in_day_album, sort_index = excluded.sort_index`,
        [day.id, member.photoId, member.inDayAlbum, member.sortIndex],
      );
    }
  }
  for (const highlight of catalog.highlights) {
    await sql.query(
      `insert into album_highlights (trip_id, photo_id, sort_index) values ($1, $2, $3)
       on conflict (trip_id, photo_id) do update set sort_index = excluded.sort_index`,
      [tripId, highlight.photoId, highlight.sortIndex],
    );
  }
}
