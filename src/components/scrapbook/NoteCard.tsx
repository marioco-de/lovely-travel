import { cn } from "@/lib/utils";
import { useAlbum } from "@/lib/album/store";
import { LiveText } from "./LiveText";
import { ScriptLine } from "./PhotoCaption";
import { SlideIn } from "./SlideIn";

type NoteCardProps = {
  place: string;
  body: string;
  className?: string;
  onPlaceChange?: (value: string) => void;
  onBodyChange?: (value: string) => void;
};

export function NoteCard({ place, body, className, onPlaceChange, onBodyChange }: NoteCardProps) {
  const canEdit = useAlbum((s) => s.canEdit);
  if (!place && !body && !canEdit) return null;
  return (
    <SlideIn from="left" className={cn("max-w-md", className)}>
      <div className="caption-strip relative -rotate-1 px-5 py-4 text-center">
        {canEdit && onPlaceChange ? (
          <LiveText
            value={place}
            onChange={onPlaceChange}
            placeholder="Lorem ipsum"
            className="place-type font-typewriter text-place text-lagoon-deep"
          />
        ) : place ? (
          <p className="place-type font-typewriter text-place text-lagoon-deep">— {place} —</p>
        ) : null}
        {canEdit && onBodyChange ? (
          <LiveText value={body} onChange={onBodyChange} className="mt-1 font-script text-caption leading-snug text-ink-soft" />
        ) : body ? (
          <ScriptLine>{body}</ScriptLine>
        ) : null}
      </div>
    </SlideIn>
  );
}