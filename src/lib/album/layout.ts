import { de, en, type Locale } from "@/lib/i18n/messages";
import {
  CORNER_STYLES,
  days,
  heroPhotos,
  type AlbumPhoto,
  type CornerSet,
  type CornerStyle,
  type PaperVariant,
  type PhotoKind,
  type RotateDir,
} from "./data";
import { PLACES, type GeoHit } from "./places";

export type I18nPair = { en: string; de: string } & Partial<Record<Locale, string>>;

export type BlockKind = "collage" | "photo" | "polaroid" | "place" | "note" | "poi";

export type PhotoFormat = "square" | "fourThree" | "original" | "oval";
export const PHOTO_FORMATS: PhotoFormat[] = ["square", "fourThree", "original", "oval"];

export type PoiSize = 1 | 2 | 3;
export const POI_SIZES: PoiSize[] = [1, 2, 3];
export const POI_SKINS = ["ticket", "matchbox", "postcard", "coaster", "menu"] as const;
export type PoiSkin = (typeof POI_SKINS)[number];

export type PoiData = {
  name: string;
  category: string;
  rating?: number;
  photoUrl?: string;
  address?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  size: PoiSize;
  skin: PoiSkin;
};

export function nextPoiSize(current?: PoiSize): PoiSize {
  const index = POI_SIZES.indexOf(current ?? 2);
  return POI_SIZES[(index + 1) % POI_SIZES.length] ?? 1;
}

export function nextPoiSkin(current?: PoiSkin): PoiSkin {
  const index = Math.max(0, POI_SKINS.indexOf(current ?? "ticket"));
  return POI_SKINS[(index + 1) % POI_SKINS.length] ?? "ticket";
}

export function emptyPoi(): PoiData {
  return { name: "", category: "", size: 2, skin: "ticket" };
}

export type PhotoCrop = { x: number; y: number; z: number };

export function emptyCrop(): PhotoCrop {
  return { x: 0, y: 0, z: 1 };
}

export function clampCrop(crop: PhotoCrop): PhotoCrop {
  const z = Math.min(3, Math.max(1, Number.isFinite(crop.z) ? crop.z : 1));
  const max = 50 * (1 - 0.15 / z);
  return {
    z,
    x: Math.min(max, Math.max(-max, Number.isFinite(crop.x) ? crop.x : 0)),
    y: Math.min(max, Math.max(-max, Number.isFinite(crop.y) ? crop.y : 0)),
  };
}

export type PhotoNote = {
  title: I18nPair;
  caption: I18nPair;
  frame?: CornerStyle;
  format?: PhotoFormat;
  crop?: PhotoCrop;
};

export type LayoutBlock = {
  id: string;
  kind: BlockKind;
  photoIds: string[];
  place: I18nPair;
  caption: I18nPair;
  body: I18nPair;
  photoNotes?: Record<string, PhotoNote>;
  writingPaper?: string;
  poi?: PoiData;
};

export type LayoutDay = {
  id: string;
  builtIn: boolean;
  place: I18nPair;
  places: I18nPair[];
  label: I18nPair;
  pin: { x: number; y: number; label: "left" | "right" | "bottom" };
  geo?: GeoHit;
  paper: PaperVariant;
  blocks: LayoutBlock[];
};

export type AlbumLayout = {
  version: 1;
  days: LayoutDay[];
};

export const COVER_ID = "cover";

export function isCoverDay(id: string) {
  return id === COVER_ID;
}

export type PrintPhoto = {
  id: string;
  src: string;
  alt: string;
  place: string;
  caption: string;
  kind: PhotoKind;
  rotate: RotateDir;
  corners?: CornerStyle;
  cornerSet?: CornerSet;
  format?: PhotoFormat;
  crop?: PhotoCrop;
};

const emptyPair = (): I18nPair => ({ en: "", de: "" });

export function isDayNumberLabel(text: string) {
  return /^(tag|day|día|dia|jour)\s*0*\d+$/i.test(text.trim());
}

