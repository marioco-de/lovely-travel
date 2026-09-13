import { cn } from "@/lib/utils";
import { useAlbum } from "@/lib/album/store";
import { LiveText } from "./LiveText";
import { ScriptLine } from "./PhotoCaption";
import { SlideIn } from "./SlideIn";

type PlaceCardProps = {
  place: string;
  caption: string;
  className?: string;
  onPlaceChange?: (value: string) => void;
  onCaptionChange?: (value: string) => void;
};

export function PlaceCard({ place, caption, className, onPlaceChange, onCaptionChange }: PlaceCardProps) {
  const canEdit = useAlbum((s) => s.canEdit);
  if (!place && !caption && !canEdit) return null;
  return (
    <SlideIn from="left" className={cn("max-w-sm", className)}>
      <div className="relative border-y border-dashed border-stamp/30 py-3 pr-4 pl-2 text-center">
        {canEdit && onPlaceChange ? (
          <LiveText
            value={place}
            onChange={onPlaceChange}
            placeholder="Lorem ipsum"
            className="place-type font-typewriter text-day text-lagoon-deep"
          />
        ) : (
          <p className="place-type font-typewriter text-day text-lagoon-deep">— {place} —</p>
        )}
        {canEdit && onCaptionChange ? (
          <LiveText value={caption} onChange={onCaptionChange} className="mt-1 font-script text-caption leading-snug text-ink-soft" />
        ) : caption ? (
          <ScriptLine>{caption}</ScriptLine>
        ) : null}
      </div>
    </SlideIn>
  );
}