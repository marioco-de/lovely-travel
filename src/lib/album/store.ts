import { create } from "zustand";
import { LOCALES, type Locale, type MessageKey } from "@/lib/i18n/messages";
import { days, heroPhotos, type AlbumPhoto } from "./data";
import { applyFields, collectFields, type AlbumTexts } from "./fields";
import { geocodePortugal } from "./geocode";
import { FEATURED_EDIT_HASH, FEATURED_SLUG, PRIVATE_EDIT_HASH, PRIVATE_SLUG, readFeaturedUnlock, writeFeaturedUnlock } from "./featured";
import { isStoredPhotoUrl, mediaUrl, removeAlbumPhoto, uploadAlbumPhoto } from "./photo-store";
import { createTrip, ensureFeaturedTrip, ensurePrivateTrip, getEditTrip, getPublicTrip, saveTrip } from "./trips";
import { ensureTranslations } from "./translate";
import {
  catalogSrc,
  catalogPhoto,
  COLLAGE_MAX,
  COLLAGE_MIN,
  COVER_ID,
  emptyBlock,
  emptyDay,
  emptyPhotoNote,
  seedLayout,
  unifyLayouts,
  type AlbumLayout,
  type BlockKind,
  type I18nPair,
  type LayoutBlock,
  type LayoutDay,
  type PhotoNote,
} from "./layout";
import type { BulkDayDraft } from "./bulk";
import { PLACES } from "./places";
import { getLocalTripByEdit, getLocalTripByPublic, saveLocalTrip } from "./trips-local";

export const CLEARED_PHOTO = "cleared";
const DB_NAME = "tropical-album";
const DB_VERSION = 2;
const PHOTO_STORE = "photos";
const TEXT_STORE = "texts";
const LAYOUT_STORE = "layout";

export type { AlbumTexts };
export type SaveStatus = "idle" | "saving" | "saved" | "error";

type AlbumState = {
  ready: boolean;
  saveStatus: SaveStatus;
  photos: Record<string, string>;
  texts: AlbumTexts;
  hiddenPins: Record<string, boolean>;
  googleAlbumUrl: string;
  googleAlbumUrls: string[];
  allowUploads: boolean;
  highlights: string[];
  dayAlbums: Record<string, { all: string[]; selected: string[] }>;
  layout: AlbumLayout;
  hydrate: () => Promise<void>;
  setPhoto: (id: string, file: File) => Promise<void>;
  setPhotos: (files: { id: string; file: File }[]) => Promise<void>;
  clearPhoto: (id: string) => Promise<void>;
  setText: (locale: Locale, key: MessageKey, value: string) => void;
  togglePin: (id: string) => void;
  setDayPlace: (dayId: string, locale: Locale, value: string) => void;
  setDayLabel: (dayId: string, locale: Locale, value: string) => void;
  addDayPlace: (dayId: string) => void;
  removeDayPlace: (dayId: string, index: number) => void;
  setDayPlaceAt: (dayId: string, index: number, locale: Locale, value: string) => void;
  setDayGeo: (dayId: string, geo: { lat: number; lng: number; address: string }) => void;
  setDayPin: (dayId: string, pin: LayoutDay["pin"]) => void;
  addDay: (kind?: BlockKind) => void;
  removeDay: (dayId: string) => void;
  addBlock: (dayId: string, kind: BlockKind) => void;
  insertBlock: (dayId: string, afterId: string, kind: BlockKind) => void;
  addCollageFromFiles: (dayId: string, files: File[]) => Promise<void>;
  importBulk: (drafts: import("./bulk").BulkDayDraft[], onProgress?: (done: number, total: number) => void) => Promise<void>;
  importStored: (days: { place: string; photos: { id: string; url: string }[] }[]) => Promise<void>;
  applyGoogleImport: (input: {
    photos: Record<string, string>;
    highlights: string[];
    days: { id: string; place: string; selected: string[]; all: string[] }[];
  }) => void;
  publishCurationDay: (input: {
    id: string;
    place: string;
    selected: string[];
    all: string[];
    photos: Record<string, string>;
    highlights: string[];
    videoIds?: string[];
  }) => void;
  syncCuration: (input: {
    photos?: Record<string, string>;
    highlights: string[];
    days: { id: string; place: string; selected: string[]; all: string[] }[];
  }) => void;
  setPhotoUrl: (id: string, url: string) => void;
  toggleHighlight: (id: string) => void;
  removeBlock: (dayId: string, blockId: string) => void;
  moveBlock: (dayId: string, blockId: string, dir: -1 | 1) => void;
  patchBlock: (dayId: string, blockId: string, patch: Partial<Pick<LayoutBlock, "place" | "caption" | "body" | "writingPaper" | "poi">>) => void;
  setPhotoMeta: (dayId: string, blockId: string, photoId: string, patch: Partial<Pick<PhotoNote, "frame" | "format" | "crop" | "play" | "media">>) => void;
  setPhotoNote: (dayId: string, blockId: string, photoId: string, field: "title" | "caption", locale: Locale, value: string) => void;
  clearPhotoNote: (dayId: string, blockId: string, photoId: string) => void;
  addPhotoSlot: (dayId: string, blockId: string) => void;
  removePhotoSlot: (dayId: string, blockId: string, photoId: string) => void;
  reset: () => Promise<void>;
  canEdit: boolean;
  enableEdit: () => void;
  lockEdit: () => void;
  becomeOwner: (editHash: string) => void;
  unlockFeatured: () => void;
  tripId?: string;
  publicHash?: string;
  editHash?: string;
  sourceLocale: Locale;
  bindTrip: (opts: { mode: "demo" | "view" | "edit"; publicHash?: string; editHash?: string }) => Promise<void>;
  ensureLocale: (locale: Locale) => Promise<void>;
  createRemote: (password: string) => Promise<{ publicHash: string; editHash: string; editPassword?: string } | null>;
  setGoogleAlbumUrl: (url: string) => void;
  addGoogleAlbumUrl: (url: string) => void;
  removeGoogleAlbumUrl: (url: string) => void;
  setAllowUploads: (value: boolean) => void;
  placeEditId: string | null;
  setPlaceEditId: (id: string | null) => void;
};