export function newId(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${rand}`;
}

export function catalogSrc(id: string): string {
  return catalogPhoto(id)?.src ?? "";
}

export function catalogPhoto(id: string): AlbumPhoto | undefined {
  const hero = Object.values(heroPhotos).find((item) => item.id === id);
  if (hero) return hero;
  for (const day of days) {
    const photo = day.photos.find((item) => item.id === id);
    if (photo) return photo;
  }
  return undefined;
}

export function cornersFor(id: string, index: number): { corners: CornerStyle; cornerSet: CornerSet } {
  const photo = catalogPhoto(id);
  if (photo?.corners) {
    return { corners: photo.corners, cornerSet: photo.cornerSet ?? "all" };
  }
  const sets: CornerSet[] = ["all", "diagonal", "slash"];
  return {
    corners: CORNER_STYLES[index % CORNER_STYLES.length] ?? "black",
    cornerSet: sets[index % 3] ?? "all",
  };
}

function pairFrom(enKey: keyof typeof en, deFallback?: string): I18nPair {
  return { en: en[enKey], de: de[enKey] ?? deFallback ?? en[enKey] };
}

function photoToBlock(photo: (typeof days)[number]["photos"][number], dayPlace: I18nPair): LayoutBlock {
  const caption = photo.captionKey ? pairFrom(photo.captionKey) : emptyPair();
  return {
    id: `block-${photo.id}`,
    kind: photo.kind === "polaroid" ? "polaroid" : "photo",
    photoIds: [photo.id],
    place: photo.placeKey ? pairFrom(photo.placeKey) : { ...dayPlace },
    caption,
    body: emptyPair(),
    photoNotes: {
      [photo.id]: {
        title: emptyPair(),
        caption,
      },
    },
  };
}

export function emptyPhotoNote(): PhotoNote {
  return { title: emptyPair(), caption: emptyPair() };
}

export function nextFrame(current?: CornerStyle): CornerStyle {
  const index = Math.max(0, CORNER_STYLES.indexOf(current ?? "black"));
  return CORNER_STYLES[(index + 1) % CORNER_STYLES.length] ?? "black";
}

export function nextFormat(current?: PhotoFormat): PhotoFormat {
  const index = Math.max(0, PHOTO_FORMATS.indexOf(current ?? "original"));
  return PHOTO_FORMATS[(index + 1) % PHOTO_FORMATS.length] ?? "original";
}

export function formatLabel(format?: PhotoFormat) {
  if (format === "square") return "1:1";
  if (format === "fourThree") return "4:3";
  if (format === "oval") return "O";
  return "orig";
}

export function noteForPhoto(block: LayoutBlock, photoId: string, index = 0): PhotoNote {
  const existing = block.photoNotes?.[photoId];
  if (existing) return existing;
  const cat = catalogPhoto(photoId);
  if (cat?.captionKey) {
    return { title: emptyPair(), caption: pairFrom(cat.captionKey) };
  }
  if (index === 0 && (block.caption.en || block.caption.de)) {
    return { title: emptyPair(), caption: { ...block.caption } };
  }
  return emptyPhotoNote();
}

export function withPhotoNotes(block: LayoutBlock): LayoutBlock {
  const photoNotes: Record<string, PhotoNote> = { ...block.photoNotes };
  block.photoIds.forEach((id, index) => {
    if (!photoNotes[id]) photoNotes[id] = noteForPhoto(block, id, index);
  });
  return { ...block, photoNotes };
}

function uniquePlaces(primary: I18nPair, extras: I18nPair[]): I18nPair[] {
  const seen = new Set<string>([primary.en.trim().toLowerCase(), primary.de.trim().toLowerCase()]);
  const list = [primary];
  for (const extra of extras) {
    const key = (extra.en || extra.de).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    list.push(extra);
  }
  return list;
}

function seedCoverDay(): LayoutDay {
  const place = pairFrom("hero.place");
  return {
    id: COVER_ID,
    builtIn: true,
    place,
    places: [place],
    label: pairFrom("album.title"),
    pin: { x: 48, y: 18, label: "left" },
    paper: "azulejos",
    blocks: [
      photoToBlock(heroPhotos.lagoon, place),
      photoToBlock(heroPhotos.courtyard, pairFrom("polaroid.courtyard.place")),
      photoToBlock(heroPhotos.fruit, pairFrom("frame.fruit.place")),
    ],
  };
}

export function seedLayout(): AlbumLayout {
  return {
    version: 1,
    days: [
      seedCoverDay(),
      ...days.map((day) => {
        const place = pairFrom(day.placeKey);
        const known = PLACES[day.id];
        const extras = day.photos
          .filter((photo) => photo.placeKey)
          .map((photo) => pairFrom(photo.placeKey));
        return {
          id: day.id,
          builtIn: true,
          place,
          places: uniquePlaces(place, extras),
          label: pairFrom(day.labelKey),
          pin: { ...day.pin },
          geo: known ? { lat: known.lat, lng: known.lng, address: known.address } : undefined,
          paper: day.paper,
          blocks: day.photos.map((photo) => photoToBlock(photo, place)),
        };
      }),
    ],
  };
}

export function mergeLayout(saved: AlbumLayout): AlbumLayout {
  const seed = seedLayout();
  const mergedDays = saved.days.map((day) => {
    const fromSeed = seed.days.find((item) => item.id === day.id);
    const places = day.places?.length ? day.places : uniquePlaces(day.place, fromSeed?.places ?? []);
    if (!fromSeed) return { ...day, places, blocks: day.blocks.map(withPhotoNotes) };
    const numberLabel = isDayNumberLabel(day.label.en) || isDayNumberLabel(day.label.de);
    return {
      ...day,
      paper: day.paper || fromSeed.paper,
      pin: day.pin ?? fromSeed.pin,
      geo: day.geo ?? fromSeed.geo,
      places,
      place: places[0] ?? day.place,
      label: numberLabel && day.id !== COVER_ID ? fromSeed.label : day.label,
      blocks: day.blocks.map(withPhotoNotes),
    };
  });
  const hasCover = mergedDays.some((day) => day.id === COVER_ID);
  return {
    ...saved,
    days: hasCover ? mergedDays : [seedCoverDay(), ...mergedDays],
  };
}

export function unifyLayouts(...candidates: Array<AlbumLayout | undefined>): AlbumLayout {
  const valid = candidates.filter((item): item is AlbumLayout => Boolean(item && Array.isArray(item.days)));
  const primary = valid[0];
  if (!primary) return seedLayout();
  const byId = new Map<string, LayoutDay>();
  for (const day of mergeLayout(primary).days) {
    byId.set(day.id, { ...day, blocks: day.blocks.map(withPhotoNotes) });
  }
  const extras: LayoutDay[] = [];
  const seen = new Set(byId.keys());
  for (const layout of valid.slice(1)) {
    for (const day of layout.days) {
      if (seen.has(day.id)) continue;
      seen.add(day.id);
      extras.push({ ...day, blocks: day.blocks.map(withPhotoNotes) });
    }
  }
  return {
    version: 1,
    days: [...mergeLayout(primary).days.map((day) => byId.get(day.id) ?? day), ...extras],
  };
}

export const COLLAGE_MIN = 2;
export const COLLAGE_MAX = 10;

export function emptyBlock(kind: BlockKind, dayPlace: I18nPair): LayoutBlock {
  const photoCount = kind === "collage" ? COLLAGE_MIN : kind === "photo" || kind === "polaroid" ? 1 : 0;
  return {
    id: newId("block"),
    kind,
    photoIds: Array.from({ length: photoCount }, () => newId("pic")),
    place: { ...dayPlace },
    caption: emptyPair(),
    body: emptyPair(),
    photoNotes: {},
    writingPaper: kind === "note" ? "lined" : undefined,
    poi: kind === "poi" ? emptyPoi() : undefined,
  };
}

export function emptyDay(index: number, first?: BlockKind): LayoutDay {
  const place: I18nPair = { en: "New stop", de: "Neue Station" };
  return {
    id: newId("day"),
    builtIn: false,
    place,
    places: [place],
    label: emptyPair(),
    pin: { x: 48, y: 52, label: index % 2 === 0 ? "left" : "right" },
    paper: (["azulejos", "vines", "waves", "sardinhas"] as const)[index % 4] ?? "azulejos",
    blocks: first ? [emptyBlock(first, place)] : [],
  };
}

const ROTATIONS: RotateDir[] = ["leftSoft", "right", "left", "rightSoft", "none"];

export function rotateFor(seed: string | number): RotateDir {
  const text = String(seed);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return ROTATIONS[Math.abs(h) % ROTATIONS.length] ?? "leftSoft";
}

export function dayGeo(day: { id: string; geo?: GeoHit }): GeoHit | null {
  if (day.geo) return day.geo;
  const known = PLACES[day.id];
  if (!known) return null;
  return { lat: known.lat, lng: known.lng, address: known.address };
}
