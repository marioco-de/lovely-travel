import { COVER_ID } from "@/lib/album/layout";
import { pairText, useAlbum } from "@/lib/album/store";
import { useLocale, useT } from "@/lib/i18n/locale";
import { PortugalLocator } from "./PortugalLocator";
import { PortugalMap } from "./PortugalMap";
import { SlideIn } from "./SlideIn";
import { Stamp } from "./Stamp";
import { Tape } from "./Tape";

type MapInsertProps = {
  activeId: string | null;
  onSelect: (id: string) => void;
};

export function MapInsert({ activeId, onSelect }: MapInsertProps) {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const days = useAlbum((s) => s.layout.days);
  const route = days
    .filter((day) => day.id !== COVER_ID)
    .map((day) => pairText(day.place, locale).trim())
    .filter(Boolean)
    .filter((name, index, list) => list.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index)
    .join(" — ");

  return (
    <section id="route-map" className="relative mx-auto w-full max-w-7xl scroll-mt-6 px-4 py-8 md:px-10 md:py-12 lg:px-16">
      <SlideIn from="left">
        <div className="relative mb-6 max-w-lg">
          <h2 className="font-display text-day leading-tight font-semibold text-ink">{t("map.title")}</h2>
        </div>
      </SlideIn>

      <div className="map-stage relative mx-auto w-full max-w-3xl overflow-visible">
        <PortugalLocator />
        <div className="map-hero-art relative">
          <PortugalMap variant="hero" activeId={activeId} onSelect={onSelect} />
        </div>
        <div className="map-hero-tapes pointer-events-none absolute inset-0 z-30 overflow-visible">
          <Tape variant="airmail" rotation={16} className="-top-2 right-[8%] w-36 md:w-44" />
          <Tape variant="gingham" rotation={-11} className="-bottom-1 left-[18%] w-40 md:w-48" />
        </div>
        <p className="sr-only">Map tiles by Stamen Design, CC BY 3.0. Data © OpenStreetMap.</p>
        {route ? (
          <Stamp
            label={route}
            variant="postal"
            rotation={8}
            delayMs={120}
            className="pointer-events-none absolute -right-1 bottom-10 z-30 hidden max-w-[11rem] sm:block"
          />
        ) : null}
      </div>
    </section>
  );
}