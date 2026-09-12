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

type FrameProps = {
  photo: AlbumPhoto;
  className?: string;
  showCaption?: boolean;
  priority?: boolean;
};

function InkCorner({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const pos =
    corner === "tl"
      ? "top-0 left-0"
      : corner === "tr"
        ? "top-0 right-0 -scale-x-100"
        : corner === "bl"
          ? "bottom-0 left-0 -scale-y-100"
          : "right-0 bottom-0 -scale-100";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 36 36"
      className={cn("ink-corner pointer-events-none absolute size-9 md:size-11", pos)}
    >
      <path d="M2 2h24L2 26Z" fill="currentColor" opacity="0.92" />
      <path
        d="M2 2h18L2 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.55"
      />
    </svg>
  );
}

export function Frame({ photo, className, showCaption = true, priority = false }: FrameProps) {
  const t = useT();
  const isDetail = photo.kind === "detail";

  return (
    <figure className={cn("relative", rotateClass[photo.rotate], className)}>
      <div className="photo-shadow relative bg-mat p-2 md:p-2.5">
        <div
          className={cn(
            "relative overflow-hidden bg-page-deep",
            isDetail ? "aspect-4/3" : "aspect-video",
          )}
        >
          <DevelopingImage src={photo.src} alt={t(photo.altKey)} priority={priority} />
        </div>
        <InkCorner corner="tl" />
        <InkCorner corner="tr" />
        <InkCorner corner="bl" />
        <InkCorner corner="br" />
        <Pearl size="sm" className="absolute top-1 left-8" />
        <Pearl size="sm" className="absolute top-1 right-8" />
      </div>
      {showCaption && (
        <figcaption className="caption-strip relative z-20 mx-4 mt-3 -rotate-1 px-3 py-2.5 md:mx-6">
          <p className="font-script text-place leading-snug text-lagoon-deep">{t(photo.placeKey)}</p>
          <p className="mt-1 font-script text-caption leading-snug text-ink-soft">{t(photo.captionKey)}</p>
        </figcaption>
      )}
    </figure>
  );
}
