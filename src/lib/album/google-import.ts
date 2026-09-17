import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dayKey } from "./exif";
import { newId } from "./layout";
import { clusterByPlace } from "./place-split";

export type ImportPhoto = {
  id: string;
  uid: string;
  thumb: string;
  url: string;
  takenAt: number;
  dateKey: string;
  lat?: number;
  lng?: number;
  place: string;
};

export type ImportDayDraft = {
  id: string;
  dateKey: string;
  place: string;
  photos: ImportPhoto[];
  selectedIds?: string[];
};

const UNKNOWN = "Unbekannter Ort";

export const previewGoogleLink = createServerFn({ method: "POST" })
  .validator(z.object({ url: z.string().min(12).max(500) }))
  .handler(async ({ data }): Promise<{ days: ImportDayDraft[]; needsAuth: boolean; title?: string; total?: number }> => {
    const { fetchSharedAlbum } = await import("./shared-album.server");
    const album = await fetchSharedAlbum(data.url);
    if (album.needsAuth || album.photos.length === 0) {
      return { days: [], needsAuth: album.needsAuth || album.photos.length === 0, title: album.title };
    }
    const photos: ImportPhoto[] = album.photos
      .filter((photo) => photo.uid.startsWith("AF1Qip") && photo.url.includes("/pw/"))
      .map((photo) => {
        const takenAt = photo.takenAt || 0;
        return {
          id: photo.uid,
          uid: photo.uid,
          thumb: photo.thumb,
          url: photo.url,
          takenAt,
          dateKey: takenAt ? dayKey(takenAt) : "unknown",
          lat: photo.lat,
          lng: photo.lng,
          place: photo.place?.trim() || UNKNOWN,
        };
      });
    photos.sort((a, b) => (a.takenAt || Number.MAX_SAFE_INTEGER) - (b.takenAt || Number.MAX_SAFE_INTEGER));
    const byDate = new Map<string, ImportPhoto[]>();
    for (const photo of photos) {
      const list = byDate.get(photo.dateKey) ?? [];
      list.push(photo);
      byDate.set(photo.dateKey, list);
    }
    const days: ImportDayDraft[] = [];
    for (const [dateKey, list] of byDate.entries()) {
      const clusters = clusterByPlace(list);
      for (const cluster of clusters) {
        const places = cluster.map((photo) => photo.place).filter((place) => place && place !== UNKNOWN);
        const tally = new Map<string, number>();
        for (const place of places) tally.set(place, (tally.get(place) ?? 0) + 1);
        const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        days.push({
          id: newId("imp"),
          dateKey,
          place: top || UNKNOWN,
          photos: cluster,
        });
      }
    }
    return { days, needsAuth: false, title: album.title, total: photos.length };
  });

const draftSchema = z.object({
  editHash: z.string().min(8).max(64),
  shareUrl: z.string().max(500).optional(),
  highlights: z.array(z.string()).max(12),
  days: z.array(
    z.object({
      id: z.string(),
      dateKey: z.string(),
      place: z.string().max(160),
      photos: z.array(
        z.object({
          id: z.string(),
          uid: z.string(),
          url: z.string(),
          thumb: z.string(),
          takenAt: z.number(),
          selected: z.boolean(),
          place: z.string().optional(),
        }),
      ),
    }),
  ),
});

