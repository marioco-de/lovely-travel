import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { GeoHit } from "./places";

export type { GeoHit };

export type PlaceHit = GeoHit & { name: string };

function shortName(display: string, query: string) {
  const parts = display.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
  return parts[0] || query;
}

export const searchPlaces = createServerFn({ method: "GET" })
  .validator(z.object({ q: z.string().min(2).max(120) }))
  .handler(async ({ data }): Promise<PlaceHit[]> => {
    const q = data.q.trim();
    if (q.length < 2) return [];
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", /portugal|açores|azores|madeira/i.test(q) ? q : `${q}, Portugal`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "6");
    url.searchParams.set("countrycodes", "pt");
    url.searchParams.set("addressdetails", "1");
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "LovelyTravel/1.0 (https://lovely-travel.vercel.app)",
      },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    return rows.map((row) => ({
      lat: Number(row.lat),
      lng: Number(row.lon),
      address: row.display_name ?? q,
      name: shortName(row.display_name ?? q, q),
    }));
  });

export const reversePlace = createServerFn({ method: "GET" })
  .validator(z.object({ lat: z.number(), lng: z.number() }))
  .handler(async ({ data }): Promise<PlaceHit | null> => {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(data.lat));
    url.searchParams.set("lon", String(data.lng));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "14");
    url.searchParams.set("addressdetails", "1");
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "LovelyTravel/1.0 (https://lovely-travel.vercel.app)",
      },
    });
    if (!res.ok) return null;
    const row = (await res.json()) as { display_name?: string; lat?: string; lon?: string };
    const address = row.display_name?.trim();
    if (!address) return null;
    return {
      lat: Number(row.lat ?? data.lat),
      lng: Number(row.lon ?? data.lng),
      address,
      name: shortName(address, address),
    };
  });

export type PoiHit = {
  name: string;
  category: string;
  rating?: number;
  photoUrl?: string;
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
};

function mapsKey() {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "";
}

function osmCategory(row: { type?: string; class?: string; extra?: Record<string, string> }) {
  const raw = row.extra?.cuisine || row.type || row.class || "";
  if (!raw) return "Place";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function googleCategory(types: string[] | undefined) {
  const skip = new Set(["point_of_interest", "establishment", "premise", "political"]);
  const type = types?.find((item) => !skip.has(item)) ?? types?.[0] ?? "place";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function googlePhoto(name: string, key: string) {
  try {
    const res = await fetch(`https://places.googleapis.com/v1/${name}/media?maxHeightPx=480&key=${key}`);
    if (!res.ok) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 80 || buf.byteLength > 900_000) return undefined;
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

async function searchGooglePoi(q: string): Promise<PoiHit[]> {
  const key = mapsKey();
  if (!key) return [];
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.types,places.photos,places.location",
    },
    body: JSON.stringify({
      textQuery: /portugal|açores|azores|madeira/i.test(q) ? q : `${q}, Portugal`,
      languageCode: "en",
      regionCode: "PT",
      maxResultCount: 6,
    }),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      rating?: number;
      types?: string[];
      photos?: Array<{ name?: string }>;
      location?: { latitude?: number; longitude?: number };
    }>;
  };
  const rows = json.places ?? [];
  const hits: PoiHit[] = [];
  for (const place of rows) {
    const name = place.displayName?.text?.trim();
    if (!name) continue;
    const photoName = place.photos?.[0]?.name;
    hits.push({
      name,
      category: googleCategory(place.types),
      rating: place.rating,
      photoUrl: photoName ? await googlePhoto(photoName, key) : undefined,
      address: place.formattedAddress ?? name,
      lat: place.location?.latitude ?? 0,
      lng: place.location?.longitude ?? 0,
      placeId: place.id,
    });
  }
  return hits;
}

export const searchPoi = createServerFn({ method: "GET" })
  .validator(z.object({ q: z.string().min(2).max(120) }))
  .handler(async ({ data }): Promise<PoiHit[]> => {
    const q = data.q.trim();
    if (q.length < 2) return [];
    try {
      const google = await searchGooglePoi(q);
      if (google.length) return google;
    } catch {
      /* nominatim */
    }
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", /portugal|açores|azores|madeira/i.test(q) ? q : `${q}, Portugal`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "6");
    url.searchParams.set("countrycodes", "pt");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("extratags", "1");
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "LovelyTravel/1.0 (https://lovely-travel.vercel.app)",
      },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name?: string;
      name?: string;
      type?: string;
      class?: string;
      extratags?: Record<string, string>;
    }>;
    return rows.map((row) => ({
      name: row.name || shortName(row.display_name ?? q, q),
      category: osmCategory({ type: row.type, class: row.class, extra: row.extratags }),
      address: row.display_name ?? q,
      lat: Number(row.lat),
      lng: Number(row.lon),
      placeId: undefined,
    }));
  });

export async function geocodePortugal(query: string): Promise<GeoHit | null> {
  try {
    const hits = await searchPlaces({ data: { q: query } });
    const hit = hits[0];
    if (!hit) return null;
    return { lat: hit.lat, lng: hit.lng, address: hit.address };
  } catch {
    return null;
  }
}
