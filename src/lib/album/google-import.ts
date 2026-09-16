import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dayKey } from "./exif";
import { newId } from "./layout";

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
          id: newId("gph"),
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
    const grouped = new Map<string, ImportPhoto[]>();
    for (const photo of photos) {
      const list = grouped.get(photo.dateKey) ?? [];
      list.push(photo);
      grouped.set(photo.dateKey, list);
    }
    const days: ImportDayDraft[] = [...grouped.entries()].map(([dateKey, list]) => {
      const places = list.map((photo) => photo.place).filter((place) => place && place !== UNKNOWN);
      const tally = new Map<string, number>();
      for (const place of places) tally.set(place, (tally.get(place) ?? 0) + 1);
      const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      return {
        id: newId("imp"),
        dateKey,
        place: top || UNKNOWN,
        photos: list,
      };
    });
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
    const { getSql } = await import("@/lib/db");
    const { uploadAlbumPhoto } = await import("./photo-store");
    const { readExifBytes } = await import("./exif");
    const { replaceCatalog } = await import("./catalog.server");
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

    const needed = data.days.flatMap((day) =>
      day.photos.filter((photo) => photo.selected || data.highlights.includes(photo.id)),
    );
    for (const photo of needed) {
      try {
        const response = await fetch(photo.url);
        if (!response.ok) continue;
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length < 32) continue;
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
      } catch {
        uploaded[photo.id] = photo.url;
        catalogPhotos.push({
          id: photo.id,
          blobUrl: photo.url,
          sourceUrl: photo.url,
          googleId: photo.uid,
          takenAt: new Date(photo.takenAt).toISOString(),
          placeLabel: photo.place || "",
        });
      }
    }

    const catalogDays = data.days.map((day, index) => ({
      id: day.id,
      sortIndex: index,
      title: "",
      placeLabel: day.place,
      photos: day.photos.map((photo, sort) => ({
        photoId: photo.id,
        inDayAlbum: photo.selected,
        sortIndex: sort,
      })),
    }));
    await replaceCatalog(sql, tripId, {
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
