import { cn } from "@/lib/utils";
import type { PrintPhoto } from "@/lib/album/layout";
import { Frame } from "./Frame";
import { PhotoCaption } from "./PhotoCaption";
import { Polaroid } from "./Polaroid";
import { SlideIn } from "./SlideIn";

type CollageBlockProps = {
  photos: PrintPhoto[];
  place: string;
  caption: string;
  reverse?: boolean;
  onPlaceChange?: (value: string) => void;
  onCaptionChange?: (value: string) => void;
};

export function CollageBlock({
  photos,
  place,
  caption,
  reverse = false,
  onPlaceChange,
  onCaptionChange,
}: CollageBlockProps) {
  const count = Math.min(8, Math.max(photos.length, 0));
  if (count === 0) return null;

  return (
    <div className="space-y-4">
      <div className={cn("collage-mosaic", `collage-mosaic--n${count}`, reverse && "collage-mosaic--reverse")}>
        {photos.slice(0, 8).map((photo, index) => {
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
