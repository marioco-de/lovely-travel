import { cn } from "@/lib/utils";
import type { DayStop } from "@/lib/album/data";
import { useT } from "@/lib/i18n/locale";
import { DayMark } from "./DayMark";
import { Frame } from "./Frame";
import { PaperLayer } from "./PaperLayer";
import { Polaroid } from "./Polaroid";
import { PortugalMap } from "./PortugalMap";
import { SlideIn } from "./SlideIn";

type DayBlockProps = {
  day: DayStop;
  index: number;
  active: boolean;
  onSelect: (id: string) => void;
};

export function DayBlock({ day, index, active, onSelect }: DayBlockProps) {
  const t = useT();
  const reverse = index % 2 === 1;
  const polaroid = day.photos.find((p) => p.kind === "polaroid");
  const framed = day.photos.filter((p) => p.kind !== "polaroid");

  return (
    <article
      id={`day-${day.id}`}
      data-day={day.id}
      data-paper={day.paper}
      className={cn("day-wash relative isolate scroll-mt-8 py-10 md:py-16", `day-wash--${day.paper}`)}
    >
      <PaperLayer variant="azulejos" />
      <div className="relative z-10">
        <div className="relative z-20 mb-6 flex items-start gap-4 pl-8 md:mb-8 md:pl-16">
          <DayMark index={index} active={active} rotation={index % 2 === 0 ? -10 : 8} />
          <div className="min-w-0">
            <h3 className="place-type font-typewriter text-day leading-snug text-lagoon-deep">
              {t(day.placeKey)}
            </h3>
          </div>
        </div>

        <div
          className={cn(
            "grid grid-cols-1 items-start gap-10 md:grid-cols-5 md:gap-8",
            reverse && "md:[&_.day-frame]:col-start-3",
          )}
        >
          {framed.map((photo, i) => (
            <SlideIn
              key={photo.id}
              from="left"
              delayMs={i * 70}
              className={cn("day-frame min-w-0", polaroid ? "md:col-span-3" : "md:col-span-4")}
            >
              <Frame photo={photo} />
            </SlideIn>
          ))}
          {polaroid && (
            <SlideIn
              from="left"
              delayMs={90}
              className={cn(
                "relative z-10 min-w-0 w-3/4 max-w-xs justify-self-end md:col-span-2 md:w-auto md:max-w-none md:justify-self-stretch",
                reverse && "md:col-start-1 md:row-start-1",
              )}
            >
              <Polaroid photo={polaroid} />
            </SlideIn>
          )}
        </div>
      </div>

      <PortugalMap
        variant="aside"
        activeId={active ? day.id : null}
        focusId={day.id}
        onSelect={onSelect}
        className="pointer-events-none absolute inset-y-6 right-0 z-0 hidden w-[42%] md:block"
      />
    </article>
  );
}
