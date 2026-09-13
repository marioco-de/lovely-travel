import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import { dayGeo } from "@/lib/album/layout";
import { pairText, useAlbum } from "@/lib/album/store";
import { useLocale } from "@/lib/i18n/locale";

type PortugalLeafletProps = {
  variant?: "hero" | "aside";
  activeId: string | null;
  focusId?: string | null;
  onSelect: (id: string) => void;
  className?: string;
};

function pinIcon(active: boolean) {
  return L.divIcon({
    className: "map-pin-icon",
    iconSize: [22, 36],
    iconAnchor: [11, 34],
    html: `<span class="wax-pin leaflet-wax"><span class="wax-seal${active ? " is-active" : ""}"><span class="wax-impress"></span></span><span class="wax-needle${active ? " is-active" : ""}"></span></span>`,
  });
}

function Recenter({
  points,
  variant,
}: {
  points: { lat: number; lng: number }[];
  variant: "hero" | "aside";
}) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");

  useEffect(() => {
    if (points.length === 0) return;
    if (variant === "aside" && points[0]) {
      map.setView([points[0].lat, points[0].lng], 11, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 8, animate: true });
  }, [map, key, variant, points]);

  return null;
}

export default function PortugalLeaflet({
  variant = "hero",
  activeId,
  focusId,
  onSelect,
  className,
}: PortugalLeafletProps) {
  const locale = useLocale((s) => s.locale);
  const hiddenPins = useAlbum((s) => s.hiddenPins);
  const days = useAlbum((s) => s.layout.days);

  const stops = days
    .filter((stop) => {
      if (hiddenPins[stop.id]) return false;
      if (variant === "aside" && focusId) return stop.id === focusId;
      return true;
    })
    .map((stop) => {
      const geo = dayGeo(stop);
      return geo ? { stop, geo, name: pairText(stop.place, locale) } : null;
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const points = stops.map((row) => ({ lat: row.geo.lat, lng: row.geo.lng }));
  const line = variant === "hero" ? points.map((p) => [p.lat, p.lng] as [number, number]) : [];
  const start = points[0] ?? { lat: 39.5, lng: -8.1 };

  const icons = useMemo(
    () => ({
      idle: pinIcon(false),
      active: pinIcon(true),
    }),
    [],
  );

  return (
    <div
      className={cn(
        "portugal-map portugal-leaflet relative overflow-hidden",
        variant === "hero" && "portugal-map--hero",
        variant === "aside" && "portugal-map--aside portugal-map--flush",
        className,
      )}
    >
      <MapContainer
        center={[start.lat, start.lng]}
        zoom={variant === "aside" ? 11 : 7}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        className="portugal-leaflet-canvas h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <Recenter points={points} variant={variant} />
        {line.length > 1 ? (
          <Polyline
            positions={line}
            pathOptions={{ color: "#c12a21", weight: 2.4, dashArray: "7 8", opacity: 0.92 }}
          />
        ) : null}
        {stops.map((row) => {
          const active = activeId === row.stop.id || (variant === "aside" && focusId === row.stop.id);
          return (
            <Marker
              key={`${row.stop.id}-${row.geo.lat}-${row.geo.lng}`}
              position={[row.geo.lat, row.geo.lng]}
              icon={active ? icons.active : icons.idle}
              eventHandlers={{ click: () => onSelect(row.stop.id) }}
            >
              {variant === "hero" ? (
                <Tooltip direction={row.stop.pin.label === "left" ? "left" : "right"} offset={[8, -12]} permanent>
                  {row.name}
                </Tooltip>
              ) : null}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
