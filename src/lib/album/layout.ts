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

export type BlockKind = "collage" | "photo" | "polaroid" | "place" | "note";

export type LayoutBlock = {
  id: string;
  kind: BlockKind;
  photoIds: string[];
  place: I18nPair;
  caption: I18nPair;
  body: I18nPair;
};

export type LayoutDay = {
  id: string;
  builtIn: boolean;
  place: I18nPair;
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
};

const emptyPair = (): I18nPair => ({ en: "", de: "" });

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
  const sets: CornerSet[] = ["all", "diagonal", "top"];
  return {
    corners: CORNER_STYLES[index % CORNER_STYLES.length] ?? "black",
    cornerSet: sets[index % 3] ?? "all",
  };
}

function pairFrom(enKey: keyof typeof en, deFallback?: string): I18nPair {
  return { en: en[enKey], de: de[enKey] ?? deFallback ?? en[enKey] };
}

function photoToBlock(photo: (typeof days)[number]["photos"][number], dayPlace: I18nPair): LayoutBlock {
  return {
    id: `block-${photo.id}`,
    kind: photo.kind === "polaroid" ? "polaroid" : "photo",
    photoIds: [photo.id],
    place: photo.placeKey ? pairFrom(photo.placeKey) : { ...dayPlace },
    caption: photo.captionKey ? pairFrom(photo.captionKey) : emptyPair(),
    body: emptyPair(),
  };
}

export function seedLayout(): AlbumLayout {
  return {
    version: 1,
    days: days.map((day) => {
      const place = pairFrom(day.placeKey);
      const known = PLACES[day.id];
      return {
        id: day.id,
        builtIn: true,
        place,
        label: pairFrom(day.labelKey),
        pin: { ...day.pin },
        geo: known ? { lat: known.lat, lng: known.lng, address: known.address } : undefined,
        paper: day.paper,
        blocks: day.photos.map((photo) => photoToBlock(photo, place)),
      };
    }),
  };
}

export function mergeLayout(saved: AlbumLayout): AlbumLayout {
  const seed = seedLayout();
  return {
    ...saved,
    days: saved.days.map((day) => {
      const fromSeed = seed.days.find((item) => item.id === day.id);
      if (!fromSeed) return day;
      return { ...day, paper: fromSeed.paper, pin: fromSeed.pin, geo: day.geo ?? fromSeed.geo };
    }),
  };
}

export function emptyBlock(kind: BlockKind, dayPlace: I18nPair): LayoutBlock {
  const photoCount = kind === "collage" ? 2 : kind === "photo" || kind === "polaroid" ? 1 : 0;
  return {
    id: newId("block"),
    kind,
    photoIds: Array.from({ length: photoCount }, () => newId("pic")),
    place: { ...dayPlace },
    caption: emptyPair(),
    body: emptyPair(),
  };
}

export function emptyDay(index: number): LayoutDay {
  const n = String(index + 1).padStart(2, "0");
  const place: I18nPair = { en: "New stop", de: "Neue Station" };
  return {
    id: newId("day"),
    builtIn: false,
    place,
    label: { en: `Day ${n}`, de: `Tag ${n}` },
    pin: { x: 48, y: 52, label: index % 2 === 0 ? "left" : "right" },
    paper: (["azulejos", "vines", "waves", "sardinhas"] as const)[index % 4] ?? "azulejos",
    blocks: [],
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
