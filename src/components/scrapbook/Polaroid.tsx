import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";
import { usePhotoSrc } from "@/lib/album/store";
import type { AlbumPhoto, RotateDir } from "@/lib/album/data";
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
  photo: AlbumPhoto;
  className?: string;
};

export function Polaroid({ photo, className }: PolaroidProps) {
  const t = useT();
  const src = usePhotoSrc(photo);

  return (
    <figure className={cn("photo-block relative", className)}>
      <div className={cn("photo-print relative", rotateClass[photo.rotate])}>
        <div className="polaroid-shadow relative w-full overflow-visible rounded-xs bg-mat">
          <Tape className="-top-2.5 left-1/2 w-[4.75rem] -translate-x-1/2" rotation={3} />
          <div className="relative p-2.5 pb-1.5">
            <div className="relative aspect-square overflow-hidden bg-page-deep">
              <DevelopingImage key={src} src={src} alt={t(photo.altKey)} />
            </div>
          </div>
          <PhotoCaption variant="band" place={t(photo.placeKey)} caption={t(photo.captionKey)} />
        </div>
      </div>
    </figure>
  );
}
