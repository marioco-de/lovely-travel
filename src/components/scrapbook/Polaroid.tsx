import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";
import { usePhotoSrc } from "@/lib/album/store";
import type { AlbumPhoto, RotateDir } from "@/lib/album/data";
import { DevelopingImage } from "./DevelopingImage";
import { Pearl } from "./Pearl";
import { PhotoCaption } from "./PhotoCaption";

const rotateClass: Record<RotateDir, string> = {
  left: "rotate-left",
  right: "rotate-right",
  leftSoft: "rotate-left-soft",
  rightSoft: "rotate-right-soft",
  none: "",
};

type PolaroidProps = {
  photo: AlbumPhoto;
  className?: string;
};

export function Polaroid({ photo, className }: PolaroidProps) {
  const t = useT();
  const src = usePhotoSrc(photo);

  return (
    <figure className={cn("photo-block relative", rotateClass[photo.rotate], className)}>
      <div className="polaroid-shadow relative w-full rounded-xs bg-mat p-2.5">
        <span className="washi-tape pointer-events-none absolute -top-1 left-1/2 z-10 h-3 w-16 -translate-x-1/2 rotate-2" />
        <div className="relative aspect-square overflow-hidden bg-page-deep">
          <DevelopingImage key={src} src={src} alt={t(photo.altKey)} />
        </div>
        <PhotoCaption variant="band" place={t(photo.placeKey)} caption={t(photo.captionKey)} />
      </div>
      <Pearl size="sm" className="absolute -top-1 right-6" />
    </figure>
  );
}
