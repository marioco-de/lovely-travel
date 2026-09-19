import { nextWritingPaper } from "@/lib/album/papers";
import type { PrintPhoto } from "@/lib/album/layout";
import { pairText, useAlbum } from "@/lib/album/store";
import { useLocale } from "@/lib/i18n/locale";
import { Frame } from "./Frame";
import { NoteCard } from "./NoteCard";
import { Polaroid } from "./Polaroid";

type IntroBlockProps = {
  dayId: string;
  blockId: string;
  wide: PrintPhoto;
  polaroid: PrintPhoto;
  body: string;
  paper?: string;
};

export function IntroBlock({ dayId, blockId, wide, polaroid, body, paper }: IntroBlockProps) {
  const locale = useLocale((s) => s.locale);
  const patchBlock = useAlbum((s) => s.patchBlock);
  const canEdit = useAlbum((s) => s.canEdit);

  return (
    <div className="intro-layout">
      <div className="intro-shot">
        <Frame photo={{ ...wide, format: wide.format ?? "fourThree" }} dayId={dayId} blockId={blockId} />
        {canEdit || body ? (
          <div className="intro-note">
            <NoteCard
              body={body}
              paper={paper}
              dayId={dayId}
              blockId={blockId}
              className="max-w-none"
              onBodyChange={(value) => patchBlock(dayId, blockId, { body: { en: value, de: value, [locale]: value } })}
              onCyclePaper={() => patchBlock(dayId, blockId, { writingPaper: nextWritingPaper(paper) })}
            />
          </div>
        ) : null}
      </div>
      <div className="intro-polaroid">
        <Polaroid photo={{ ...polaroid, kind: "polaroid", format: polaroid.format ?? "square" }} dayId={dayId} blockId={blockId} />
      </div>
    </div>
  );
}
