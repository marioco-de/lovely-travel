import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLightbox } from "@/lib/album/lightbox";
import { useLocale, useT } from "@/lib/i18n/locale";
import { useAlbum, usePhotoSrc } from "@/lib/album/store";
import type { AlbumPhoto, RotateDir } from "@/lib/album/data";
import type { PrintPhoto } from "@/lib/album/layout";
import { DevelopingImage } from "./DevelopingImage";
import { PhotoCaption } from "./PhotoCaption";
import { PhotoEditTools } from "./PhotoEditTools";
import { Tape } from "./Tape";

const rotateClass: Record<RotateDir, string> = {
  left: "rotate-left",
  right: "rotate-right",
  leftSoft: "rotate-left-soft",
  rightSoft: "rotate-right-soft",
  none: "",
};

type PolaroidProps = {
  photo: AlbumPhoto | PrintPhoto;
  className?: string;
  onPlaceChange?: (value: string) => void;
  onCaptionChange?: (value: string) => void;
  dayId?: string;
  blockId?: string;
};

function isCatalog(photo: AlbumPhoto | PrintPhoto): photo is AlbumPhoto {
  return "altKey" in photo && typeof photo.altKey === "string";
}

export function Polaroid({ photo, className, onPlaceChange, onCaptionChange, dayId, blockId }: PolaroidProps) {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const canEdit = useAlbum((s) => s.canEdit);
  const setPhoto = useAlbum((s) => s.setPhoto);
  const setPhotoNote = useAlbum((s) => s.setPhotoNote);
  const clearPhotoNote = useAlbum((s) => s.clearPhotoNote);
  const [captionOpen, setCaptionOpen] = useState(false);
  const src = usePhotoSrc(photo.id, "src" in photo ? photo.src : "");
  const openLightbox = useLightbox((s) => s.open);
  const alt = isCatalog(photo) ? t(photo.altKey) : photo.alt;
  const place = isCatalog(photo) ? t(photo.placeKey) : photo.place;
  const caption = isCatalog(photo) ? t(photo.captionKey) : photo.caption;

  function writeTitle(value: string) {
    if (dayId && blockId) setPhotoNote(dayId, blockId, photo.id, "title", locale, value);
    else onPlaceChange?.(value);
  }
  function writeCaption(value: string) {
    if (dayId && blockId) setPhotoNote(dayId, blockId, photo.id, "caption", locale, value);
    else onCaptionChange?.(value);
  }
  function clearNote() {
    if (dayId && blockId) clearPhotoNote(dayId, blockId, photo.id);
    else {
      onPlaceChange?.("");
      onCaptionChange?.("");
    }
  }

  return (
    <figure className={cn("photo-block relative", className)}>
      <div className={cn("photo-print relative", rotateClass[photo.rotate])}>
        <div className="polaroid-shadow relative w-full overflow-visible rounded-xs bg-mat">
          <Tape seed={photo.id} className="-top-3.5 left-1/2 w-[8.5rem] -translate-x-1/2" rotation={3} />
          <div className="relative p-2.5 pb-1.5">
            <div className="relative aspect-square overflow-hidden bg-page-deep">
              {src ? (
                <button
                  type="button"
                  className="block h-full w-full cursor-zoom-in"
                  onClick={() => openLightbox({ src, alt, place, caption })}
                >
                  <DevelopingImage key={src} src={src} alt={alt} />
                </button>
              ) : (
                <div className="photo-add grid h-full place-items-center">
                  <span className="photo-add-plus">{canEdit ? "+" : t("ui.addPhoto")}</span>
                </div>
              )}
            </div>
          </div>
          {canEdit ? (
            <PhotoEditTools
              hasSrc={Boolean(src)}
              title={place}
              caption={caption}
              open={captionOpen}
              onOpenChange={setCaptionOpen}
              onFile={(file) => void setPhoto(photo.id, file)}
              onTitle={writeTitle}
              onCaption={writeCaption}
              onClear={clearNote}
            />
          ) : null}
          {!captionOpen && (place.trim() || caption.trim()) ? (
            <PhotoCaption variant="band" place={place} caption={caption} />
          ) : !captionOpen ? (
            <div className="h-11" />
          ) : null}
        </div>
      </div>
    </figure>
  );
}