export const confirmGoogleLink = createServerFn({ method: "POST" })
  .validator(draftSchema)
  .handler(async ({ data }) => {
    const { requireOwner } = await import("./owner-session.server");
    if (!(await requireOwner(data.editHash))) return { ok: false as const, photos: {} as Record<string, string>, days: [], highlights: [] as string[] };
    const { getSql } = await import("@/lib/db");
    const { uploadAlbumPhoto } = await import("./photo-store");
    const { readExifBytes } = await import("./exif");
    const { mergeCatalog } = await import("./catalog.server");
    const sql = await getSql();
    const trip = await sql<{ id: string }>`select id from trips where edit_hash = ${data.editHash} limit 1`;
    const tripId = trip[0]?.id;
    if (!tripId) return { ok: false as const, photos: {} as Record<string, string>, days: [], highlights: [] as string[] };

    const uploaded: Record<string, string> = {};
    const catalogPhotos: {
      id: string;
      blobUrl: string;
      sourceUrl?: string;
      googleId?: string;
      takenAt?: string;
      lat?: number;
      lng?: number;
      placeLabel: string;
    }[] = [];

    const neededIds = new Set(
      data.days.flatMap((day) => day.photos.filter((photo) => photo.selected || data.highlights.includes(photo.id)).map((photo) => photo.id)),
    );
    const existingCatalog = await (await import("./catalog.server")).loadCatalog(sql, tripId);
    const known = new Map(existingCatalog.photos.map((photo) => [photo.id, photo]));
    for (const photo of data.days.flatMap((day) => day.photos)) {
      const prev = known.get(photo.id);
      const alreadyStored = Boolean(prev?.blobUrl && (prev.blobUrl.startsWith("/media/") || prev.blobUrl.includes("blob.vercel")));
      if (neededIds.has(photo.id) && !alreadyStored) {
        try {
          const response = await fetch(photo.url);
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            if (buffer.length >= 32) {
              const mime = response.headers.get("content-type") || "image/jpeg";
              const slice = buffer.subarray(0, Math.min(buffer.length, 200_000));
              const exif = readExifBytes(slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength), photo.takenAt);
              const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
              if (dataUrl.length > 2_300_000) {
                uploaded[photo.id] = photo.url;
              } else {
                const stored = await uploadAlbumPhoto({ data: { editHash: data.editHash, photoId: photo.id, data: dataUrl } });
                uploaded[photo.id] = stored && "url" in stored && stored.url ? stored.url : photo.url;
              }
              catalogPhotos.push({
                id: photo.id,
                blobUrl: uploaded[photo.id] ?? photo.url,
                sourceUrl: photo.url,
                googleId: photo.uid,
                takenAt: new Date(exif.takenAt || photo.takenAt).toISOString(),
                lat: exif.lat,
                lng: exif.lng,
                placeLabel: photo.place && photo.place !== UNKNOWN ? photo.place : "",
              });
              continue;
            }
          }
        } catch {
          /* fall through to metadata */
        }
      }
      uploaded[photo.id] = prev?.blobUrl || photo.thumb || photo.url;
      catalogPhotos.push({
        id: photo.id,
        blobUrl: uploaded[photo.id] ?? photo.thumb,
        sourceUrl: photo.url || prev?.sourceUrl,
        googleId: photo.uid || prev?.googleId,
        takenAt: photo.takenAt ? new Date(photo.takenAt).toISOString() : prev?.takenAt,
        placeLabel: photo.place && photo.place !== UNKNOWN ? photo.place : prev?.placeLabel || "",
      });
    }

    const catalogDays = data.days.map((day, index) => ({
      id: day.id,
      sortIndex: index,
      title: day.dateKey,
      placeLabel: day.place,
      photos: day.photos.map((photo, sort) => ({
        photoId: photo.id,
        inDayAlbum: photo.selected,
        sortIndex: sort,
      })),
    }));
    await mergeCatalog(sql, tripId, {
      photos: catalogPhotos,
      days: catalogDays,
      highlights: data.highlights.map((photoId, sortIndex) => ({ photoId, sortIndex })),
    });
    if (data.shareUrl) {
      await sql.query(
        `update trips set payload = jsonb_set(coalesce(payload, '{}'::jsonb), '{googleAlbumUrl}', to_jsonb($1::text), true), updated_at = now() where id = $2`,
        [data.shareUrl, tripId],
      );
    }
    return {
      ok: true as const,
      photos: uploaded,
      highlights: data.highlights,
      days: data.days.map((day) => ({
        id: day.id,
        place: day.place,
        selected: day.photos.filter((photo) => photo.selected).map((photo) => photo.id),
        all: day.photos.map((photo) => photo.id),
      })),
    };
  });


