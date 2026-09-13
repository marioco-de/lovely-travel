import { dayGeo } from "@/lib/album/layout";
import { geoToLand } from "@/lib/album/places";
import { pairText, useAlbum } from "@/lib/album/store";
import { useLocale, useT } from "@/lib/i18n/locale";

/** Simplified mainland coastline, north → west → Algarve → east border. */
const OUTLINE: [number, number][] = [
  [42.13, -8.44],
  [41.94, -8.86],
  [41.15, -8.72],
  [40.64, -8.75],
  [40.15, -8.87],
  [39.36, -9.37],
  [38.78, -9.5],
  [38.67, -9.24],
  [38.42, -8.9],
  [37.95, -8.87],
  [37.02, -8.98],
  [37.08, -8.67],
  [37.02, -7.93],
  [37.17, -7.4],
  [38.0, -7.12],
  [38.88, -7.05],
  [39.82, -6.92],
  [40.54, -6.87],
  [41.81, -6.76],
  [42.13, -8.2],
];

function toPt(lat: number, lng: number) {
  const p = geoToLand(lat, lng);
  return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
}

export function PortugalLocator() {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const days = useAlbum((s) => s.layout.days);
  const hiddenPins = useAlbum((s) => s.hiddenPins);
  const path = OUTLINE.map(([lat, lng]) => toPt(lat, lng)).join(" ");
  const stops = days
    .filter((day) => !hiddenPins[day.id])
    .map((day) => {
      const geo = dayGeo(day);
      if (!geo) return null;
      const land = geoToLand(geo.lat, geo.lng);
      return { id: day.id, name: pairText(day.place, locale), ...land };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return (
    <figure className="country-locator" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="h-auto w-full overflow-visible">
        <polygon
          points={path}
          fill="rgb(243 230 201 / 0.55)"
          stroke="#5C3D2A"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {stops.map((stop) => (
          <g key={stop.id}>
            <circle cx={stop.x} cy={stop.y} r="1.7" fill="#c12a21" />
            <text
              x={stop.x > 58 ? stop.x - 3.2 : stop.x + 3.2}
              y={stop.y + 1.2}
              textAnchor={stop.x > 58 ? "end" : "start"}
              fill="#3d2a1c"
              fontSize="5.2"
              fontFamily="var(--font-typewriter), ui-monospace, monospace"
            >
              {stop.name}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 text-center font-typewriter text-[0.65rem] tracking-[0.22em] text-ink uppercase">
        {t("map.country")}
      </figcaption>
    </figure>
  );
}
