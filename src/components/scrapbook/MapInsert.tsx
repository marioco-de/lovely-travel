import { useT } from "@/lib/i18n/locale";
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

      <SlideIn from="right" delayMs={80} className="relative mx-auto w-full max-w-3xl overflow-hidden">
        <Tape
          variant="plaid"
          rotation={18}
          className="-top-3 right-[8%] w-28"
        />
        <PortugalMap variant="hero" activeId={activeId} onSelect={onSelect} />
        <Tape
          variant="plaid"
          rotation={-12}
          className="-bottom-3 left-[28%] w-32"
        />
        <Stamp
          labelKey="stamp.route"
          variant="postal"
          rotation={8}
          delayMs={120}
          className="pointer-events-none absolute -right-2 bottom-10 z-20 hidden sm:block"
        />
      </SlideIn>
    </section>
  );
}
