import { googleStatus, importGooglePicker, pollGooglePicker, startGooglePicker } from "./google-photos";
import { useAlbum } from "./store";

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function runGoogleImport(editHash: string, onStatus?: (label: "picker" | "import") => void) {
  const status = await googleStatus({ data: { editHash } });
  if (!status.configured) return { ok: false as const, reason: "missing" as const };
  if (!status.connected) {
    const returnTo = `${window.location.pathname}`;
    window.location.href = `/api/google/start?editHash=${encodeURIComponent(editHash)}&return=${encodeURIComponent(returnTo)}`;
    return { ok: false as const, reason: "connect" as const };
  }
  onStatus?.("picker");
  const session = await startGooglePicker({ data: { editHash } });
  if (!session.pickerUri) return { ok: false as const, reason: "picker" as const };
  window.open(session.pickerUri, "google-photos", "popup=yes,width=960,height=720");
  for (let i = 0; i < 90; i += 1) {
    await sleep(2000);
    const poll = await pollGooglePicker({ data: { editHash } });
    if (poll.ready) break;
    if (i === 89) return { ok: false as const, reason: "timeout" as const };
  }
  onStatus?.("import");
  const imported = await importGooglePicker({ data: { editHash } });
  if (!imported.photos.length) return { ok: false as const, reason: "empty" as const };
  const days = new Map<string, { id: string; url: string }[]>();
  for (const photo of imported.photos) {
    const key = new Date(photo.takenAt).toISOString().slice(0, 10);
    const list = days.get(key) ?? [];
    list.push({ id: photo.id, url: photo.url });
    days.set(key, list);
  }
  await useAlbum.getState().importStored(
    [...days.values()].map((photos) => ({ place: "Unbekannter Ort", photos })),
  );
  return { ok: true as const };
}
