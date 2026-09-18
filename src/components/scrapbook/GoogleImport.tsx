import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { alignTakenAt, dayKey, isDayKey } from "@/lib/album/exif";
import { addCurationPhoto, confirmGoogleLink, loadCuration, previewGoogleLink, saveCuration, saveCurationFlags, type ImportDayDraft, type ImportPhoto } from "@/lib/album/google-import";
import { COVER_ID, newId } from "@/lib/album/layout";
import { useAlbum } from "@/lib/album/store";
import { useFormatDay, useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./ConfirmDialog";
import { DayMark } from "./DayMark";
import { EditGear, GearAction } from "./EditGear";

const DAY_CAP = 20;
const HIGHLIGHT_CAP = 12;
const HIGHLIGHT_SEED = 5;
const DENSITY_KEY = "lovely-curate-density";
const SORT_KEY = "lovely-curate-newest";
const UNKNOWN = "Unbekannter Ort";
const DESKTOP_COLS = [8, 6, 4, 2] as const;
const MOBILE_COLS = [4, 3, 2, 1] as const;

type Density = 0 | 1 | 2 | 3;
type Tool = "select" | "split" | "star";
type DayDraft = ImportDayDraft & { selected: Set<string> };
type DragPhoto = { dayId: string; photoId: string; index: number; thumb: string };
type CtxMenu = { dayId: string; photoId: string; index: number; x: number; y: number };

function readDensity(): Density {
  try {
    const raw = Number(localStorage.getItem(DENSITY_KEY));
    if (raw === 0 || raw === 1 || raw === 2 || raw === 3) return raw;
  } catch {
    /* ignore */
  }
  return 0;
}

function toLocalInput(ms: number) {
  if (!ms) return "";
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string) {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function photoMatchKey(photo: ImportPhoto) {
  if (photo.uid?.startsWith("AF1Qip")) return photo.uid;
  if (photo.id.startsWith("AF1Qip")) return photo.id;
  const pw = (photo.url || photo.thumb).split("=")[0]?.match(/\/pw\/([^/?]+)/);
  return pw?.[1] || photo.uid || photo.id;
}

function uniquePhotos(photos: ImportPhoto[]) {
  const seen = new Set<string>();
  const out: ImportPhoto[] = [];
  for (const photo of photos) {
    const key = photoMatchKey(photo);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(photo);
  }
  return out;
}

function readNewestFirst() {
  try {
    return localStorage.getItem(SORT_KEY) === "1";
  } catch {
    return false;
  }
}

function sortDays(days: DayDraft[]) {
  return [...days].sort((a, b) => {
    const date = a.dateKey.localeCompare(b.dateKey);
    if (date) return date;
    const at = Math.min(...a.photos.map((photo) => photo.takenAt || Number.MAX_SAFE_INTEGER));
    const bt = Math.min(...b.photos.map((photo) => photo.takenAt || Number.MAX_SAFE_INTEGER));
    if (at !== bt) return at - bt;
    return a.place.localeCompare(b.place, "de");
  });
}

function viewDays(days: DayDraft[], newestFirst: boolean) {
  const sorted = sortDays(days);
  return newestFirst ? sorted.reverse() : sorted;
}

function exclusiveDays(days: DayDraft[]) {
  const owner = new Map<string, string>();
  const sorted = sortDays(days);
  for (const day of sorted) {
    for (const photo of day.photos) {
      const key = photoMatchKey(photo);
      if (!owner.has(key)) owner.set(key, day.id);
    }
  }
  for (const day of sorted) {
    for (const photo of day.photos) {
      if (day.selected.has(photo.id)) owner.set(photoMatchKey(photo), day.id);
    }
  }
  return sorted
    .map((day) => {
      const photos = uniquePhotos(day.photos.filter((photo) => owner.get(photoMatchKey(photo)) === day.id));
      const ids = new Set(photos.map((photo) => photo.id));
      return {
        ...day,
        photos,
        selected: new Set([...day.selected].filter((id) => ids.has(id))),
      };
    })
    .filter((day) => day.photos.length > 0);
}

function fromDays(days: ImportDayDraft[], capNew: boolean): DayDraft[] {
  return exclusiveDays(
    days
      .filter((day) => isDayKey(day.dateKey))
      .map((day) => {
        const photos = uniquePhotos(day.photos).sort((a, b) => (a.takenAt || 0) - (b.takenAt || 0));
        const selectedIds = new Set(day.selectedIds ?? (capNew ? photos.slice(0, DAY_CAP).map((photo) => photo.id) : []));
        return {
          ...day,
          photos,
          selected: new Set(photos.filter((photo) => selectedIds.has(photo.id)).map((photo) => photo.id)),
        };
      }),
  );
}

function mergeRefresh(current: DayDraft[], incoming: ImportDayDraft[]): DayDraft[] {
  const hiddenDates = new Set(current.filter((day) => day.hidden).map((day) => day.dateKey));
  const next: DayDraft[] = current
    .filter((day) => isDayKey(day.dateKey))
    .map((day) => ({
    ...day,
    photos: day.photos.map((photo) => ({ ...photo })),
    selected: new Set(day.selected),
  }));
  const byUid = new Map<string, { day: DayDraft; photo: ImportPhoto }>();
  for (const day of next) {
    for (const photo of day.photos) byUid.set(photoMatchKey(photo), { day, photo });
  }

  function dayFor(dateKey: string, place: string) {
    const exact = next.find((day) => day.dateKey === dateKey && day.place === place);
    if (exact) return exact;
    const sameDate = next.find((day) => day.dateKey === dateKey);
    if (sameDate && (place === UNKNOWN || sameDate.place === UNKNOWN || sameDate.place === place)) return sameDate;
    const created: DayDraft = {
      id: `imp-${Date.now().toString(36)}-${next.length}`,
      dateKey,
      place,
      photos: [],
      selected: new Set(),
      hidden: hiddenDates.has(dateKey),
    };
    const insertAt = next.findIndex((day) => day.dateKey > dateKey);
    if (insertAt < 0) next.push(created);
    else next.splice(insertAt, 0, created);
    return created;
  }

  for (const draft of incoming) {
    for (const fresh of draft.photos) {
      const uid = photoMatchKey(fresh);
      const hit = byUid.get(uid);
      if (hit) {
        hit.photo.thumb = fresh.thumb || hit.photo.thumb;
        hit.photo.url = fresh.url || hit.photo.url;
        if (!hit.photo.takenAt && fresh.takenAt) {
          hit.photo.takenAt = fresh.takenAt;
          if (!hit.photo.dateKey) hit.photo.dateKey = fresh.dateKey;
        }
        if ((!hit.photo.place || hit.photo.place === UNKNOWN) && fresh.place && fresh.place !== UNKNOWN) {
          hit.photo.place = fresh.place;
        }
        if (fresh.kind) hit.photo.kind = fresh.kind;
        if (fresh.lat != null && hit.photo.lat == null) hit.photo.lat = fresh.lat;
        if (fresh.lng != null && hit.photo.lng == null) hit.photo.lng = fresh.lng;
        const destKey = hit.photo.dateKey || draft.dateKey;
        if (destKey !== hit.day.dateKey) {
          const wasSelected = hit.day.selected.has(hit.photo.id);
          hit.day.photos = hit.day.photos.filter((item) => item.id !== hit.photo.id);
          hit.day.selected.delete(hit.photo.id);
          const dest = dayFor(destKey, hit.photo.place || draft.place);
          dest.photos.push(hit.photo);
          if (wasSelected) dest.selected.add(hit.photo.id);
          byUid.set(uid, { day: dest, photo: hit.photo });
        }
        continue;
      }
      const dest = dayFor(draft.dateKey, draft.place);
      dest.photos.push(fresh);
      byUid.set(uid, { day: dest, photo: fresh });
    }
  }

  for (const day of next) {
    day.photos = uniquePhotos(day.photos);
    day.photos.sort((a, b) => (a.takenAt || 0) - (b.takenAt || 0));
    day.selected = new Set([...day.selected].filter((id) => day.photos.some((photo) => photo.id === id)));
    if (hiddenDates.has(day.dateKey)) day.hidden = true;
  }
  return exclusiveDays(next.filter((day) => day.photos.length > 0 && isDayKey(day.dateKey)));
}

async function fileToDataUrl(file: File) {
  const blob = await compressUpload(file);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function compressUpload(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.size < 380_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1920;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    bitmap.close();
    return blob ?? file;
  } catch {
    return file;
  }
}

export function GoogleImport() {
  const t = useT();
  const formatDay = useFormatDay();
  const editHash = useAlbum((s) => s.editHash);
  const savedUrl = useAlbum((s) => s.googleAlbumUrl);
  const albumUrls = useAlbum((s) => s.googleAlbumUrls);
  const allowUploads = useAlbum((s) => s.allowUploads);
  const addGoogleAlbumUrl = useAlbum((s) => s.addGoogleAlbumUrl);
  const removeGoogleAlbumUrl = useAlbum((s) => s.removeGoogleAlbumUrl);
  const publishCurationDay = useAlbum((s) => s.publishCurationDay);
  const syncCuration = useAlbum((s) => s.syncCuration);
  const layoutDays = useAlbum((s) => s.layout.days);
  const [url, setUrl] = useState(savedUrl);
  const [days, setDays] = useState<DayDraft[] | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);
  const [pendingPreview, setPendingPreview] = useState(false);
  const [density, setDensity] = useState<Density>(0);
  const [newestFirst, setNewestFirst] = useState(false);
  const [wide, setWide] = useState(true);
  const [tool, setTool] = useState<Tool>("select");
  const [fanOpen, setFanOpen] = useState(false);
  const [dropDay, setDropDay] = useState<string | null>(null);
  const [lift, setLift] = useState<{ photo: DragPhoto; x: number; y: number } | null>(null);
  const [menu, setMenu] = useState<CtxMenu | null>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [picking, setPicking] = useState(false);
  const [pickMenu, setPickMenu] = useState<string | null>(null);
  const [hideOff, setHideOff] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());
  const [removeUrl, setRemoveUrl] = useState<string | null>(null);
  const clickTimer = useRef(0);
  const lastTap = useRef<{ id: string; time: number } | null>(null);
  const dragRef = useRef<DragPhoto | null>(null);
  const didDrag = useRef(false);
  const pressRef = useRef<{ photo: DragPhoto; x: number; y: number; pointerId: number; timer: number } | null>(null);
  const previewLock = useRef(false);
  const daysRef = useRef<DayDraft[] | null>(null);
  const highlightsRef = useRef<string[]>([]);
  const flagTimer = useRef(0);

  daysRef.current = days;
  highlightsRef.current = highlights;

  useEffect(() => {
    setDensity(readDensity());
    setNewestFirst(readNewestFirst());
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!editHash) return;
    let active = true;
    void loadCuration({ data: { editHash } }).then((result) => {
      if (!active || previewLock.current || !result.days.length) return;
      setDays(fromDays(result.days, false));
      setHighlights(result.highlights);
      setTotal(result.total);
      setPendingPreview(false);
      if (result.urls.length) {
        for (const item of result.urls) addGoogleAlbumUrl(item);
        setUrl((current) => current || result.urls[0]!);
      }
    });
    return () => {
      active = false;
    };
  }, [editHash]);

  useEffect(() => {
    try {
      localStorage.setItem(DENSITY_KEY, String(density));
    } catch {
      /* ignore */
    }
  }, [density]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(null);
    };
    const onDown = (event: MouseEvent) => {
      const node = event.target as HTMLElement | null;
      if (node?.closest(".curate-ctx")) return;
      setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [menu]);

  useEffect(() => {
    if (!pickMenu) return;
    const onDown = (event: MouseEvent) => {
      const node = event.target as HTMLElement | null;
      if (node?.closest("[data-pick-menu]")) return;
      setPickMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [pickMenu]);

  useEffect(() => {
    if (picked.size === 0 && !pickMenu) setPicking(false);
  }, [picked, pickMenu]);

  const cols = wide ? DESKTOP_COLS[density] : MOBILE_COLS[density];

  async function preview() {
    const share = url.trim();
    if (share.length < 12) return;
    const known = albumUrls.includes(share) || share === savedUrl;
    if (known && days?.length) {
      await refreshAlbum(share);
      return;
    }
    setBusy(true);
    setError(false);
    setNeedsAuth(false);
    try {
      const result = await previewGoogleLink({ data: { url: share } });
      if (result.needsAuth || !result.days.length) {
        setNeedsAuth(true);
        return;
      }
      const drafted = fromDays(result.days, true);
      previewLock.current = true;
      if (!days?.length) {
        setDays(drafted);
        setTotal(result.total ?? drafted.reduce((sum, day) => sum + day.photos.length, 0));
        setHighlights(
          drafted
            .map((day) => [...day.selected][0])
            .filter((id): id is string => Boolean(id))
            .slice(0, HIGHLIGHT_SEED),
        );
      } else {
        const added = drafted.flatMap((day) => day.photos.map((photo) => photo.id));
        setDays((current) => (current?.length ? [...current, ...drafted] : drafted));
        setTotal((current) => current + drafted.reduce((sum, day) => sum + day.photos.length, 0));
        setFreshIds(new Set(added));
      }
      addGoogleAlbumUrl(share);
      setPendingPreview(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function refreshAlbum(share: string) {
    if (share.length < 12) return;
    setBusy(true);
    setError(false);
    setNeedsAuth(false);
    try {
      const result = await previewGoogleLink({ data: { url: share } });
      if (result.needsAuth || !result.days.length) {
        setNeedsAuth(true);
        return;
      }
      previewLock.current = true;
      const known = new Set((daysRef.current ?? []).flatMap((day) => day.photos.map((photo) => photoMatchKey(photo))));
      const merged = mergeRefresh(daysRef.current ?? [], result.days);
      const added = merged.flatMap((day) => day.photos).filter((photo) => !known.has(photoMatchKey(photo))).map((photo) => photo.id);
      setDays(merged);
      setFreshIds(new Set(added));
      setTotal(result.total ?? merged.reduce((sum, day) => sum + day.photos.length, 0));
      addGoogleAlbumUrl(share);
      setPendingPreview(true);
      persistFlags(merged);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function connectFallback() {
    if (!editHash) return;
    const { runGoogleImport } = await import("@/lib/album/google-client");
    await runGoogleImport(editHash);
  }

  function curationPayload(list = daysRef.current, stars = highlightsRef.current) {
    return {
      editHash: editHash!,
      shareUrl: url.trim() || undefined,
      highlights: stars,
      days: exclusiveDays((list ?? []).filter((day) => isDayKey(day.dateKey))).map((day) => ({
        id: day.id,
        dateKey: day.dateKey,
        place: day.place,
        photos: day.photos.map((photo) => ({
          id: photo.id,
          uid: photo.uid,
          url: photo.url,
          thumb: photo.thumb,
          takenAt: photo.takenAt,
          selected: day.selected.has(photo.id),
          place: photo.place || day.place,
        })),
        hidden: Boolean(day.hidden),
      })),
    };
  }

  function persistFlags(nextDays?: DayDraft[] | null, nextHighlights?: string[]) {
    const list = nextDays ? exclusiveDays(nextDays) : daysRef.current;
    const stars = nextHighlights ?? highlightsRef.current;
    if (nextDays !== undefined) daysRef.current = list;
    if (nextHighlights) highlightsRef.current = nextHighlights;
    if (!editHash || !list?.length) return;
    syncCuration({
      highlights: stars,
      days: list.map((day) => ({
        id: day.id,
        place: day.place,
        selected: [...day.selected],
        all: day.photos.map((photo) => photo.id),
      })),
    });
    window.clearTimeout(flagTimer.current);
    flagTimer.current = window.setTimeout(() => {
      void saveCurationFlags({ data: curationPayload(list, stars) }).catch(() => setError(true));
    }, 400);
  }

  async function publishDay(day: DayDraft) {
    if (!editHash) return;
    setBusy(true);
    setError(false);
    try {
      const payload = curationPayload();
      const uploaded = pendingPreview
        ? await confirmGoogleLink({ data: payload })
        : await saveCuration({ data: payload });
      if (!uploaded.ok) {
        setError(true);
        return;
      }
      const photos: Record<string, string> = { ...uploaded.photos };
      for (const photo of day.photos) {
        if (!photos[photo.id]) photos[photo.id] = photo.url || photo.thumb;
      }
      for (const star of highlights) {
        if (photos[star]) continue;
        const hit = days?.flatMap((item) => item.photos).find((item) => item.id === star);
        if (hit) photos[star] = hit.url || hit.thumb;
      }
      publishCurationDay({
        id: day.id,
        place: day.place,
        selected: [...day.selected],
        all: day.photos.map((photo) => photo.id),
        photos,
        highlights,
        videoIds: (days ?? [])
          .flatMap((item) => item.photos)
          .filter((photo) => photo.kind === "video")
          .map((photo) => photo.id),
      });
      setPendingPreview(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function uploadToDay(dayId: string, file: File) {
    if (!editHash) return;
    setBusy(true);
    setError(false);
    try {
      const photoId = newId("upl");
      const dataUrl = await fileToDataUrl(file);
      const day = days?.find((item) => item.id === dayId);
      const result = await addCurationPhoto({
        data: {
          editHash,
          dayId,
          photoId,
          dataUrl,
          place: day?.place,
          takenAt: Date.now(),
        },
      });
      if (!result.ok || !result.url) {
        setError(true);
        return;
      }
      const photo: ImportPhoto = {
        id: photoId,
        uid: photoId,
        thumb: result.url,
        url: result.url,
        takenAt: Date.now(),
        dateKey: day?.dateKey || dayKey(Date.now()),
        place: day?.place || UNKNOWN,
      };
      setDays(
        (current) =>
          current?.map((item) =>
            item.id === dayId
              ? { ...item, photos: [...item.photos, photo], selected: new Set([...item.selected, photoId]) }
              : item,
          ) ?? null,
      );
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  function togglePhoto(dayId: string, photoId: string) {
    setDays((current) => {
      const next = exclusiveDays(
        current?.map((day) => {
          if (day.id !== dayId) return day;
          const selected = new Set(day.selected);
          if (selected.has(photoId)) selected.delete(photoId);
          else selected.add(photoId);
          return { ...day, selected };
        }) ?? [],
      );
      persistFlags(next);
      return next;
    });
  }

  function splitFrom(dayId: string, photoIndex: number) {
    setDays((current) => {
      if (!current) return current;
      const index = current.findIndex((day) => day.id === dayId);
      const day = current[index];
      if (!day || photoIndex <= 0 || photoIndex >= day.photos.length) return current;
      const left = day.photos.slice(0, photoIndex);
      const right = day.photos.slice(photoIndex);
      const next: DayDraft = {
        id: `imp-${Date.now().toString(36)}`,
        dateKey: day.dateKey,
        place: day.place,
        photos: right,
        selected: new Set([...day.selected].filter((id) => right.some((photo) => photo.id === id))),
      };
      const updated: DayDraft = {
        ...day,
        photos: left,
        selected: new Set([...day.selected].filter((id) => left.some((photo) => photo.id === id))),
      };
      const copy = [...current];
      copy.splice(index, 1, updated, next);
      return copy;
    });
  }

  function hideDate(dateKey: string) {
    setDays((current) => {
      const next =
        current?.map((day) => (day.dateKey === dateKey ? { ...day, hidden: !day.hidden } : day)) ?? null;
      persistFlags(next);
      return next;
    });
  }

  function mergePrev(dayId: string) {
    setDays((current) => {
      if (!current) return current;
      const shown = viewDays(current, newestFirst);
      const index = shown.findIndex((day) => day.id === dayId);
      if (index < 1) return current;
      const prev = shown[index - 1]!;
      const day = shown[index]!;
      const photos = [...prev.photos, ...day.photos].map((photo) => ({
        ...photo,
        dateKey: prev.dateKey,
        takenAt: alignTakenAt(photo.takenAt, prev.dateKey),
      }));
      const selected = new Set([...prev.selected, ...day.selected]);
      const copy = current.filter((item) => item.id !== day.id).map((item) => (item.id === prev.id ? { ...prev, photos, selected } : item));
      const sorted = sortDays(copy);
      persistFlags(sorted);
      return sorted;
    });
  }

  function toggleStar(id: string) {
    setHighlights((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      const capped = next.length > HIGHLIGHT_CAP ? next.slice(next.length - HIGHLIGHT_CAP) : next;
      persistFlags(daysRef.current, capped);
      return capped;
    });
  }

  function applyPhoto(photoId: string, patch: Partial<Pick<ImportPhoto, "takenAt" | "place">>) {
    setDays((current) => {
      if (!current) return current;
      let found: ImportPhoto | undefined;
      let wasSelected = false;
      for (const day of current) {
        const photo = day.photos.find((item) => item.id === photoId);
        if (photo) {
          found = { ...photo };
          wasSelected = day.selected.has(photoId);
          break;
        }
      }
      if (!found) return current;
      if (patch.takenAt != null) {
        const key = dayKey(patch.takenAt);
        if (!key) return current;
        found.takenAt = patch.takenAt;
        found.dateKey = key;
      }
      if (patch.place != null) found.place = patch.place.trim() || UNKNOWN;
      const stripped = current.map((day) => ({
        ...day,
        photos: day.photos.filter((item) => item.id !== photoId),
        selected: new Set([...day.selected].filter((id) => id !== photoId)),
      }));
      let destIndex = stripped.findIndex((day) => day.dateKey === found!.dateKey && day.place === found!.place);
      let next = stripped.map((day) => ({ ...day, photos: [...day.photos], selected: new Set(day.selected) }));
      if (destIndex < 0) {
        const dest: DayDraft = {
          id: `imp-${Date.now().toString(36)}`,
          dateKey: found.dateKey,
          place: found.place,
          photos: [],
          selected: new Set(),
        };
        destIndex = next.findIndex((day) => day.dateKey > found!.dateKey);
        if (destIndex < 0) {
          next = [...next, dest];
          destIndex = next.length - 1;
        } else {
          next = [...next.slice(0, destIndex), dest, ...next.slice(destIndex)];
        }
      }
      const dest = next[destIndex]!;
      dest.photos = [...dest.photos, found].sort((a, b) => (a.takenAt || 0) - (b.takenAt || 0));
      if (wasSelected) dest.selected.add(photoId);
      const cleaned = sortDays(next.filter((day) => day.photos.length > 0));
      persistFlags(cleaned);
      return cleaned;
    });
  }

  function applyPicked(patch: Partial<Pick<ImportPhoto, "takenAt" | "place">>) {
    setDays((current) => {
      if (!current || !picked.size) return current;
      const moving: { photo: ImportPhoto; selected: boolean }[] = [];
      const stripped = current.map((day) => {
        const selected = new Set(day.selected);
        const photos: ImportPhoto[] = [];
        for (const photo of day.photos) {
          if (!picked.has(photo.id)) {
            photos.push(photo);
            continue;
          }
          const next = { ...photo };
          if (patch.takenAt != null) {
            const key = dayKey(patch.takenAt);
            if (!key) continue;
            next.takenAt = patch.takenAt;
            next.dateKey = key;
          }
          if (patch.place != null) next.place = patch.place.trim() || UNKNOWN;
          moving.push({ photo: next, selected: day.selected.has(photo.id) });
          selected.delete(photo.id);
        }
        return { ...day, photos, selected };
      });
      let next = stripped.map((day) => ({ ...day, photos: [...day.photos], selected: new Set(day.selected) }));
      for (const item of moving) {
        let destIndex = next.findIndex((day) => day.dateKey === item.photo.dateKey && day.place === item.photo.place);
        if (destIndex < 0) {
          const dest: DayDraft = {
            id: `imp-${Date.now().toString(36)}-${item.photo.id.slice(-6)}`,
            dateKey: item.photo.dateKey,
            place: item.photo.place,
            photos: [],
            selected: new Set(),
          };
          destIndex = next.findIndex((day) => day.dateKey > item.photo.dateKey);
          if (destIndex < 0) {
            next = [...next, dest];
            destIndex = next.length - 1;
          } else {
            next = [...next.slice(0, destIndex), dest, ...next.slice(destIndex)];
          }
        }
        const dest = next[destIndex]!;
        dest.photos = [...dest.photos, item.photo].sort((a, b) => (a.takenAt || 0) - (b.takenAt || 0));
        if (item.selected) dest.selected.add(item.photo.id);
      }
      const cleaned = sortDays(next.filter((day) => day.photos.length > 0));
      persistFlags(cleaned);
      return cleaned;
    });
  }

  function movePhoto(fromDayId: string, photoId: string, toDayId: string, toIndex: number) {
    setDays((current) => {
      if (!current) return current;
      const source = current.find((day) => day.id === fromDayId);
      const fromIndex = source?.photos.findIndex((photo) => photo.id === photoId) ?? -1;
      const photo = source?.photos[fromIndex];
      if (!source || !photo || fromIndex < 0) return current;
      const pulled = current.map((day) => {
        if (day.id !== fromDayId) return { ...day, photos: [...day.photos], selected: new Set(day.selected) };
        return {
          ...day,
          photos: day.photos.filter((item) => item.id !== photoId),
          selected: new Set([...day.selected].filter((id) => id !== photoId)),
        };
      });
      const destPos = pulled.findIndex((day) => day.id === toDayId);
      if (destPos < 0) return current;
      const dest = pulled[destPos]!;
      let insertAt = Math.max(0, Math.min(toIndex, dest.photos.length));
      if (fromDayId === toDayId && fromIndex < toIndex) insertAt = Math.max(0, toIndex - 1);
      const photos = [...dest.photos];
      photos.splice(insertAt, 0, photo);
      const selected = new Set(dest.selected);
      if (source.selected.has(photoId)) selected.add(photoId);
      pulled[destPos] = { ...dest, photos, selected };
      return pulled.filter((day) => day.photos.length > 0);
    });
  }

  function togglePicked(id: string) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function pickAll(dayId: string) {
    const day = days?.find((item) => item.id === dayId);
    if (!day) return;
    setPicked((current) => new Set([...current, ...day.photos.map((photo) => photo.id)]));
    setPicking(true);
    setPickMenu(null);
  }

  function pickNone(dayId: string) {
    const day = days?.find((item) => item.id === dayId);
    if (!day) return;
    const ids = new Set(day.photos.map((photo) => photo.id));
    setPicked((current) => new Set([...current].filter((id) => !ids.has(id))));
    setPickMenu(null);
  }

  function setPickedInDay(on: boolean) {
    setDays((current) => {
      const next =
        current?.map((day) => {
          const selected = new Set(day.selected);
          for (const id of picked) {
            if (!day.photos.some((photo) => photo.id === id)) continue;
            if (on) selected.add(id);
            else selected.delete(id);
          }
          return { ...day, selected };
        }) ?? null;
      persistFlags(next);
      return next;
    });
  }

  function starPicked() {
    setHighlights((current) => {
      const next = [...current];
      for (const id of picked) {
        if (!next.includes(id)) next.push(id);
      }
      const capped = next.length > HIGHLIGHT_CAP ? next.slice(next.length - HIGHLIGHT_CAP) : next;
      persistFlags(daysRef.current, capped);
      return capped;
    });
  }

  function handleTap(dayId: string, photo: ImportPhoto, photoIndex: number) {
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    if (tool === "star") {
      toggleStar(photo.id);
      setTool("select");
      return;
    }
    if (tool === "split") {
      splitFrom(dayId, photoIndex);
      setTool("select");
      return;
    }
    if (picking) {
      togglePicked(photo.id);
      return;
    }
    const now = Date.now();
    if (lastTap.current && lastTap.current.id === photo.id && now - lastTap.current.time < 420) {
      window.clearTimeout(clickTimer.current);
      lastTap.current = null;
      toggleStar(photo.id);
      return;
    }
    lastTap.current = { id: photo.id, time: now };
    window.clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(() => togglePhoto(dayId, photo.id), 420);
  }

  function dropOn(dayId: string, index: number) {
    const drag = dragRef.current;
    if (!drag) return;
    movePhoto(drag.dayId, drag.photoId, dayId, index);
    didDrag.current = true;
    dragRef.current = null;
    setDropDay(null);
    setLift(null);
  }

  function clearPress() {
    const press = pressRef.current;
    if (press) window.clearTimeout(press.timer);
    pressRef.current = null;
  }

  function startLift(photo: DragPhoto, x: number, y: number) {
    dragRef.current = photo;
    didDrag.current = true;
    window.clearTimeout(clickTimer.current);
    setMenu(null);
    setLift({ photo, x, y });
  }

  function onPointerDown(event: ReactPointerEvent, photo: DragPhoto) {
    if (event.button !== 0) return;
    if (tool !== "select") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    clearPress();
    const pointerId = event.pointerId;
    const timer =
      event.pointerType === "mouse"
        ? 0
        : window.setTimeout(() => {
            const press = pressRef.current;
            if (!press || press.pointerId !== pointerId) return;
            startLift(press.photo, press.x, press.y);
          }, 340);
    pressRef.current = { photo, x: event.clientX, y: event.clientY, pointerId, timer };
  }

  function onPointerMove(event: ReactPointerEvent) {
    const press = pressRef.current;
    if (press && !lift) {
      const dist = Math.hypot(event.clientX - press.x, event.clientY - press.y);
      if (event.pointerType === "mouse" && dist > 8) {
        clearPress();
        startLift(press.photo, event.clientX, event.clientY);
      } else if (event.pointerType !== "mouse" && dist > 12) {
        clearPress();
      }
    }
    if (lift) {
      setLift((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));
      const node = document.elementFromPoint(event.clientX, event.clientY);
      const dayId = node?.closest("[data-curate-day]")?.getAttribute("data-curate-day") ?? null;
      setDropDay(dayId);
    }
  }

  function onPointerUp(event: ReactPointerEvent, dayId: string, photo: ImportPhoto, photoIndex: number) {
    const dragging = dragRef.current && didDrag.current;
    if (dragging) {
      const node = document.elementFromPoint(event.clientX, event.clientY);
      const cell = node?.closest("[data-curate-index]");
      const dayNode = node?.closest("[data-curate-day]");
      const targetDay = dayNode?.getAttribute("data-curate-day");
      const index = cell?.getAttribute("data-curate-index");
      if (targetDay) dropOn(targetDay, index != null ? Number(index) : Number.MAX_SAFE_INTEGER);
      else {
        dragRef.current = null;
        setLift(null);
        setDropDay(null);
      }
      clearPress();
      return;
    }
    clearPress();
    setLift(null);
    if (event.button !== 0) return;
    handleTap(dayId, photo, photoIndex);
  }

  const linkedAlbums = [...new Set([...albumUrls, savedUrl].filter((item) => item.trim().length > 12))];
  const menuPhoto = menu && days ? days.find((day) => day.id === menu.dayId)?.photos.find((photo) => photo.id === menu.photoId) : null;
  const menuDay = menu && days ? days.find((day) => day.id === menu.dayId) : null;

  return (
    <div className="grid gap-3">
      <span className="font-display text-kicker tracking-widest text-ink-soft uppercase">{t("ui.googleAlbum")}</span>
      {linkedAlbums.length ? (
        <ul className="grid gap-1">
          {linkedAlbums.map((item) => (
            <li key={item} className="flex min-w-0 items-center gap-1 font-typewriter text-kicker tracking-wide text-ink-soft">
              <span className="min-w-0 truncate">{item}</span>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center text-stamp"
                aria-label={t("ui.googleRefresh")}
                title={t("ui.googleRefresh")}
                disabled={busy}
                onClick={() => void refreshAlbum(item)}
              >
                <RefreshIcon />
              </button>
              <button
                type="button"
                className="grid h-7 w-7 shrink-0 place-items-center text-lg leading-none"
                aria-label={t("ui.removeAlbum")}
                title={t("ui.removeAlbum")}
                onClick={() => setRemoveUrl(item)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://photos.app.goo.gl/…"
          className="album-field min-w-[16rem] flex-1"
        />
        <button type="button" className="album-btn" disabled={busy || !url.trim()} onClick={() => void preview()}>
          {busy ? t("ui.googleImporting") : albumUrls.includes(url.trim()) || url.trim() === savedUrl ? t("ui.googleRefresh") : days?.length ? t("ui.googleAddAlbum") : t("ui.googleFromLink")}
        </button>
      </div>
      <p className="font-script text-sm text-ink-soft">{t("ui.googleAlbumHint")}</p>
      <button type="button" className="album-btn w-fit" disabled={busy || !editHash} onClick={() => void connectFallback()}>
        {t("ui.googleConnect")}
      </button>
      {needsAuth ? <p className="font-script text-sm text-ink-soft">{t("ui.googleNeedLogin")}</p> : null}
      {error ? <p className="font-script text-sm text-coral">{t("ui.googleImportError")}</p> : null}

      {days ? (
        <div className="caption-strip confirm-card curate-review p-4">
          <p className="font-typewriter text-place text-lagoon-deep">{t("ui.googleReview")}</p>
          <p className="mt-1 font-typewriter text-kicker tracking-wide text-ink">
            {total} {t("ui.googleTotal")}
          </p>
          <p className="mt-1 font-script text-sm text-ink-soft">{t("ui.googleReviewHint")}</p>
          <button
            type="button"
            className="album-btn album-btn--ghost mt-3 w-fit"
            onClick={() => {
              setNewestFirst((value) => {
                const next = !value;
                try {
                  localStorage.setItem(SORT_KEY, next ? "1" : "0");
                } catch {
                  /* ignore */
                }
                return next;
              });
            }}
          >
            {newestFirst ? t("ui.curateFirstTop") : t("ui.curateLastTop")}
          </button>
          <div className="mt-4 grid gap-6">
            {(days ? viewDays(days, newestFirst) : []).map((day, dayIndex, shown) => (
              <section
                key={day.id}
                data-curate-day={day.id}
                className={cn("curate-day grid gap-2", dropDay === day.id && "is-drop", day.hidden && "is-hidden")}
                onDragOver={(event) => event.preventDefault()}
                onPointerUp={() => {
                  /* drop handled on the tile */
                }}
              >
                <div className="flex flex-wrap items-end gap-2">
                  <DayMark
                    index={sortDays(days ?? []).findIndex((item) => item.id === day.id)}
                    size="sm"
                    rotation={dayIndex % 2 === 0 ? -10 : 8}
                  />
                  <p className="flex items-center gap-0.5 font-typewriter text-place font-bold text-ink">
                    {formatDay(day.dateKey)}
                    {dayIndex === 0 || shown[dayIndex - 1]?.dateKey !== day.dateKey ? (
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center font-typewriter text-lg leading-none text-ink-soft"
                        aria-label={day.hidden ? t("ui.showDate") : t("ui.hideDate")}
                        title={day.hidden ? t("ui.showDate") : t("ui.hideDate")}
                        onClick={() => hideDate(day.dateKey)}
                      >
                        {day.hidden ? "+" : "×"}
                      </button>
                    ) : null}
                  </p>
                  <input
                    value={day.place}
                    onChange={(event) =>
                      setDays(
                        (current) =>
                          current?.map((item) => (item.id === day.id ? { ...item, place: event.target.value } : item)) ??
                          null,
                      )
                    }
                    className="album-field max-w-xs"
                    aria-label={t("ui.place")}
                  />
                  <span className="relative flex items-center gap-1 font-typewriter text-[0.7rem] tracking-wide text-ink-soft" data-pick-menu={day.id}>
                    {day.selected.size}/{day.photos.length}
                    <button
                      type="button"
                      className={cn(
                        "grid h-8 w-8 place-items-center text-stamp",
                        (pickMenu === day.id || day.photos.some((photo) => picked.has(photo.id))) && "bg-tape/50",
                      )}
                      aria-label={t("ui.curateSelect")}
                      aria-expanded={pickMenu === day.id}
                      onClick={() => {
                        setPicking(true);
                        setPickMenu((current) => (current === day.id ? null : day.id));
                      }}
                    >
                      <SelectIcon />
                    </button>
                    {pickMenu === day.id ? (
                      <div className="caption-strip curate-select-fan" role="menu">
                        <button type="button" className="menu-link px-3 py-2" onClick={() => pickAll(day.id)}>
                          {t("ui.curateSelectAll")}
                        </button>
                        <button type="button" className="menu-link px-3 py-2" onClick={() => pickNone(day.id)}>
                          {t("ui.curateSelectNone")}
                        </button>
                      </div>
                    ) : null}
                  </span>
                  {dayIndex > 0 ? (
                    <button type="button" className="album-btn album-btn--ghost" onClick={() => mergePrev(day.id)}>
                      {t("ui.mergePlace")}
                    </button>
                  ) : null}
                  <EditGear label={t("ui.daySettings")}>
                    {(close) => (
                      <>
                        {day.hidden ? null : layoutDays.some((item) => item.id === day.id) ? (
                          <GearAction href={`/e/${editHash}#day-${day.id}`}>{t("ui.editDay")}</GearAction>
                        ) : (
                          <GearAction
                            onClick={() => {
                              close();
                              void publishDay(day);
                            }}
                          >
                            {busy ? t("ui.googleImporting") : t("ui.createDay")}
                          </GearAction>
                        )}
                        {dayIndex > 0 ? (
                          <GearAction
                            onClick={() => {
                              mergePrev(day.id);
                              close();
                            }}
                          >
                            {t("ui.mergePlace")}
                          </GearAction>
                        ) : null}
                      </>
                    )}
                  </EditGear>
                </div>
                <div className="curate-grid" data-density={density}>
                  {(hideOff ? day.photos.filter((photo) => day.selected.has(photo.id)) : day.photos).map((photo) => {
                    const photoIndex = day.photos.findIndex((item) => item.id === photo.id);
                    const on = day.selected.has(photo.id);
                    const star = highlights.includes(photo.id);
                    const firstCol = photoIndex % cols === 0;
                    const firstRow = photoIndex < cols;
                    const marked = picked.has(photo.id);
                    const isNew = freshIds.has(photo.id);
                    const dragPhoto: DragPhoto = { dayId: day.id, photoId: photo.id, index: photoIndex, thumb: photo.thumb };
                    return (
                      <div key={photo.id} className="curate-cell" data-curate-index={photoIndex}>
                        <button
                          type="button"
                          onPointerDown={(event) => onPointerDown(event, dragPhoto)}
                          onPointerMove={onPointerMove}
                          onPointerUp={(event) => onPointerUp(event, day.id, photo, photoIndex)}
                          onPointerCancel={() => {
                            clearPress();
                            setLift(null);
                          }}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            window.clearTimeout(clickTimer.current);
                            clearPress();
                            const x = Math.min(event.clientX, window.innerWidth - 260);
                            const y = Math.min(event.clientY, window.innerHeight - 320);
                            setMenu({ dayId: day.id, photoId: photo.id, index: photoIndex, x, y });
                          }}
                          className={cn("curate-tile", !on && "is-off", star && "is-star", marked && "is-picked", isNew && "is-new")}
                          title={t("ui.googlePickHint")}
                        >
                          <img src={photo.thumb} alt="" />
                          {star ? <span className="curate-star-mark">★</span> : null}
                          {marked ? <span className="curate-pick-mark">✓</span> : null}
                          {isNew ? <span className="curate-new-tag">{t("ui.curateNew")}</span> : null}
                          {photo.kind === "video" ? <span className="curate-video-mark">▶</span> : null}
                        </button>
                        {photoIndex > 0 && !firstCol ? (
                          <button
                            type="button"
                            className="curate-gap curate-gap--v"
                            title={t("ui.splitFromHere")}
                            onClick={() => splitFrom(day.id, photoIndex)}
                          >
                            <ScissorsIcon />
                          </button>
                        ) : null}
                        {photoIndex > 0 && !firstRow ? (
                          <button
                            type="button"
                            className="curate-gap curate-gap--h"
                            title={t("ui.splitFromHere")}
                            onClick={() => splitFrom(day.id, photoIndex)}
                          >
                            <ScissorsIcon />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                  {hideOff && day.photos.length - day.selected.size > 0 ? (
                    <button
                      type="button"
                      className="curate-upload curate-hidden-tile"
                      onClick={() => setHideOff(false)}
                    >
                      <span>{day.photos.length - day.selected.size}</span>
                      <em>{t("ui.curateHidden")}</em>
                    </button>
                  ) : null}
                  {allowUploads ? (
                    <label className="curate-upload">
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={busy}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) void uploadToDay(day.id, file);
                        }}
                      />
                      <span>+</span>
                      <em>{t("ui.uploadToDay")}</em>
                    </label>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
          <p className="mt-3 font-script text-sm text-ink-soft">{t("ui.googleHighlightHint")}</p>
          <CurateDock
            density={density}
            wide={wide}
            tool={tool}
            fanOpen={fanOpen}
            pickedCount={picked.size}
            hideOff={hideOff}
            onHideOff={() => setHideOff((value) => !value)}
            onDensity={(value) => {
              setDensity(value);
              setFanOpen(false);
            }}
            onFan={() => setFanOpen((open) => !open)}
            onTool={(value) => setTool((current) => (current === value ? "select" : value))}
            onBulkStar={starPicked}
            onBulkShow={() => setPickedInDay(true)}
            onBulkHide={() => setPickedInDay(false)}
            onBulkDate={(value) => applyPicked({ takenAt: value })}
            onBulkPlace={(value) => applyPicked({ place: value })}
            seedDate={(() => {
              const id = [...picked][0];
              if (!id || !days) return 0;
              for (const day of days) {
                const photo = day.photos.find((item) => item.id === id);
                if (photo) return photo.takenAt;
              }
              return 0;
            })()}
            seedPlace={(() => {
              const id = [...picked][0];
              if (!id || !days) return "";
              for (const day of days) {
                const photo = day.photos.find((item) => item.id === id);
                if (photo) return photo.place || day.place;
              }
              return "";
            })()}
          />
        </div>
      ) : null}
      {lift
        ? createPortal(
            <div className="curate-lift" style={{ left: lift.x, top: lift.y }}>
              <img src={lift.photo.thumb} alt="" />
            </div>,
            document.body,
          )
        : null}
      {menu && menuPhoto && menuDay
        ? createPortal(
            <CurateContextMenu
              ctx={menu}
              photo={menuPhoto}
              selected={menuDay.selected.has(menuPhoto.id)}
              starred={highlights.includes(menuPhoto.id)}
              onHighlight={() => {
                toggleStar(menuPhoto.id);
                setMenu(null);
              }}
              onKeep={() => {
                togglePhoto(menu.dayId, menuPhoto.id);
                setMenu(null);
              }}
              onSplit={() => {
                splitFrom(menu.dayId, menu.index);
                setMenu(null);
              }}
              onDate={(value) => applyPhoto(menuPhoto.id, { takenAt: value })}
              onPlace={(value) => applyPhoto(menuPhoto.id, { place: value })}
            />,
            document.body,
          )
        : null}
      <ConfirmDialog
        open={Boolean(removeUrl)}
        title={t("ui.confirmRemove")}
        onCancel={() => setRemoveUrl(null)}
        onConfirm={() => {
          if (removeUrl) {
            removeGoogleAlbumUrl(removeUrl);
            if (url === removeUrl) setUrl("");
          }
          setRemoveUrl(null);
        }}
      />
    </div>
  );
}

function CurateContextMenu({
  ctx,
  photo,
  selected,
  starred,
  onHighlight,
  onKeep,
  onSplit,
  onDate,
  onPlace,
}: {
  ctx: CtxMenu;
  photo: ImportPhoto;
  selected: boolean;
  starred: boolean;
  onHighlight: () => void;
  onKeep: () => void;
  onSplit: () => void;
  onDate: (value: number) => void;
  onPlace: (value: string) => void;
}) {
  const t = useT();
  const [dateValue, setDateValue] = useState(toLocalInput(photo.takenAt));
  const [placeValue, setPlaceValue] = useState(photo.place);
  useEffect(() => {
    setDateValue(toLocalInput(photo.takenAt));
    setPlaceValue(photo.place);
  }, [photo.id, photo.takenAt, photo.place]);

  return (
    <div className="caption-strip curate-ctx" style={{ left: ctx.x, top: ctx.y }} role="menu">
      <button type="button" className="menu-link px-3 py-2" onClick={onHighlight}>
        {starred ? t("ui.curateUnhighlight") : t("ui.curateHighlight")}
      </button>
      <button type="button" className="menu-link px-3 py-2" onClick={onKeep}>
        {selected ? t("ui.curateDrop") : t("ui.curateKeep")}
      </button>
      {ctx.index > 0 ? (
        <button type="button" className="menu-link px-3 py-2" onClick={onSplit}>
          {t("ui.splitFromHere")}
        </button>
      ) : null}
      <label className="curate-ctx-field">
        <span>{t("ui.curateEditDate")}</span>
        <input
          type="datetime-local"
          value={dateValue}
          onChange={(event) => setDateValue(event.target.value)}
          onBlur={() => {
            const ms = fromLocalInput(dateValue);
            if (ms) onDate(ms);
          }}
        />
      </label>
      <label className="curate-ctx-field">
        <span>{t("ui.curateEditPlace")}</span>
        <input
          type="text"
          value={placeValue}
          onChange={(event) => setPlaceValue(event.target.value)}
          onBlur={() => onPlace(placeValue)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onPlace(placeValue);
            }
          }}
        />
      </label>
    </div>
  );
}

function CurateDock({
  density,
  wide,
  tool,
  fanOpen,
  pickedCount,
  hideOff,
  onHideOff,
  onDensity,
  onFan,
  onTool,
  onBulkStar,
  onBulkShow,
  onBulkHide,
  onBulkDate,
  onBulkPlace,
  seedDate,
  seedPlace,
}: {
  density: Density;
  wide: boolean;
  tool: Tool;
  fanOpen: boolean;
  pickedCount: number;
  hideOff: boolean;
  onHideOff: () => void;
  onDensity: (value: Density) => void;
  onFan: () => void;
  onTool: (value: Tool) => void;
  onBulkStar: () => void;
  onBulkShow: () => void;
  onBulkHide: () => void;
  onBulkDate: (value: number) => void;
  onBulkPlace: (value: string) => void;
  seedDate: number;
  seedPlace: string;
}) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [bulkEdit, setBulkEdit] = useState<null | "date" | "place">(null);
  const [dateValue, setDateValue] = useState("");
  const [placeValue, setPlaceValue] = useState("");
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (pickedCount === 0) setBulkEdit(null);
  }, [pickedCount]);
  useEffect(() => {
    setDateValue(toLocalInput(seedDate));
    setPlaceValue(seedPlace);
  }, [seedDate, seedPlace]);
  if (!mounted) return null;
  const densities: Density[] = [0, 1, 2, 3];
  return createPortal(
    <div className="curate-dock">
      <div className="curate-dock-stack">
        {pickedCount > 0 ? (
          <div className="curate-bulk">
            <button type="button" className="album-btn album-btn--tiny" onClick={onBulkStar}>
              {t("ui.curateBulkStar")}
            </button>
            <button type="button" className="album-btn album-btn--tiny" onClick={onBulkShow}>
              {t("ui.curateBulkShow")}
            </button>
            <button type="button" className="album-btn album-btn--tiny" onClick={onBulkHide}>
              {t("ui.curateBulkHide")}
            </button>
            <button
              type="button"
              className={cn("album-btn album-btn--tiny", bulkEdit === "date" && "is-on")}
              onClick={() => setBulkEdit((value) => (value === "date" ? null : "date"))}
            >
              {t("ui.curateEditDate")}
            </button>
            <button
              type="button"
              className={cn("album-btn album-btn--tiny", bulkEdit === "place" && "is-on")}
              onClick={() => setBulkEdit((value) => (value === "place" ? null : "place"))}
            >
              {t("ui.curateEditPlace")}
            </button>
            {bulkEdit === "date" ? (
              <input
                type="datetime-local"
                className="album-field curate-bulk-field"
                value={dateValue}
                onChange={(event) => setDateValue(event.target.value)}
                onBlur={() => {
                  const ms = fromLocalInput(dateValue);
                  if (ms) onBulkDate(ms);
                }}
              />
            ) : null}
            {bulkEdit === "place" ? (
              <input
                type="text"
                className="album-field curate-bulk-field"
                value={placeValue}
                onChange={(event) => setPlaceValue(event.target.value)}
                onBlur={() => onBulkPlace(placeValue)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onBulkPlace(placeValue);
                  }
                }}
                placeholder={t("ui.place")}
              />
            ) : null}
          </div>
        ) : null}
        <div className="curate-dock-inner">
        <button
          type="button"
          className={cn("curate-dock-btn", hideOff && "is-on")}
          aria-label={hideOff ? t("ui.curateShowOff") : t("ui.curateHideOff")}
          aria-pressed={hideOff}
          onClick={onHideOff}
        >
          {hideOff ? <EyeOffIcon /> : <EyeIcon />}
        </button>
        <span className="curate-dock-rule" aria-hidden="true" />
        {wide ? (
          densities.map((value) => (
            <button
              key={value}
              type="button"
              className={cn("curate-dock-btn", density === value && "is-on")}
              aria-label={t("ui.curateGrid")}
              onClick={() => onDensity(value)}
            >
              <GridIcon n={value} />
            </button>
          ))
        ) : (
          <>
            <button
              type="button"
              className={cn("curate-dock-btn", fanOpen && "is-on")}
              aria-label={t("ui.curateGrid")}
              aria-expanded={fanOpen}
              onClick={onFan}
            >
              <GridIcon n={density} />
            </button>
            {fanOpen ? (
              <div className="curate-grid-fan" role="menu">
                {densities.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={cn("curate-dock-btn", density === value && "is-on")}
                    onClick={() => onDensity(value)}
                  >
                    <GridIcon n={value} />
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              className={cn("curate-dock-btn", tool === "split" && "is-on")}
              aria-label={t("ui.curateSplit")}
              aria-pressed={tool === "split"}
              onClick={() => onTool("split")}
            >
              <ScissorsIcon />
            </button>
            <button
              type="button"
              className={cn("curate-dock-btn", tool === "star" && "is-on")}
              aria-label={t("ui.curateStar")}
              aria-pressed={tool === "star"}
              onClick={() => onTool("star")}
            >
              <StarIcon />
            </button>
          </>
        )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function GridIcon({ n }: { n: Density }) {
  if (n === 3) {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <rect x="3.5" y="3.5" width="15" height="15" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  const count = n === 0 ? 4 : n === 1 ? 3 : 2;
  const step = 16 / (count - 1);
  const dots = [];
  for (let y = 0; y < count; y += 1) {
    for (let x = 0; x < count; x += 1) {
      dots.push(<circle key={`${x}-${y}`} cx={3 + x * step} cy={3 + y * step} r="1.55" fill="currentColor" />);
    }
  }
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      {dots}
    </svg>
  );
}

function SelectIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 12.2 10.6 14.8 16.2 8.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.2-5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M20 5v5h-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.8 12S6.2 6.8 12 6.8 21.2 12 21.2 12 17.8 17.2 12 17.2 2.8 12 2.8 12Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.8 12S6.2 6.8 12 6.8 21.2 12 21.2 12 17.8 17.2 12 17.2 2.8 12 2.8 12Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 19.2 19 4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ScissorsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="7" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="6" cy="17" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 8.2 20 18.5M8 15.8 20 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3.4 14.4 9l6.1.5-4.7 3.9 1.5 5.9L12 16.2 6.7 19.3l1.5-5.9L3.5 9.5 9.6 9z"
      />
    </svg>
  );
}
