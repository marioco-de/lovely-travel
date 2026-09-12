/** Real stop coordinates (WGS84), from municipal / map sources — not guessed. */
export type PlaceRecord = {
  id: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  pinLabel: "left" | "right" | "bottom";
};

export const PLACES: Record<string, PlaceRecord> = {
  porto: {
    id: "porto",
    name: "Cais da Ribeira",
    city: "Porto",
    address: "Cais da Ribeira, 4050-513 Porto, Portugal",
    lat: 41.1409,
    lng: -8.611,
    pinLabel: "left",
  },
  coimbra: {
    id: "coimbra",
    name: "Sé Velha",
    city: "Coimbra",
    address: "Largo da Sé Velha, 3000-383 Coimbra, Portugal",
    lat: 40.2089,
    lng: -8.4291,
    pinLabel: "right",
  },
  lisbon: {
    id: "lisbon",
    name: "Miradouro das Portas do Sol",
    city: "Lisboa",
    address: "Largo das Portas do Sol, 1100-411 Lisboa, Portugal",
    lat: 38.7118,
    lng: -9.1304,
    pinLabel: "left",
  },
  algarve: {
    id: "algarve",
    name: "Ponta da Piedade",
    city: "Lagos",
    address: "Ponta da Piedade, 8600-315 Lagos, Portugal",
    lat: 37.0804,
    lng: -8.6695,
    pinLabel: "right",
  },
};

/**
 * Mainland Portugal extent matching the watercolor silhouette
 * (Minho → Sagres, Cabo da Roca → eastern border), with a little sea padding.
 */
const GEO = {
  north: 42.18,
  south: 36.72,
  west: -9.62,
  east: -6.12,
};

export function geoToLand(lat: number, lng: number) {
  return {
    x: ((lng - GEO.west) / (GEO.east - GEO.west)) * 100,
    y: ((GEO.north - lat) / (GEO.north - GEO.south)) * 100,
  };
}

/** Crop of portugal-map.jpg that shows only the country. */
export const MAP_LAND_CROP = { x0: 360, y0: 240, x1: 800, y1: 1360, srcW: 1200, srcH: 1600 };

export function landToHero(point: { x: number; y: number }) {
  const { x0, y0, x1, y1, srcW, srcH } = MAP_LAND_CROP;
  return {
    x: (((point.x / 100) * (x1 - x0) + x0) / srcW) * 100,
    y: (((point.y / 100) * (y1 - y0) + y0) / srcH) * 100,
  };
}

export function pinForPlace(id: string) {
  const place = PLACES[id];
  if (!place) return { x: 50, y: 50, label: "right" as const };
  const land = geoToLand(place.lat, place.lng);
  return { ...landToHero(land), label: place.pinLabel };
}

export function landPinForPlace(id: string) {
  const place = PLACES[id];
  if (!place) return { x: 50, y: 50 };
  return geoToLand(place.lat, place.lng);
}