export const loadCuration = createServerFn({ method: "POST" })
  .validator(z.object({ editHash: z.string().min(8).max(64) }))
  .handler(async ({ data }): Promise<{ days: ImportDayDraft[]; highlights: string[]; urls: string[]; allowUploads: boolean; total: number }> => {
    const { requireOwner } = await import("./owner-session.server");
    if (!(await requireOwner(data.editHash))) return { days: [], highlights: [], urls: [], allowUploads: true, total: 0 };
    const { getSql } = await import("@/lib/db");
    const { loadCatalog } = await import("./catalog.server");
    const sql = await getSql();
    const trip = await sql<{ id: string; payload: unknown }>`select id, payload from trips where edit_hash = ${data.editHash} limit 1`;
    const row = trip[0];
    if (!row) return { days: [], highlights: [], urls: [], allowUploads: true, total: 0 };
    const catalog = await loadCatalog(sql, row.id);
    const photos = new Map(catalog.photos.map((photo) => [photo.id, photo]));
    const payload = (row.payload && typeof row.payload === "object" ? row.payload : {}) as {
      googleAlbumUrl?: string;
      googleAlbumUrls?: string[];
      allowUploads?: boolean;
    };
    const urls = [...(payload.googleAlbumUrls ?? []), payload.googleAlbumUrl ?? ""].filter(Boolean);
    const days: ImportDayDraft[] = catalog.days.map((day) => ({
      id: day.id,
      dateKey: day.title || "unknown",
      place: day.placeLabel || UNKNOWN,
      photos: day.photos.map((member) => {
        const photo = photos.get(member.photoId);
        const takenAt = photo?.takenAt ? Date.parse(photo.takenAt) || 0 : 0;
        const url = photo?.sourceUrl || photo?.blobUrl || "";
        return {
          id: member.photoId,
          uid: photo?.googleId || member.photoId,
          thumb: photo?.blobUrl || url,
          url,
          takenAt,
          dateKey: takenAt ? dayKey(takenAt) : day.title || "unknown",
          lat: photo?.lat,
          lng: photo?.lng,
          place: photo?.placeLabel || day.placeLabel || UNKNOWN,
        };
      }),
      selectedIds: day.photos.filter((member) => member.inDayAlbum).map((member) => member.photoId),
    }));
    return {
      days,
      highlights: catalog.highlights.map((item) => item.photoId),
      urls: [...new Set(urls)],
      allowUploads: payload.allowUploads !== false,
      total: catalog.photos.length,
    };
  });

export const saveCuration = createServerFn({ method: "POST" })
  .validator(draftSchema)
  .handler(async ({ data }) => {
    const { requireOwner } = await import("./owner-session.server");
    if (!(await requireOwner(data.editHash))) return { ok: false as const };
    const { getSql } = await import("@/lib/db");
    const { setDayAlbumFlags, loadCatalog } = await import("./catalog.server");
    const { uploadAlbumPhoto } = await import("./photo-store");
    const sql = await getSql();
    const trip = await sql<{ id: string }>`select id from trips where edit_hash = ${data.editHash} limit 1`;
    const tripId = trip[0]?.id;
    if (!tripId) return { ok: false as const };
    const existing = await loadCatalog(sql, tripId);
    const known = new Map(existing.photos.map((photo) => [photo.id, photo]));
    const uploaded: Record<string, string> = {};
    for (const photo of data.days.flatMap((day) => day.photos)) {
      if (!photo.selected && !data.highlights.includes(photo.id)) continue;
      const prev = known.get(photo.id);
      const stored = Boolean(prev?.blobUrl && (prev.blobUrl.startsWith("/media/") || prev.blobUrl.includes("blob.vercel")));
      if (stored || !photo.url) continue;
      try {
        const response = await fetch(photo.url);
        if (!response.ok) continue;
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length < 32) continue;
        const mime = response.headers.get("content-type") || "image/jpeg";
        const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
        if (dataUrl.length > 2_300_000) continue;
        const result = await uploadAlbumPhoto({ data: { editHash: data.editHash, photoId: photo.id, data: dataUrl } });
        if (result && "url" in result && result.url) {
          uploaded[photo.id] = result.url;
          await sql.query(`update photos set blob_url = $2 where id = $1`, [photo.id, result.url]);
        }
      } catch {
        /* keep existing url */
      }
    }
    await setDayAlbumFlags(
      sql,
      tripId,
      data.days.map((day) => ({
        id: day.id,
        title: day.dateKey,
        placeLabel: day.place,
        photos: day.photos.map((photo, sortIndex) => ({
          photoId: photo.id,
          inDayAlbum: photo.selected,
          sortIndex,
        })),
      })),
      data.highlights.map((photoId, sortIndex) => ({ photoId, sortIndex })),
    );
    return { ok: true as const, photos: uploaded };
  });

