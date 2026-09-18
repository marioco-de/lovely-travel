import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const PORTUGAL: [number, number] = [39.55, -8.0];

function pinIcon() {
  return L.divIcon({
    className: "map-pin-icon",
    iconSize: [22, 36],
    iconAnchor: [11, 34],
    html: `<span class="wax-pin leaflet-wax"><span class="wax-seal is-active"><span class="wax-impress"></span></span><span class="wax-needle is-active"></span></span>`,
  });
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 10), { animate: true });
    map.invalidateSize();
  }, [lat, lng, map]);
  return null;
}

function ClickMap({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function PlacePickerMap({
  lat,
  lng,
  onPick,
}: {
  lat?: number;
  lng?: number;
  onPick: (lat: number, lng: number) => void;
}) {
  const center: [number, number] = lat != null && lng != null ? [lat, lng] : PORTUGAL;
  const watercolorUrl = import.meta.env.VITE_STADIA_API_KEY
    ? `https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg?api_key=${import.meta.env.VITE_STADIA_API_KEY}`
    : "https://watercolormaps.collection.cooperhewitt.org/tile/watercolor/{z}/{x}/{y}.jpg";
  return (
    <MapContainer
      center={center}
      zoom={lat != null ? 11 : 6}
      className="place-picker-map"
      zoomControl
      attributionControl={false}
    >
      <TileLayer url={watercolorUrl} />
      {lat != null && lng != null ? <Marker position={[lat, lng]} icon={pinIcon()} /> : null}
      {lat != null && lng != null ? <Recenter lat={lat} lng={lng} /> : null}
      <ClickMap onPick={onPick} />
    </MapContainer>
  );
}
