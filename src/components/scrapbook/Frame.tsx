import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";
import { usePhotoSrc } from "@/lib/album/store";
import type { AlbumPhoto, RotateDir } from "@/lib/album/data";
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
  photo: AlbumPhoto;
  className?: string;
  showCaption?: boolean;
  priority?: boolean;
};

export function Frame({ photo, className, showCaption = true, priority = false }: FrameProps) {
  const t = useT();
  const src = usePhotoSrc(photo);
  const isDetail = photo.kind === "detail";
  const corners = photo.corners ?? (isDetail ? "scalloped" : "classic");

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
            <DevelopingImage key={src} src={src} alt={t(photo.altKey)} priority={priority} />
          </div>
          <PhotoCorners variant={corners} />
        </div>
      </div>
      {showCaption && <PhotoCaption place={t(photo.placeKey)} caption={t(photo.captionKey)} />}
    </figure>
  );
}
