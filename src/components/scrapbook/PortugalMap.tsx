import { cn } from "@/lib/utils";
import { days, routePath } from "@/lib/album/data";
import { useAlbum } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";
import { WaxPin } from "./WaxPin";

type PortugalMapProps = {
  variant?: "hero" | "aside";
  activeId: string | null;
  focusId?: string;
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
  const hiddenPins = useAlbum((s) => s.hiddenPins);
  const visible = days.filter((stop) => !hiddenPins[stop.id]);
  const path = routePath(visible);
  const focus = days.find((stop) => stop.id === (focusId ?? activeId));

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
        src="/photos/portugal-map.jpg"
        alt={variant === "hero" ? t("map.alt") : ""}
        className="portugal-map-art"
        style={
          variant === "aside" && focus
            ? { objectPosition: `${focus.pin.x}% ${focus.pin.y}%` }
            : undefined
        }
      />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <path d={path} className="route-dash" />
      </svg>
      {visible.map((stop) => {
        const active = activeId === stop.id;
        return (
          <button
            key={stop.id}
            type="button"
            onClick={() => onSelect(stop.id)}
            aria-label={`${t(stop.placeKey)} — ${t("ui.openDay")}`}
            aria-current={active ? "true" : undefined}
            className={cn(
              "map-pin pointer-events-auto absolute -translate-x-1/2 -translate-y-[70%]",
              active && "is-active",
            )}
            style={{ left: `${stop.pin.x}%`, top: `${stop.pin.y}%` }}
          >
            <span className="relative flex min-h-11 min-w-11 flex-col items-center justify-end">
              <WaxPin active={active} />
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
                  {t(stop.placeKey)}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
