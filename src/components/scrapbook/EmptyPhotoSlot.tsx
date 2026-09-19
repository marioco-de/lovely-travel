import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { useAlbum } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";

type EmptyPhotoSlotProps = {
  photoId: string;
};

export function EmptyPhotoSlot({ photoId }: EmptyPhotoSlotProps) {
  const t = useT();
  const highlights = useAlbum((s) => s.highlights);
  const photoMap = useAlbum((s) => s.photos);
  const setPhoto = useAlbum((s) => s.setPhoto);
  const setPhotoUrl = useAlbum((s) => s.setPhotoUrl);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const picks = highlights
    .map((id) => ({ id, src: photoMap[id] }))
    .filter((item): item is { id: string; src: string } => Boolean(item.src));

  return (
    <div ref={wrapRef} className="photo-add photo-add--split">
      <button
        type="button"
        className="photo-add-star"
        aria-label={t("ui.pickHighlight")}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Star size={22} strokeWidth={1.8} />
      </button>
      <span className="photo-add-rule" aria-hidden="true" />
      <label className="photo-add-file">
        <input
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void setPhoto(photoId, file);
            event.target.value = "";
          }}
        />
        <span className="photo-add-plus" aria-hidden="true">
          +
        </span>
        <span className="sr-only">{t("ui.addPhoto")}</span>
      </label>
      {open ? (
        <div className="photo-highlight-sheet caption-strip">
          <p className="px-1 font-display text-[0.58rem] tracking-widest text-ink-soft uppercase">{t("ui.highlights")}</p>
          {picks.length ? (
            <div className="photo-highlight-grid">
              {picks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="photo-highlight-pick"
                  onClick={() => {
                    setPhotoUrl(photoId, item.src);
                    setOpen(false);
                  }}
                >
                  <img src={item.src} alt="" />
                </button>
              ))}
            </div>
          ) : (
            <p className="px-1 font-script text-sm text-ink-soft">{t("ui.pickHighlight")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
