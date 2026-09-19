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
import { EmptyPhotoSlot } from "./EmptyPhotoSlot";
import { PhotoEditTools } from "./PhotoEditTools";
import { PhotoStage } from "./PhotoStage";
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
  const clearPhoto = useAlbum((s) => s.clearPhoto);
  const removePhotoSlot = useAlbum((s) => s.removePhotoSlot);
  const setPhotoMeta = useAlbum((s) => s.setPhotoMeta);
  const [captionOpen, setCaptionOpen] = useState(false);
  const src = usePhotoSrc(photo.id, "src" in photo ? photo.src : "");
  const openDay = useOpenDayLightbox();
  const alt = isCatalog(photo) ? t(photo.altKey) : photo.alt;
  const place = isCatalog(photo) ? t(photo.placeKey) : photo.place;
  const caption = isCatalog(photo) ? t(photo.captionKey) : photo.caption;
  const corners = "corners" in photo ? photo.corners : undefined;
  const cornerSet: CornerSet = "cornerSet" in photo && photo.cornerSet ? photo.cornerSet : "all";
  const format: PhotoFormat = "format" in photo && photo.format ? photo.format : "original";
  const crop = "crop" in photo ? photo.crop : undefined;
  const media = "media" in photo ? photo.media : undefined;
  const play = "play" in photo ? photo.play : undefined;
  const video = isVideoSrc(src, media);
  const oval = format === "oval";
  const aspect = oval
    ? "aspect-[3/4]"
    : format === "fourThree"
      ? "aspect-[4/3]"
      : format === "original" && photo.kind !== "polaroid"
        ? "aspect-video"
        : "aspect-square";

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
        <div className={cn("polaroid-shadow photo-mat relative w-full overflow-visible bg-mat", oval ? "photo-mat--oval rounded-[50%]" : "rounded-xs")}>
          {oval ? null : <Tape seed={photo.id} className="-top-3.5 left-1/2 w-[8.5rem] -translate-x-1/2" rotation={3} />}
          <div className={cn("relative", oval ? "p-1.5" : "p-2.5 pb-1.5")}>
            <div className={cn("relative bg-page-deep", aspect, oval && "rounded-[50%]", src ? "overflow-hidden" : "overflow-visible")}>
              {src ? (
                <PhotoStage
                  src={src}
                  alt={alt}
                  crop={crop}
                  oval={oval}
                  editable={canEdit}
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
            </div>
          </div>
          {!captionOpen && (place.trim() || caption.trim()) ? (
            <PhotoCaption variant="band" place={place} caption={caption} />
          ) : !captionOpen ? (
            <div className="h-11" />
          ) : null}
          {oval ? null : <PhotoCorners variant={corners ?? "kraft"} set={cornerSet} />}
        </div>
        <div className="photo-under">
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
