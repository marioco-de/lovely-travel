import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";
import { useAlbum, usePhotoSrc } from "@/lib/album/store";
import type { AlbumPhoto, RotateDir } from "@/lib/album/data";
import type { PrintPhoto } from "@/lib/album/layout";
import { DevelopingImage } from "./DevelopingImage";
import { PhotoCaption } from "./PhotoCaption";
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
};

function isCatalog(photo: AlbumPhoto | PrintPhoto): photo is AlbumPhoto {
  return "altKey" in photo && typeof photo.altKey === "string";
}

export function Polaroid({ photo, className, onPlaceChange, onCaptionChange }: PolaroidProps) {
  const t = useT();
  const canEdit = useAlbum((s) => s.canEdit);
  const setPhoto = useAlbum((s) => s.setPhoto);
  const src = usePhotoSrc(photo.id, "src" in photo ? photo.src : "");
  const alt = isCatalog(photo) ? t(photo.altKey) : photo.alt;
  const place = isCatalog(photo) ? t(photo.placeKey) : photo.place;
  const caption = isCatalog(photo) ? t(photo.captionKey) : photo.caption;

  return (
    <figure className={cn("photo-block relative", className)}>
      <div className={cn("photo-print relative", rotateClass[photo.rotate])}>
        <div className="polaroid-shadow relative w-full overflow-visible rounded-xs bg-mat">
          <Tape seed={photo.id} className="-top-3.5 left-1/2 w-[8.5rem] -translate-x-1/2" rotation={3} />
          <div className="relative p-2.5 pb-1.5">
            <div className="relative aspect-square overflow-hidden bg-page-deep">
              {src ? (
                <DevelopingImage key={src} src={src} alt={alt} />
              ) : (
                <label className="photo-add grid h-full cursor-pointer place-items-center">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={!canEdit}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void setPhoto(photo.id, file);
                      event.target.value = "";
                    }}
                  />
                  <span className="photo-add-plus">{canEdit ? "+" : t("ui.addPhoto")}</span>
                </label>
              )}
            </div>
          </div>
          <PhotoCaption
            variant="band"
            place={place}
            caption={caption}
            onPlaceChange={onPlaceChange}
            onCaptionChange={onCaptionChange}
          />
        </div>
      </div>
    </figure>
  );
}
