import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";
import { usePhotoSrc } from "@/lib/album/store";
import type { AlbumPhoto, RotateDir } from "@/lib/album/data";
import type { PrintPhoto } from "@/lib/album/layout";
import { DevelopingImage } from "./DevelopingImage";
import { PhotoCaption } from "./PhotoCaption";
import { PhotoCorners } from "./PhotoCorners";

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
};

function isCatalog(photo: AlbumPhoto | PrintPhoto): photo is AlbumPhoto {
  return "altKey" in photo && typeof photo.altKey === "string";
}

export function Frame({ photo, className, showCaption = true, priority = false }: FrameProps) {
  const t = useT();
  const src = usePhotoSrc(photo.id, "src" in photo ? photo.src : "");
  const isDetail = photo.kind === "detail";
  const corners = "corners" in photo ? (photo.corners ?? (isDetail ? "scalloped" : "classic")) : "classic";
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
              <DevelopingImage key={src} src={src} alt={alt} priority={priority} />
            ) : (
              <div className="grid h-full place-items-center font-typewriter text-kicker tracking-widest text-ink-soft uppercase">
                {t("ui.addPhoto")}
              </div>
            )}
          </div>
          <PhotoCorners variant={corners} />
        </div>
      </div>
      {showCaption && <PhotoCaption place={place} caption={caption} />}
    </figure>
  );
}
