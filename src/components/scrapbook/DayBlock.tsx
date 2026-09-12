import { cn } from "@/lib/utils";
import { catalogSrc, cornersFor, rotateFor, type LayoutDay, type PrintPhoto } from "@/lib/album/layout";
import { pairText, useAlbum } from "@/lib/album/store";
import { useLocale } from "@/lib/i18n/locale";
import { DayMark } from "./DayMark";
import { Frame } from "./Frame";
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
  const reverse = index % 2 === 1;
  const placeName = pairText(day.place, locale);

  function toPrint(photoId: string, i: number, place: string, caption: string): PrintPhoto {
    const mount = cornersFor(photoId, i + index);
    return {
      id: photoId,
      src: photos[photoId] ?? catalogSrc(photoId),
      alt: caption || place || placeName,
      place,
      caption,
      kind: "landscape",
      rotate: rotateFor(i + index),
      corners: mount.corners,
      cornerSet: mount.cornerSet,
    };
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
      <PaperLayer variant="azulejos" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-10 lg:px-16">
        <div className="relative z-20 mb-6 flex items-start gap-4 pl-8 md:mb-8 md:pl-16">
          <DayMark index={index} active={active} rotation={index % 2 === 0 ? -10 : 8} />
          <div className="min-w-0">
            <h3 className="place-type font-typewriter text-day leading-snug text-lagoon-deep">{placeName}</h3>
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-10">
          {day.blocks.map((block, blockIndex) => {
            const blockPlace = pairText(block.place, locale) || placeName;
            const blockCaption = pairText(block.caption, locale);
            const body = pairText(block.body, locale);
            const visibleIds = block.photoIds.filter((id) => photos[id] || catalogSrc(id));

            if (block.kind === "note") {
              return <NoteCard key={block.id} place={blockPlace} body={body} />;
            }
            if (block.kind === "place") {
              return <PlaceCard key={block.id} place={blockPlace} caption={blockCaption || body} />;
            }
            if (block.kind === "polaroid") {
              const id = visibleIds[0] ?? block.photoIds[0];
              if (!id) return null;
              return (
                <SlideIn
                  key={block.id}
                  from="left"
                  className="w-3/4 max-w-xs self-end md:w-[38%] md:max-w-sm"
                >
                  <Polaroid
                    photo={{
                      ...toPrint(id, blockIndex, blockPlace, blockCaption),
                      kind: "polaroid",
                      rotate: "right",
                    }}
                  />
                </SlideIn>
              );
            }
            if (block.kind === "collage") {
              if (visibleIds.length === 0) return null;
              const [first, ...rest] = visibleIds;
              if (!first) return null;
              return (
                <div
                  key={block.id}
                  className={cn(
                    "grid grid-cols-1 items-start gap-8 md:grid-cols-5",
                    reverse && "md:[&_.day-frame]:col-start-1",
                  )}
                >
                  <SlideIn from="left" className="day-frame min-w-0 md:col-span-3">
                    <Frame photo={toPrint(first, blockIndex, blockPlace, blockCaption)} />
                  </SlideIn>
                  {rest[0] ? (
                    <SlideIn from="left" delayMs={80} className="min-w-0 w-3/4 max-w-xs justify-self-end md:col-span-2 md:w-auto md:max-w-none">
                      <Polaroid
                        photo={{
                          ...toPrint(rest[0], blockIndex + 1, blockPlace, blockCaption),
                          kind: "polaroid",
                          rotate: "left",
                        }}
                      />
                    </SlideIn>
                  ) : null}
                </div>
              );
            }
            const id = visibleIds[0] ?? block.photoIds[0];
            if (!id || (!photos[id] && !catalogSrc(id))) return null;
            return (
              <SlideIn key={block.id} from="left" className="day-frame max-w-3xl">
                <Frame photo={toPrint(id, blockIndex, blockPlace, blockCaption)} />
              </SlideIn>
            );
          })}
        </div>

        <PortugalMap
          variant="aside"
          activeId={active ? day.id : null}
          onSelect={onSelect}
          className="pointer-events-none absolute top-2 right-4 z-0 hidden w-[min(38%,18rem)] md:block"
        />
      </div>
    </article>
  );
}
