import { cn } from "@/lib/utils";
import { ScriptLine } from "./PhotoCaption";
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
      <div className="caption-strip relative -rotate-1 px-5 py-4 text-center">
        {place ? <p className="place-type font-typewriter text-place text-lagoon-deep">— {place} —</p> : null}
        {body ? <ScriptLine>{body}</ScriptLine> : null}
      </div>
    </SlideIn>
  );
}
