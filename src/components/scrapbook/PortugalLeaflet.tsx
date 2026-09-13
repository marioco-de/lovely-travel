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

    const placePin = () => {
      if (variant === "aside" && points[0]) {
        const ll = L.latLng(points[0].lat, points[0].lng);
        map.setView(ll, 11, { animate: false });
        map.invalidateSize();
        const size = map.getSize();
        if (size.x < 8 || size.y < 8) return;
        const current = map.latLngToContainerPoint(ll);
        const target = L.point(size.x * 0.75, size.y * 0.25);
        map.panBy(current.subtract(target), { animate: false });
        return;
      }
      if (points.length === 1 && points[0]) {
        map.setView([points[0].lat, points[0].lng], 10, { animate: true });
        return;
      }
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      const latSpan = bounds.getNorth() - bounds.getSouth();
      const lngSpan = bounds.getEast() - bounds.getWest();
      if (latSpan < 0.4) {
        const mid = bounds.getCenter();
        bounds.extend([mid.lat + 0.22, mid.lng]);
        bounds.extend([mid.lat - 0.22, mid.lng]);
      }
      if (lngSpan < 0.5) {
        const mid = bounds.getCenter();
        bounds.extend([mid.lat, mid.lng + 0.28]);
        bounds.extend([mid.lat, mid.lng - 0.28]);
      }
      map.fitBounds(bounds, { padding: [52, 64], maxZoom: 11, animate: true });
    };

    placePin();
    const retry = window.setTimeout(placePin, 220);
    const retry2 = window.setTimeout(placePin, 640);
    map.whenReady(placePin);
    return () => {
      window.clearTimeout(retry);
      window.clearTimeout(retry2);
    };
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

  const watercolorUrl = import.meta.env.VITE_STADIA_API_KEY
    ? `https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg?api_key=${import.meta.env.VITE_STADIA_API_KEY}`
    : "https://watercolormaps.collection.cooperhewitt.org/tile/watercolor/{z}/{x}/{y}.jpg";

  const watercolorAttribution = import.meta.env.VITE_STADIA_API_KEY
    ? '&copy; <a href="https://stadiamaps.com/attribution/" target="_blank" rel="noreferrer">Stadia Maps</a> &copy; <a href="https://stamen.com/" target="_blank" rel="noreferrer">Stamen Design</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
    : 'Map tiles by <a href="https://stamen.com/" target="_blank" rel="noreferrer">Stamen Design</a>, <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a> · Data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

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
        maxZoom={16}
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
          url={watercolorUrl}
          maxZoom={16}
          maxNativeZoom={16}
          errorTileUrl="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
          attribution={watercolorAttribution}
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
