import { useEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { confirmGoogleLink, previewGoogleLink, type ImportDayDraft, type ImportPhoto } from "@/lib/album/google-import";
import { useAlbum } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const DAY_CAP = 20;
const HIGHLIGHT_CAP = 8;
const DENSITY_KEY = "lovely-curate-density";
const DESKTOP_COLS = [8, 6, 4, 2] as const;
const MOBILE_COLS = [4, 3, 2, 1] as const;

type Density = 0 | 1 | 2 | 3;
type Tool = "select" | "split" | "star";
type DayDraft = ImportDayDraft & { selected: Set<string> };
type DragPhoto = { dayId: string; photoId: string; index: number; thumb: string };

function readDensity(): Density {
  try {
    const raw = Number(localStorage.getItem(DENSITY_KEY));
    if (raw === 0 || raw === 1 || raw === 2 || raw === 3) return raw;
  } catch {
    /* ignore */
  }
  return 0;
}

export function GoogleImport() {
  const t = useT();
  const editHash = useAlbum((s) => s.editHash);
  const savedUrl = useAlbum((s) => s.googleAlbumUrl);
  const setGoogleAlbumUrl = useAlbum((s) => s.setGoogleAlbumUrl);
  const applyGoogleImport = useAlbum((s) => s.applyGoogleImport);
  const [url, setUrl] = useState(savedUrl);
  const [days, setDays] = useState<DayDraft[] | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);
  const [density, setDensity] = useState<Density>(0);
  const [wide, setWide] = useState(true);
  const [tool, setTool] = useState<Tool>("select");
  const [fanOpen, setFanOpen] = useState(false);
  const [dropDay, setDropDay] = useState<string | null>(null);
  const [lift, setLift] = useState<{ photo: DragPhoto; x: number; y: number } | null>(null);
  const clickTimer = useRef(0);
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
    try {
      localStorage.setItem(DENSITY_KEY, String(density));
    } catch {
      /* ignore */
    }
  }, [density]);

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
        setDays(null);
        setTotal(0);
        return;
      }
      const drafted: DayDraft[] = result.days.map((day) => ({
        ...day,
        selected: new Set(day.photos.slice(0, DAY_CAP).map((photo) => photo.id)),
      }));
      setDays(drafted);
      setTotal(result.total ?? drafted.reduce((sum, day) => sum + day.photos.length, 0));
      setHighlights(
        drafted
          .map((day) => [...day.selected][0])
          .filter((id): id is string => Boolean(id))
          .slice(0, HIGHLIGHT_CAP),
      );
      setGoogleAlbumUrl(share);
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

  async function confirm() {
    if (!editHash || !days?.length) return;
    setBusy(true);
    setError(false);
    try {
      const result = await confirmGoogleLink({
        data: {
          editHash,
          shareUrl: url.trim(),
          highlights,
          days: days.map((day) => ({
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
              place: day.place,
            })),
          })),
        },
      });
      if (!result.ok) {
        setError(true);
        return;
      }
      applyGoogleImport({
        photos: result.photos,
        highlights: result.highlights,
        days: result.days,
      });
      setDays(null);
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
      return [...current, id].slice(0, HIGHLIGHT_CAP);
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

  function onTileClick(dayId: string, photo: ImportPhoto, photoIndex: number) {
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
    window.clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(() => togglePhoto(dayId, photo.id), 260);
  }

  function onTileDoubleClick(photoId: string) {
    window.clearTimeout(clickTimer.current);
    toggleStar(photoId);
  }

  function onDragStart(event: DragEvent, photo: DragPhoto) {
    dragRef.current = photo;
    didDrag.current = true;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", photo.photoId);
  }

  function onDragEnd() {
    window.setTimeout(() => {
      dragRef.current = null;
      setDropDay(null);
    }, 40);
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

  function onPointerDown(event: ReactPointerEvent, photo: DragPhoto) {
    if (event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    clearPress();
    const pointerId = event.pointerId;
    const timer = window.setTimeout(() => {
      const press = pressRef.current;
      if (!press || press.pointerId !== pointerId) return;
      dragRef.current = press.photo;
      setLift({ photo: press.photo, x: press.x, y: press.y });
    }, 340);
    pressRef.current = { photo, x: event.clientX, y: event.clientY, pointerId, timer };
  }

  function onPointerMove(event: ReactPointerEvent) {
    const press = pressRef.current;
    if (press && !lift) {
      const dist = Math.hypot(event.clientX - press.x, event.clientY - press.y);
      if (dist > 12) clearPress();
    }
    if (lift) {
      setLift((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));
      const node = document.elementFromPoint(event.clientX, event.clientY);
      const dayId = node?.closest("[data-curate-day]")?.getAttribute("data-curate-day") ?? null;
      setDropDay(dayId);
    }
  }

  function onPointerUp(event: ReactPointerEvent) {
    if (lift && dragRef.current) {
      const node = document.elementFromPoint(event.clientX, event.clientY);
      const cell = node?.closest("[data-curate-index]");
      const dayNode = node?.closest("[data-curate-day]");
      const dayId = dayNode?.getAttribute("data-curate-day");
      const index = cell?.getAttribute("data-curate-index");
      if (dayId) dropOn(dayId, index != null ? Number(index) : Number.MAX_SAFE_INTEGER);
    }
    clearPress();
    setLift(null);
  }

  return (
    <div className="grid gap-3">
      <span className="font-display text-kicker tracking-widest text-ink-soft uppercase">{t("ui.googleAlbum")}</span>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://photos.app.goo.gl/…"
          className="album-field min-w-[16rem] flex-1"
        />
        <button type="button" className="album-btn" disabled={busy || !url.trim()} onClick={() => void preview()}>
          {busy ? t("ui.googleImporting") : t("ui.googleFromLink")}
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
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropDay(day.id);
                }}
                onDragLeave={() => setDropDay((current) => (current === day.id ? null : current))}
                onDrop={(event) => {
                  event.preventDefault();
                  dropOn(day.id, day.photos.length);
                }}
              >
                <div className="flex flex-wrap items-end gap-2">
                  <p className="font-display text-kicker tracking-widest text-ink-soft uppercase">{day.dateKey}</p>
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
                  <span className="font-typewriter text-[0.7rem] tracking-wide text-ink-soft">
                    {day.selected.size}/{day.photos.length}
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
                    const dragPhoto: DragPhoto = { dayId: day.id, photoId: photo.id, index: photoIndex, thumb: photo.thumb };
                    return (
                      <div
                        key={photo.id}
                        className="curate-cell"
                        data-curate-index={photoIndex}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setDropDay(day.id);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          dropOn(day.id, photoIndex);
                        }}
                      >
                        <button
                          type="button"
                          draggable
                          onDragStart={(event) => onDragStart(event, dragPhoto)}
                          onDragEnd={onDragEnd}
                          onPointerDown={(event) => onPointerDown(event, dragPhoto)}
                          onPointerMove={onPointerMove}
                          onPointerUp={onPointerUp}
                          onPointerCancel={() => {
                            clearPress();
                            setLift(null);
                          }}
                          onClick={() => onTileClick(day.id, photo, photoIndex)}
                          onDoubleClick={() => onTileDoubleClick(photo.id)}
                          className={cn("curate-tile", !on && "is-off", star && "is-star")}
                          title={t("ui.googlePickHint")}
                        >
                          <img src={photo.thumb} alt="" />
                          {star ? <span className="curate-star-mark">★</span> : null}
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
                </div>
              </section>
            ))}
          </div>
          <p className="mt-3 font-script text-sm text-ink-soft">{t("ui.googleHighlightHint")}</p>
          <button type="button" className="album-btn mt-3" disabled={busy} onClick={() => void confirm()}>
            {t("ui.googleConfirm")}
          </button>
          <CurateDock
            density={density}
            wide={wide}
            tool={tool}
            fanOpen={fanOpen}
            onDensity={(value) => {
              setDensity(value);
              setFanOpen(false);
            }}
            onFan={() => setFanOpen((open) => !open)}
            onTool={(value) => setTool((current) => (current === value ? "select" : value))}
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
    </div>
  );
}

function CurateDock({
  density,
  wide,
  tool,
  fanOpen,
  onDensity,
  onFan,
  onTool,
}: {
  density: Density;
  wide: boolean;
  tool: Tool;
  fanOpen: boolean;
  onDensity: (value: Density) => void;
  onFan: () => void;
  onTool: (value: Tool) => void;
}) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const densities: Density[] = [0, 1, 2, 3];
  return createPortal(
    <div className="curate-dock">
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
