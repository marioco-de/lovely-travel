import { dayKey, readPhotoExif } from "./exif";
import { reversePlace, type PlaceHit } from "./geocode";
import { newId } from "./layout";
import { shortPlaceLine, type GeoHit } from "./places";

export type BulkPhoto = {
  id: string;
  file: File;
  name: string;
  size: number;
  takenAt: number;
  lat?: number;
  lng?: number;
  preview: string;
};

export type BulkDayDraft = {
  id: string;
  dateKey: string;
  place: string;
  geo?: GeoHit;
  photos: BulkPhoto[];
};

const UNKNOWN = { en: "Unknown place", de: "Unbekannter Ort" };

export function unknownPlace(locale: "en" | "de") {
  return UNKNOWN[locale];
}

function dupKey(file: File) {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

export async function ingestFiles(
  files: File[],
  onProgress: (done: number, total: number) => void,
): Promise<BulkPhoto[]> {
  const unique: File[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) continue;
    if (file.size < 32) continue;
    const key = dupKey(file);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(file);
  }
  const photos: BulkPhoto[] = [];
  for (let i = 0; i < unique.length; i += 1) {
    const file = unique[i]!;
    const exif = await readPhotoExif(file);
    photos.push({
      id: newId("pic"),
      file,
      name: file.name,
      size: file.size,
      takenAt: exif.takenAt,
      lat: exif.lat,
      lng: exif.lng,
      preview: URL.createObjectURL(file),
    });
    onProgress(i + 1, unique.length);
  }
  photos.sort((a, b) => a.takenAt - b.takenAt || a.name.localeCompare(b.name));
  return photos;
}

function centroid(photos: BulkPhoto[]) {
  const withGeo = photos.filter((photo) => photo.lat != null && photo.lng != null);
  if (withGeo.length === 0) return null;
  return {
    lat: withGeo.reduce((sum, photo) => sum + (photo.lat ?? 0), 0) / withGeo.length,
    lng: withGeo.reduce((sum, photo) => sum + (photo.lng ?? 0), 0) / withGeo.length,
  };
}

export async function draftsFromPhotos(photos: BulkPhoto[], unknown: string): Promise<BulkDayDraft[]> {
  const byDay = new Map<string, BulkPhoto[]>();
  for (const photo of photos) {
    const key = dayKey(photo.takenAt);
    const list = byDay.get(key) ?? [];
    list.push(photo);
    byDay.set(key, list);
  }
  const drafts: BulkDayDraft[] = [];
  for (const [dateKey, group] of [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const center = centroid(group);
    let place = unknown;
    let geo: GeoHit | undefined;
    if (center) {
      try {
        const hit: PlaceHit | null = await reversePlace({ data: center });
        if (hit) {
          place = shortPlaceLine(hit.name || hit.address);
          geo = { lat: hit.lat, lng: hit.lng, address: hit.address };
        }
      } catch {
        /* keep unknown */
      }
      await new Promise((resolve) => window.setTimeout(resolve, 800));
    }
    drafts.push({
      id: newId("import-day"),
      dateKey,
      place,
      geo,
      photos: group,
    });
  }
  return drafts;
}

export function revokeDrafts(drafts: BulkDayDraft[]) {
  for (const day of drafts) {
    for (const photo of day.photos) URL.revokeObjectURL(photo.preview);
  }
}

export function splitDraft(drafts: BulkDayDraft[], dayId: string, afterIndex: number): BulkDayDraft[] {
  return drafts.flatMap((day) => {
    if (day.id !== dayId || afterIndex < 0 || afterIndex >= day.photos.length - 1) return [day];
    const first = day.photos.slice(0, afterIndex + 1);
    const second = day.photos.slice(afterIndex + 1);
    return [
      { ...day, photos: first },
      { id: newId("import-day"), dateKey: day.dateKey, place: day.place, geo: day.geo, photos: second },
    ];
  });
}

export function mergeDraftUp(drafts: BulkDayDraft[], index: number): BulkDayDraft[] {
  if (index <= 0) return drafts;
  const prev = drafts[index - 1];
  const current = drafts[index];
  if (!prev || !current) return drafts;
  const merged: BulkDayDraft = {
    ...prev,
    photos: [...prev.photos, ...current.photos].sort((a, b) => a.takenAt - b.takenAt),
    geo: prev.geo ?? current.geo,
    place: prev.place || current.place,
  };
  return drafts.filter((_, i) => i !== index).map((day, i) => (i === index - 1 ? merged : day));
}
