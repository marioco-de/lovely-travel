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

export type PhotoFormat = "square" | "fourThree" | "original";
export const PHOTO_FORMATS: PhotoFormat[] = ["square", "fourThree", "original"];

export type PhotoNote = {
  title: I18nPair;
  caption: I18nPair;
  frame?: CornerStyle;
  format?: PhotoFormat;
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
      paper: fromSeed.paper,
      pin: fromSeed.pin,
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

export const COLLAGE_MIN = 3;
export const COLLAGE_MAX = 8;

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
