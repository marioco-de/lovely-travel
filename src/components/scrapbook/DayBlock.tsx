import { cn } from "@/lib/utils";
import { catalogSrc, cornersFor, rotateFor, type LayoutBlock, type LayoutDay, type PrintPhoto } from "@/lib/album/layout";
import { PLACES } from "@/lib/album/places";
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
  const title = pairText(day.label, locale);
  const stops = (day.places?.length ? day.places : [day.place]).map((item) => pairText(item, locale)).filter(Boolean);
  const placeName = stops[0] || pairText(day.place, locale);
  const place = PLACES[day.id];
  const address = day.geo?.address ?? place?.address;
  const editingPlaces = canEdit && placeEditId === day.id;

  function toPrint(photoId: string, i: number, placeLabel: string, caption: string): PrintPhoto {
    const mount = cornersFor(photoId, i + index);
    return {
      id: photoId,
      src: photos[photoId] ?? catalogSrc(photoId),
      alt: caption || placeLabel || placeName,
      place: placeLabel,
      caption,
      kind: "landscape",
      rotate: rotateFor(`${photoId}:${day.id}:${i}`),
      corners: mount.corners,
      cornerSet: mount.cornerSet,
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
          <div className="relative z-20 mb-6 flex items-start gap-4 pl-8 md:mb-8 md:pl-16">
            <DayMark index={index} active={active} rotation={index % 2 === 0 ? -10 : 8} />
            <div className="min-w-0">
              {canEdit ? (
                <LiveText
                  tag="h3"
                  value={title}
                  onChange={(value) => setDayLabel(day.id, locale, value)}
                  placeholder={t("ui.dayTitle")}
                  className="font-display text-day leading-snug font-semibold text-ink md:text-left"
                />
              ) : (
                <h3 className="font-display text-center text-day leading-snug font-semibold text-ink md:text-left">
                  {title}
                </h3>
              )}
              {canEdit || editingPlaces ? (
                <div className="mt-2 space-y-1">
                  {(day.places?.length ? day.places : [day.place]).map((item, placeIndex) => (
                    <div key={`${day.id}-place-${placeIndex}`} className="flex items-center gap-2">
                      <LiveText
                        tag="p"
                        value={pairText(item, locale)}
                        onChange={(value) => setDayPlaceAt(day.id, placeIndex, locale, value)}
                        placeholder={t("ui.place")}
                        className="place-type text-left font-typewriter text-kicker tracking-wide text-lagoon-deep"
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
                  <button type="button" className="album-btn album-btn--ghost mt-1" onClick={() => addDayPlace(day.id)}>
                    + {t("ui.addPlaceName")}
                  </button>
                </div>
              ) : stops.length ? (
                <p className="place-type mt-1 text-center font-typewriter text-kicker tracking-wide text-lagoon-deep md:text-left">
                  — {stops.join(" · ")} —
                </p>
              ) : null}
              {address ? (
                <p className="mt-1 font-typewriter text-[0.7rem] tracking-wide text-ink-soft">{address}</p>
              ) : null}
              {canEdit ? (
                <button
                  type="button"
                  className="mt-2 font-typewriter text-kicker tracking-wide text-lagoon-deep underline-offset-4 hover:underline"
                  onClick={() => setPlaceEditId(placeEditId === day.id ? null : day.id)}
                >
                  {t("ui.place")}
                </button>
              ) : null}
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-10">
            {day.blocks.map((block, blockIndex) => {
              const blockPlace = pairText(block.place, locale) || placeName;
              const blockCaption = pairText(block.caption, locale);
              const body = pairText(block.body, locale);
              const visibleIds = block.photoIds.filter((id) => photos[id] || catalogSrc(id));
              const photoId = visibleIds[0] ?? block.photoIds[0];

              let inner = null;
              if (block.kind === "note") {
                inner = (
                  <NoteCard
                    place={blockPlace}
                    body={body}
                    onPlaceChange={(value) => patchPair(block, "place", value)}
                    onBodyChange={(value) => patchPair(block, "body", value)}
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
                        photo={{
                          ...toPrint(photoId, blockIndex, blockPlace, blockCaption),
                          kind: "polaroid",
                          rotate: "right",
                        }}
                        onPlaceChange={(value) => patchPair(block, "place", value)}
                        onCaptionChange={(value) => patchPair(block, "caption", value)}
                      />
                    </SlideIn>
                  );
                }
              } else if (block.kind === "collage") {
                const tiles = (canEdit ? block.photoIds : visibleIds).map((id, i) =>
                  toPrint(id, blockIndex + i, blockPlace, blockCaption),
                );
                if (tiles.length === 0) inner = null;
                else {
                  inner = (
                    <CollageBlock
                      photos={tiles}
                      place={blockPlace}
                      caption={blockCaption}
                      reverse={reverse}
                      dayId={day.id}
                      blockId={block.id}
                      onPlaceChange={(value) => patchPair(block, "place", value)}
                      onCaptionChange={(value) => patchPair(block, "caption", value)}
                    />
                  );
                }
              } else if (photoId) {
                inner = (
                  <SlideIn from="left" className="day-frame max-w-3xl">
                    <Frame
                      photo={toPrint(photoId, blockIndex, blockPlace, blockCaption)}
                      onPlaceChange={(value) => patchPair(block, "place", value)}
                      onCaptionChange={(value) => patchPair(block, "caption", value)}
                    />
                  </SlideIn>
                );
              }

              if (!inner && !canEdit) return null;
              return (
                <div key={block.id} className="relative">
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
