import { cn } from "@/lib/utils";
import { routePath } from "@/lib/album/data";
import { landPinForPlace, PLACES } from "@/lib/album/places";
import { pairText, useAlbum } from "@/lib/album/store";
import { useLocale, useT } from "@/lib/i18n/locale";
import { WaxPin } from "./WaxPin";

type PortugalMapProps = {
  variant?: "hero" | "aside";
  activeId: string | null;
  focusId?: string | null;
  onSelect: (id: string) => void;
  className?: string;
};

export function PortugalMap({
  variant = "hero",
  activeId,
  focusId,
  onSelect,
  className,
}: PortugalMapProps) {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const hiddenPins = useAlbum((s) => s.hiddenPins);
  const days = useAlbum((s) => s.layout.days);
  const shown = days.filter((stop) => {
    if (hiddenPins[stop.id]) return false;
    if (variant === "aside" && focusId) return stop.id === focusId;
    return true;
  });

  const points = shown.map((stop) => {
    if (variant === "aside") return landPinForPlace(stop.id);
    return stop.pin;
  });
  const path = variant === "hero" ? routePath(points) : "";

  return (
    <div
      className={cn(
        "portugal-map relative",
        variant === "hero" && "portugal-map--hero",
        variant === "aside" && "portugal-map--aside",
        className,
      )}
    >
      <img
        src={variant === "aside" ? "/photos/portugal-land.jpg" : "/photos/portugal-map.jpg"}
        alt={variant === "hero" ? t("map.alt") : ""}
        className="portugal-map-art"
      />
      {path ? (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path d={path} className="route-dash" />
        </svg>
      ) : null}
      {shown.map((stop, i) => {
        const point = points[i];
        if (!point) return null;
        const active = activeId === stop.id;
        const name = pairText(stop.place, locale);
        const place = PLACES[stop.id];
        return (
          <button
            key={stop.id}
            type="button"
            onClick={() => onSelect(stop.id)}
            aria-label={`${place?.address ?? name} — ${t("ui.openDay")}`}
            aria-current={active ? "true" : undefined}
            className={cn(
              "map-pin pointer-events-auto absolute -translate-x-1/2 -translate-y-[70%]",
              active && "is-active",
            )}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            <span className="relative flex min-h-11 min-w-11 flex-col items-center justify-end">
              <WaxPin active={active || variant === "aside"} />
              {variant === "hero" && (
                <span
                  className={cn(
                    "caption-strip absolute whitespace-nowrap px-1.5 py-0.5 font-typewriter text-kicker leading-none tracking-wide",
                    active ? "text-coral" : "text-lagoon-deep",
                    stop.pin.label === "left" && "top-1/2 right-full mr-1 -translate-y-1/2",
                    stop.pin.label === "right" && "top-1/2 left-full ml-1 -translate-y-1/2",
                    stop.pin.label === "bottom" && "top-full mt-1",
                  )}
                >
                  {name}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
