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
  hidden?: boolean;
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
  await sql.query(`alter table trip_days add column if not exists hidden boolean not null default false`);
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
    hidden: boolean;
  }>`
    select id, sort_index, title, place_label, lat, lng, hidden from trip_days
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
      hidden: day.hidden,
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
    if (!isDayTitle(day.title)) continue;
    await sql.query(
      `insert into trip_days (id, trip_id, sort_index, title, place_label, lat, lng, hidden)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (id) do update set
         sort_index = excluded.sort_index,
         title = excluded.title,
         place_label = excluded.place_label,
         lat = excluded.lat,
         lng = excluded.lng,
         hidden = excluded.hidden`,
      [day.id, tripId, day.sortIndex, day.title, day.placeLabel, day.lat ?? null, day.lng ?? null, Boolean(day.hidden)],
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
  await dropInvalidDays(sql, tripId);
}


export async function mergeCatalog(sql: Sql, tripId: string, catalog: Catalog) {
  await ensureCatalog(sql);
  for (const photo of catalog.photos) {
    await sql.query(
      `insert into photos (id, trip_id, blob_url, source_url, google_id, taken_at, lat, lng, place_label)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (id) do update set
         blob_url = case when excluded.blob_url <> '' then excluded.blob_url else photos.blob_url end,
         source_url = coalesce(excluded.source_url, photos.source_url),
         google_id = coalesce(excluded.google_id, photos.google_id),
         taken_at = coalesce(excluded.taken_at, photos.taken_at),
         lat = coalesce(excluded.lat, photos.lat),
         lng = coalesce(excluded.lng, photos.lng),
         place_label = case when excluded.place_label <> '' then excluded.place_label else photos.place_label end`,
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
  const existing = await sql<{ id: string; title: string; place_label: string; sort_index: number }>`
    select id, title, place_label, sort_index from trip_days where trip_id = ${tripId}
  `;
  const byKey = new Map(existing.map((row) => [`${row.title}|${row.place_label}`, row]));
  let sort = existing.reduce((max, row) => Math.max(max, row.sort_index), -1);
  for (const day of catalog.days) {
    if (!isDayTitle(day.title)) continue;
    const key = `${day.title}|${day.placeLabel}`;
    const match = existing.find((row) => row.id === day.id) ?? byKey.get(key);
    const dayId = match?.id ?? day.id;
    if (!match) {
      sort += 1;
      await sql.query(
        `insert into trip_days (id, trip_id, sort_index, title, place_label, lat, lng, hidden)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (id) do update set
           title = excluded.title,
           place_label = excluded.place_label,
           lat = excluded.lat,
           lng = excluded.lng,
           hidden = excluded.hidden`,
        [dayId, tripId, day.sortIndex || sort, day.title, day.placeLabel, day.lat ?? null, day.lng ?? null, Boolean(day.hidden)],
      );
    } else {
      await sql.query(
        `update trip_days set title = $2, place_label = $3, lat = coalesce($4, lat), lng = coalesce($5, lng), hidden = $6
         where id = $1`,
        [dayId, day.title || match.title, day.placeLabel || match.place_label, day.lat ?? null, day.lng ?? null, Boolean(day.hidden)],
      );
    }
    const offsetRows = await sql<{ n: number }>`select coalesce(max(sort_index), -1) as n from day_photos where day_id = ${dayId}`;
    const offset = match ? (offsetRows[0]?.n ?? -1) + 1 : 0;
    const existingPhotos = match
      ? await sql<{ photo_id: string }>`select photo_id from day_photos where day_id = ${dayId}`
      : [];
    const knownPhotos = new Set(existingPhotos.map((row) => row.photo_id));
    for (const member of day.photos) {
      const sortIndex = !match || knownPhotos.has(member.photoId) ? member.sortIndex : offset + member.sortIndex;
      await sql.query(
        `insert into day_photos (day_id, photo_id, in_day_album, sort_index)
         values ($1, $2, $3, $4)
         on conflict (day_id, photo_id) do update set in_day_album = excluded.in_day_album, sort_index = excluded.sort_index`,
        [dayId, member.photoId, member.inDayAlbum, sortIndex],
      );
    }
  }
  await sql.query(`delete from album_highlights where trip_id = $1`, [tripId]);
  for (const highlight of catalog.highlights) {
    await sql.query(
      `insert into album_highlights (trip_id, photo_id, sort_index) values ($1, $2, $3)
       on conflict (trip_id, photo_id) do update set sort_index = excluded.sort_index`,
      [tripId, highlight.photoId, highlight.sortIndex],
    );
  }
  await repairUnknownCatalog(sql, tripId);
}

export async function setDayAlbumFlags(
  sql: Sql,
  tripId: string,
  days: { id: string; title?: string; placeLabel?: string; photos: { photoId: string; inDayAlbum: boolean; sortIndex: number }[] }[],
  highlights: { photoId: string; sortIndex: number }[],
) {
  await ensureCatalog(sql);
  for (const day of days) {
    if (day.title != null || day.placeLabel != null) {
      await sql.query(
        `update trip_days set title = coalesce($2, title), place_label = coalesce($3, place_label) where id = $1 and trip_id = $4`,
        [day.id, day.title ?? null, day.placeLabel ?? null, tripId],
      );
    }
    for (const member of day.photos) {
      await sql.query(
        `insert into day_photos (day_id, photo_id, in_day_album, sort_index)
         values ($1, $2, $3, $4)
         on conflict (day_id, photo_id) do update set in_day_album = excluded.in_day_album, sort_index = excluded.sort_index`,
        [day.id, member.photoId, member.inDayAlbum, member.sortIndex],
      );
    }
  }
  await sql.query(`delete from album_highlights where trip_id = $1`, [tripId]);
  for (const highlight of highlights) {
    await sql.query(
      `insert into album_highlights (trip_id, photo_id, sort_index) values ($1, $2, $3)
       on conflict (trip_id, photo_id) do update set sort_index = excluded.sort_index`,
      [tripId, highlight.photoId, highlight.sortIndex],
    );
  }
}

function isDayTitle(title: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(title);
}

async function dropInvalidDays(sql: Sql, tripId: string) {
  await sql.query(
    `delete from day_photos
     where day_id in (select id from trip_days where trip_id = $1 and title !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')`,
    [tripId],
  );
  await sql.query(
    `delete from trip_days where trip_id = $1 and title !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`,
    [tripId],
  );
}

