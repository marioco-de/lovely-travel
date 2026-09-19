import { cn } from "@/lib/utils";
import { COLLAGE_MAX, COLLAGE_MIN, type PhotoFormat, type PrintPhoto } from "@/lib/album/layout";
import { useAlbum } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";
import { Frame } from "./Frame";
import { Polaroid } from "./Polaroid";
import { SlideIn } from "./SlideIn";

type CollageBlockProps = {
  photos: PrintPhoto[];
  reverse?: boolean;
  dayId?: string;
  blockId?: string;
  variant?: "collage" | "polaroids";
};

function spanFor(format?: PhotoFormat) {
  if (format === "square") return "square";
  if (format === "oval") return "portrait";
  return "wide";
}

export function CollageBlock({
  photos,
  reverse = false,
  dayId,
  blockId,
  variant = "collage",
}: CollageBlockProps) {
  const t = useT();
  const canEdit = useAlbum((s) => s.canEdit);
  const addPhotoSlot = useAlbum((s) => s.addPhotoSlot);
  const removePhotoSlot = useAlbum((s) => s.removePhotoSlot);
  const count = Math.min(COLLAGE_MAX, Math.max(photos.length, 0));
  if (count === 0) return null;
  const showControls = canEdit && dayId && blockId;
  const polaroids = variant === "polaroids";

  return (
    <div className="space-y-4">
      <div
        className={cn(
          polaroids ? "polaroid-strip" : "collage-mosaic collage-mosaic--auto",
          reverse && !polaroids && "collage-mosaic--reverse",
        )}
      >
        {photos.slice(0, COLLAGE_MAX).map((photo, index) =>
          polaroids ? (
            <SlideIn
              key={photo.id}
              from={index % 2 === 0 ? "left" : "right"}
              delayMs={index * 50}
              className="polaroid-strip-tile"
            >
              <Polaroid photo={{ ...photo, kind: "polaroid" }} dayId={dayId} blockId={blockId} />
            </SlideIn>
          ) : (
            <div key={photo.id} className="collage-tile" data-span={spanFor(photo.format)}>
              <SlideIn from={index % 2 === 0 ? "left" : "right"} delayMs={index * 50}>
                <Frame photo={photo} dayId={dayId} blockId={blockId} />
              </SlideIn>
            </div>
          ),
        )}
      </div>
      {showControls ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
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
    </div>
  );
}
