import type { Locale } from "@/lib/i18n/messages";
import type { TripPayload, TripRecord } from "./trips";

const DB_NAME = "lovely-trips";
const STORE = "trips";

type LocalTrip = TripRecord;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("publicHash", "publicHash", { unique: true });
        store.createIndex("editHash", "editHash", { unique: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function token(bytes: number) {
  const bytesArr = crypto.getRandomValues(new Uint8Array(bytes));
  let bin = "";
  for (const b of bytesArr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function makeLocalTrip(opts: {
  title: string;
  sourceLocale: Locale;
  password: string;
  payload: TripPayload;
}): LocalTrip {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    publicHash: token(8),
    editHash: token(18),
    editPassword: opts.password,
    title: opts.title,
    sourceLocale: opts.sourceLocale,
    payload: opts.payload,
    createdAt: now,
    updatedAt: now,
  };
}

export async function saveLocalTrip(trip: LocalTrip) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(trip);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function byIndex(index: "publicHash" | "editHash", value: string): Promise<LocalTrip | null> {
  const db = await openDb();
  const trip = await new Promise<LocalTrip | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).index(index).get(value);
    req.onsuccess = () => resolve((req.result as LocalTrip | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return trip;
}

export function getLocalTripByPublic(hash: string) {
  return byIndex("publicHash", hash);
}

export function getLocalTripByEdit(hash: string) {
  return byIndex("editHash", hash);
}
