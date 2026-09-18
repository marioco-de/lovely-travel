import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export function mediaUrl(publicHash: string, photoId: string, bust?: number) {
  const path = `/media/${encodeURIComponent(publicHash)}/${encodeURIComponent(photoId)}`;
  return bust ? `${path}?v=${bust}` : path;
}

export function isStoredPhotoUrl(url: string) {
  return url.startsWith("/media/") || url.startsWith("http://") || url.startsWith("https://");
}

async function ensurePhotoTable() {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql.query(`
    create table if not exists album_photos (
      public_hash text not null,
      photo_id text not null,
      mime text not null default 'image/jpeg',
      bytes bytea not null,
      url text,
      storage text not null default 'db',
      updated_at timestamptz not null default now(),
      primary key (public_hash, photo_id)
    )
  `);
  await sql.query(`alter table album_photos add column if not exists url text`);
  await sql.query(`alter table album_photos add column if not exists storage text not null default 'db'`);
  return sql;
}

function parseDataUrl(raw: string) {
  const match = raw.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { mime: match[1] || "image/jpeg", bytes: Buffer.from(match[2] ?? "", "base64") };
  return { mime: "image/jpeg", bytes: Buffer.from(raw, "base64") };
}

async function patchTripPhoto(editHash: string, photoId: string, url: string) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const patch = JSON.stringify({ [photoId]: url });
  await sql.query(
    `update trips
     set payload = jsonb_set(
       coalesce(payload, '{}'::jsonb),
       '{photos}',
       coalesce(payload->'photos', '{}'::jsonb) || $1::jsonb
     ),
     updated_at = now()
     where edit_hash = $2`,
    [patch, editHash],
  );
}

export const uploadAlbumPhoto = createServerFn({ method: "POST" })
  .validator(
    z.object({
      editHash: z.string().min(8).max(64),
      photoId: z.string().min(1).max(80),
      data: z.string().min(24).max(3_200_000),
    }),
  )
  .handler(async ({ data }): Promise<{ url: string } | { error: string }> => {
    const { requireOwner } = await import("./owner-session.server");
    if (!(await requireOwner(data.editHash))) return { error: "locked" };
    const sql = await ensurePhotoTable();
    const trip = await sql<{ public_hash: string }>`
      select public_hash from trips where edit_hash = ${data.editHash} limit 1
    `;
    const hash = trip[0]?.public_hash;
    if (!hash) return { error: "album not found" };
    const parsed = parseDataUrl(data.data);
    if (parsed.bytes.length < 32 || parsed.bytes.length > 2_200_000) return { error: "photo too large" };
    const { putPublicBlob } = await import("./blob-store");
    const blobUrl = await putPublicBlob(`albums/${hash}/${data.photoId}.jpg`, parsed.bytes, parsed.mime);
    if (blobUrl) {
      await sql.query(
        `insert into album_photos (public_hash, photo_id, mime, bytes, url, storage)
         values ($1, $2, $3, $4, $5, 'blob')
         on conflict (public_hash, photo_id)
         do update set mime = excluded.mime, url = excluded.url, storage = 'blob', bytes = excluded.bytes, updated_at = now()`,
        [hash, data.photoId, parsed.mime, parsed.bytes, blobUrl],
      );
      await patchTripPhoto(data.editHash, data.photoId, blobUrl);
      return { url: blobUrl };
    }
    await sql.query(
      `insert into album_photos (public_hash, photo_id, mime, bytes, storage)
       values ($1, $2, $3, $4, 'db')
       on conflict (public_hash, photo_id)
       do update set mime = excluded.mime, bytes = excluded.bytes, storage = 'db', updated_at = now()`,
      [hash, data.photoId, parsed.mime, parsed.bytes],
    );
    const url = mediaUrl(hash, data.photoId, Date.now());
    await patchTripPhoto(data.editHash, data.photoId, url);
    return { url };
  });

export const removeAlbumPhoto = createServerFn({ method: "POST" })
  .validator(z.object({ editHash: z.string().min(8).max(64), photoId: z.string().min(1).max(80) }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const sql = await ensurePhotoTable();
    const trip = await sql<{ public_hash: string }>`
      select public_hash from trips where edit_hash = ${data.editHash} limit 1
    `;
    const hash = trip[0]?.public_hash;
    if (hash) {
      const row = await sql.query<{ url: string | null }>(
        `select url from album_photos where public_hash = $1 and photo_id = $2 limit 1`,
        [hash, data.photoId],
      );
      if (row[0]?.url) {
        const { deletePublicBlob } = await import("./blob-store");
        await deletePublicBlob(row[0].url);
      }
      await sql.query(`delete from album_photos where public_hash = $1 and photo_id = $2`, [hash, data.photoId]);
      await sql.query(
        `update trips
         set payload = jsonb_set(
           coalesce(payload, '{}'::jsonb),
           '{photos}',
           coalesce(payload->'photos', '{}'::jsonb) - $1
         ),
         updated_at = now()
         where edit_hash = $2`,
        [data.photoId, data.editHash],
      );
    }
    return { ok: true };
  });

export async function readAlbumPhoto(publicHash: string, photoId: string) {
  const sql = await ensurePhotoTable();
  const rows = await sql.query<{ mime: string; bytes: Buffer | Uint8Array; url: string | null }>(
    `select mime, bytes, url from album_photos where public_hash = $1 and photo_id = $2 limit 1`,
    [publicHash, photoId],
  );
  return rows[0] ?? null;
}
