import { cn } from "@/lib/utils";
import { days, MAP_VIEW, pinPercent, PORTUGAL_PATH, routePath } from "@/lib/album/data";
import { useT } from "@/lib/i18n/locale";
import { SlideIn } from "./SlideIn";
import { Stamp } from "./Stamp";
import { WaxPin } from "./WaxPin";

type MapInsertProps = {
  activeId: string | null;
  onSelect: (id: string) => void;
};

export function MapInsert({ activeId, onSelect }: MapInsertProps) {
  const t = useT();
  const path = routePath(days);

  return (
    <section id="route-map" className="mx-auto w-full max-w-5xl scroll-mt-6 px-4 py-8 md:px-8 md:py-12">
      <SlideIn from="left">
        <div className="mb-6 max-w-lg">
          <h2 className="font-display text-day leading-tight font-semibold text-ink">{t("map.title")}</h2>
          <p className="mt-2 font-script text-caption text-ink-soft">{t("map.caption")}</p>
          <p className="mt-3 font-display text-kicker tracking-widest text-lagoon-deep uppercase">
            {t("ui.routeHint")}
          </p>
        </div>
      </SlideIn>

      <SlideIn from="right" delayMs={80} className="relative mx-auto max-w-md md:max-w-lg">
        <figure className="insert-shadow rotate-left-soft relative bg-mat p-3 md:p-4">
          <span className="washi-tape pointer-events-none absolute -top-2 left-8 z-20 h-4 w-24 -rotate-6" />
          <span className="washi-tape pointer-events-none absolute -top-1 right-10 z-20 h-4 w-20 rotate-12" />

          <Stamp
            labelKey="stamp.passport"
            variant="round"
            rotation={-14}
            className="pointer-events-none absolute -left-3 top-10 z-20 size-16 md:size-20"
          />
          <Stamp
            labelKey="stamp.route"
            variant="postal"
            rotation={8}
            delayMs={120}
            className="pointer-events-none absolute -right-2 bottom-16 z-20"
          />
          <Stamp
            labelKey="stamp.date"
            variant="rect"
            rotation={-6}
            delayMs={180}
            className="pointer-events-none absolute right-6 -bottom-3 z-20 hidden sm:block"
          />

          <div className="map-board relative overflow-hidden">
            <svg
              viewBox={`0 0 ${MAP_VIEW.w} ${MAP_VIEW.h}`}
              className="block h-full w-full"
              role="img"
              aria-label={t("map.alt")}
            >
              <defs>
                <radialGradient id="ocean-wash" cx="28%" cy="42%" r="75%">
                  <stop offset="0%" stopColor="var(--color-lagoon)" stopOpacity="0.28" />
                  <stop offset="55%" stopColor="var(--color-lagoon)" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="var(--color-page)" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="land-wash" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--color-lagoon)" stopOpacity="0.35" />
                  <stop offset="50%" stopColor="var(--color-palm)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--color-coral)" stopOpacity="0.16" />
                </linearGradient>
              </defs>
              <rect width={MAP_VIEW.w} height={MAP_VIEW.h} fill="var(--color-page-deep)" />
              <rect width={MAP_VIEW.w} height={MAP_VIEW.h} fill="url(#ocean-wash)" />
              <path d={PORTUGAL_PATH} fill="url(#land-wash)" />
              <path
                d={PORTUGAL_PATH}
                className="portugal-stroke"
                fill="none"
                stroke="var(--color-stamp)"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d={path} className="route-dash" />
              <g className="compass" transform="translate(36, 292)" opacity="0.72">
                <circle r="16" fill="none" stroke="var(--color-stamp)" strokeWidth="1.1" />
                <circle r="5" fill="none" stroke="var(--color-stamp)" strokeWidth="0.7" />
                <path d="M0 -13 L3 0 L0 13 L-3 0 Z" fill="var(--color-coral)" />
                <path d="M-13 0 L0 3 L13 0 L0 -3 Z" fill="var(--color-lagoon-deep)" opacity="0.85" />
              </g>
            </svg>

            {days.map((stop) => {
              const active = activeId === stop.id;
              const pos = pinPercent(stop);
              return (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => onSelect(stop.id)}
                  aria-label={`${t(stop.placeKey)} — ${t("ui.openDay")}`}
                  aria-current={active ? "true" : undefined}
                  className={cn("map-pin absolute -translate-x-1/2 -translate-y-[70%]", active && "is-active")}
                  style={{ left: pos.left, top: pos.top }}
                >
                  <span className="relative flex min-h-11 min-w-11 flex-col items-center justify-end">
                    <WaxPin active={active} />
                    <span
                      className={cn(
                        "caption-strip absolute whitespace-nowrap px-1.5 py-0.5 font-typewriter text-caption leading-none tracking-wide",
                        active ? "text-coral" : "text-lagoon-deep",
                        active ? "text-coral" : "text-ink",
                        stop.pin.label === "left" && "top-1/2 right-full mr-1 -translate-y-1/2",
                        stop.pin.label === "right" && "top-1/2 left-full ml-1 -translate-y-1/2",
                        stop.pin.label === "bottom" && "top-full mt-1",
                      )}
                    >
                      {t(stop.placeKey)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </figure>
      </SlideIn>
    </section>
  );
}
