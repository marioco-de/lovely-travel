import { cn } from "@/lib/utils";
import { catalogSrc, cornersFor, isDayNumberLabel, noteForPhoto, rotateFor, type LayoutBlock, type LayoutDay, type PrintPhoto } from "@/lib/album/layout";
import { nextWritingPaper } from "@/lib/album/papers";
import { PLACES, placeCaption } from "@/lib/album/places";
import { pairText, useAlbum } from "@/lib/album/store";
import { useLocale, useT } from "@/lib/i18n/locale";
import { BlockBar } from "./BlockBar";
import { CollageBlock } from "./CollageBlock";
import { DayMark } from "./DayMark";
import { DayStarter } from "./DayStarter";
import { Frame } from "./Frame";
import { LiveText } from "./LiveText";
import { NoteCard } from "./NoteCard";
import { PaperLayer } from "./PaperLayer";
import { PlaceCard } from "./PlaceCard";
import { Polaroid } from "./Polaroid";
import { PortugalMap } from "./PortugalMap";
import { SlideIn } from "./SlideIn";

type DayBlockProps = {
  day: LayoutDay;
  index: number;
  active: boolean;
  onSelect: (id: string) => void;
};

export function DayBlock({ day, index, active, onSelect }: DayBlockProps) {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const photos = useAlbum((s) => s.photos);
  const canEdit = useAlbum((s) => s.canEdit);
  const patchBlock = useAlbum((s) => s.patchBlock);
  const setDayLabel = useAlbum((s) => s.setDayLabel);
  const setDayPlaceAt = useAlbum((s) => s.setDayPlaceAt);
  const addDayPlace = useAlbum((s) => s.addDayPlace);
  const removeDayPlace = useAlbum((s) => s.removeDayPlace);
  const placeEditId = useAlbum((s) => s.placeEditId);
  const setPlaceEditId = useAlbum((s) => s.setPlaceEditId);
  const reverse = index % 2 === 1;
  const titleRaw = pairText(day.label, locale);
  const title = isDayNumberLabel(titleRaw) ? "" : titleRaw;
  const stops = (day.places?.length ? day.places : [day.place]).map((item) => pairText(item, locale)).filter(Boolean);
  const placeName = stops[0] || pairText(day.place, locale);
  const catalog = PLACES[day.id];
  const pinLine = placeCaption(catalog, day.geo?.address);
  const extras = stops.filter((stop) => {
    const value = stop.toLowerCase();
    if (title && value === title.toLowerCase()) return false;
    if (pinLine && pinLine.toLowerCase().includes(value)) return false;
    return true;
  });
  const placeLine = pinLine || extras.join(" · ");
  const editingPlaces = canEdit && placeEditId === day.id;

  function toPrint(photoId: string, i: number, title: string, caption: string, frame?: PrintPhoto["corners"], format?: PrintPhoto["format"]): PrintPhoto {
    const mount = cornersFor(photoId, i + index);
    return {
      id: photoId,
      src: photos[photoId] ?? catalogSrc(photoId),
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
    <article
      id={`day-${day.id}`}
      data-day={day.id}
      data-paper={day.paper}
      className={cn(
        "day-wash relative isolate w-full scroll-mt-8 py-12 md:py-20",
        `day-wash--${day.paper}`,
        canEdit && "is-editing",
      )}
    >
      <PaperLayer variant={day.paper} />
      <PortugalMap
        variant="aside"
        activeId={day.id}
        focusId={day.id}
        onSelect={onSelect}
        className="hidden md:block"
      />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-10 lg:px-16">
        <div className="min-w-0">
          <div className="relative z-20 mb-10 flex items-start gap-4 pl-8 md:mb-14 md:pl-16">
            <DayMark index={index} active={active} rotation={index % 2 === 0 ? -10 : 8} />
            <div className="day-heading-copy min-w-0">
              {canEdit ? (
                <LiveText
                  tag="h3"
                  value={title}
                  onChange={(value) => setDayLabel(day.id, locale, value)}
                  placeholder={t("ui.dayTitle")}
                  className="place-type text-left font-typewriter text-day leading-[1.15] text-lagoon-deep"
                />
              ) : title ? (
                <h3 className="place-type m-0 text-left font-typewriter text-day leading-[1.15] text-lagoon-deep">
                  {title}
                </h3>
              ) : null}
              {canEdit || editingPlaces ? (
                <div className="space-y-1">
                  {(day.places?.length ? day.places : [day.place]).map((item, placeIndex) => (
                    <div key={`${day.id}-place-${placeIndex}`} className="flex items-center gap-2">
                      <LiveText
                        tag="p"
                        value={pairText(item, locale)}
                        onChange={(value) => setDayPlaceAt(day.id, placeIndex, locale, value)}
                        placeholder={t("ui.place")}
                        className="text-left font-typewriter text-kicker tracking-wide text-ink"
                      />
                      {placeIndex > 0 ? (
                        <button
                          type="button"
                          className="album-btn album-btn--tiny"
                          onClick={() => removeDayPlace(day.id, placeIndex)}
                          aria-label={t("ui.remove")}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" className="album-btn album-btn--ghost" onClick={() => addDayPlace(day.id)}>
                    + {t("ui.addPlaceName")}
                  </button>
                </div>
              ) : placeLine ? (
                <p className="day-place-line text-left font-typewriter text-kicker tracking-wide">
                  {placeLine}
                </p>
              ) : null}
              {canEdit ? (
                <button
                  type="button"
                  className="font-typewriter text-kicker tracking-wide text-lagoon-deep underline-offset-4 hover:underline"
                  onClick={() => setPlaceEditId(placeEditId === day.id ? null : day.id)}
                >
                  {t("ui.place")}
                </button>
              ) : null}
            </div>
          </div>

          <div className="day-blocks">
            {day.blocks.map((block, blockIndex) => {
              const blockPlace = pairText(block.place, locale) || placeName;
              const blockCaption = pairText(block.caption, locale);
              const body = pairText(block.body, locale);
              const visibleIds = block.photoIds.filter((id) => photos[id] || catalogSrc(id));
              const photoId = visibleIds[0] ?? block.photoIds[0];

              function printOf(id: string, i: number) {
                const note = noteForPhoto(block, id, i);
                return toPrint(
                  id,
                  blockIndex + i,
                  pairText(note.title, locale),
                  pairText(note.caption, locale),
                  note.frame,
                  note.format,
                );
              }

              let inner = null;
              if (block.kind === "note") {
                inner = (
                  <NoteCard
                    body={body}
                    paper={block.writingPaper}
                    onBodyChange={(value) => patchPair(block, "body", value)}
                    onCyclePaper={() =>
                      patchBlock(day.id, block.id, { writingPaper: nextWritingPaper(block.writingPaper) })
                    }
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
                    <SlideIn from="left" className="w-3/4 max-w-xs self-end md:w-[42%] md:max-w-sm">
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
                  inner = (
                    <CollageBlock
                      photos={tiles}
                      reverse={reverse}
                      dayId={day.id}
                      blockId={block.id}
                    />
                  );
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
            {canEdit && day.blocks.length === 0 ? <DayStarter dayId={day.id} /> : null}
          </div>
        </div>
      </div>
    </article>
  );
}
