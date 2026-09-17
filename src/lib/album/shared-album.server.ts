import { readExifBytes } from "./exif";

export type SharedAlbumPhoto = {
  uid: string;
  url: string;
  thumb: string;
  takenAt: number;
  lat?: number;
  lng?: number;
  place?: string;
};

const UNKNOWN = "Unbekannter Ort";
const BATCH_URL = "https://photos.google.com/u/0/_/PhotosUi/data/batchexecute";
const BATCH_RPC = "snAcKc";
const MAX_PAGES = 80;
const BROWSER =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function cleanUrl(raw: string) {
  return raw.replace(/\\u003d/g, "=").replace(/\\u0026/g, "&").split("=")[0] ?? raw;
}

function sized(url: string, spec: string) {
  return `${cleanUrl(url)}=${spec}`;
}

function isAlbumMediaUrl(url: string) {
  if (!url.includes("lh3.googleusercontent.com")) return false;
  if (url.includes("/a/") || url.includes("/a-/") || url.includes("/ogw/") || url.includes("default-user")) return false;
  return url.includes("/pw/");
}

function isAlbumUid(uid: string) {
  return uid.startsWith("AF1Qip") && uid.length > 20;
}

function parseTime(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return 0;
  if (value > 1e16) return Math.floor(value / 1000);
  if (value > 1e14) return Math.floor(value / 1000);
  if (value > 1e11) return Math.floor(value);
  if (value > 1e9) return Math.floor(value * 1000);
  return 0;
}

function timeFromRow(row: unknown[]) {
  const direct = parseTime(row[2]);
  if (direct) return direct;
  for (const value of row) {
    const time = parseTime(value);
    if (time) return time;
    if (!Array.isArray(value)) continue;
    for (const inner of value.slice(0, 8)) {
      const nested = parseTime(inner);
      if (nested) return nested;
    }
  }
  return 0;
}

function fillMissingTimes(photos: SharedAlbumPhoto[]) {
  let last = 0;
  for (const photo of photos) {
    if (photo.takenAt) last = photo.takenAt;
    else if (last) photo.takenAt = last;
  }
  last = 0;
  for (let i = photos.length - 1; i >= 0; i -= 1) {
    const photo = photos[i];
    if (!photo) continue;
    if (photo.takenAt) last = photo.takenAt;
    else if (last) photo.takenAt = last;
  }
}

