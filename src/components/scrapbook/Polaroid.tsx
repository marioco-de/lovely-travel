import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";
import type { AlbumPhoto, RotateDir } from "@/lib/album/data";
import { DevelopingImage } from "./DevelopingImage";
import { Pearl } from "./Pearl";

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

  return (
    <figure className={cn("relative", rotateClass[photo.rotate], className)}>
      <div className="polaroid-shadow relative w-full rounded-xs bg-mat p-2.5">
        <span className="washi-tape pointer-events-none absolute -top-1 left-1/2 z-10 h-3 w-16 -translate-x-1/2 rotate-2" />
        <div className="relative aspect-square overflow-hidden bg-page-deep">
          <DevelopingImage src={photo.src} alt={t(photo.altKey)} />
        </div>
        <figcaption className="relative z-20 px-1.5 pt-3 pb-3.5">
          <p className="font-script text-place leading-snug text-lagoon-deep">{t(photo.placeKey)}</p>
          <p className="mt-1 font-script text-caption leading-snug text-ink-soft">{t(photo.captionKey)}</p>
        </figcaption>
      </div>
      <Pearl size="sm" className="absolute -top-1 right-6" />
    </figure>
  );
}
