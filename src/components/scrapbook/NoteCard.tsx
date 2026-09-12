import { cn } from "@/lib/utils";
import { SlideIn } from "./SlideIn";

type NoteCardProps = {
  place: string;
  body: string;
  className?: string;
};

export function NoteCard({ place, body, className }: NoteCardProps) {
  if (!place && !body) return null;
  return (
    <SlideIn from="left" className={cn("max-w-md", className)}>
      <div className="caption-strip relative -rotate-1 px-5 py-4">
        {place ? <p className="place-type font-typewriter text-place text-lagoon-deep">{place}</p> : null}
        {body ? <p className="mt-2 font-script text-caption leading-snug text-ink">{body}</p> : null}
      </div>
    </SlideIn>
  );
}
