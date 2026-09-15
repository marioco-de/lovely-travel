import { useState } from "react";
import { confirmGoogleLink, previewGoogleLink, type ImportDayDraft } from "@/lib/album/google-import";
import { useAlbum } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const DAY_CAP = 20;
const HIGHLIGHT_CAP = 5;

type DayDraft = ImportDayDraft & { selected: Set<string> };

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
        return;
      }
      const drafted: DayDraft[] = result.days.map((day) => ({
        ...day,
        selected: new Set(day.photos.slice(0, DAY_CAP).map((photo) => photo.id)),
      }));
      setDays(drafted);
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

  function toggleStar(id: string) {
    setHighlights((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      return [...current, id].slice(0, 8);
    });
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
        <div className="caption-strip confirm-card p-4">
          <p className="font-typewriter text-place text-lagoon-deep">{t("ui.googleReview")}</p>
          <p className="mt-1 font-script text-sm text-ink-soft">{t("ui.googleReviewHint")}</p>
          <div className="mt-4 grid gap-5">
            {days.map((day) => (
              <section key={day.id} className="grid gap-2">
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
                </div>
                <div className="flex flex-wrap gap-2">
                  {day.photos.map((photo) => {
                    const on = day.selected.has(photo.id);
                    const star = highlights.includes(photo.id);
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => togglePhoto(day.id, photo.id)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          toggleStar(photo.id);
                        }}
                        className={cn(
                          "relative h-16 w-16 overflow-hidden border",
                          on ? "border-lagoon-deep opacity-100" : "border-stamp/30 opacity-40",
                        )}
                        title={t("ui.googlePickHint")}
                      >
                        <img src={photo.thumb} alt="" className="h-full w-full object-cover" />
                        <span
                          role="presentation"
                          className="absolute top-0.5 right-0.5 grid h-5 w-5 place-items-center bg-page/80 font-typewriter text-[0.7rem]"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleStar(photo.id);
                          }}
                        >
                          {star ? "★" : "☆"}
                        </span>
                      </button>
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
        </div>
      ) : null}
    </div>
  );
}