const emptyTexts = (): AlbumTexts => Object.fromEntries(LOCALES.map((locale) => [locale, {}])) as AlbumTexts;

const PIN_KEY = "tropical-album-pins";

function readHiddenPins(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeHiddenPins(hiddenPins: Record<string, boolean>) {
  try {
    localStorage.setItem(PIN_KEY, JSON.stringify(hiddenPins));
  } catch {
    /* ignore */
  }
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE);
      if (!db.objectStoreNames.contains(TEXT_STORE)) db.createObjectStore(TEXT_STORE);
      if (!db.objectStoreNames.contains(LAYOUT_STORE)) db.createObjectStore(LAYOUT_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(store: string, key: string) {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const req = db.transaction(store, "readonly").objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbSet(store: string, key: string, value: unknown) {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const req = db.transaction(store, "readwrite").objectStore(store).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbDelete(store: string, key: string) {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const req = db.transaction(store, "readwrite").objectStore(store).delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbClear(store: string) {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const req = db.transaction(store, "readwrite").objectStore(store).clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbKeys(store: string) {
  return openDb().then(
    (db) =>
      new Promise<IDBValidKey[]>((resolve, reject) => {
        const req = db.transaction(store, "readonly").objectStore(store).getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

async function readAllPhotos() {
  const keys = await idbKeys(PHOTO_STORE);
  const out: Record<string, Blob> = {};
  for (const key of keys) {
    const blob = await idbGet<Blob>(PHOTO_STORE, String(key));
    if (blob) out[String(key)] = blob;
  }
  return out;
}

let saveTimer: number | undefined;
let layoutTimer: number | undefined;
let geoTimer: number | undefined;
let bindSeq = 0;

function isLayout(value: unknown): value is AlbumLayout {
  if (!value || typeof value !== "object") return false;
  const rec = value as AlbumLayout;
  return rec.version === 1 && Array.isArray(rec.days);
}

function storageKey(publicHash?: string, editHash?: string) {
  return publicHash || editHash || FEATURED_SLUG;
}

function layoutKeys(publicHash?: string, editHash?: string) {
  const keys = [publicHash, editHash].filter((item): item is string => Boolean(item));
  if (publicHash === FEATURED_SLUG || editHash === FEATURED_EDIT_HASH) keys.push("album");
  return [...new Set(keys)];
}

async function readSavedLayouts(hash?: string, extra?: string) {
  if (typeof indexedDB === "undefined") return [] as AlbumLayout[];
  const keys = layoutKeys(hash, extra);
  const found: AlbumLayout[] = [];
  for (const key of keys) {
    const saved = await idbGet<AlbumLayout>(LAYOUT_STORE, key);
    if (isLayout(saved)) found.push(saved);
  }
  return found;
}

async function loadPhotoUrls() {
  const photos: Record<string, string> = {};
  if (typeof indexedDB === "undefined") return photos;
  const blobs = await readAllPhotos();
  for (const [id, blob] of Object.entries(blobs)) {
    photos[id] = blob.size === 0 ? CLEARED_PHOTO : URL.createObjectURL(blob);
  }
  return photos;
}

function mergePhotoMaps(...maps: Array<Record<string, string> | undefined>) {
  const out: Record<string, string> = {};
  for (const map of maps) {
    if (!map) continue;
    for (const [id, src] of Object.entries(map)) {
      if (src) out[id] = src;
    }
  }
  return out;
}

async function prepareImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.size < 380_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1920;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    bitmap.close();
    return blob ?? file;
  } catch {
    return file;
  }
}

function placeNorm(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function geoClose(a?: { lat: number; lng: number }, b?: { lat: number; lng: number }) {
  if (!a || !b) return false;
  return Math.hypot(a.lat - b.lat, a.lng - b.lng) < 0.22;
}

function isCoverPlaceholder(id: string, photos: Record<string, string>) {
  if (!id || id.startsWith("pic-")) return true;
  if (photos[id] === CLEARED_PHOTO) return true;
  if (isStoredPhotoUrl(photos[id] || "")) return false;
  if (catalogPhoto(id)) return true;
  return !photos[id];
}

function markVideoNotes(layout: AlbumLayout, videoIds: string[]): AlbumLayout {
  if (!videoIds.length) return layout;
  const videos = new Set(videoIds);
  return {
    ...layout,
    days: layout.days.map((day) => ({
      ...day,
      blocks: day.blocks.map((block) => {
        let changed = false;
        const photoNotes = { ...block.photoNotes };
        for (const id of block.photoIds) {
          if (!videos.has(id)) continue;
          const current = photoNotes[id] ?? emptyPhotoNote();
          if (current.media === "video") continue;
          photoNotes[id] = { ...current, media: "video", play: current.play ?? "loop" };
          changed = true;
        }
        return changed ? { ...block, photoNotes } : block;
      }),
    })),
  };
}

function fillCoverHighlights(layout: AlbumLayout, highlights: string[], photos: Record<string, string>): AlbumLayout {
  if (!highlights.length) return layout;
  return mapDays(layout, COVER_ID, (day) => {
    const used = new Set(
      day.blocks.flatMap((block) => block.photoIds).filter((id) => !isCoverPlaceholder(id, photos)),
    );
    const queue = highlights.filter((id) => !used.has(id));
    if (!queue.length && day.blocks.some((block) => block.photoIds.length)) return day;
    const blocks = day.blocks.map((block) => {
      if (block.kind === "note" || block.kind === "place" || block.kind === "poi") return block;
      let changed = false;
      const photoIds = block.photoIds.map((id) => {
        if (!queue.length || !isCoverPlaceholder(id, photos)) return id;
        changed = true;
        return queue.shift() ?? id;
      });
      if (!changed) return block;
      const photoNotes = { ...block.photoNotes };
      for (const id of photoIds) {
        if (!photoNotes[id]) photoNotes[id] = emptyPhotoNote();
      }
      return { ...block, photoIds, photoNotes };
    });
    if (queue.length && !blocks.some((block) => block.photoIds.length)) {
      const showcase = queue.slice(0, COLLAGE_MAX);
      const block = emptyBlock(showcase.length >= COLLAGE_MIN ? "collage" : "photo", day.place);
      block.photoIds = showcase;
      block.photoNotes = Object.fromEntries(showcase.map((id) => [id, emptyPhotoNote()]));
      return { ...day, blocks: [block, ...blocks] };
    }
    return { ...day, blocks };
  });
}

function ensureCurationDay(
  layout: AlbumLayout,
  draft: { id: string; place: string; selected: string[] },
): AlbumLayout {
  const place: I18nPair = { en: draft.place, de: draft.place };
  const exists = layout.days.some((day) => day.id === draft.id);
  if (!exists) {
    const day = emptyDay(layout.days.filter((item) => item.id !== COVER_ID).length);
    day.id = draft.id;
    day.builtIn = false;
    day.place = place;
    day.places = [place];
    day.label = place;
    layout = { ...layout, days: [...layout.days, day] };
  } else {
    layout = mapDays(layout, draft.id, (day) => ({
      ...day,
      place: day.place.en || day.place.de ? day.place : place,
      places: day.places?.length ? day.places : [place],
      label: day.label.en || day.label.de ? day.label : place,
    }));
  }
  const showcase = draft.selected.slice(0, COLLAGE_MAX);
  if (!showcase.length) return layout;
  return mapDays(layout, draft.id, (day) => {
    if (day.blocks.some((block) => block.photoIds.some((id) => showcase.includes(id)))) return day;
    const block = emptyBlock(showcase.length >= COLLAGE_MIN ? "collage" : "photo", place);
    block.photoIds = showcase;
    block.photoNotes = Object.fromEntries(showcase.map((id) => [id, emptyPhotoNote()]));
    return { ...day, blocks: [...day.blocks, block] };
  });
}

function matchImportDay(layout: AlbumLayout, place: string, geo?: { lat: number; lng: number }) {
  const unknown = /^(unbekannter ort|unknown place)$/i.test(place.trim());
  for (const day of layout.days) {
    if (day.id === COVER_ID) continue;
    const catalog = PLACES[day.id];
    if (geoClose(geo, day.geo) || (catalog && geoClose(geo, catalog))) return day.id;
    if (unknown) continue;
    const names = [
      day.place.en,
      day.place.de,
      ...(day.places ?? []).flatMap((item) => [item.en, item.de]),
      catalog?.city,
      catalog?.name,
    ];
    const needle = placeNorm(place);
    if (names.some((name) => name && (placeNorm(name) === needle || needle.includes(placeNorm(name)) || placeNorm(name).includes(needle.split(",")[0] ?? needle)))) {
      return day.id;
    }
  }
  return null;
}

function photoChunks<T>(items: T[]) {
  const chunks: T[][] = [];
  let rest = items;
  while (rest.length) {
    if (rest.length <= 2) {
      chunks.push(...rest.map((item) => [item]));
      break;
    }
    if (rest.length <= COLLAGE_MAX) {
      chunks.push(rest);
      break;
    }
    chunks.push(rest.slice(0, COLLAGE_MAX));
    rest = rest.slice(COLLAGE_MAX);
  }
  return chunks;
}

function mapDays(layout: AlbumLayout, dayId: string, fn: (day: LayoutDay) => LayoutDay): AlbumLayout {
  return {
    ...layout,
    days: layout.days.map((day) => (day.id === dayId ? fn(day) : day)),
  };
}

export const useAlbum = create<AlbumState>((set, get) => ({
  ready: false,
  saveStatus: "idle",
  photos: {},
  texts: emptyTexts(),
  hiddenPins: {},
  googleAlbumUrl: "",
  googleAlbumUrls: [],
  allowUploads: true,
  highlights: [],
  dayAlbums: {},
  layout: seedLayout(),
  canEdit: false,
  placeEditId: null,
  setPlaceEditId: (id) => set({ placeEditId: id }),
  enableEdit: () => set({ canEdit: true }),
  lockEdit: () => set({ canEdit: false, placeEditId: null }),
  becomeOwner: (editHash) => set({ canEdit: true, editHash }),
  unlockFeatured: () => {
    writeFeaturedUnlock();
    set({
      canEdit: true,
      publicHash: FEATURED_SLUG,
      editHash: FEATURED_EDIT_HASH,
    });
  },
  sourceLocale: "en",
  hydrate: async () => {
    if (typeof indexedDB === "undefined") {
      set({ ready: true, hiddenPins: readHiddenPins() });
      return;
    }
    try {
      const hash = get().publicHash || get().editHash || FEATURED_SLUG;
      const [en, de, photos, savedLayouts] = await Promise.all([
        idbGet<Partial<Record<MessageKey, string>>>(TEXT_STORE, "en"),
        idbGet<Partial<Record<MessageKey, string>>>(TEXT_STORE, "de"),
        loadPhotoUrls(),
        readSavedLayouts(hash),
      ]);
      set({
        ready: true,
        photos,
        texts: { en: en ?? {}, de: de ?? {} },
        hiddenPins: readHiddenPins(),
        layout: unifyLayouts(...savedLayouts),
        saveStatus: "saved",
      });
    } catch {
      set({ ready: true, hiddenPins: readHiddenPins() });
    }
  },
  setPhoto: async (id, file) => {
    await get().setPhotos([{ id, file }]);
  },
  clearPhoto: async (id) => {
    const prev = get().photos[id];
    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
    const next = { ...get().photos, [id]: CLEARED_PHOTO };
    set({ photos: next, saveStatus: "saving" });
    try {
      await idbSet(PHOTO_STORE, id, new Blob());
      const editHash = get().editHash;
      if (editHash) await removeAlbumPhoto({ data: { editHash, photoId: id } });
      scheduleRemote(get);
      set({ saveStatus: "saved" });
    } catch {
      set({ saveStatus: "error" });
    }
  },
  setPhotos: async (files) => {
    set({ saveStatus: "saving" });
    const next: Record<string, string> = { ...get().photos };
    try {
      for (const { id, file } of files) {
        const blob = await prepareImage(file);
        const localUrl = URL.createObjectURL(blob);
        const prev = next[id];
        next[id] = localUrl;
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        await idbSet(PHOTO_STORE, id, blob);
        set({ photos: { ...next } });
        const { editHash, publicHash } = get();
        if (editHash && publicHash) {
          const dataUrl = await blobToDataUrl(blob);
          const uploaded = await uploadAlbumPhoto({ data: { editHash, photoId: id, data: dataUrl } });
          if (uploaded && "url" in uploaded && uploaded.url) {
            if (next[id]?.startsWith("blob:")) URL.revokeObjectURL(next[id]);
            next[id] = uploaded.url;
            set({ photos: { ...next } });
          } else {
            throw new Error("upload missed");
          }
        }
      }
      const state = get();
      const key = storageKey(state.publicHash, state.editHash);
      await idbSet(LAYOUT_STORE, key, state.layout);
      scheduleRemote(get);
      set({ photos: next, saveStatus: "saved" });
    } catch {
      set({ photos: next, saveStatus: "error" });
    }
  },
  setText: (locale, key, value) => {
    const texts: AlbumTexts = {
      ...get().texts,
      [locale]: { ...get().texts[locale], [key]: value },
    };
    set({ texts, saveStatus: "saving" });
    if (typeof window === "undefined") return;
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      void Promise.all([idbSet(TEXT_STORE, "en", texts.en ?? {}), idbSet(TEXT_STORE, "de", texts.de ?? {})])
        .then(() => {
          scheduleRemote(get);
          set({ saveStatus: "saved" });
        })
        .catch(() => set({ saveStatus: "error" }));
    }, 280);
  },
  togglePin: (id) => {
    const hiddenPins = { ...get().hiddenPins };
    if (hiddenPins[id]) delete hiddenPins[id];
    else hiddenPins[id] = true;
    set({ hiddenPins });
    writeHiddenPins(hiddenPins);
  },
  setDayPlace: (dayId, locale, value) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => {
        const places = day.places?.length ? [...day.places] : [{ ...day.place }];
        places[0] = { ...places[0], [locale]: value };
        return { ...day, place: places[0] ?? { ...day.place, [locale]: value }, places };
      }),
    );
    const day = get().layout.days.find((item) => item.id === dayId);
    const query = day ? `${day.place.de || day.place.en}` : value;
    if (typeof window === "undefined") return;
    window.clearTimeout(geoTimer);
    geoTimer = window.setTimeout(() => {
      void geocodePortugal(query).then((hit) => {
        if (!hit) return;
        persistLayout(
          set,
          get,
          mapDays(get().layout, dayId, (item) => ({ ...item, geo: hit })),
        );
      });
    }, 640);
  },
  setDayLabel: (dayId, locale, value) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => ({
        ...day,
        label: { ...day.label, [locale]: value },
      })),
    );
  },
  addDayPlace: (dayId) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => ({
        ...day,
        places: [...(day.places?.length ? day.places : [day.place]), { en: "", de: "" }],
      })),
    );
  },
  removeDayPlace: (dayId, index) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => {
        const places = (day.places?.length ? day.places : [day.place]).filter((_, i) => i !== index);
        const next = places.length ? places : [{ en: "", de: "" }];
        return { ...day, places: next, place: next[0] ?? day.place };
      }),
    );
  },
  setDayPlaceAt: (dayId, index, locale, value) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => {
        const places = [...(day.places?.length ? day.places : [day.place])];
        const current = places[index] ?? { en: "", de: "" };
        places[index] = { ...current, en: value, de: value };
        return { ...day, places, place: index === 0 ? places[0] ?? day.place : day.place };
      }),
    );
    if (index !== 0) return;
    const day = get().layout.days.find((item) => item.id === dayId);
    const query = day ? `${day.place.de || day.place.en}` : value;
    if (typeof window === "undefined") return;
    window.clearTimeout(geoTimer);
    geoTimer = window.setTimeout(() => {
      void geocodePortugal(query).then((hit) => {
        if (!hit) return;
        persistLayout(
          set,
          get,
          mapDays(get().layout, dayId, (item) => ({ ...item, geo: hit })),
        );
      });
    }, 640);
  },
  setDayGeo: (dayId, geo) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => ({ ...day, geo })),
    );
  },
  setDayPin: (dayId, pin) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => ({ ...day, pin })),
    );
  },
  addDay: (kind) => {
    persistLayout(set, get, {
      ...get().layout,
      days: [...get().layout.days, emptyDay(get().layout.days.length, kind)],
    });
  },
  removeDay: (dayId) => {
    if (dayId === COVER_ID) return;
    persistLayout(set, get, {
      ...get().layout,
      days: get().layout.days.filter((day) => day.id !== dayId),
    });
  },
  addBlock: (dayId, kind) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => ({
        ...day,
        blocks: [...day.blocks, emptyBlock(kind, day.place)],
      })),
    );
  },
  insertBlock: (dayId, afterId, kind) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => {
        const index = day.blocks.findIndex((block) => block.id === afterId);
        const blocks = [...day.blocks];
        blocks.splice(index < 0 ? blocks.length : index + 1, 0, emptyBlock(kind, day.place));
        return { ...day, blocks };
      }),
    );
  },
  addCollageFromFiles: async (dayId, files) => {
    if (files.length === 0) return;
    const day = get().layout.days.find((item) => item.id === dayId);
    if (!day) return;
    const used = files.slice(0, COLLAGE_MAX);
    const asCollage = used.length >= COLLAGE_MIN;
    const block = emptyBlock(used.length === 1 ? "photo" : asCollage ? "collage" : "photo", day.place);
    if (asCollage) {
      while (block.photoIds.length < used.length) block.photoIds.push(`pic-${Date.now()}-${block.photoIds.length}`);
      block.photoIds = block.photoIds.slice(0, used.length);
    } else {
      block.photoIds = used.map((_, i) => block.photoIds[i] ?? `pic-${i}-${Date.now()}`);
    }
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (item) => ({
        ...item,
        blocks: [...item.blocks, block],
      })),
    );
    await get().setPhotos(used.map((file, i) => ({ id: block.photoIds[i] ?? block.id, file })));
  },
  importBulk: async (drafts, onProgress) => {
    const incoming = drafts.filter((draft) => draft.photos.length > 0);
    if (incoming.length === 0) return;
    const uploads = incoming.flatMap((draft) => draft.photos);
    let layout = get().layout;
    for (const draft of incoming) {
      const place: I18nPair = { en: draft.place, de: draft.place };
      let dayId = matchImportDay(layout, draft.place, draft.geo);
      if (!dayId) {
        const day = emptyDay(layout.days.filter((item) => item.id !== COVER_ID).length);
        day.place = place;
        day.places = [place];
        day.label = place;
        day.geo = draft.geo;
        layout = { ...layout, days: [...layout.days, day] };
        dayId = day.id;
      } else {
        layout = mapDays(layout, dayId, (day) => {
          const places = day.places?.length ? day.places : [day.place];
          const hasPlace = places.some((item) => placeNorm(item.en) === placeNorm(place.en) || placeNorm(item.de) === placeNorm(place.de));
          return {
            ...day,
            geo: day.geo ?? draft.geo,
            places: hasPlace ? places : [...places, place],
          };
        });
      }
      const chunks = photoChunks(draft.photos);
      layout = mapDays(layout, dayId, (day) => {
        const blocks = [...day.blocks];
        for (const chunk of chunks) {
          const kind: BlockKind = chunk.length >= COLLAGE_MIN ? "collage" : "photo";
          const block = emptyBlock(kind, place);
          block.photoIds = chunk.map((photo) => photo.id);
          block.place = place;
          block.caption = { en: "", de: "" };
          block.photoNotes = Object.fromEntries(
            chunk.map((photo) => [photo.id, emptyPhotoNote()]),
          );
          blocks.push(block);
        }
        return { ...day, blocks };
      });
    }
    persistLayout(set, get, layout);
    const batch = 3;
    for (let i = 0; i < uploads.length; i += batch) {
      const slice = uploads.slice(i, i + batch);
      await get().setPhotos(slice.map((photo) => ({ id: photo.id, file: photo.file })));
      onProgress?.(Math.min(i + batch, uploads.length), uploads.length);
    }
  },
  importStored: async (incoming) => {
    const daysIn = incoming.filter((draft) => draft.photos.length > 0);
    if (daysIn.length === 0) return;
    let layout = get().layout;
    const photos = { ...get().photos };
    for (const draft of daysIn) {
      const place: I18nPair = { en: draft.place, de: draft.place };
      let dayId = matchImportDay(layout, draft.place);
      if (!dayId) {
        const day = emptyDay(layout.days.filter((item) => item.id !== COVER_ID).length);
        day.place = place;
        day.places = [place];
        day.label = place;
        layout = { ...layout, days: [...layout.days, day] };
        dayId = day.id;
      }
      const chunks = photoChunks(draft.photos);
      layout = mapDays(layout, dayId, (day) => {
        const blocks = [...day.blocks];
        for (const chunk of chunks) {
          const kind: BlockKind = chunk.length >= COLLAGE_MIN ? "collage" : "photo";
          const block = emptyBlock(kind, place);
          block.photoIds = chunk.map((photo) => photo.id);
          block.place = place;
          block.caption = { en: "", de: "" };
          block.photoNotes = Object.fromEntries(chunk.map((photo) => [photo.id, emptyPhotoNote()]));
          blocks.push(block);
        }
        return { ...day, blocks };
      });
      for (const photo of draft.photos) photos[photo.id] = photo.url;
    }
    set({ photos });
    persistLayout(set, get, layout);
  },
  applyGoogleImport: (input) => {
    const photos = { ...get().photos, ...input.photos };
    const dayAlbums: Record<string, { all: string[]; selected: string[] }> = { ...get().dayAlbums };
    let layout = get().layout;
    for (const draft of input.days) {
      dayAlbums[draft.id] = { all: draft.all, selected: draft.selected };
      layout = ensureCurationDay(layout, draft);
    }
    layout = fillCoverHighlights(layout, input.highlights, photos);
    set({ photos, highlights: input.highlights, dayAlbums });
    persistLayout(set, get, layout);
  },
  publishCurationDay: (input) => {
    const photos = { ...get().photos, ...input.photos };
    const dayAlbums = {
      ...get().dayAlbums,
      [input.id]: { all: input.all, selected: input.selected },
    };
    let layout = ensureCurationDay(get().layout, input);
    layout = fillCoverHighlights(layout, input.highlights, photos);
    layout = markVideoNotes(layout, input.videoIds ?? []);
    set({ photos, highlights: input.highlights, dayAlbums });
    persistLayout(set, get, layout);
  },
  syncCuration: (input) => {
    const photos = { ...get().photos, ...input.photos };
    const dayAlbums: Record<string, { all: string[]; selected: string[] }> = { ...get().dayAlbums };
    for (const draft of input.days) {
      dayAlbums[draft.id] = { all: draft.all, selected: draft.selected };
    }
    set({ photos, highlights: input.highlights, dayAlbums, saveStatus: "saving" });
    scheduleRemote(get);
  },
  setPhotoUrl: (id, url) => {
    set({ photos: { ...get().photos, [id]: url }, saveStatus: "saving" });
    scheduleRemote(get);
  },
  toggleHighlight: (id) => {
    const current = get().highlights;
    const highlights = current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(0, 8);
    set({ highlights, saveStatus: "saving" });
    scheduleRemote(get);
  },
  removeBlock: (dayId, blockId) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => ({
        ...day,
        blocks: day.blocks.filter((block) => block.id !== blockId),
      })),
    );
  },
  moveBlock: (dayId, blockId, dir) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => {
        const index = day.blocks.findIndex((block) => block.id === blockId);
        const next = index + dir;
        if (index < 0 || next < 0 || next >= day.blocks.length) return day;
        const blocks = [...day.blocks];
        const current = blocks[index];
        const swap = blocks[next];
        if (!current || !swap) return day;
        blocks[index] = swap;
        blocks[next] = current;
        return { ...day, blocks };
      }),
    );
  },
  patchBlock: (dayId, blockId, patch) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => ({
        ...day,
        blocks: day.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
      })),
    );
  },
  setPhotoMeta: (dayId, blockId, photoId, patch) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => ({
        ...day,
        blocks: day.blocks.map((block) => {
          if (block.id !== blockId) return block;
          const current = block.photoNotes?.[photoId] ?? emptyPhotoNote();
          return {
            ...block,
            photoNotes: {
              ...block.photoNotes,
              [photoId]: { ...current, ...patch },
            },
          };
        }),
      })),
    );
  },
  setPhotoNote: (dayId, blockId, photoId, field, locale, value) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => ({
        ...day,
        blocks: day.blocks.map((block) => {
          if (block.id !== blockId) return block;
          const current = block.photoNotes?.[photoId] ?? emptyPhotoNote();
          return {
            ...block,
            photoNotes: {
              ...block.photoNotes,
              [photoId]: {
                ...current,
                [field]: { ...current[field], en: value, de: value, [locale]: value },
              },
            },
          };
        }),
      })),
    );
  },
  clearPhotoNote: (dayId, blockId, photoId) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => ({
        ...day,
        blocks: day.blocks.map((block) => {
          if (block.id !== blockId) return block;
          return {
            ...block,
            photoNotes: {
              ...block.photoNotes,
              [photoId]: emptyPhotoNote(),
            },
          };
        }),
      })),
    );
  },
  addPhotoSlot: (dayId, blockId) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => ({
        ...day,
        blocks: day.blocks.map((block) =>
          block.id === blockId && block.photoIds.length < COLLAGE_MAX
            ? { ...block, photoIds: [...block.photoIds, `pic-${Date.now()}`] }
            : block,
        ),
      })),
    );
  },
  removePhotoSlot: (dayId, blockId, photoId) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => ({
        ...day,
        blocks: day.blocks.map((block) => {
          if (block.id !== blockId) return block;
          const notes = { ...block.photoNotes };
          delete notes[photoId];
          if (block.kind === "collage" && block.photoIds.length > COLLAGE_MIN) {
            return { ...block, photoIds: block.photoIds.filter((id) => id !== photoId), photoNotes: notes };
          }
          return { ...block, photoNotes: notes };
        }),
      })),
    );
  },
  reset: async () => {
    for (const url of Object.values(get().photos)) URL.revokeObjectURL(url);
    set({
      photos: {},
      texts: emptyTexts(),
      hiddenPins: {},
      layout: seedLayout(),
      saveStatus: "saving",
    });
    writeHiddenPins({});
    try {
      await Promise.all([idbClear(PHOTO_STORE), idbClear(TEXT_STORE), idbClear(LAYOUT_STORE)]);
      set({ saveStatus: "saved" });
    } catch {
      set({ saveStatus: "error" });
    }
  },
  bindTrip: async ({ mode, publicHash, editHash }) => {
    const seq = ++bindSeq;
    const isFeatured = editHash === FEATURED_EDIT_HASH || publicHash === FEATURED_SLUG || mode === "demo";
    const featuredUnlocked = isFeatured && (mode === "edit" || Boolean(editHash) || readFeaturedUnlock());
    const hash = publicHash || editHash || (isFeatured ? FEATURED_SLUG : undefined);

    if (mode === "view" && publicHash === FEATURED_SLUG) {
      set({
        ready: true,
        canEdit: false,
        publicHash: FEATURED_SLUG,
        editHash: undefined,
        tripId: undefined,
        layout: seedLayout(),
        texts: emptyTexts(),
        hiddenPins: {},
        photos: {},
        googleAlbumUrl: "",
        googleAlbumUrls: [],
        allowUploads: true,
        highlights: [],
        dayAlbums: {},
        saveStatus: "saved",
      });
      return;
    }

    if (mode === "demo" && !isFeatured) {
      set({ canEdit: false, publicHash: undefined, editHash: undefined, tripId: undefined });
      await get().hydrate();
      return;
    }

    const [idbPhotos, idbLayouts, localTrip, en, de] = await Promise.all([
      typeof indexedDB === "undefined" ? Promise.resolve({}) : loadPhotoUrls(),
      typeof indexedDB === "undefined"
        ? Promise.resolve([] as AlbumLayout[])
        : readSavedLayouts(
            publicHash || (isFeatured ? FEATURED_SLUG : undefined),
            editHash ||
              (isFeatured
                ? FEATURED_EDIT_HASH
                : publicHash === PRIVATE_SLUG
                  ? PRIVATE_EDIT_HASH
                  : undefined),
          ),
      editHash
        ? getLocalTripByEdit(editHash)
        : publicHash
          ? getLocalTripByPublic(publicHash)
          : isFeatured
            ? getLocalTripByPublic(FEATURED_SLUG)
            : Promise.resolve(null),
      typeof indexedDB === "undefined"
        ? Promise.resolve(undefined)
        : idbGet<Partial<Record<MessageKey, string>>>(TEXT_STORE, "en"),
      typeof indexedDB === "undefined"
        ? Promise.resolve(undefined)
        : idbGet<Partial<Record<MessageKey, string>>>(TEXT_STORE, "de"),
    ]);

    let remote: Awaited<ReturnType<typeof getEditTrip>> | Awaited<ReturnType<typeof getPublicTrip>> | null = null;
    try {
      if (publicHash === PRIVATE_SLUG || editHash === PRIVATE_EDIT_HASH) {
        await ensurePrivateTrip();
      } else if (isFeatured && mode !== "view") {
        await ensureFeaturedTrip();
      }
      remote = editHash
        ? await getEditTrip({ data: { hash: editHash } })
        : publicHash
          ? await getPublicTrip({ data: { hash: publicHash } })
          : null;
    } catch {
      remote = null;
    }

    if (seq !== bindSeq) return;

    const remoteLayout = remote?.payload.layout;
    const localTripLayout = localTrip?.payload.layout;
    const remoteEditHash = remote && "editHash" in remote ? remote.editHash : undefined;
    const remoteAt = remote?.updatedAt ? Date.parse(remote.updatedAt) : 0;
    const localAt = localTrip?.updatedAt ? Date.parse(localTrip.updatedAt) : 0;
    const localIsNewer = Boolean(localTripLayout?.days?.length) && localAt > remoteAt;
    const layout = localIsNewer
      ? unifyLayouts(localTripLayout, remoteLayout, ...idbLayouts)
      : remoteLayout
        ? unifyLayouts(remoteLayout, localTripLayout, ...idbLayouts)
        : unifyLayouts(localTripLayout, ...idbLayouts);
    const remotePhotos = remote?.payload.photos ?? {};
    const photos = localIsNewer
      ? mergePhotoMaps(remotePhotos, localTrip?.payload.photos, idbPhotos)
      : Object.keys(remotePhotos).length
        ? mergePhotoMaps(idbPhotos, localTrip?.payload.photos, remotePhotos)
        : mergePhotoMaps(localTrip?.payload.photos, idbPhotos);
    const texts = localTrip?.payload.texts ?? remote?.payload.texts ?? { en: en ?? {}, de: de ?? {} };
    const hiddenPins = localTrip?.payload.hiddenPins ?? remote?.payload.hiddenPins ?? readHiddenPins();
    const googleAlbumUrl = localTrip?.payload.googleAlbumUrl ?? remote?.payload.googleAlbumUrl ?? "";
    const googleAlbumUrls = [
      ...new Set(
        [
          ...(remote?.payload.googleAlbumUrls ?? []),
          ...(localTrip?.payload.googleAlbumUrls ?? []),
          googleAlbumUrl,
        ].filter(Boolean),
      ),
    ];
    const allowUploads = remote?.payload.allowUploads ?? localTrip?.payload.allowUploads ?? true;
    const highlights = remote?.payload.highlights ?? localTrip?.payload.highlights ?? [];
    const dayAlbums = remote?.payload.dayAlbums ?? localTrip?.payload.dayAlbums ?? {};

    set({
      ready: true,
      canEdit: mode === "edit" && (Boolean(editHash && (remoteEditHash || localTrip?.editHash)) || featuredUnlocked),
      tripId: remote?.id ?? localTrip?.id,
      publicHash: remote?.publicHash || localTrip?.publicHash || (isFeatured ? FEATURED_SLUG : publicHash),
      editHash: remoteEditHash ?? localTrip?.editHash ?? (featuredUnlocked ? FEATURED_EDIT_HASH : undefined),
      sourceLocale: remote?.sourceLocale ?? localTrip?.sourceLocale ?? "en",
      layout,
      texts,
      hiddenPins,
      googleAlbumUrl,
      googleAlbumUrls,
      allowUploads,
      highlights,
      dayAlbums,
      photos,
      saveStatus: "saved",
    });
    if (localIsNewer && (editHash || featuredUnlocked || get().editHash)) {
      scheduleRemote(get);
    }
  },
  ensureLocale: async (locale) => {
    const { sourceLocale, layout, texts, tripId } = get();
    if (locale === sourceLocale) return;
    const fields = collectFields(sourceLocale, texts, layout);
    if (fields.length === 0) return;
    try {
      const translated = await ensureTranslations({
        data: { tripId, sourceLocale, targetLocale: locale, fields },
      });
      const next = applyFields(layout, texts, locale, translated);
      set({ layout: next.layout, texts: next.texts });
      if (typeof window !== "undefined") {
        void idbSet(TEXT_STORE, "en", next.texts.en ?? {});
        void idbSet(TEXT_STORE, "de", next.texts.de ?? {});
        void idbSet(LAYOUT_STORE, storageKey(get().publicHash, get().editHash), next.layout);
      }
      scheduleRemote(get);
    } catch {
      /* keep source language on screen */
    }
  },
  createRemote: async (password: string) => {
    const state = get();
    const layout: AlbumLayout = { version: 1, days: [emptyDay(0)] };
    const payload = {
      layout,
      texts: emptyTexts(),
      hiddenPins: {},
      photos: {},
    };
    const title = "Lovely";
    try {
      const trip = await createTrip({
        data: {
          title,
          sourceLocale: state.sourceLocale,
          password,
          payload,
        },
      });
      if (typeof window !== "undefined") {
        await saveLocalTrip({
          id: trip.id,
          publicHash: trip.publicHash,
          editHash: trip.editHash ?? "",
          editPassword: password,
          title,
          sourceLocale: state.sourceLocale,
          payload,
          createdAt: trip.createdAt,
          updatedAt: trip.updatedAt,
        });
        sessionStorage.setItem(`album-pw-${trip.publicHash}`, password);
      }
      set({
        canEdit: true,
        tripId: trip.id,
        publicHash: trip.publicHash,
        editHash: trip.editHash,
        layout,
        texts: emptyTexts(),
        hiddenPins: {},
        googleAlbumUrl: "",
        googleAlbumUrls: [],
        allowUploads: true,
        highlights: [],
        dayAlbums: {},
        saveStatus: "saved",
      });
      return { publicHash: trip.publicHash, editHash: trip.editHash ?? "", editPassword: trip.editPassword };
    } catch {
      set({ saveStatus: "error" });
      return null;
    }
  },
  setGoogleAlbumUrl: (url) => {
    const trimmed = url.trim();
    const urls = get().googleAlbumUrls;
    set({
      googleAlbumUrl: trimmed,
      googleAlbumUrls: trimmed && !urls.includes(trimmed) ? [...urls, trimmed] : urls,
      saveStatus: "saving",
    });
    scheduleRemote(get);
  },
  addGoogleAlbumUrl: (url) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (get().googleAlbumUrls.includes(trimmed)) {
      if (!get().googleAlbumUrl) set({ googleAlbumUrl: trimmed });
      return;
    }
    const urls = [...get().googleAlbumUrls, trimmed];
    set({ googleAlbumUrl: trimmed, googleAlbumUrls: urls, saveStatus: "saving" });
    scheduleRemote(get);
  },
  removeGoogleAlbumUrl: (url) => {
    const urls = get().googleAlbumUrls.filter((item) => item !== url);
    set({
      googleAlbumUrl: urls[0] ?? "",
      googleAlbumUrls: urls,
      saveStatus: "saving",
    });
    scheduleRemote(get);
  },
  setAllowUploads: (value) => {
    set({ allowUploads: value, saveStatus: "saving" });
    scheduleRemote(get);
  },
}));