export const addCurationPhoto = createServerFn({ method: "POST" })
  .validator(
    z.object({
      editHash: z.string().min(8).max(64),
      dayId: z.string().min(3).max(64),
      photoId: z.string().min(3).max(80),
      dataUrl: z.string().min(24).max(2_400_000),
      place: z.string().max(160).optional(),
      takenAt: z.number().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { requireOwner } = await import("./owner-session.server");
    if (!(await requireOwner(data.editHash))) return { ok: false as const, url: "" };
    const { getSql } = await import("@/lib/db");
    const { uploadAlbumPhoto } = await import("./photo-store");
    const { ensureCatalog } = await import("./catalog.server");
    const sql = await getSql();
    await ensureCatalog(sql);
    const trip = await sql<{ id: string }>`select id from trips where edit_hash = ${data.editHash} limit 1`;
    const tripId = trip[0]?.id;
    if (!tripId) return { ok: false as const, url: "" };
    const stored = await uploadAlbumPhoto({ data: { editHash: data.editHash, photoId: data.photoId, data: data.dataUrl } });
    const url = stored && "url" in stored && stored.url ? stored.url : "";
    if (!url) return { ok: false as const, url: "" };
    const taken = data.takenAt ? new Date(data.takenAt).toISOString() : new Date().toISOString();
    await sql.query(
      `insert into photos (id, trip_id, blob_url, taken_at, place_label)
       values ($1, $2, $3, $4, $5)
       on conflict (id) do update set blob_url = excluded.blob_url`,
      [data.photoId, tripId, url, taken, data.place ?? ""],
    );
    const sort = await sql<{ n: number }>`select coalesce(max(sort_index), -1) as n from day_photos where day_id = ${data.dayId}`;
    await sql.query(
      `insert into day_photos (day_id, photo_id, in_day_album, sort_index)
       values ($1, $2, true, $3)
       on conflict (day_id, photo_id) do update set in_day_album = true`,
      [data.dayId, data.photoId, (sort[0]?.n ?? -1) + 1],
    );
    return { ok: true as const, url };
  });

export const saveCurationFlags = createServerFn({ method: "POST" })
  .validator(draftSchema)
  .handler(async ({ data }) => {
    const { requireOwner } = await import("./owner-session.server");
    if (!(await requireOwner(data.editHash))) return { ok: false as const };
    const { getSql } = await import("@/lib/db");
    const { mergeCatalog } = await import("./catalog.server");
    const sql = await getSql();
    const trip = await sql<{ id: string }>`select id from trips where edit_hash = ${data.editHash} limit 1`;
    const tripId = trip[0]?.id;
    if (!tripId) return { ok: false as const };
    const catalogPhotos = data.days.flatMap((day) =>
      day.photos.map((photo) => ({
        id: photo.id,
        blobUrl: photo.thumb || photo.url,
        sourceUrl: photo.url,
        googleId: photo.uid,
        takenAt: photo.takenAt ? new Date(photo.takenAt).toISOString() : undefined,
        placeLabel: photo.place && photo.place !== UNKNOWN ? photo.place : "",
      })),
    );
    await mergeCatalog(sql, tripId, {
      photos: catalogPhotos,
      days: data.days.map((day, index) => ({
        id: day.id,
        sortIndex: index,
        title: day.dateKey,
        placeLabel: day.place,
        photos: day.photos.map((photo, sortIndex) => ({
          photoId: photo.id,
          inDayAlbum: photo.selected,
          sortIndex,
        })),
      })),
      highlights: data.highlights.map((photoId, sortIndex) => ({ photoId, sortIndex })),
    });
    return { ok: true as const };
  });
