import { de, en } from "@/lib/i18n/messages";
import { days, heroPhotos, type PaperVariant, type PhotoKind, type RotateDir } from "./data";

export type I18nPair = { en: string; de: string };

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
  corners?: "classic" | "scalloped" | "ink";
};

const emptyPair = (): I18nPair => ({ en: "", de: "" });

export function newId(prefix: string) {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${rand}`;
}

export function catalogSrc(id: string): string {
  const hero = Object.values(heroPhotos).find((item) => item.id === id);
  if (hero) return hero.src;
  for (const day of days) {
    const photo = day.photos.find((item) => item.id === id);
    if (photo) return photo.src;
  }
  return "";
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
      return {
        id: day.id,
        builtIn: true,
        place,
        label: pairFrom(day.labelKey),
        pin: { ...day.pin },
        paper: day.paper,
        blocks: day.photos.map((photo) => photoToBlock(photo, place)),
      };
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
    paper: "azulejos",
    blocks: [],
  };
}

export function rotateFor(index: number): RotateDir {
  const cycle: RotateDir[] = ["leftSoft", "right", "left", "rightSoft"];
  return cycle[index % cycle.length] ?? "none";
}
