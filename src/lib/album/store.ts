import { create } from "zustand";
import { LOCALES, type Locale, type MessageKey } from "@/lib/i18n/messages";
import { days, heroPhotos, type AlbumPhoto } from "./data";
import { applyFields, collectFields, type AlbumTexts } from "./fields";
import { geocodePortugal } from "./geocode";
import { FEATURED_EDIT_HASH, FEATURED_SLUG, readFeaturedUnlock, writeFeaturedUnlock } from "./featured";
import { createTrip, getEditTrip, getPublicTrip, saveTrip } from "./trips";
import { ensureTranslations } from "./translate";
import {
  catalogSrc,
  emptyBlock,
  emptyDay,
  mergeLayout,
  seedLayout,
  type AlbumLayout,
  type BlockKind,
  type I18nPair,
  type LayoutBlock,
  type LayoutDay,
} from "./layout";

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
  layout: AlbumLayout;
  hydrate: () => Promise<void>;
  setPhoto: (id: string, file: File) => Promise<void>;
  setPhotos: (files: { id: string; file: File }[]) => Promise<void>;
  setText: (locale: Locale, key: MessageKey, value: string) => void;
  togglePin: (id: string) => void;
  setDayPlace: (dayId: string, locale: Locale, value: string) => void;
  setDayPin: (dayId: string, pin: LayoutDay["pin"]) => void;
  addDay: () => void;
  removeDay: (dayId: string) => void;
  addBlock: (dayId: string, kind: BlockKind) => void;
  insertBlock: (dayId: string, afterId: string, kind: BlockKind) => void;
  addCollageFromFiles: (dayId: string, files: File[]) => Promise<void>;
  removeBlock: (dayId: string, blockId: string) => void;
  moveBlock: (dayId: string, blockId: string, dir: -1 | 1) => void;
  patchBlock: (dayId: string, blockId: string, patch: Partial<Pick<LayoutBlock, "place" | "caption" | "body">>) => void;
  addPhotoSlot: (dayId: string, blockId: string) => void;
  reset: () => Promise<void>;
  canEdit: boolean;
  enableEdit: () => void;
  unlockFeatured: () => void;
  tripId?: string;
  publicHash?: string;
  editHash?: string;
  sourceLocale: Locale;
  bindTrip: (opts: { mode: "demo" | "view" | "edit"; publicHash?: string; editHash?: string }) => Promise<void>;
  ensureLocale: (locale: Locale) => Promise<void>;
  createRemote: (password: string) => Promise<{ publicHash: string; editHash: string; editPassword?: string } | null>;
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

