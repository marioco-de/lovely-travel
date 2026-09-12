import type { MessageKey } from "@/lib/i18n/messages";

export type PhotoKind = "landscape" | "portrait" | "polaroid" | "detail";
export type SlideFrom = "left" | "right";
export type RotateDir = "left" | "right" | "leftSoft" | "rightSoft" | "none";
export type CornerStyle = "classic" | "scalloped" | "ink";
export type PaperVariant = "azulejos" | "sardinhas";

export type AlbumPhoto = {
  id: string;
  src: string;
  altKey: MessageKey;
  placeKey: MessageKey;
  captionKey: MessageKey;
  kind: PhotoKind;
  rotate: RotateDir;
  slideFrom: SlideFrom;
  corners?: CornerStyle;
};

export type DayStop = {
  id: string;
  labelKey: MessageKey;
  placeKey: MessageKey;
  captionKey: MessageKey;
  pin: { x: number; y: number; label: "left" | "right" | "bottom" };
  paper: PaperVariant;
  photos: AlbumPhoto[];
};

export const MAP_VIEW = { w: 220, h: 360 } as const;

/** Mainland Portugal silhouette in MAP_VIEW coordinates. */
export const PORTUGAL_PATH =
  "M 92 34 C 114 22 136 24 150 40 C 160 54 164 72 163 92 C 165 116 167 140 163 164 C 161 188 165 212 159 234 C 155 254 153 274 147 288 C 137 304 118 308 100 304 C 86 300 76 294 73 282 C 70 268 75 252 79 238 C 81 224 77 214 71 204 C 65 194 63 184 69 176 C 75 166 81 156 83 142 C 85 126 83 110 83 96 C 83 80 81 66 86 52 C 88 42 90 36 92 34 Z";

export const heroPhotos = {
  lagoon: {
    id: "lagoon",
    src: "/photos/lagoon.jpg",
    altKey: "hero.alt",
    placeKey: "hero.place",
    captionKey: "hero.caption",
    kind: "landscape",
    rotate: "leftSoft",
    slideFrom: "left",
    corners: "classic",
  },
  courtyard: {
    id: "courtyard",
    src: "/photos/courtyard.jpg",
    altKey: "polaroid.courtyard.alt",
    placeKey: "polaroid.courtyard.place",
    captionKey: "polaroid.courtyard.caption",
    kind: "polaroid",
    rotate: "right",
    slideFrom: "right",
  },
  fruit: {
    id: "fruit",
    src: "/photos/fruit.jpg",
    altKey: "frame.fruit.alt",
    placeKey: "frame.fruit.place",
    captionKey: "frame.fruit.caption",
    kind: "detail",
    rotate: "left",
    slideFrom: "left",
    corners: "scalloped",
  },
} as const satisfies Record<string, AlbumPhoto>;

export const days: DayStop[] = [
  {
    id: "porto",
    labelKey: "day.porto.label",
    placeKey: "day.porto.place",
    captionKey: "day.porto.caption",
    pin: { x: 90, y: 82, label: "left" },
    paper: "azulejos",
    photos: [
      {
        id: "ribeira",
        src: "/photos/porto-ribeira.jpg",
        altKey: "day.porto.ribeira.alt",
        placeKey: "day.porto.place",
        captionKey: "day.porto.caption",
        kind: "landscape",
        rotate: "leftSoft",
        slideFrom: "left",
        corners: "classic",
      },
    ],
  },
  {
    id: "coimbra",
    labelKey: "day.coimbra.label",
    placeKey: "day.coimbra.place",
    captionKey: "day.coimbra.caption",
    pin: { x: 110, y: 134, label: "right" },
    paper: "azulejos",
    photos: [
      {
        id: "rooftops",
        src: "/photos/coimbra.jpg",
        altKey: "day.coimbra.alt",
        placeKey: "day.coimbra.place",
        captionKey: "day.coimbra.caption",
        kind: "landscape",
        rotate: "rightSoft",
        slideFrom: "right",
        corners: "scalloped",
      },
      {
        id: "se",
        src: "/photos/coimbra-se.jpg",
        altKey: "day.coimbra.se.alt",
        placeKey: "day.coimbra.place",
        captionKey: "day.coimbra.se.caption",
        kind: "polaroid",
        rotate: "left",
        slideFrom: "left",
      },
    ],
  },
  {
    id: "lisbon",
    labelKey: "day.lisbon.label",
    placeKey: "day.lisbon.place",
    captionKey: "day.lisbon.caption",
    pin: { x: 76, y: 200, label: "left" },
    paper: "azulejos",
    photos: [
      {
        id: "alfama",
        src: "/photos/lisbon-alfama.jpg",
        altKey: "day.lisbon.alfama.alt",
        placeKey: "day.lisbon.place",
        captionKey: "day.lisbon.caption",
        kind: "landscape",
        rotate: "leftSoft",
        slideFrom: "left",
        corners: "ink",
      },
      {
        id: "tram",
        src: "/photos/lisbon-tram.jpg",
        altKey: "day.lisbon.tram.alt",
        placeKey: "day.lisbon.place",
        captionKey: "day.lisbon.tram.caption",
        kind: "polaroid",
        rotate: "right",
        slideFrom: "right",
      },
    ],
  },
  {
    id: "algarve",
    labelKey: "day.algarve.label",
    placeKey: "day.algarve.place",
    captionKey: "day.algarve.caption",
    pin: { x: 98, y: 290, label: "right" },
    paper: "sardinhas",
    photos: [
      {
        id: "cliffs",
        src: "/photos/algarve-cliffs.jpg",
        altKey: "day.algarve.cliffs.alt",
        placeKey: "day.algarve.place",
        captionKey: "day.algarve.caption",
        kind: "landscape",
        rotate: "leftSoft",
        slideFrom: "left",
        corners: "classic",
      },
      {
        id: "cove",
        src: "/photos/algarve-cove.jpg",
        altKey: "day.algarve.cove.alt",
        placeKey: "day.algarve.place",
        captionKey: "day.algarve.cove.caption",
        kind: "polaroid",
        rotate: "right",
        slideFrom: "right",
      },
    ],
  },
];

export function routePath(stops: DayStop[]): string {
  if (stops.length === 0) return "";
  const first = stops[0];
  if (!first) return "";
  let d = `M ${first.pin.x} ${first.pin.y}`;
  for (let i = 1; i < stops.length; i++) {
    const prev = stops[i - 1];
    const next = stops[i];
    if (!prev || !next) continue;
    const sway = i % 2 === 0 ? 10 : -8;
    const cx = (prev.pin.x + next.pin.x) / 2 + sway;
    const cy = (prev.pin.y + next.pin.y) / 2;
    d += ` Q ${cx} ${cy} ${next.pin.x} ${next.pin.y}`;
  }
  return d;
}

export function pinPercent(stop: DayStop) {
  return {
    left: `${(stop.pin.x / MAP_VIEW.w) * 100}%`,
    top: `${(stop.pin.y / MAP_VIEW.h) * 100}%`,
  };
}
