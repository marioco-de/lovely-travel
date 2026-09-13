import { catalogSrc, cornersFor, noteForPhoto, rotateFor, type LayoutBlock, type LayoutDay, type PrintPhoto } from "@/lib/album/layout";
import { nextWritingPaper } from "@/lib/album/papers";
import { CLEARED_PHOTO, pairText, useAlbum } from "@/lib/album/store";
import { useLocale } from "@/lib/i18n/locale";
import { BlockBar } from "./BlockBar";
import { CollageBlock } from "./CollageBlock";
import { DayStarter } from "./DayStarter";
import { Frame } from "./Frame";
import { NoteCard } from "./NoteCard";
import { PlaceCard } from "./PlaceCard";
import { PoiCard } from "./PoiCard";
import { Polaroid } from "./Polaroid";
import { SlideIn } from "./SlideIn";

type BlockStackProps = {
  day: LayoutDay;
  reverse?: boolean;
};

export function BlockStack({ day, reverse = false }: BlockStackProps) {
  const locale = useLocale((s) => s.locale);
  const photos = useAlbum((s) => s.photos);
  const canEdit = useAlbum((s) => s.canEdit);
  const patchBlock = useAlbum((s) => s.patchBlock);
  const placeName = pairText(day.place, locale);

  function toPrint(photoId: string, i: number, title: string, caption: string, frame?: PrintPhoto["corners"], format?: PrintPhoto["format"]): PrintPhoto {
    const mount = cornersFor(photoId, i);
    return {
      id: photoId,
      src: photos[photoId] === CLEARED_PHOTO ? "" : photos[photoId] || catalogSrc(photoId),
      alt: caption || title || placeName,
      place: title,
      caption,
      kind: "landscape",
      rotate: rotateFor(`${photoId}:${day.id}:${i}`),
      corners: frame ?? mount.corners,
      cornerSet: mount.cornerSet,
      format,
    };
  }

  function patchPair(block: LayoutBlock, field: "place" | "caption" | "body", value: string) {
    patchBlock(day.id, block.id, { [field]: { ...block[field], [locale]: value } });
  }

  return (
    <div className="day-blocks">
      {day.blocks.map((block, blockIndex) => {
        const blockPlace = pairText(block.place, locale) || placeName;
        const blockCaption = pairText(block.caption, locale);
        const body = pairText(block.body, locale);
        const visibleIds = block.photoIds.filter((id) => {
          const stored = photos[id];
          if (stored === CLEARED_PHOTO) return false;
          return Boolean(stored || catalogSrc(id));
        });
        const photoId = visibleIds[0] ?? block.photoIds[0];

        function printOf(id: string, i: number) {
          const note = noteForPhoto(block, id, i);
          return toPrint(id, blockIndex + i, pairText(note.title, locale), pairText(note.caption, locale), note.frame, note.format);
        }

        let inner = null;
        if (block.kind === "note") {
          inner = (
            <NoteCard
              body={body}
              paper={block.writingPaper}
              onBodyChange={(value) => patchPair(block, "body", value)}
              onCyclePaper={() => patchBlock(day.id, block.id, { writingPaper: nextWritingPaper(block.writingPaper) })}
            />
          );
        } else if (block.kind === "poi") {
          inner = (
            <PoiCard
              dayId={day.id}
              blockId={block.id}
              poi={block.poi ?? { name: blockPlace, category: "", size: 2, skin: "ticket" }}
              caption={blockCaption}
              onCaption={(value) => patchPair(block, "caption", value)}
              onClearCaption={() => patchPair(block, "caption", "")}
            />
          );
        } else if (block.kind === "place") {
          inner = (
            <PlaceCard
              place={blockPlace}
              caption={blockCaption || body}
              onPlaceChange={(value) => patchPair(block, "place", value)}
              onCaptionChange={(value) => patchPair(block, "caption", value)}
            />
          );
        } else if (block.kind === "polaroid") {
          if (!photoId && !canEdit) inner = null;
          else if (photoId) {
            inner = (
              <SlideIn from={reverse ? "right" : "left"} className="w-3/4 max-w-xs self-end md:w-[42%] md:max-w-sm">
                <Polaroid
                  photo={{ ...printOf(photoId, 0), kind: "polaroid", rotate: "right" }}
                  dayId={day.id}
                  blockId={block.id}
                />
              </SlideIn>
            );
          }
        } else if (block.kind === "collage") {
          const tiles = (canEdit ? block.photoIds : visibleIds).map((id, i) => printOf(id, i));
          if (tiles.length === 0) inner = null;
          else {
            inner = <CollageBlock photos={tiles} reverse={reverse} dayId={day.id} blockId={block.id} />;
          }
        } else if (photoId) {
          inner = (
            <SlideIn from="left" className="day-frame max-w-3xl">
              <Frame photo={printOf(photoId, 0)} dayId={day.id} blockId={block.id} />
            </SlideIn>
          );
        }

        if (!inner && !canEdit) return null;
        return (
          <div key={block.id} className="day-block-slot">
            {inner}
            {canEdit ? <BlockBar dayId={day.id} blockId={block.id} /> : null}
          </div>
        );
      })}
      {canEdit && day.blocks.length === 0 ? <DayStarter dayId={day.id} leadKey="ui.dayHappened" /> : null}
    </div>
  );
}
