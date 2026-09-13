import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLightbox } from "@/lib/album/lightbox";
import { useLocale, useT } from "@/lib/i18n/locale";
import { useAlbum, usePhotoSrc } from "@/lib/album/store";
import type { AlbumPhoto, CornerSet, RotateDir } from "@/lib/album/data";
import type { PrintPhoto } from "@/lib/album/layout";
import { DevelopingImage } from "./DevelopingImage";
import { PhotoCaption } from "./PhotoCaption";
import { PhotoBanderole } from "./PhotoBanderole";
import { PhotoCorners } from "./PhotoCorners";
import { PhotoEdgeStamp } from "./PhotoEdgeStamp";
import { PhotoEditTools } from "./PhotoEditTools";
import type { MessageKey } from "@/lib/i18n/messages";

const rotateClass: Record<RotateDir, string> = {
  left: "rotate-left",
  right: "rotate-right",
  leftSoft: "rotate-left-soft",
  rightSoft: "rotate-right-soft",
  none: "",
};

type FrameProps = {
  photo: AlbumPhoto | PrintPhoto;
  className?: string;
  showCaption?: boolean;
  priority?: boolean;
  stamp?: { labelKey: MessageKey; corner: "tl" | "tr" | "bl" | "br"; variant?: "round" | "rect" | "postal"; rotation?: number };
  onPlaceChange?: (value: string) => void;
  onCaptionChange?: (value: string) => void;
  dayId?: string;
  blockId?: string;
};

function isCatalog(photo: AlbumPhoto | PrintPhoto): photo is AlbumPhoto {
  return "altKey" in photo && typeof photo.altKey === "string";
}

export function Frame({ photo, className, showCaption = true, priority = false, stamp, onPlaceChange, onCaptionChange, dayId, blockId }: FrameProps) {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const canEdit = useAlbum((s) => s.canEdit);
  const setPhoto = useAlbum((s) => s.setPhoto);
  const setPhotoNote = useAlbum((s) => s.setPhotoNote);
  const clearPhotoNote = useAlbum((s) => s.clearPhotoNote);
  const [captionOpen, setCaptionOpen] = useState(false);
  const src = usePhotoSrc(photo.id, "src" in photo ? photo.src : "");
  const openLightbox = useLightbox((s) => s.open);
  const isDetail = photo.kind === "detail";
  const corners = "corners" in photo ? (photo.corners ?? (isDetail ? "scallop" : "black")) : "black";
  const cornerSet: CornerSet =
    "cornerSet" in photo && photo.cornerSet ? photo.cornerSet : isDetail ? "diagonal" : "all";
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
        <div className="photo-shadow relative overflow-visible bg-mat p-2 md:p-2.5">
          <div
            className={cn(
              "relative overflow-hidden bg-page-deep",
              isDetail ? "aspect-4/3" : "aspect-video",
            )}
          >
            {src ? (
              <button
                type="button"
                className="block h-full w-full cursor-zoom-in"
                onClick={() => openLightbox({ src, alt, place, caption })}
              >
                <DevelopingImage key={src} src={src} alt={alt} priority={priority} />
              </button>
            ) : (
              <div className="photo-add grid h-full place-items-center">
                <span className="photo-add-plus">{canEdit ? "+" : t("ui.addPhoto")}</span>
              </div>
            )}
            {src && stamp ? (
              <PhotoEdgeStamp
                src={src}
                corner={stamp.corner}
                labelKey={stamp.labelKey}
                variant={stamp.variant}
                rotation={stamp.rotation}
              />
            ) : null}
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
          {corners === "scallop" ? <PhotoBanderole /> : <PhotoCorners variant={corners} set={cornerSet} />}
        </div>
      </div>
      {showCaption && !captionOpen ? <PhotoCaption place={place} caption={caption} /> : null}
    </figure>
  );
}
