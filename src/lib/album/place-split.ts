export type GeoPhoto = {
  lat?: number;
  lng?: number;
  takenAt: number;
};

const KM = 10;
const MIN_RUN = 3;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(s)));
}

function far(a: GeoPhoto, b: GeoPhoto) {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return false;
  return kmBetween({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }) >= KM;
}

export function clusterByPlace<T extends GeoPhoto>(photos: T[]): T[][] {
  if (photos.length === 0) return [];
  const ordered = [...photos].sort((a, b) => (a.takenAt || 0) - (b.takenAt || 0));
  const runs: T[][] = [];
  let current: T[] = [];
  for (const photo of ordered) {
    const prev = current[current.length - 1];
    if (!prev || !far(prev, photo)) {
      current.push(photo);
      continue;
    }
    runs.push(current);
    current = [photo];
  }
  if (current.length) runs.push(current);

  const merged: T[][] = [];
  for (const run of runs) {
    if (!merged.length) {
      merged.push([...run]);
      continue;
    }
    const previous = merged[merged.length - 1]!;
    const last = previous[previous.length - 1]!;
    const first = run[0]!;
    if (run.length < MIN_RUN || !far(last, first)) previous.push(...run);
    else merged.push([...run]);
  }
  return merged;
}
