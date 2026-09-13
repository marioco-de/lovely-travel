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
import { getLocalTripByEdit, getLocalTripByPublic, makeLocalTrip, saveLocalTrip } from "./trips-local";

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
  removeBlock: (dayId: string, blockId: string) => void;
  moveBlock: (dayId: string, blockId: string, dir: -1 | 1) => void;
  patchBlock: (dayId: string, blockId: string, patch: Partial<Pick<LayoutBlock, "place" | "caption" | "body" | "writingPaper">>) => void;
  setPhotoMeta: (dayId: string, blockId: string, photoId: string, patch: Partial<Pick<PhotoNote, "frame" | "format">>) => void;
  setPhotoNote: (dayId: string, blockId: string, photoId: string, field: "title" | "caption", locale: Locale, value: string) => void;
  clearPhotoNote: (dayId: string, blockId: string, photoId: string) => void;
  addPhotoSlot: (dayId: string, blockId: string) => void;
  removePhotoSlot: (dayId: string, blockId: string, photoId: string) => void;
  reset: () => Promise<void>;
  canEdit: boolean;
  enableEdit: () => void;
  lockEdit: () => void;
  unlockFeatured: () => void;
  tripId?: string;
  publicHash?: string;
  editHash?: string;
  sourceLocale: Locale;
  bindTrip: (opts: { mode: "demo" | "view" | "edit"; publicHash?: string; editHash?: string }) => Promise<void>;
  ensureLocale: (locale: Locale) => Promise<void>;
  createRemote: (password: string) => Promise<{ publicHash: string; editHash: string; editPassword?: string } | null>;
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

async function readSavedLayouts(hash?: string) {
  if (typeof indexedDB === "undefined") return [] as AlbumLayout[];
  const keys = [...new Set([hash, FEATURED_SLUG, "album"].filter(Boolean))] as string[];
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
  placeEditId: null,
  setPlaceEditId: (id) => set({ placeEditId: id }),
  enableEdit: () => set({ canEdit: true }),
  lockEdit: () => set({ canEdit: false, placeEditId: null }),
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
        const url = URL.createObjectURL(blob);
        const prev = next[id];
        next[id] = url;
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        await idbSet(PHOTO_STORE, id, blob);
      }
      set({ photos: next, saveStatus: "saving" });
      const state = get();
      const key = storageKey(state.publicHash, state.editHash);
      await idbSet(LAYOUT_STORE, key, state.layout);
      scheduleRemote(get);
      set({ saveStatus: "saved" });
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

    if (mode === "demo" && !isFeatured) {
      set({ canEdit: false, publicHash: undefined, editHash: undefined, tripId: undefined });
      await get().hydrate();
      return;
    }

    const [idbPhotos, idbLayouts, localTrip, en, de] = await Promise.all([
      typeof indexedDB === "undefined" ? Promise.resolve({}) : loadPhotoUrls(),
      typeof indexedDB === "undefined" ? Promise.resolve([] as AlbumLayout[]) : readSavedLayouts(hash),
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
    const layout = unifyLayouts(remoteLayout, localTripLayout, ...idbLayouts);
    const photos = mergePhotoMaps(remote?.payload.photos, localTrip?.payload.photos, idbPhotos, get().photos);
    const texts = localTrip?.payload.texts ?? remote?.payload.texts ?? { en: en ?? {}, de: de ?? {} };
    const hiddenPins = localTrip?.payload.hiddenPins ?? remote?.payload.hiddenPins ?? readHiddenPins();

    set({
      ready: true,
      canEdit: Boolean(editHash && (remoteEditHash || localTrip?.editHash)) || featuredUnlocked,
      tripId: remote?.id ?? localTrip?.id,
      publicHash: remote?.publicHash || localTrip?.publicHash || (isFeatured ? FEATURED_SLUG : publicHash),
      editHash: remoteEditHash ?? localTrip?.editHash ?? (featuredUnlocked ? FEATURED_EDIT_HASH : undefined),
      sourceLocale: remote?.sourceLocale ?? localTrip?.sourceLocale ?? "en",
      layout,
      texts,
      hiddenPins,
      photos,
      saveStatus: "saved",
    });
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
    const local = typeof window !== "undefined"
      ? makeLocalTrip({
          title,
          sourceLocale: state.sourceLocale,
          password,
          payload,
        })
      : null;
    if (local) {
      await saveLocalTrip(local);
      sessionStorage.setItem(`album-pw-${local.publicHash}`, password);
    }
    try {
      const trip = await createTrip({
        data: {
          title,
          sourceLocale: state.sourceLocale,
          password,
          payload,
        },
      });
      if (local) {
        await saveLocalTrip({
          ...local,
          id: trip.id,
          publicHash: trip.publicHash,
          editHash: trip.editHash,
          payload,
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
        saveStatus: "saved",
      });
      return { publicHash: trip.publicHash, editHash: trip.editHash ?? "", editPassword: trip.editPassword };
    } catch {
      if (!local) {
        set({ saveStatus: "error" });
        return null;
      }
      set({
        canEdit: true,
        tripId: local.id,
        publicHash: local.publicHash,
        editHash: local.editHash,
        layout,
        texts: emptyTexts(),
        hiddenPins: {},
        saveStatus: "saved",
      });
      return { publicHash: local.publicHash, editHash: local.editHash ?? "", editPassword: password };
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
    const state = get();
    const key = storageKey(state.publicHash, state.editHash);
    void idbSet(LAYOUT_STORE, key, state.layout)
      .then(async () => {
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
              photos: existing?.payload.photos ?? {},
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

async function fitRemotePayload(
  layout: AlbumLayout,
  texts: AlbumTexts,
  hiddenPins: Record<string, boolean>,
  photos: Record<string, string>,
) {
  const base = { layout, texts, hiddenPins, photos: {} as Record<string, string> };
  const entries = Object.entries(photos).sort((a, b) => a[1].length - b[1].length);
  for (const [id, data] of entries) {
    const next = { ...base.photos, [id]: data };
    if (JSON.stringify({ ...base, photos: next }).length > 3_200_000) break;
    base.photos = next;
  }
  return base;
}

async function pushRemote(state: AlbumState) {
  if (!state.editHash) return;
  const photos = await encodePhotos(state.photos);
  const title = state.texts.en?.["album.title"] || state.texts.de?.["album.title"] || "Lovely";
  const remotePayload = await fitRemotePayload(state.layout, state.texts, state.hiddenPins, photos);
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
      /* keep going */
    }
  }
  try {
    const result = await saveTrip({
      data: {
        editHash: state.editHash,
        title,
        sourceLocale: state.sourceLocale,
        payload: remotePayload,
      },
    });
    if (!result || !("ok" in result) || !result.ok) throw new Error("remote save missed");
  } catch {
    /* local copy already written */
  }
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
