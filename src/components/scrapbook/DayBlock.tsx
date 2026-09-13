import { cn } from "@/lib/utils";
import { catalogSrc, cornersFor, rotateFor, type LayoutBlock, type LayoutDay, type PrintPhoto } from "@/lib/album/layout";
import { PLACES } from "@/lib/album/places";
import { pairText, useAlbum } from "@/lib/album/store";
import { useLocale } from "@/lib/i18n/locale";
import { BlockBar } from "./BlockBar";
import { DayMark } from "./DayMark";
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
  const locale = useLocale((s) => s.locale);
  const photos = useAlbum((s) => s.photos);
  const canEdit = useAlbum((s) => s.canEdit);
  const patchBlock = useAlbum((s) => s.patchBlock);
  const setDayPlace = useAlbum((s) => s.setDayPlace);
  const addBlock = useAlbum((s) => s.addBlock);
  const reverse = index % 2 === 1;
  const placeName = pairText(day.place, locale);
  const place = PLACES[day.id];
  const address = day.geo?.address ?? place?.address;

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
                  value={placeName}
                  onChange={(value) => setDayPlace(day.id, locale, value)}
                  placeholder="Lorem ipsum"
                  className="place-type text-center font-typewriter text-day leading-snug text-lagoon-deep md:text-left"
                />
              ) : (
                <h3 className="place-type text-center font-typewriter text-day leading-snug text-lagoon-deep md:text-left">
                  — {placeName} —
                </h3>
              )}
              {address ? (
                <p className="mt-1 font-typewriter text-kicker tracking-wide text-ink-soft">{address}</p>
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
                const first = visibleIds[0] ?? block.photoIds[0];
                const second = visibleIds[1] ?? block.photoIds[1];
                if (!first && !canEdit) inner = null;
                else {
                  inner = (
                    <div
                      className={cn(
                        "grid grid-cols-1 items-start gap-8 md:grid-cols-5",
                        reverse && "md:[&_.day-frame]:col-start-1",
                      )}
                    >
                      {first ? (
                        <SlideIn from="left" className="day-frame min-w-0 md:col-span-3">
                          <Frame
                            photo={toPrint(first, blockIndex, blockPlace, blockCaption)}
                            onPlaceChange={(value) => patchPair(block, "place", value)}
                            onCaptionChange={(value) => patchPair(block, "caption", value)}
                          />
                        </SlideIn>
                      ) : null}
                      {second ? (
                        <SlideIn from="left" delayMs={80} className="min-w-0 w-3/4 max-w-xs justify-self-end md:col-span-2 md:w-auto md:max-w-none">
                          <Polaroid
                            photo={{
                              ...toPrint(second, blockIndex + 1, blockPlace, blockCaption),
                              kind: "polaroid",
                              rotate: "left",
                            }}
                            onPlaceChange={(value) => patchPair(block, "place", value)}
                            onCaptionChange={(value) => patchPair(block, "caption", value)}
                          />
                        </SlideIn>
                      ) : null}
                    </div>
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
            {canEdit && day.blocks.length === 0 ? (
              <button
                type="button"
                className="block-bar-btn mx-auto"
                onClick={() => addBlock(day.id, "photo")}
              >
                +
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
