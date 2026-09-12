import { cn } from "@/lib/utils";
import { SlideIn } from "./SlideIn";

type PlaceCardProps = {
  place: string;
  caption: string;
  className?: string;
};

export function PlaceCard({ place, caption, className }: PlaceCardProps) {
  if (!place && !caption) return null;
  return (
    <SlideIn from="left" className={cn("max-w-sm", className)}>
      <div className="relative border-y border-dashed border-stamp/30 py-3 pr-4 pl-2">
        <p className="place-type font-typewriter text-day text-lagoon-deep">{place}</p>
        {caption ? <p className="mt-1 font-script text-caption text-ink-soft">{caption}</p> : null}
      </div>
    </SlideIn>
  );
}
