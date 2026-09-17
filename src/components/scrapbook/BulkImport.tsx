import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { draftsFromPhotos, ingestFiles, mergeDraftUp, revokeDrafts, splitDraft, unknownPlace, type BulkDayDraft } from "@/lib/album/bulk";
import { useAlbum } from "@/lib/album/store";
import { formatDayKey, useLocale, useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const BulkCtx = createContext({ pick: () => {} });
export function useBulkImport() {
  return useContext(BulkCtx);
}

export function BulkImportRoot({ children }: { children: ReactNode }) {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const importBulk = useAlbum((s) => s.importBulk);
  const inputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<BulkDayDraft[] | null>(null);
  const [reading, setReading] = useState<{ done: number; total: number } | null>(null);
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (drafts) revokeDrafts(drafts);
    };
  }, [drafts]);

  function pick() {
    inputRef.current?.click();
  }

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setReading({ done: 0, total: list.length });
    try {
      const photos = await ingestFiles([...list], (done, total) => setReading({ done, total }));
      const grouped = await draftsFromPhotos(photos, unknownPlace(locale === "de" ? "de" : "en"));
      setDrafts(grouped);
    } finally {
      setBusy(false);
      setReading(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function close() {
    if (drafts) revokeDrafts(drafts);
    setDrafts(null);
    setSaving(null);
  }

  async function confirm() {
    if (!drafts?.length) return;
    setBusy(true);
    setSaving({ done: 0, total: drafts.reduce((n, day) => n + day.photos.length, 0) });
    try {
      await importBulk(drafts, (done, total) => setSaving({ done, total }));
      close();
    } finally {
      setBusy(false);
    }
  }

  return (
    <BulkCtx.Provider value={{ pick }}>
      {children}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => void onFiles(event.target.files)}
      />
      {reading || saving || drafts ? (
        <div className="lightbox-scrim" role="dialog" aria-modal="true" aria-label={t("ui.bulkTitle")}>
          <div className="caption-strip confirm-card relative z-10 mx-4 max-h-[88svh] w-full max-w-2xl overflow-y-auto p-5">
            <p className="font-typewriter text-place text-lagoon-deep">{t("ui.bulkTitle")}</p>
            {reading ? (
              <p className="mt-3 font-script text-caption text-ink">
                {t("ui.bulkReading")} {reading.done}/{reading.total}
              </p>
            ) : null}
            {saving ? (
              <p className="mt-3 font-script text-caption text-ink">
                {t("ui.bulkSaving")} {saving.done}/{saving.total}
              </p>
            ) : null}
            {drafts && !saving ? (
              <>
                <p className="mt-2 font-script text-caption text-ink-soft">{t("ui.bulkHint")}</p>
                <div className="mt-4 space-y-5">
                  {drafts.map((day, index) => (
                    <section key={day.id} className="border-t border-[rgb(61_42_28_/_0.12)] pt-3">
                      <p className="font-typewriter text-place font-bold text-ink">{formatDayKey(day.dateKey, locale)}</p>
                      <input
                        value={day.place}
                        onChange={(event) =>
                          setDrafts((current) =>
                            current
                              ? current.map((item) => (item.id === day.id ? { ...item, place: event.target.value } : item))
                              : current,
                          )
                        }
                        className="mt-1 w-full border-0 bg-transparent font-typewriter text-place text-lagoon-deep"
                        aria-label={t("ui.bulkPlace")}
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {day.photos.map((photo, photoIndex) => (
                          <div key={photo.id} className="relative">
                            <img src={photo.preview} alt="" className="h-16 w-16 rounded-sm object-cover" />
                            {photoIndex < day.photos.length - 1 ? (
                              <button
                                type="button"
                                className="album-btn album-btn--tiny mt-1"
                                onClick={() => setDrafts((current) => (current ? splitDraft(current, day.id, photoIndex) : current))}
                              >
                                {t("ui.bulkSplit")}
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {index > 0 ? (
                        <button
                          type="button"
                          className="album-btn album-btn--ghost mt-2"
                          onClick={() => setDrafts((current) => (current ? mergeDraftUp(current, index) : current))}
                        >
                          {t("ui.bulkMerge")}
                        </button>
                      ) : null}
                    </section>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" className="album-btn album-btn--ghost" onClick={close} disabled={busy}>
                    {t("ui.close")}
                  </button>
                  <button type="button" className="album-btn" onClick={() => void confirm()} disabled={busy}>
                    {t("ui.bulkConfirm")}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </BulkCtx.Provider>
  );
}

export function BulkImportButton({ className }: { className?: string }) {
  const t = useT();
  const { pick } = useBulkImport();
  return (
    <button type="button" className={cn("album-btn", className)} onClick={pick}>
      {t("ui.bulkUpload")}
    </button>
  );
}
