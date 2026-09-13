import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hashText } from "./hash";

const LANG: Record<string, string> = {
  en: "en",
  de: "de",
  pt: "pt",
  fr: "fr",
  es: "es",
};

type CacheRow = { locale: string; field_key: string; source_hash: string; value: string };

async function translateOnce(text: string, from: string, to: string): Promise<string> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text.slice(0, 480));
  url.searchParams.set("langpair", `${LANG[from] ?? from}|${LANG[to] ?? to}`);
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) return text;
  const body = (await res.json()) as { responseData?: { translatedText?: string } };
  const out = body.responseData?.translatedText?.trim();
  if (!out || /MYMEMORY/i.test(out)) return text;
  return out;
}

export const ensureTranslations = createServerFn({ method: "POST" })
  .validator(
    z.object({
      tripId: z.string().optional(),
      sourceLocale: z.string().min(2).max(8),
      targetLocale: z.string().min(2).max(8),
      fields: z.array(z.object({ key: z.string(), text: z.string() })),
    }),
  )
  .handler(async ({ data }) => {
    const source = data.sourceLocale;
    const target = data.targetLocale;
    if (source === target) {
      return Object.fromEntries(data.fields.map((field) => [field.key, field.text]));
    }

    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const cached = data.tripId
      ? await sql<CacheRow>`
          select locale, field_key, source_hash, value
          from trip_translations
          where trip_id = ${data.tripId} and locale = ${target}
        `
      : [];
    const byKey = new Map(cached.map((row) => [row.field_key, row]));
    const out: Record<string, string> = {};

    for (const field of data.fields) {
      const text = field.text.trim();
      if (!text) {
        out[field.key] = "";
        continue;
      }
      const sourceHash = hashText(`${source}:${text}`);
      const hit = byKey.get(field.key);
      if (hit && hit.source_hash === sourceHash) {
        out[field.key] = hit.value;
        continue;
      }
      const value = await translateOnce(text, source, target);
      out[field.key] = value;
      if (data.tripId) {
        await sql`
          insert into trip_translations (trip_id, locale, field_key, source_hash, value)
          values (${data.tripId}, ${target}, ${field.key}, ${sourceHash}, ${value})
          on conflict (trip_id, locale, field_key)
          do update set source_hash = excluded.source_hash, value = excluded.value
        `;
      }
    }
    return out;
  });
