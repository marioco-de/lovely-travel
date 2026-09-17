import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { dayKey } from "@/lib/album/exif";
import { addCurationPhoto, confirmGoogleLink, loadCuration, previewGoogleLink, saveCuration, type ImportDayDraft, type ImportPhoto } from "@/lib/album/google-import";
import { newId } from "@/lib/album/layout";
import { useAlbum } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const DAY_CAP = 20;
const HIGHLIGHT_CAP = 12;
const HIGHLIGHT_SEED = 5;
const DENSITY_KEY = "lovely-curate-density";
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

function fromDays(days: ImportDayDraft[], capNew: boolean): DayDraft[] {
  return days.map((day) => ({
    ...day,
    selected: new Set(
      day.selectedIds ?? (capNew ? day.photos.slice(0, DAY_CAP).map((photo) => photo.id) : []),
    ),
  }));
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
  const editHash = useAlbum((s) => s.editHash);
  const savedUrl = useAlbum((s) => s.googleAlbumUrl);
  const albumUrls = useAlbum((s) => s.googleAlbumUrls);
  const allowUploads = useAlbum((s) => s.allowUploads);
  const addGoogleAlbumUrl = useAlbum((s) => s.addGoogleAlbumUrl);
  const applyGoogleImport = useAlbum((s) => s.applyGoogleImport);
  const syncCuration = useAlbum((s) => s.syncCuration);
  const [url, setUrl] = useState(savedUrl);
  const [days, setDays] = useState<DayDraft[] | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);
  const [pendingPreview, setPendingPreview] = useState(false);
  const [density, setDensity] = useState<Density>(0);
  const [wide, setWide] = useState(true);
  const [tool, setTool] = useState<Tool>("select");
  const [fanOpen, setFanOpen] = useState(false);
  const [dropDay, setDropDay] = useState<string | null>(null);
  const [lift, setLift] = useState<{ photo: DragPhoto; x: number; y: number } | null>(null);
  const [menu, setMenu] = useState<CtxMenu | null>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [picking, setPicking] = useState(false);
  const [pickMenu, setPickMenu] = useState<string | null>(null);
  const clickTimer = useRef(0);
  const lastTap = useRef<{ id: string; time: number } | null>(null);
  const dragRef = useRef<DragPhoto | null>(null);
  const didDrag = useRef(false);
  const pressRef = useRef<{ photo: DragPhoto; x: number; y: number; pointerId: number; timer: number } | null>(null);

  useEffect(() => {
    setDensity(readDensity());
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
      if (!active || !result.days.length) return;
      setDays(fromDays(result.days, false));
      setHighlights(result.highlights);
      setTotal(result.total);
      setPendingPreview(false);
      if (result.urls[0] && !url) setUrl(result.urls[0]);
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
      setDays((current) => (current?.length ? [...current, ...drafted] : drafted));
      setTotal((current) => current + drafted.reduce((sum, day) => sum + day.photos.length, 0) || (result.total ?? drafted.reduce((sum, day) => sum + day.photos.length, 0)));
      if (!days?.length) {
        setHighlights(
          drafted
            .map((day) => [...day.selected][0])
            .filter((id): id is string => Boolean(id))
            .slice(0, HIGHLIGHT_SEED),
        );
      }
      addGoogleAlbumUrl(share);
      setPendingPreview(true);
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

  function curationPayload() {
    return {
      editHash: editHash!,
      shareUrl: url.trim() || undefined,
      highlights,
      days: (days ?? []).map((day) => ({
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
      })),
    };
  }

  async function confirm() {
    if (!editHash || !days?.length) return;
    setBusy(true);
    setError(false);
    try {
      if (pendingPreview) {
        const result = await confirmGoogleLink({ data: curationPayload() });
        if (!result.ok) {
          setError(true);
          return;
        }
        applyGoogleImport({
          photos: result.photos,
          highlights: result.highlights,
          days: result.days,
        });
        setPendingPreview(false);
      } else {
        const result = await saveCuration({ data: curationPayload() });
        if (!result.ok) {
          setError(true);
          return;
        }
        syncCuration({
          photos: result.photos,
          highlights,
          days: days.map((day) => ({
            id: day.id,
            place: day.place,
            selected: [...day.selected],
            all: day.photos.map((photo) => photo.id),
          })),
        });
      }
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
    setDays(
      (current) =>
        current?.map((day) => {
          if (day.id !== dayId) return day;
          const selected = new Set(day.selected);
          if (selected.has(photoId)) selected.delete(photoId);
          else selected.add(photoId);
          return { ...day, selected };
        }) ?? null,
    );
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
    const gone = new Set(
      days?.filter((day) => day.dateKey === dateKey).flatMap((day) => day.photos.map((photo) => photo.id)) ?? [],
    );
    setDays((current) => current?.filter((day) => day.dateKey !== dateKey) ?? null);
    if (gone.size) {
      setHighlights((current) => current.filter((id) => !gone.has(id)));
      setPicked((current) => new Set([...current].filter((id) => !gone.has(id))));
    }
  }

  function mergePrev(dayId: string) {
    setDays((current) => {
      if (!current) return current;
      const index = current.findIndex((day) => day.id === dayId);
      if (index < 1) return current;
      const prev = current[index - 1]!;
      const day = current[index]!;
      if (prev.dateKey !== day.dateKey) return current;
      const photos = [...prev.photos, ...day.photos];
      const selected = new Set([...prev.selected, ...day.selected]);
      const copy = [...current];
      copy.splice(index - 1, 2, { ...prev, photos, selected });
      return copy;
    });
  }

  function toggleStar(id: string) {
    setHighlights((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      const next = [...current, id];
      return next.length > HIGHLIGHT_CAP ? next.slice(next.length - HIGHLIGHT_CAP) : next;
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
        found.takenAt = patch.takenAt;
        found.dateKey = patch.takenAt ? dayKey(patch.takenAt) : "unknown";
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
      return next.filter((day) => day.photos.length > 0);
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
    setDays(
      (current) =>
        current?.map((day) => {
          const selected = new Set(day.selected);
          for (const id of picked) {
            if (!day.photos.some((photo) => photo.id === id)) continue;
            if (on) selected.add(id);
            else selected.delete(id);
          }
          return { ...day, selected };
        }) ?? null,
    );
  }

  function starPicked() {
    setHighlights((current) => {
      const next = [...current];
      for (const id of picked) {
        if (!next.includes(id)) next.push(id);
      }
      return next.length > HIGHLIGHT_CAP ? next.slice(next.length - HIGHLIGHT_CAP) : next;
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

  const menuPhoto = menu && days ? days.find((day) => day.id === menu.dayId)?.photos.find((photo) => photo.id === menu.photoId) : null;
  const menuDay = menu && days ? days.find((day) => day.id === menu.dayId) : null;

  return (
    <div className="grid gap-3">
      <span className="font-display text-kicker tracking-widest text-ink-soft uppercase">{t("ui.googleAlbum")}</span>
      {albumUrls.length ? (
        <ul className="grid gap-1">
          {albumUrls.map((item) => (
            <li key={item} className="truncate font-typewriter text-kicker tracking-wide text-ink-soft">
              {item}
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
          {busy ? t("ui.googleImporting") : days?.length ? t("ui.googleAddAlbum") : t("ui.googleFromLink")}
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
          <div className="mt-4 grid gap-6">
            {days.map((day, dayIndex) => (
              <section
                key={day.id}
                data-curate-day={day.id}
                className={cn("curate-day grid gap-2", dropDay === day.id && "is-drop")}
                onDragOver={(event) => event.preventDefault()}
                onPointerUp={() => {
                  /* drop handled on the tile */
                }}
              >
                <div className="flex flex-wrap items-end gap-2">
                  <p className="flex items-center gap-0.5 font-display text-kicker tracking-widest text-ink-soft uppercase">
                    {day.dateKey}
                    {dayIndex === 0 || days[dayIndex - 1]?.dateKey !== day.dateKey ? (
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center font-typewriter text-lg leading-none text-ink-soft"
                        aria-label={t("ui.hideDate")}
                        title={t("ui.hideDate")}
                        onClick={() => hideDate(day.dateKey)}
                      >
                        ×
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
                  {dayIndex > 0 && days[dayIndex - 1]?.dateKey === day.dateKey ? (
                    <button type="button" className="album-btn album-btn--ghost" onClick={() => mergePrev(day.id)}>
                      {t("ui.mergePlace")}
                    </button>
                  ) : null}
                </div>
                <div className="curate-grid" data-density={density}>
                  {day.photos.map((photo, photoIndex) => {
                    const on = day.selected.has(photo.id);
                    const star = highlights.includes(photo.id);
                    const firstCol = photoIndex % cols === 0;
                    const firstRow = photoIndex < cols;
                    const marked = picked.has(photo.id);
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
                          className={cn("curate-tile", !on && "is-off", star && "is-star", marked && "is-picked")}
                          title={t("ui.googlePickHint")}
                        >
                          <img src={photo.thumb} alt="" />
                          {star ? <span className="curate-star-mark">★</span> : null}
                          {marked ? <span className="curate-pick-mark">✓</span> : null}
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
          <button type="button" className="album-btn mt-3" disabled={busy} onClick={() => void confirm()}>
            {pendingPreview ? t("ui.googleConfirm") : t("ui.googleSave")}
          </button>
          <CurateDock
            density={density}
            wide={wide}
            tool={tool}
            fanOpen={fanOpen}
            pickedCount={picked.size}
            onDensity={(value) => {
              setDensity(value);
              setFanOpen(false);
            }}
            onFan={() => setFanOpen((open) => !open)}
            onTool={(value) => setTool((current) => (current === value ? "select" : value))}
            onBulkStar={starPicked}
            onBulkShow={() => setPickedInDay(true)}
            onBulkHide={() => setPickedInDay(false)}
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
  onDensity,
  onFan,
  onTool,
  onBulkStar,
  onBulkShow,
  onBulkHide,
}: {
  density: Density;
  wide: boolean;
  tool: Tool;
  fanOpen: boolean;
  pickedCount: number;
  onDensity: (value: Density) => void;
  onFan: () => void;
  onTool: (value: Tool) => void;
  onBulkStar: () => void;
  onBulkShow: () => void;
  onBulkHide: () => void;
}) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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
          </div>
        ) : null}
        <div className="curate-dock-inner">
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