function persistLayout(
  set: (partial: Partial<AlbumState>) => void,
  get: () => AlbumState,
  layout: AlbumLayout,
) {
  set({ layout, saveStatus: "saving" });
  if (typeof window === "undefined") return;
  window.clearTimeout(layoutTimer);
  layoutTimer = window.setTimeout(() => {
    const state = get();
    const key = storageKey(state.publicHash, state.editHash);
    void idbSet(LAYOUT_STORE, key, state.layout)
      .then(async () => {
        const alt = state.editHash && state.publicHash && state.editHash !== key ? state.editHash : null;
        if (alt) await idbSet(LAYOUT_STORE, alt, state.layout);
        if (state.publicHash && state.editHash) {
          const existing =
            (await getLocalTripByEdit(state.editHash)) ?? (await getLocalTripByPublic(state.publicHash));
          await saveLocalTrip({
            id: state.tripId ?? existing?.id ?? state.editHash,
            publicHash: state.publicHash,
            editHash: state.editHash,
            editPassword: existing?.editPassword,
            title: state.texts.en?.["album.title"] || state.texts.de?.["album.title"] || "Lovely",
            sourceLocale: state.sourceLocale,
            payload: {
              layout: state.layout,
              texts: state.texts,
              hiddenPins: state.hiddenPins,
              photos: storedPhotoMap(state.publicHash, state.photos),
              googleAlbumUrl: state.googleAlbumUrl || undefined,
              googleAlbumUrls: state.googleAlbumUrls,
              allowUploads: state.allowUploads,
              highlights: state.highlights,
              dayAlbums: state.dayAlbums,
            },
            createdAt: existing?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        scheduleRemote(get);
        set({ saveStatus: "saved" });
      })
      .catch(() => set({ saveStatus: "error" }));
  }, 220);
}

let remoteTimer: number | undefined;

function scheduleRemote(get: () => AlbumState) {
  if (typeof window === "undefined") return;
  if (!get().editHash) return;
  window.clearTimeout(remoteTimer);
  remoteTimer = window.setTimeout(() => {
    void pushRemote(get()).catch(() => useAlbum.setState({ saveStatus: "error" }));
  }, 700);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function storedPhotoMap(publicHash: string | undefined, photos: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [id, url] of Object.entries(photos)) {
    if (!url || url === CLEARED_PHOTO) continue;
    if (isStoredPhotoUrl(url) || url.startsWith("data:")) out[id] = url;
    else if (publicHash) out[id] = mediaUrl(publicHash, id);
  }
  return out;
}

async function pushPendingUploads(state: AlbumState) {
  const next = { ...state.photos };
  if (!state.editHash || !state.publicHash) return storedPhotoMap(state.publicHash, next);
  for (const [id, url] of Object.entries(next)) {
    if (!url || url === CLEARED_PHOTO || isStoredPhotoUrl(url)) continue;
    const blob = url.startsWith("data:") ? null : await idbGet<Blob>(PHOTO_STORE, id);
    const dataUrl = url.startsWith("data:") ? url : blob && blob.size > 0 ? await blobToDataUrl(blob) : "";
    if (!dataUrl) continue;
    const uploaded = await uploadAlbumPhoto({ data: { editHash: state.editHash, photoId: id, data: dataUrl } });
    if (uploaded && "url" in uploaded && uploaded.url) next[id] = uploaded.url;
  }
  return storedPhotoMap(state.publicHash, next);
}

async function pushRemote(state: AlbumState) {
  if (!state.editHash) return;
  const photos = await pushPendingUploads(state);
  const title = state.texts.en?.["album.title"] || state.texts.de?.["album.title"] || "Lovely";
  const remotePayload = {
    layout: state.layout,
    texts: state.texts,
    hiddenPins: state.hiddenPins,
    photos,
    googleAlbumUrl: state.googleAlbumUrl || undefined,
    googleAlbumUrls: state.googleAlbumUrls,
    allowUploads: state.allowUploads,
    highlights: state.highlights,
    dayAlbums: state.dayAlbums,
  };
  if (state.publicHash) {
    try {
      const existing =
        (await getLocalTripByEdit(state.editHash)) ?? (await getLocalTripByPublic(state.publicHash));
      await saveLocalTrip({
        id: state.tripId ?? existing?.id ?? state.editHash,
        publicHash: state.publicHash,
        editHash: state.editHash,
        editPassword: existing?.editPassword,
        title,
        sourceLocale: state.sourceLocale,
        payload: remotePayload,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch {
      /* still try the server */
    }
  }
  const result = await saveTrip({
    data: {
      editHash: state.editHash,
      title,
      sourceLocale: state.sourceLocale,
      payload: remotePayload,
    },
  });
  if (!result || !("ok" in result) || !result.ok) throw new Error("remote save missed");
}

export function usePhotoSrc(photo: AlbumPhoto | string, fallback?: string) {
  const id = typeof photo === "string" ? photo : photo.id;
  const builtIn = typeof photo === "string" ? fallback ?? catalogSrc(id) : photo.src;
  return useAlbum((s) => {
    const stored = s.photos[id];
    if (stored === CLEARED_PHOTO) return "";
    return stored || builtIn;
  });
}

export function pairText(pair: I18nPair, locale: Locale) {
  return pair[locale] || pair.en || pair.de;
}

export function allAlbumPhotos(): AlbumPhoto[] {
  return [...Object.values(heroPhotos), ...days.flatMap((day) => day.photos)];
}