function readArray(text: string, from: number) {
  const start = text.indexOf("[", from);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseAlbumItems(data: unknown): { photos: SharedAlbumPhoto[]; nextPageToken: string | null } {
  if (!Array.isArray(data) || data.length < 2 || !Array.isArray(data[1])) {
    return { photos: [], nextPageToken: null };
  }
  const photos: SharedAlbumPhoto[] = [];
  for (const row of data[1]) {
    if (!Array.isArray(row) || row.length < 3) continue;
    const uid = row[0];
    const detail = row[1];
    if (typeof uid !== "string" || !isAlbumUid(uid) || !Array.isArray(detail)) continue;
    const rawUrl = typeof detail[0] === "string" ? detail[0] : "";
    const width = typeof detail[1] === "number" ? detail[1] : 0;
    const height = typeof detail[2] === "number" ? detail[2] : 0;
    if (!isAlbumMediaUrl(rawUrl) || Math.min(width, height) < 80) continue;
    const takenAt = timeFromRow(row);
    photos.push({
      uid,
      url: sized(rawUrl, "w1600"),
      thumb: sized(rawUrl, "w280"),
      takenAt,
    });
  }
  const token = data[2];
  return { photos, nextPageToken: typeof token === "string" && token.length > 8 ? token : null };
}

function parseInitData(html: string) {
  const marker = "AF_initDataCallback({key: 'ds:1'";
  const at = html.indexOf(marker);
  if (at < 0) return { photos: [] as SharedAlbumPhoto[], nextPageToken: null as string | null };
  const dataAt = html.indexOf("data:", at);
  const raw = readArray(html, dataAt);
  if (!raw) return { photos: [], nextPageToken: null };
  try {
    return parseAlbumItems(JSON.parse(raw));
  } catch {
    return { photos: [], nextPageToken: null };
  }
}

function extractAlbumRequest(html: string, finalUrl: string) {
  const fromHtml = html.match(
    /snAcKc[\s\S]{0,400}?request:\s*\[\s*"([A-Za-z0-9_-]+)"\s*,\s*null\s*,\s*null\s*,\s*"([A-Za-z0-9_-]+)"/,
  );
  if (fromHtml?.[1] && fromHtml[2]) return { albumKey: fromHtml[1], authKey: fromHtml[2] };
  const fromUrl = finalUrl.match(/\/share\/(AF1Qip[^/?#]+).*[?&]key=([A-Za-z0-9_-]+)/);
  if (fromUrl?.[1] && fromUrl[2]) return { albumKey: fromUrl[1], authKey: fromUrl[2] };
  const canonical = html.match(/photos\.google\.com\/share\/(AF1Qip[^"?]+)\?key=([A-Za-z0-9_-]+)/);
  if (canonical?.[1] && canonical[2]) return { albumKey: canonical[1], authKey: canonical[2] };
  return null;
}

function parseBatchBody(body: string) {
  let text = body.trimStart();
  if (text.startsWith(")]}'")) text = text.slice(4).trimStart();
  const line = text.split("\n").find((row) => row.trimStart().startsWith("[["));
  if (!line) return null;
  try {
    const outer = JSON.parse(line) as unknown;
    if (!Array.isArray(outer)) return null;
    for (const entry of outer) {
      if (Array.isArray(entry) && entry[0] === "wrb.fr" && entry[1] === BATCH_RPC && typeof entry[2] === "string") {
        const data = JSON.parse(entry[2]) as unknown;
        return parseAlbumItems(data);
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchHtml(url: string) {
  return fetch(url, {
    redirect: "follow",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": BROWSER,
      "Accept-Language": "en,de;q=0.8",
    },
  });
}

async function fetchPage(albumKey: string, authKey: string, pageToken: string | null) {
  const inner = JSON.stringify([albumKey, pageToken, null, authKey]);
  const envelope = JSON.stringify([[[BATCH_RPC, inner, null, "generic"]]]);
  const endpoint = new URL(BATCH_URL);
  endpoint.searchParams.set("rpcids", BATCH_RPC);
  endpoint.searchParams.set("source-path", `/share/${albumKey}`);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Origin: "https://photos.google.com",
      Referer: `https://photos.google.com/share/${albumKey}?key=${authKey}`,
      "User-Agent": BROWSER,
    },
    body: new URLSearchParams({ "f.req": envelope }).toString(),
  });
  if (!response.ok) return null;
  return parseBatchBody(await response.text());
}

async function lookupPlace(lat: number, lng: number) {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "14");
    url.searchParams.set("addressdetails", "1");
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "LovelyTravel/1.0 (https://lovely-travel.vercel.app)",
      },
    });
    if (!res.ok) return "";
    const row = (await res.json()) as { display_name?: string };
    const parts = (row.display_name ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
    return parts[0] ?? "";
  } catch {
    return "";
  }
}

async function enrichFromExif(photos: SharedAlbumPhoto[]) {
  if (!photos.length) return;
  const indexes = new Set<number>();
  const n = photos.length;
  const samples = Math.min(80, n);
  const step = Math.max(1, Math.floor(n / samples));
  for (let i = 0; i < n; i += step) indexes.add(i);
  indexes.add(0);
  indexes.add(n - 1);
  for (let i = 0; i < n; i += 1) {
    if (!photos[i]?.takenAt) indexes.add(i);
  }
  const targets = [...indexes]
    .filter((i) => i >= 0 && i < n)
    .sort((a, b) => a - b)
    .slice(0, 80)
    .map((i) => photos[i]!);

  const placeCache = new Map<string, string>();
  const queue = [...targets];
  async function worker() {
    while (queue.length) {
      const photo = queue.shift();
      if (!photo) return;
      const urls = [`${cleanUrl(photo.url)}=d`, photo.url];
      for (const original of urls) {
        try {
          const response = await fetch(original, {
            headers: { Range: "bytes=0-393215", "User-Agent": BROWSER },
          });
          if (!response.ok) continue;
          const buffer = Buffer.from(await response.arrayBuffer());
          if (buffer.length < 64) continue;
          const exif = readExifBytes(
            buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
            photo.takenAt,
          );
          if (exif.takenAt) photo.takenAt = exif.takenAt;
          if (exif.lat == null || exif.lng == null) break;
          photo.lat = exif.lat;
          photo.lng = exif.lng;
          const bucket = `${exif.lat.toFixed(3)},${exif.lng.toFixed(3)}`;
          let place = placeCache.get(bucket);
          if (place == null) {
            place = (await lookupPlace(exif.lat, exif.lng)) || "";
            placeCache.set(bucket, place);
          }
          if (place) photo.place = place;
          break;
        } catch {
          /* try next url */
        }
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);

  const ordered = [...photos].sort((a, b) => (a.takenAt || 0) - (b.takenAt || 0));
  let last: SharedAlbumPhoto | undefined;
  for (const photo of ordered) {
    if (photo.lat != null && photo.lng != null) {
      last = photo;
      continue;
    }
    if (!last || last.lat == null || last.lng == null) continue;
    const dt = Math.abs((photo.takenAt || 0) - (last.takenAt || 0));
    if (dt > 6 * 60 * 60 * 1000) continue;
    photo.lat = last.lat;
    photo.lng = last.lng;
    if (last.place && !photo.place) photo.place = last.place;
  }
  last = undefined;
  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    const photo = ordered[i]!;
    if (photo.lat != null && photo.lng != null) {
      last = photo;
      continue;
    }
    if (!last || last.lat == null || last.lng == null) continue;
    const dt = Math.abs((photo.takenAt || 0) - (last.takenAt || 0));
    if (dt > 6 * 60 * 60 * 1000) continue;
    photo.lat = last.lat;
    photo.lng = last.lng;
    if (last.place && !photo.place) photo.place = last.place;
  }
}

export async function fetchSharedAlbum(
  shareUrl: string,
): Promise<{ photos: SharedAlbumPhoto[]; needsAuth: boolean; title?: string }> {
  const url = shareUrl.trim();
  if (!/^https:\/\/(photos\.app\.goo\.gl|photos\.google\.com)\//i.test(url)) {
    return { photos: [], needsAuth: false };
  }
  const first = url.includes("photos.app.goo.gl") && !url.includes("_imcp=") ? `${url}${url.includes("?") ? "&" : "?"}_imcp=1` : url;
  let response = await fetchHtml(first);
  if (!response.ok) return { photos: [], needsAuth: response.status === 401 || response.status === 403 };
  let html = await response.text();
  if (!html.includes("AF_initDataCallback({key: 'ds:1'") && url.includes("photos.app.goo.gl")) {
    const retry = await fetchHtml(`${url.split("?")[0]}?_imcp=1`);
    if (retry.ok) {
      response = retry;
      html = await retry.text();
    }
  }
  const locked = /accounts\.google\.com\/ServiceLogin|sign in to continue/i.test(html) && !html.includes("lh3.googleusercontent.com/pw/");
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.replace(/\s+-\s+Google Photos.*/i, "").trim();
  const firstPage = parseInitData(html);
  const byUid = new Map<string, SharedAlbumPhoto>();
  for (const photo of firstPage.photos) byUid.set(photo.uid, photo);

  const request = extractAlbumRequest(html, response.url);
  let token = firstPage.nextPageToken;
  const seen = new Set<string>();
  if (request) {
    if (!token) {
      const firstRpc = await fetchPage(request.albumKey, request.authKey, null);
      if (firstRpc) {
        for (const photo of firstRpc.photos) {
          if (!byUid.has(photo.uid)) byUid.set(photo.uid, photo);
        }
        token = firstRpc.nextPageToken;
      }
    }
    for (let page = 2; page <= MAX_PAGES && token; page += 1) {
      if (seen.has(token)) break;
      seen.add(token);
      const next = await fetchPage(request.albumKey, request.authKey, token);
      if (!next) break;
      for (const photo of next.photos) {
        if (!byUid.has(photo.uid)) byUid.set(photo.uid, photo);
      }
      token = next.nextPageToken;
    }
  }

  const photos = [...byUid.values()];
  fillMissingTimes(photos);
  if (photos.length) await enrichFromExif(photos);
  fillMissingTimes(photos);
  return { photos, needsAuth: locked && photos.length === 0, title };
}