export async function repairUnknownCatalog(sql: Sql, tripId: string) {
  await ensureCatalog(sql);
  const catalog = await loadCatalog(sql, tripId);
  const photos = new Map(catalog.photos.map((photo) => [photo.id, photo]));
  const unknownDays = catalog.days.filter((day) => !isDayTitle(day.title));
  const datedDays = catalog.days.filter((day) => isDayTitle(day.title));
  const byKey = new Map(datedDays.map((day) => [`${day.title}|${day.placeLabel}`, day]));
  let sort = catalog.days.reduce((max, day) => Math.max(max, day.sortIndex), -1);

  for (const day of unknownDays) {
    for (const member of day.photos) {
      const photo = photos.get(member.photoId);
      const taken = photo?.takenAt ? Date.parse(photo.takenAt) : 0;
      if (!taken) continue;
      const title = new Date(taken).toISOString().slice(0, 10);
      const place = photo?.placeLabel || day.placeLabel || "";
      const key = `${title}|${place}`;
      let dest = byKey.get(key) ?? datedDays.find((item) => item.title === title);
      if (!dest) {
        sort += 1;
        const id = `day-${title}-${sort}`;
        await sql.query(
          `insert into trip_days (id, trip_id, sort_index, title, place_label, hidden)
           values ($1, $2, $3, $4, $5, false)
           on conflict (id) do update set title = excluded.title, place_label = excluded.place_label`,
          [id, tripId, sort, title, place],
        );
        dest = { id, sortIndex: sort, title, placeLabel: place, photos: [] };
        datedDays.push(dest);
        byKey.set(key, dest);
      }
      await sql.query(
        `insert into day_photos (day_id, photo_id, in_day_album, sort_index)
         values ($1, $2, $3, $4)
         on conflict (day_id, photo_id) do update set in_day_album = excluded.in_day_album, sort_index = excluded.sort_index`,
        [dest.id, member.photoId, member.inDayAlbum, member.sortIndex],
      );
    }
    await sql.query(`delete from day_photos where day_id = $1`, [day.id]);
    await sql.query(`delete from trip_days where id = $1 and trip_id = $2`, [day.id, tripId]);
  }

  const undated = await sql<{ id: string }>`
    select id from photos
    where trip_id = ${tripId}
      and taken_at is null
      and id not like 'upl%'
  `;
  for (const row of undated) {
    await sql.query(`delete from album_highlights where trip_id = $1 and photo_id = $2`, [tripId, row.id]);
    await sql.query(`delete from day_photos where photo_id = $1`, [row.id]);
    await sql.query(`delete from photos where id = $1 and trip_id = $2`, [row.id, tripId]);
  }
  await dropInvalidDays(sql, tripId);
  await dedupeCatalogPhotos(sql, tripId);
}

