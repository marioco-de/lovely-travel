import { Recycle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOpenDayLightbox } from "@/lib/album/lightbox";
import { useAlbum } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";
import { LiveText } from "./LiveText";
import { ScriptLine } from "./PhotoCaption";
import { SlideIn } from "./SlideIn";

type NoteCardProps = {
  body: string;
  paper?: string;
  className?: string;
  dayId?: string;
  blockId?: string;
  onBodyChange?: (value: string) => void;
  onCyclePaper?: () => void;
};

export function NoteCard({ body, paper = "lined", className, dayId, blockId, onBodyChange, onCyclePaper }: NoteCardProps) {
  const t = useT();
  const canEdit = useAlbum((s) => s.canEdit);
  const openDay = useOpenDayLightbox();
  if (!body && !canEdit) return null;
  return (
    <SlideIn from="left" className={cn("max-w-lg", className)}>
      <div className="write-paper-wrap">
        <div
          className={cn("write-paper", `write-paper--${paper}`, !canEdit && body && "cursor-zoom-in")}
          onClick={() => {
            if (!canEdit && dayId && blockId && body) openDay(dayId, `note:${blockId}`);
          }}
        >
          {canEdit && onBodyChange ? (
            <LiveText
              value={body}
              onChange={onBodyChange}
              placeholder={t("ui.note")}
              className="write-paper-text text-left font-script text-caption leading-relaxed text-ink"
            />
          ) : body ? (
            <ScriptLine className="write-paper-text !mt-0 text-left">{body}</ScriptLine>
          ) : null}
        </div>
        {canEdit && onCyclePaper ? (
          <button type="button" className="paper-flag" aria-label={t("ui.cyclePaper")} onClick={onCyclePaper}>
            <Recycle size={14} strokeWidth={2.4} />
          </button>
        ) : null}
      </div>
    </SlideIn>
  );
}
