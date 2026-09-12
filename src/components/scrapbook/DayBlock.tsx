import { cn } from "@/lib/utils";
import type { DayStop } from "@/lib/album/data";
import { useT } from "@/lib/i18n/locale";
import { Frame } from "./Frame";
import { PaperLayer } from "./PaperLayer";
import { Polaroid } from "./Polaroid";
import { SlideIn } from "./SlideIn";
import { Stamp } from "./Stamp";

type DayBlockProps = {
  day: DayStop;
  index: number;
  active: boolean;
};

export function DayBlock({ day, index, active }: DayBlockProps) {
  const t = useT();
  const reverse = index % 2 === 1;
  const polaroid = day.photos.find((p) => p.kind === "polaroid");
  const framed = day.photos.filter((p) => p.kind !== "polaroid");

  return (
    <article
      id={`day-${day.id}`}
      data-day={day.id}
      className="relative scroll-mt-8 overflow-x-clip py-10 md:py-16"
    >
      <PaperLayer variant={day.paper} />
      <div className="relative z-10">
        <div className="relative z-20 mb-6 flex items-start gap-4 pl-8 md:mb-8 md:pl-16">
          <Stamp
            labelKey={day.labelKey}
            variant="round"
            rotation={index % 2 === 0 ? -10 : 8}
            className={cn("size-16 shrink-0 md:size-20", active && "is-active")}
          />
          <div className="min-w-0">
            <h3 className="font-typewriter text-day leading-snug tracking-wide text-lagoon-deep">
              {t(day.placeKey)}
            </h3>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col items-stretch gap-10 md:flex-row md:items-start md:gap-8",
            reverse && "md:flex-row-reverse",
          )}
        >
          {framed.map((photo, i) => (
            <SlideIn
              key={photo.id}
              from={photo.slideFrom}
              delayMs={i * 70}
              className={cn("w-full min-w-0", polaroid ? "md:basis-3/5" : "md:basis-5/6")}
            >
              <Frame photo={photo} />
            </SlideIn>
          ))}
          {polaroid && (
            <SlideIn
              from={polaroid.slideFrom}
              delayMs={90}
              className="relative z-10 w-3/4 max-w-xs min-w-0 self-end md:mt-8 md:w-auto md:basis-2/5 md:self-start"
            >
              <Polaroid photo={polaroid} />
            </SlideIn>
          )}
        </div>
      </div>
    </article>
  );
}
