import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";
import { usePhotoSrc } from "@/lib/album/store";
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
};

function isCatalog(photo: AlbumPhoto | PrintPhoto): photo is AlbumPhoto {
  return "altKey" in photo && typeof photo.altKey === "string";
}

export function Polaroid({ photo, className }: PolaroidProps) {
  const t = useT();
  const src = usePhotoSrc(photo.id, "src" in photo ? photo.src : "");
  const alt = isCatalog(photo) ? t(photo.altKey) : photo.alt;
  const place = isCatalog(photo) ? t(photo.placeKey) : photo.place;
  const caption = isCatalog(photo) ? t(photo.captionKey) : photo.caption;

  return (
    <figure className={cn("photo-block relative", className)}>
      <div className={cn("photo-print relative", rotateClass[photo.rotate])}>
        <div className="polaroid-shadow relative w-full overflow-visible rounded-xs bg-mat">
          <Tape className="-top-3.5 left-1/2 w-[8.5rem] -translate-x-1/2" rotation={3} />
          <div className="relative p-2.5 pb-1.5">
            <div className="relative aspect-square overflow-hidden bg-page-deep">
              {src ? (
                <DevelopingImage key={src} src={src} alt={alt} />
              ) : (
                <div className="grid h-full place-items-center px-2 text-center font-typewriter text-kicker tracking-widest text-ink-soft uppercase">
                  {t("ui.addPhoto")}
                </div>
              )}
            </div>
          </div>
          <PhotoCaption variant="band" place={place} caption={caption} />
        </div>
      </div>
    </figure>
  );
}
