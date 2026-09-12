import { create } from "zustand";
import type { Locale, MessageKey } from "@/lib/i18n/messages";
import { days, heroPhotos, type AlbumPhoto } from "./data";

const DB_NAME = "tropical-album";
const DB_VERSION = 1;
const PHOTO_STORE = "photos";
const TEXT_STORE = "texts";

export type AlbumTexts = Record<Locale, Partial<Record<MessageKey, string>>>;

type AlbumState = {
  ready: boolean;
  photos: Record<string, string>;
  texts: AlbumTexts;
  hiddenPins: Record<string, boolean>;
  hydrate: () => Promise<void>;
  setPhoto: (id: string, file: File) => Promise<void>;
  setText: (locale: Locale, key: MessageKey, value: string) => void;
  togglePin: (id: string) => void;
  reset: () => Promise<void>;
};

const emptyTexts = (): AlbumTexts => ({ en: {}, de: {} });

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

function scheduleTextSave(texts: AlbumTexts) {
  if (typeof window === "undefined") return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void idbSet(TEXT_STORE, "en", texts.en);
    void idbSet(TEXT_STORE, "de", texts.de);
  }, 280);
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
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.86),
    );
    bitmap.close();
    return blob ?? file;
  } catch {
    return file;
  }
}

export const useAlbum = create<AlbumState>((set, get) => ({
  ready: false,
  photos: {},
  texts: emptyTexts(),
  hiddenPins: {},
  hydrate: async () => {
    if (typeof indexedDB === "undefined") {
      set({ ready: true, hiddenPins: readHiddenPins() });
      return;
    }
    try {
      const [en, de, blobs] = await Promise.all([
        idbGet<Partial<Record<MessageKey, string>>>(TEXT_STORE, "en"),
        idbGet<Partial<Record<MessageKey, string>>>(TEXT_STORE, "de"),
        readAllPhotos(),
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
      });
    } catch {
      set({ ready: true, hiddenPins: readHiddenPins() });
    }
  },
  setPhoto: async (id, file) => {
    const blob = await prepareImage(file);
    const url = URL.createObjectURL(blob);
    const prev = get().photos[id];
    set((s) => ({ photos: { ...s.photos, [id]: url } }));
    if (prev) URL.revokeObjectURL(prev);
    try {
      await idbSet(PHOTO_STORE, id, blob);
    } catch {
      /* quota — keep session url */
    }
  },
  setText: (locale, key, value) => {
    const texts: AlbumTexts = {
      ...get().texts,
      [locale]: { ...get().texts[locale], [key]: value },
    };
    set({ texts });
    scheduleTextSave(texts);
  },
  togglePin: (id) => {
    const hiddenPins = { ...get().hiddenPins };
    if (hiddenPins[id]) delete hiddenPins[id];
    else hiddenPins[id] = true;
    set({ hiddenPins });
    writeHiddenPins(hiddenPins);
  },
  reset: async () => {
    for (const url of Object.values(get().photos)) URL.revokeObjectURL(url);
    set({ photos: {}, texts: emptyTexts(), hiddenPins: {} });
    writeHiddenPins({});
    try {
      await Promise.all([idbClear(PHOTO_STORE), idbClear(TEXT_STORE)]);
    } catch {
      /* ignore */
    }
  },
}));

export function usePhotoSrc(photo: AlbumPhoto) {
  return useAlbum((s) => s.photos[photo.id] ?? photo.src);
}

export function allAlbumPhotos(): AlbumPhoto[] {
  return [...Object.values(heroPhotos), ...days.flatMap((day) => day.photos)];
}
