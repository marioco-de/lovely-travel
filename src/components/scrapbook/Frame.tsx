import { useState } from "react";
import { cn } from "@/lib/utils";
import { useOpenDayLightbox } from "@/lib/album/lightbox";
import { useLocale, useT } from "@/lib/i18n/locale";
import { useAlbum, usePhotoSrc } from "@/lib/album/store";
import type { AlbumPhoto, CornerSet, RotateDir } from "@/lib/album/data";
import { nextFrame, nextFormat, type PhotoFormat, type PrintPhoto } from "@/lib/album/layout";
import { isVideoSrc, nextPlay } from "@/lib/album/media";
import { PhotoCaption } from "./PhotoCaption";
import { PhotoCorners } from "./PhotoCorners";
import { PhotoEdgeStamp } from "./PhotoEdgeStamp";
import { EmptyPhotoSlot } from "./EmptyPhotoSlot";
import { PhotoEditTools } from "./PhotoEditTools";
import { PhotoStage } from "./PhotoStage";
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
  const crop = "crop" in photo ? photo.crop : undefined;
  const media = "media" in photo ? photo.media : undefined;
  const play = "play" in photo ? photo.play : undefined;
  const video = isVideoSrc(src, media);
  const oval = format === "oval";
  const alt = isCatalog(photo) ? t(photo.altKey) : photo.alt;
  const place = isCatalog(photo) ? t(photo.placeKey) : photo.place;
  const caption = isCatalog(photo) ? t(photo.captionKey) : photo.caption;
  const aspect = oval
    ? "aspect-[3/4]"
    : format === "square"
      ? "aspect-square"
      : format === "fourThree"
        ? "aspect-[4/3]"
        : isDetail
          ? "aspect-[4/3]"
          : "aspect-video";

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
  function cyclePlay() {
    if (dayId && blockId) setPhotoMeta(dayId, blockId, photo.id, { play: nextPlay(play) });
  }
  function writeCrop(next: { x: number; y: number; z: number }) {
    if (dayId && blockId) setPhotoMeta(dayId, blockId, photo.id, { crop: next });
  }

  return (
    <figure className={cn("photo-block relative", canEdit && src && "photo-block--tabs", className)}>
      <div className={cn("photo-print relative", rotateClass[photo.rotate])}>
        <div className={cn("photo-shadow photo-mat relative overflow-visible bg-mat p-1.5", oval && "photo-mat--oval")}>
          <div className={cn("relative bg-page-deep", aspect, oval && "rounded-[50%]", src ? "overflow-hidden" : "overflow-visible")}>
            {src ? (
              <PhotoStage
                src={src}
                alt={alt}
                crop={crop}
                oval={oval}
                editable={canEdit}
                priority={priority}
                onCrop={writeCrop}
                onOpen={() => openDay(dayId, `photo:${photo.id}`, { src, alt, place, caption })}
                media={media}
                play={play}
              />
            ) : canEdit ? (
              <EmptyPhotoSlot photoId={photo.id} />
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
          {!oval ? <PhotoCorners variant={corners} set={cornerSet} /> : null}
        </div>
        <div className="photo-under">
          {showCaption && !captionOpen ? <PhotoCaption place={place} caption={caption} /> : null}
          {canEdit && src ? (
            <PhotoEditTools
              hasSrc
              photoId={photo.id}
              title={place}
              caption={caption}
              format={format}
              play={play}
              video={video}
              open={captionOpen}
              onOpenChange={setCaptionOpen}
              onFile={(file) => void setPhoto(photo.id, file)}
              onTitle={writeTitle}
              onCaption={writeCaption}
              onClear={clearNote}
              onCycleFrame={cycleFrame}
              onCycleFormat={cycleFormat}
              onCyclePlay={cyclePlay}
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
