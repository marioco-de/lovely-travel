import { dayGeo } from "@/lib/album/layout";
import { pairText, useAlbum } from "@/lib/album/store";
import { useLocale, useT } from "@/lib/i18n/locale";

/** Tight mainland extent matching the traced silhouette. */
const LAND = { north: 42.154, south: 36.959, west: -9.51, east: -6.189 };

function landPct(lat: number, lng: number) {
  return {
    x: ((lng - LAND.west) / (LAND.east - LAND.west)) * 100,
    y: ((LAND.north - lat) / (LAND.north - LAND.south)) * 100,
  };
}

export function PortugalLocator() {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const days = useAlbum((s) => s.layout.days);
  const hiddenPins = useAlbum((s) => s.hiddenPins);
  const stops = days
    .filter((day) => !hiddenPins[day.id])
    .map((day) => {
      const geo = dayGeo(day);
      if (!geo) return null;
      return { id: day.id, name: pairText(day.place, locale), ...landPct(geo.lat, geo.lng) };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return (
    <figure className="country-locator">
      <div className="relative">
        <img src="/maps/portugal-outline.svg" alt="" className="block h-auto w-full" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          {stops.map((stop) => (
            <g key={stop.id}>
              <circle cx={stop.x} cy={stop.y} r="1.6" fill="#c12a21" />
              <text
                x={stop.x > 62 ? stop.x - 3 : stop.x + 3}
                y={stop.y + 1.1}
                textAnchor={stop.x > 62 ? "end" : "start"}
                fill="#3d2a1c"
                fontSize="4.6"
                fontFamily="var(--font-typewriter), ui-monospace, monospace"
              >
                {stop.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <figcaption className="country-locator-name">{t("map.country")}</figcaption>
    </figure>
  );
}
