import { useT } from "@/lib/i18n/locale";
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

  return (
    <section id="route-map" className="relative mx-auto w-full max-w-7xl scroll-mt-6 px-4 py-8 md:px-10 md:py-12 lg:px-16">
      <SlideIn from="left">
        <div className="relative mb-6 max-w-lg">
          <h2 className="font-display text-day leading-tight font-semibold text-ink">{t("map.title")}</h2>
          <p className="mt-2 font-script text-caption text-ink-soft">{t("map.caption")}</p>
          <p className="mt-3 font-display text-kicker tracking-widest text-lagoon-deep uppercase">
            {t("ui.routeHint")}
          </p>
        </div>
      </SlideIn>

      <SlideIn from="right" delayMs={80} className="relative mx-auto w-full max-w-3xl">
        <div className="mb-2 flex justify-end">
          <PortugalLocator />
        </div>
        <div className="relative">
          <PortugalMap variant="hero" activeId={activeId} onSelect={onSelect} />
          <div className="pointer-events-none absolute inset-0 z-20 overflow-visible">
            <Tape variant="airmail" rotation={16} className="top-5 right-[10%] w-32 md:w-40" />
            <Tape variant="gingham" rotation={-11} className="bottom-8 left-[22%] w-36 md:w-44" />
          </div>
          <p className="sr-only">
            Map tiles by Stamen Design, CC BY 3.0. Data © OpenStreetMap.
          </p>
        </div>
        <Stamp
          labelKey="stamp.route"
          variant="postal"
          rotation={8}
          delayMs={120}
          className="pointer-events-none absolute -right-1 bottom-16 z-20 hidden sm:block"
        />
      </SlideIn>
    </section>
  );
}
