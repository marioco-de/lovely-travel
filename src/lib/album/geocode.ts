import type { GeoHit } from "./places";

export type { GeoHit };
export async function geocodePortugal(query: string): Promise<GeoHit | null> {
  const q = query.trim();
  if (q.length < 2) return null;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q.includes("Portugal") ? q : `${q}, Portugal`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "pt");
  url.searchParams.set("addressdetails", "1");
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name?: string;
    }>;
    const hit = rows[0];
    if (!hit) return null;
    return {
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      address: hit.display_name ?? q,
    };
  } catch {
    return null;
  }
}
