import { cn } from "@/lib/utils";
import { COLLAGE_MAX, COLLAGE_MIN, type PrintPhoto } from "@/lib/album/layout";
import { useAlbum } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";
import { Frame } from "./Frame";
import { PhotoCaption } from "./PhotoCaption";
import { Polaroid } from "./Polaroid";
import { SlideIn } from "./SlideIn";

type CollageBlockProps = {
  photos: PrintPhoto[];
  place: string;
  caption: string;
  reverse?: boolean;
  dayId?: string;
  blockId?: string;
  onPlaceChange?: (value: string) => void;
  onCaptionChange?: (value: string) => void;
};

export function CollageBlock({
  photos,
  place,
  caption,
  reverse = false,
  dayId,
  blockId,
  onPlaceChange,
  onCaptionChange,
}: CollageBlockProps) {
  const t = useT();
  const canEdit = useAlbum((s) => s.canEdit);
  const addPhotoSlot = useAlbum((s) => s.addPhotoSlot);
  const removePhotoSlot = useAlbum((s) => s.removePhotoSlot);
  const count = Math.min(COLLAGE_MAX, Math.max(photos.length, 0));
  if (count === 0) return null;
  const showControls = canEdit && dayId && blockId;

  return (
    <div className="space-y-4">
      <div className={cn("collage-mosaic", `collage-mosaic--n${count}`, reverse && "collage-mosaic--reverse")}>
        {photos.slice(0, COLLAGE_MAX).map((photo, index) => {
          const polaroid = index % 3 === 1;
          return (
            <SlideIn
              key={photo.id}
              from={index % 2 === 0 ? "left" : "right"}
              delayMs={index * 50}
              className={`collage-tile collage-tile--${index}`}
            >
              {polaroid ? (
                <Polaroid photo={{ ...photo, kind: "polaroid" }} />
              ) : (
                <Frame photo={photo} showCaption={false} />
              )}
            </SlideIn>
          );
        })}
      </div>
      {showControls ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="album-btn"
            disabled={count <= COLLAGE_MIN}
            onClick={() => removePhotoSlot(dayId, blockId, photos[photos.length - 1]?.id ?? "")}
          >
            −
          </button>
          <span className="font-typewriter text-kicker tracking-wide text-ink-soft">{t("ui.collageRange")}</span>
          <button
            type="button"
            className="album-btn"
            disabled={count >= COLLAGE_MAX}
            onClick={() => addPhotoSlot(dayId, blockId)}
          >
            +
          </button>
        </div>
      ) : null}
      <PhotoCaption
        place={place}
        caption={caption}
        className="mx-auto max-w-md"
        onPlaceChange={onPlaceChange}
        onCaptionChange={onCaptionChange}
      />
    </div>
  );
}
