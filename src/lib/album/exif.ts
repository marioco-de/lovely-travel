export type PhotoExif = {
  takenAt: number;
  lat?: number;
  lng?: number;
};

function u16(view: DataView, offset: number, le: boolean) {
  return view.getUint16(offset, le);
}
function u32(view: DataView, offset: number, le: boolean) {
  return view.getUint32(offset, le);
}

function readRational(view: DataView, offset: number, le: boolean) {
  const n = u32(view, offset, le);
  const d = u32(view, offset + 4, le) || 1;
  return n / d;
}

function parseExifDate(value: string) {
  const match = value.trim().match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  );
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

function ascii(view: DataView, offset: number, length: number) {
  const chars: string[] = [];
  for (let i = 0; i < length; i += 1) {
    const code = view.getUint8(offset + i);
    if (code === 0) break;
    chars.push(String.fromCharCode(code));
  }
  return chars.join("");
}

function readIfd(
  view: DataView,
  start: number,
  tiff: number,
  le: boolean,
  depth = 0,
): { date?: number; gpsOffset?: number; exifOffset?: number } {
  if (depth > 4 || start + 2 > view.byteLength) return {};
  const count = u16(view, start, le);
  const out: { date?: number; gpsOffset?: number; exifOffset?: number } = {};
  for (let i = 0; i < count; i += 1) {
    const entry = start + 2 + i * 12;
    if (entry + 12 > view.byteLength) break;
    const tag = u16(view, entry, le);
    const type = u16(view, entry + 2, le);
    const len = u32(view, entry + 4, le);
    const valueOff = entry + 8;
    const size = type === 3 ? 2 : type === 4 || type === 9 ? 4 : type === 5 ? 8 : 1;
    const inline = len * size <= 4;
    const dataOff = inline ? valueOff : tiff + u32(view, valueOff, le);
    if (tag === 0x0132 || tag === 0x9003 || tag === 0x9004) {
      const text = ascii(view, dataOff, Math.min(len, 32));
      const date = parseExifDate(text);
      if (date && (tag === 0x9003 || !out.date)) out.date = date;
    } else if (tag === 0x8769) {
      out.exifOffset = tiff + u32(view, valueOff, le);
    } else if (tag === 0x8825) {
      out.gpsOffset = tiff + u32(view, valueOff, le);
    }
  }
  return out;
}

function readGps(view: DataView, start: number, tiff: number, le: boolean) {
  if (start + 2 > view.byteLength) return {};
  const count = u16(view, start, le);
  let lat: number[] = [];
  let lng: number[] = [];
  let latRef = "N";
  let lngRef = "E";
  for (let i = 0; i < count; i += 1) {
    const entry = start + 2 + i * 12;
    if (entry + 12 > view.byteLength) break;
    const tag = u16(view, entry, le);
    const type = u16(view, entry + 2, le);
    const len = u32(view, entry + 4, le);
    const valueOff = entry + 8;
    const size = type === 5 ? 8 : type === 2 ? 1 : 4;
    const inline = len * size <= 4;
    const dataOff = inline ? valueOff : tiff + u32(view, valueOff, le);
    if (tag === 0x0001) latRef = ascii(view, dataOff, 2) || "N";
    if (tag === 0x0003) lngRef = ascii(view, dataOff, 2) || "E";
    if (tag === 0x0002 || tag === 0x0004) {
      const parts = [0, 1, 2].map((n) => readRational(view, dataOff + n * 8, le));
      if (tag === 0x0002) lat = parts;
      else lng = parts;
    }
  }
  if (lat.length < 3 || lng.length < 3) return {};
  const toDeg = (parts: number[]) => parts[0]! + parts[1]! / 60 + parts[2]! / 3600;
  const latitude = toDeg(lat) * (latRef.toUpperCase().startsWith("S") ? -1 : 1);
  const longitude = toDeg(lng) * (lngRef.toUpperCase().startsWith("W") ? -1 : 1);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return {};
  return { lat: latitude, lng: longitude };
}

function parseJpegExif(buffer: ArrayBuffer): PhotoExif | null {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    const size = view.getUint16(offset + 2);
    if (marker === 0xe1 && size > 8) {
      const start = offset + 4;
      if (ascii(view, start, 4) !== "Exif") {
        offset += 2 + size;
        continue;
      }
      const tiff = start + 6;
      const endian = view.getUint16(tiff);
      const le = endian === 0x4949;
      if (!le && endian !== 0x4d4d) return null;
      const ifd0 = tiff + u32(view, tiff + 4, le);
      const head = readIfd(view, ifd0, tiff, le);
      const exif = head.exifOffset ? readIfd(view, head.exifOffset, tiff, le, 1) : {};
      const gps = head.gpsOffset ? readGps(view, head.gpsOffset, tiff, le) : {};
      return {
        takenAt: exif.date ?? head.date ?? 0,
        ...gps,
      };
    }
    if (marker === 0xda) break;
    offset += 2 + size;
  }
  return null;
}

export function readExifBytes(buffer: ArrayBuffer, fallback = 0): PhotoExif {
  try {
    const parsed = parseJpegExif(buffer);
    if (!parsed) return { takenAt: fallback };
    return { takenAt: parsed.takenAt || fallback, lat: parsed.lat, lng: parsed.lng };
  } catch {
    return { takenAt: fallback };
  }
}

export async function readPhotoExif(file: File): Promise<PhotoExif> {
  const fallback = file.lastModified || Date.now();
  try {
    const head = await file.slice(0, 128 * 1024).arrayBuffer();
    const parsed = parseJpegExif(head);
    if (!parsed) return { takenAt: fallback };
    return { takenAt: parsed.takenAt || fallback, lat: parsed.lat, lng: parsed.lng };
  } catch {
    return { takenAt: fallback };
  }
}

export function dayKey(takenAt: number) {
  const date = new Date(takenAt);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
