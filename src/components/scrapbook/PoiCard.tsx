import { useEffect, useRef, useState } from "react";
import { Recycle } from "lucide-react";
import { cn } from "@/lib/utils";
import { nextPoiSize, nextPoiSkin, type PoiData } from "@/lib/album/layout";
import { searchPoi, type PoiHit } from "@/lib/album/geocode";
import { useTapOpen } from "@/hooks/use-tap-open";
import { useOpenDayLightbox } from "@/lib/album/lightbox";
import { useAlbum } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";
import { ConfirmDialog } from "./ConfirmDialog";
import { PhotoCaption } from "./PhotoCaption";
import { SlideIn } from "./SlideIn";

type PoiCardProps = {
  dayId: string;
  blockId: string;
  poi: PoiData;
  caption: string;
  onCaption: (value: string) => void;
  onClearCaption: () => void;
};

function Stars({ rating }: { rating?: number }) {
  if (rating == null || rating <= 0) return null;
  const filled = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <p className="poi-stars" aria-label={`${rating.toFixed(1)}`}>
      {"★".repeat(filled)}
      {"☆".repeat(5 - filled)}
      <span> {rating.toFixed(1)}</span>
    </p>
  );
}

export function PoiCard({ dayId, blockId, poi, caption, onCaption, onClearCaption }: PoiCardProps) {
  const t = useT();
  const canEdit = useAlbum((s) => s.canEdit);
  const openDay = useOpenDayLightbox();
  const tap = useTapOpen(
    () => {
      if (poi.name) openDay(dayId, `poi:${blockId}`);
    },
    !canEdit && Boolean(poi.name),
  );
  const patchBlock = useAlbum((s) => s.patchBlock);
  const removeBlock = useAlbum((s) => s.removeBlock);
  const [query, setQuery] = useState(poi.name);
  const [hits, setHits] = useState<PoiHit[]>([]);
  const [open, setOpen] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [captionText, setCaptionText] = useState(caption);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<number>(undefined);
  const hasNote = Boolean(caption.trim());
  const size = poi.size ?? 2;
  const skin = poi.skin ?? "ticket";

  useEffect(() => {
    setQuery(poi.name);
  }, [poi.name]);
  useEffect(() => {
    setCaptionText(caption);
  }, [caption]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, []);

  function lookup(next: string) {
    window.clearTimeout(searchTimer.current);
    if (next.trim().length < 2) {
      setHits([]);
      return;
    }
    searchTimer.current = window.setTimeout(() => {
      void searchPoi({ data: { q: next } })
        .then((rows) => {
          setHits(rows);
          setOpen(rows.length > 0);
        })
        .catch(() => setHits([]));
    }, 320);
  }

  function apply(hit: PoiHit) {
    patchBlock(dayId, blockId, {
      place: { en: hit.name, de: hit.name },
      poi: {
        ...poi,
        name: hit.name,
        category: hit.category,
        rating: hit.rating,
        photoUrl: hit.photoUrl,
        address: hit.address,
        lat: hit.lat,
        lng: hit.lng,
        placeId: hit.placeId,
      },
    });
    setQuery(hit.name);
    setOpen(false);
    setHits([]);
  }

  if (!poi.name && !canEdit) return null;

  return (
    <SlideIn from="left" className="poi-block max-w-sm">
      <div
        className={cn("poi-card", `poi-card--${skin}`, `poi-card--s${size}`, !canEdit && poi.name && "cursor-zoom-in")}
        ref={wrapRef}
        onPointerDown={tap.onPointerDown}
        onPointerMove={tap.onPointerMove}
        onPointerUp={tap.onPointerUp}
        onPointerCancel={tap.onPointerCancel}
        onClick={canEdit ? undefined : tap.onClick}
      >
        {canEdit ? (
          <div className="relative">
            <input
              value={query}
              placeholder={t("ui.poiHint")}
              aria-label={t("ui.poiHint")}
              className="poi-name-input place-type w-full bg-transparent font-typewriter text-place text-lagoon-deep"
              onChange={(event) => {
                setQuery(event.target.value);
                lookup(event.target.value);
              }}
            />
            {open && hits.length ? (
              <ul className="place-suggest">
                {hits.map((hit) => (
                  <li key={`${hit.name}-${hit.lat}`}>
                    <button type="button" className="place-suggest-item" onClick={() => apply(hit)}>
                      <span>{hit.name}</span>
                      <span className="block font-script text-[0.7rem] text-ink-soft">{hit.category}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="poi-name place-type font-typewriter text-place text-lagoon-deep">{poi.name}</p>
        )}
        {size >= 2 ? (
          <>
            {poi.category ? <p className="poi-cat font-display text-kicker tracking-widest text-ink-soft uppercase">{poi.category}</p> : null}
            <Stars rating={poi.rating} />
          </>
        ) : null}
        {size >= 3 && poi.photoUrl ? (
          <img src={poi.photoUrl} alt="" className="poi-photo" />
        ) : null}
      </div>
      {canEdit ? (
        <div className="photo-under">
          {captionOpen ? (
            <div className="caption-strip photo-caption-editor">
              <textarea
                value={captionText}
                aria-label={t("ui.caption")}
                placeholder={t("ui.caption")}
                rows={3}
                className="photo-caption-body mt-1 text-center font-script text-caption leading-snug text-ink-soft"
                onChange={(event) => {
                  setCaptionText(event.target.value);
                  onCaption(event.target.value);
                }}
              />
              {hasNote ? (
                <button
                  type="button"
                  className="photo-caption-clear"
                  onClick={() => {
                    setCaptionText("");
                    onClearCaption();
                    setCaptionOpen(false);
                  }}
                >
                  {t("ui.removeCaption")}
                </button>
              ) : null}
            </div>
          ) : caption.trim() ? (
            <PhotoCaption place="" caption={caption} />
          ) : null}
          <div className={cn("photo-tabs", menuOpen && "is-open")}>
            <div ref={menuRef} className="photo-tab-more">
              <button
                type="button"
                className={cn("photo-tab photo-tab--more", menuOpen && "is-on")}
                aria-label={t("ui.photoActions")}
                onClick={() => setMenuOpen((value) => !value)}
              >
                <span aria-hidden="true">⋯</span>
              </button>
              {menuOpen ? (
                <div className="photo-tab-menu">
                  <button
                    type="button"
                    className="photo-tab-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      setCaptionOpen(true);
                    }}
                  >
                    {hasNote ? t("ui.changeCaption") : t("ui.addCaption")}
                  </button>
                  <button
                    type="button"
                    className="photo-tab-menu-item photo-tab-menu-item--danger"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirm(true);
                    }}
                  >
                    {t("ui.delete")}
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="photo-tab photo-tab--format"
              aria-label={t("ui.photoFormat")}
              onClick={() => patchBlock(dayId, blockId, { poi: { ...poi, size: nextPoiSize(size) } })}
            >
              <span>{size}</span>
            </button>
            <button
              type="button"
              className="photo-tab photo-tab--cycle"
              aria-label={t("ui.cycleFrame")}
              onClick={() => patchBlock(dayId, blockId, { poi: { ...poi, skin: nextPoiSkin(skin) } })}
            >
              <Recycle size={14} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      ) : caption.trim() ? (
        <PhotoCaption place="" caption={caption} />
      ) : null}
      <ConfirmDialog
        open={confirm}
        title={t("ui.confirmBlock")}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          removeBlock(dayId, blockId);
        }}
      />
    </SlideIn>
  );
}
