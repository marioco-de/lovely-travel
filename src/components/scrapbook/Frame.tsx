import { cn } from "@/lib/utils";
import { useLightbox } from "@/lib/album/lightbox";
import { useT } from "@/lib/i18n/locale";
import { useAlbum, usePhotoSrc } from "@/lib/album/store";
import type { AlbumPhoto, CornerSet, RotateDir } from "@/lib/album/data";
import type { PrintPhoto } from "@/lib/album/layout";
import { DevelopingImage } from "./DevelopingImage";
import { PhotoCaption } from "./PhotoCaption";
import { PhotoBanderole } from "./PhotoBanderole";
import { PhotoCorners } from "./PhotoCorners";
import { PhotoEdgeStamp } from "./PhotoEdgeStamp";
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
};

function isCatalog(photo: AlbumPhoto | PrintPhoto): photo is AlbumPhoto {
  return "altKey" in photo && typeof photo.altKey === "string";
}

export function Frame({ photo, className, showCaption = true, priority = false, stamp, onPlaceChange, onCaptionChange }: FrameProps) {
  const t = useT();
  const canEdit = useAlbum((s) => s.canEdit);
  const setPhoto = useAlbum((s) => s.setPhoto);
  const src = usePhotoSrc(photo.id, "src" in photo ? photo.src : "");
  const openLightbox = useLightbox((s) => s.open);
  const isDetail = photo.kind === "detail";
  const corners = "corners" in photo ? (photo.corners ?? (isDetail ? "scallop" : "black")) : "black";
  const cornerSet: CornerSet =
    "cornerSet" in photo && photo.cornerSet ? photo.cornerSet : isDetail ? "diagonal" : "all";
  const alt = isCatalog(photo) ? t(photo.altKey) : photo.alt;
  const place = isCatalog(photo) ? t(photo.placeKey) : photo.place;
  const caption = isCatalog(photo) ? t(photo.captionKey) : photo.caption;

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
      </div>
      {showCaption && (
        <PhotoCaption
          place={place}
          caption={caption}
          onPlaceChange={onPlaceChange}
          onCaptionChange={onCaptionChange}
        />
      )}
    </figure>
  );
}
