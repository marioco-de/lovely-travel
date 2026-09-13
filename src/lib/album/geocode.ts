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