function isLayout(value: unknown): value is AlbumLayout {
  if (!value || typeof value !== "object") return false;
  const rec = value as AlbumLayout;
  return rec.version === 1 && Array.isArray(rec.days);
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
  layout: seedLayout(),
  canEdit: false,
  enableEdit: () => set({ canEdit: true }),
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
      const [en, de, blobs, savedLayout] = await Promise.all([
        idbGet<Partial<Record<MessageKey, string>>>(TEXT_STORE, "en"),
        idbGet<Partial<Record<MessageKey, string>>>(TEXT_STORE, "de"),
        readAllPhotos(),
        idbGet<AlbumLayout>(LAYOUT_STORE, "album"),
      ]);
      const photos: Record<string, string> = {};
      for (const [id, blob] of Object.entries(blobs)) {
        photos[id] = URL.createObjectURL(blob);
      }
      set({
        ready: true,
        photos,
        texts: { en: en ?? {}, de: de ?? {} },
        hiddenPins: readHiddenPins(),
        layout: isLayout(savedLayout) ? mergeLayout(savedLayout) : seedLayout(),
        saveStatus: "saved",
      });
    } catch {
      set({ ready: true, hiddenPins: readHiddenPins() });
    }
  },
  setPhoto: async (id, file) => {
    await get().setPhotos([{ id, file }]);
  },
  setPhotos: async (files) => {
    set({ saveStatus: "saving" });
    const next: Record<string, string> = { ...get().photos };
    try {
      for (const { id, file } of files) {
        const blob = await prepareImage(file);
        const url = URL.createObjectURL(blob);
        const prev = next[id];
        next[id] = url;
        if (prev) URL.revokeObjectURL(prev);
        await idbSet(PHOTO_STORE, id, blob);
      }
      set({ photos: next, saveStatus: "saved" });
      scheduleRemote(get);
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
      mapDays(get().layout, dayId, (day) => ({
        ...day,
        place: { ...day.place, [locale]: value },
      })),
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
  setDayPin: (dayId, pin) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => ({ ...day, pin })),
    );
  },
  addDay: () => {
    persistLayout(set, get, {
      ...get().layout,
      days: [...get().layout.days, emptyDay(get().layout.days.length)],
    });
  },
  removeDay: (dayId) => {
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
    const block = emptyBlock(files.length === 1 ? "photo" : "collage", day.place);
    const used = files.slice(0, 4);
    block.photoIds = used.map((_, i) => block.photoIds[i] ?? `pic-${i}-${Date.now()}`);
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
  addPhotoSlot: (dayId, blockId) => {
    persistLayout(
      set,
      get,
      mapDays(get().layout, dayId, (day) => ({
        ...day,
        blocks: day.blocks.map((block) =>
          block.id === blockId && block.photoIds.length < 4
            ? { ...block, photoIds: [...block.photoIds, `pic-${Date.now()}`] }
            : block,
        ),
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
    if (mode === "demo") {
      set({ canEdit: false, publicHash: undefined, editHash: undefined, tripId: undefined });
      await get().hydrate();
      return;
    }
    try {
      const trip = editHash ? await getEditTrip({ data: { hash: editHash } }) : null;
      const publicTrip = trip ?? (publicHash ? await getPublicTrip({ data: { hash: publicHash } }) : null);
      const isFeatured =
        editHash === FEATURED_EDIT_HASH || publicHash === FEATURED_SLUG;
      const featuredUnlocked = isFeatured && (Boolean(editHash) || readFeaturedUnlock());
      if (!publicTrip) {
        await get().hydrate();
        set({
          ready: true,
          canEdit: featuredUnlocked,
          publicHash: publicHash ?? (isFeatured ? FEATURED_SLUG : undefined),
          editHash: featuredUnlocked ? FEATURED_EDIT_HASH : undefined,
        });
        return;
      }
      set({
        ready: true,
        canEdit: Boolean(editHash && trip?.editHash) || featuredUnlocked,
        tripId: publicTrip.id,
        publicHash: publicTrip.publicHash || FEATURED_SLUG,
        editHash: trip?.editHash ?? (featuredUnlocked ? FEATURED_EDIT_HASH : undefined),
        sourceLocale: publicTrip.sourceLocale,
        layout: isLayout(publicTrip.payload.layout) ? mergeLayout(publicTrip.payload.layout) : seedLayout(),
        texts: publicTrip.payload.texts ?? emptyTexts(),
        hiddenPins: publicTrip.payload.hiddenPins ?? {},
        photos: publicTrip.payload.photos ?? {},
        saveStatus: "saved",
      });
    } catch {
      const isFeatured = editHash === FEATURED_EDIT_HASH || publicHash === FEATURED_SLUG;
      if (isFeatured) {
        await get().hydrate();
        set({
          ready: true,
          canEdit: Boolean(editHash),
          publicHash: FEATURED_SLUG,
          editHash: editHash ?? FEATURED_EDIT_HASH,
        });
        return;
      }
      set({ ready: true, canEdit: false });
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
        void idbSet(LAYOUT_STORE, "album", next.layout);
      }
      scheduleRemote(get);
    } catch {
      /* keep source language on screen */
    }
  },
  createRemote: async (password: string) => {
    try {
      const state = get();
      const photos = await encodePhotos(state.photos);
      const trip = await createTrip({
        data: {
          title: state.texts.en?.["album.title"] || state.texts.de?.["album.title"] || "Lovely",
          sourceLocale: state.sourceLocale,
          password,
          payload: {
            layout: state.layout,
            texts: state.texts,
            hiddenPins: state.hiddenPins,
            photos,
          },
        },
      });
      set({
        canEdit: true,
        tripId: trip.id,
        publicHash: trip.publicHash,
        editHash: trip.editHash,
        saveStatus: "saved",
      });
      if (typeof window !== "undefined" && trip.editPassword) {
        sessionStorage.setItem(`album-pw-${trip.publicHash}`, trip.editPassword);
      }
      return { publicHash: trip.publicHash, editHash: trip.editHash ?? "", editPassword: trip.editPassword };
    } catch {
      set({ saveStatus: "error" });
      return null;
    }
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
    void idbSet(LAYOUT_STORE, "album", get().layout)
      .then(() => {
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
    void pushRemote(get());
  }, 700);
}

async function encodePhotos(photos: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [id, url] of Object.entries(photos)) {
    if (url.startsWith("data:")) {
      out[id] = url;
      continue;
    }
    const blob = await idbGet<Blob>(PHOTO_STORE, id);
    if (blob) out[id] = await blobToDataUrl(blob);
  }
  return out;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function pushRemote(state: AlbumState) {
  if (!state.editHash) return;
  const photos = await encodePhotos(state.photos);
  const title = state.texts.en?.["album.title"] || state.texts.de?.["album.title"] || "Lovely";
  await saveTrip({
    data: {
      editHash: state.editHash,
      title,
      sourceLocale: state.sourceLocale,
      payload: {
        layout: state.layout,
        texts: state.texts,
        hiddenPins: state.hiddenPins,
        photos,
      },
    },
  });
}

export function usePhotoSrc(photo: AlbumPhoto | string, fallback?: string) {
  const id = typeof photo === "string" ? photo : photo.id;
  const builtIn = typeof photo === "string" ? fallback ?? catalogSrc(id) : photo.src;
  return useAlbum((s) => s.photos[id] ?? builtIn);
}

export function pairText(pair: I18nPair, locale: Locale) {
  return pair[locale] || pair.en || pair.de;
}

export function allAlbumPhotos(): AlbumPhoto[] {
  return [...Object.values(heroPhotos), ...days.flatMap((day) => day.photos)];
}
