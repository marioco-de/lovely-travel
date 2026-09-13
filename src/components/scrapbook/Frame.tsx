import { useState } from "react";
import { cn } from "@/lib/utils";
import { useOpenDayLightbox } from "@/lib/album/lightbox";
import { useLocale, useT } from "@/lib/i18n/locale";
import { useAlbum, usePhotoSrc } from "@/lib/album/store";
import type { AlbumPhoto, CornerSet, RotateDir } from "@/lib/album/data";
import { nextFrame, nextFormat, type PhotoFormat, type PrintPhoto } from "@/lib/album/layout";
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
  const clearPhoto = useAlbum((s) => s.clearPhoto);
  const removePhotoSlot = useAlbum((s) => s.removePhotoSlot);
  const setPhotoMeta = useAlbum((s) => s.setPhotoMeta);
  const [captionOpen, setCaptionOpen] = useState(false);
  const src = usePhotoSrc(photo.id, "src" in photo ? photo.src : "");
  const openDay = useOpenDayLightbox();
  const isDetail = photo.kind === "detail";
  const corners = "corners" in photo ? (photo.corners ?? (isDetail ? "scallop" : "black")) : "black";
  const cornerSet: CornerSet =
    "cornerSet" in photo && photo.cornerSet ? photo.cornerSet : isDetail ? "diagonal" : "all";
  const format: PhotoFormat = "format" in photo && photo.format ? photo.format : "original";
  const alt = isCatalog(photo) ? t(photo.altKey) : photo.alt;
  const place = isCatalog(photo) ? t(photo.placeKey) : photo.place;
  const caption = isCatalog(photo) ? t(photo.captionKey) : photo.caption;
  const aspect =
    format === "square" ? "aspect-square" : format === "fourThree" ? "aspect-[4/3]" : isDetail ? "aspect-[4/3]" : "aspect-video";

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
  function cycleFrame() {
    if (dayId && blockId) setPhotoMeta(dayId, blockId, photo.id, { frame: nextFrame(corners) });
  }
  function cycleFormat() {
    if (dayId && blockId) setPhotoMeta(dayId, blockId, photo.id, { format: nextFormat(format) });
  }

  return (
    <figure className={cn("photo-block relative", canEdit && src && "photo-block--tabs", className)}>
      <div className={cn("photo-print relative", rotateClass[photo.rotate])}>
        <div className="photo-shadow photo-mat relative overflow-visible bg-mat p-1.5">
          <div className={cn("relative overflow-hidden bg-page-deep", aspect)}>
            {src ? (
              <button
                type="button"
                className="block h-full w-full cursor-zoom-in"
                onClick={() => openDay(dayId, `photo:${photo.id}`, { src, alt, place, caption })}
              >
                <DevelopingImage key={src} src={src} alt={alt} priority={priority} />
              </button>
            ) : canEdit ? (
              <label className="photo-add grid h-full cursor-pointer place-items-center">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void setPhoto(photo.id, file);
                    event.target.value = "";
                  }}
                />
                <span className="photo-add-plus" aria-hidden="true">
                  +
                </span>
                <span className="sr-only">{t("ui.addPhoto")}</span>
              </label>
            ) : (
              <div className="photo-add grid h-full place-items-center">
                <span className="photo-add-plus">{t("ui.addPhoto")}</span>
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
          {corners === "scallop" ? <PhotoBanderole /> : <PhotoCorners variant={corners} set={cornerSet} />}
        </div>
        <div className="photo-under">
          {showCaption && !captionOpen ? <PhotoCaption place={place} caption={caption} /> : null}
          {canEdit && src ? (
            <PhotoEditTools
              hasSrc
              title={place}
              caption={caption}
              format={format}
              open={captionOpen}
              onOpenChange={setCaptionOpen}
              onFile={(file) => void setPhoto(photo.id, file)}
              onTitle={writeTitle}
              onCaption={writeCaption}
              onClear={clearNote}
              onCycleFrame={cycleFrame}
              onCycleFormat={cycleFormat}
              onRemove={() => {
                void clearPhoto(photo.id);
                if (dayId && blockId) removePhotoSlot(dayId, blockId, photo.id);
              }}
            />
          ) : null}
        </div>
      </div>
    </figure>
  );
}