function photoDedupeKey(photo: CatalogPhoto) {
  const gid = photo.googleId || (photo.id.startsWith("AF1Qip") ? photo.id : "");
  if (gid.startsWith("AF1Qip")) return `g:${gid}`;
  const raw = (photo.sourceUrl || photo.blobUrl || "").split("=")[0] ?? "";
  const pw = raw.match(/\/pw\/([^/?]+)/);
  if (pw?.[1]) return `pw:${pw[1]}`;
  return `id:${photo.id}`;
}

export async function dedupeCatalogPhotos(sql: Sql, tripId: string) {
  const catalog = await loadCatalog(sql, tripId);
  const groups = new Map<string, CatalogPhoto[]>();
  for (const photo of catalog.photos) {
    if (photo.id.startsWith("upl")) continue;
    const key = photoDedupeKey(photo);
    const list = groups.get(key) ?? [];
    list.push(photo);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => Number(b.id.startsWith("AF1Qip")) - Number(a.id.startsWith("AF1Qip")));
    const keep = list[0]!;
    for (const extra of list.slice(1)) {
      await sql.query(
        `insert into day_photos (day_id, photo_id, in_day_album, sort_index)
         select day_id, $2, in_day_album, sort_index from day_photos where photo_id = $1
         on conflict (day_id, photo_id) do update set
           in_day_album = day_photos.in_day_album or excluded.in_day_album`,
        [extra.id, keep.id],
      );
      await sql.query(`delete from day_photos where photo_id = $1`, [extra.id]);
      await sql.query(
        `insert into album_highlights (trip_id, photo_id, sort_index)
         select trip_id, $2, sort_index from album_highlights where trip_id = $3 and photo_id = $1
         on conflict (trip_id, photo_id) do nothing`,
        [extra.id, keep.id, tripId],
      );
      await sql.query(`delete from album_highlights where trip_id = $1 and photo_id = $2`, [tripId, extra.id]);
      await sql.query(`delete from photos where id = $1 and trip_id = $2`, [extra.id, tripId]);
    }
  }

  const days = await sql<{ id: string; title: string; place_label: string; sort_index: number }>`
    select id, title, place_label, sort_index from trip_days where trip_id = ${tripId} order by sort_index
  `;
  const keepByKey = new Map<string, string>();
  for (const day of days) {
    const key = `${day.title}|${day.place_label}`;
    const keepId = keepByKey.get(key);
    if (!keepId) {
      keepByKey.set(key, day.id);
      continue;
    }
    await sql.query(
      `insert into day_photos (day_id, photo_id, in_day_album, sort_index)
       select $2, photo_id, in_day_album, sort_index from day_photos where day_id = $1
       on conflict (day_id, photo_id) do update set
         in_day_album = day_photos.in_day_album or excluded.in_day_album`,
      [day.id, keepId],
    );
    await sql.query(`delete from day_photos where day_id = $1`, [day.id]);
    await sql.query(`delete from trip_days where id = $1 and trip_id = $2`, [day.id, tripId]);
  }
}

