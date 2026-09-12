import { useT } from "@/lib/i18n/locale";
import { PortugalMap } from "./PortugalMap";
import { PortugalSeal } from "./PortugalSeal";
import { SlideIn } from "./SlideIn";
import { Stamp } from "./Stamp";

type MapInsertProps = {
  activeId: string | null;
  onSelect: (id: string) => void;
};

export function MapInsert({ activeId, onSelect }: MapInsertProps) {
  const t = useT();

  return (
    <section id="route-map" className="relative mx-auto w-full max-w-5xl scroll-mt-6 px-4 py-8 md:px-8 md:py-12">
      <SlideIn from="left">
        <div className="relative mb-6 max-w-lg">
          <h2 className="font-display text-day leading-tight font-semibold text-ink">{t("map.title")}</h2>
          <p className="mt-2 font-script text-caption text-ink-soft">{t("map.caption")}</p>
          <p className="mt-3 font-display text-kicker tracking-widest text-lagoon-deep uppercase">
            {t("ui.routeHint")}
          </p>
          <PortugalSeal className="absolute -top-4 right-0 size-16 md:-right-8 md:size-20" delayMs={160} rotation={12} />
        </div>
      </SlideIn>

      <SlideIn from="right" delayMs={80} className="relative mx-auto w-full max-w-xl">
        <PortugalMap variant="hero" activeId={activeId} onSelect={onSelect} />
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
