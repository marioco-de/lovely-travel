import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Locale } from "@/lib/i18n/messages";
import type { AlbumLayout } from "./layout";
import type { AlbumTexts } from "./store";

export type TripPayload = {
  layout: AlbumLayout;
  texts: AlbumTexts;
  hiddenPins: Record<string, boolean>;
  photos: Record<string, string>;
  translationMeta?: Record<string, Record<string, string>>;
};

export type TripRecord = {
  id: string;
  publicHash: string;
  editHash?: string;
  title: string;
  sourceLocale: Locale;
  payload: TripPayload;
  createdAt: string;
  updatedAt: string;
};

export type TripListItem = {
  id: string;
  publicHash: string;
  editHash: string;
  title: string;
  sourceLocale: string;
  createdAt: string;
  updatedAt: string;
};

const payloadSchema = z.object({
  layout: z.any(),
  texts: z.any(),
  hiddenPins: z.record(z.string(), z.boolean()).optional(),
  photos: z.record(z.string(), z.string()).optional(),
  translationMeta: z.record(z.string(), z.record(z.string(), z.string())).optional(),
});

function newId() {
  return crypto.randomUUID();
}

function token(bytes: number) {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("base64url");
}

function asPayload(raw: unknown): TripPayload {
  const parsed = payloadSchema.parse(raw ?? {});
  return {
    layout: parsed.layout,
    texts: parsed.texts ?? { en: {}, de: {} },
    hiddenPins: parsed.hiddenPins ?? {},
    photos: parsed.photos ?? {},
    translationMeta: parsed.translationMeta,
  };
}

export const createTrip = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().min(1).max(120),
      sourceLocale: z.string().min(2).max(8),
      payload: payloadSchema,
    }),
  )
  .handler(async ({ data }): Promise<TripRecord> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const id = newId();
    const publicHash = token(8);
    const editHash = token(18);
    const rows = await sql<{
      id: string;
      public_hash: string;
      edit_hash: string;
      title: string;
      source_locale: string;
      payload: unknown;
      created_at: string;
      updated_at: string;
    }>`
      insert into trips (id, public_hash, edit_hash, title, source_locale, payload)
      values (${id}, ${publicHash}, ${editHash}, ${data.title}, ${data.sourceLocale}, ${JSON.stringify(data.payload)}::jsonb)
      returning id, public_hash, edit_hash, title, source_locale, payload, created_at::text, updated_at::text
    `;
    const row = rows[0];
    if (!row) throw new Error("Could not create album");
    return {
      id: row.id,
      publicHash: row.public_hash,
      editHash: row.edit_hash,
      title: row.title,
      sourceLocale: row.source_locale as Locale,
      payload: asPayload(row.payload),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

export const getPublicTrip = createServerFn({ method: "GET" })
  .validator(z.object({ hash: z.string().min(4).max(64) }))
  .handler(async ({ data }): Promise<Omit<TripRecord, "editHash"> | null> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      public_hash: string;
      title: string;
      source_locale: string;
      payload: unknown;
      created_at: string;
      updated_at: string;
    }>`
      select id, public_hash, title, source_locale, payload, created_at::text, updated_at::text
      from trips where public_hash = ${data.hash} limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      publicHash: row.public_hash,
      title: row.title,
      sourceLocale: row.source_locale as Locale,
      payload: asPayload(row.payload),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

export const getEditTrip = createServerFn({ method: "GET" })
  .validator(z.object({ hash: z.string().min(8).max(64) }))
  .handler(async ({ data }): Promise<TripRecord | null> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      public_hash: string;
      edit_hash: string;
      title: string;
      source_locale: string;
      payload: unknown;
      created_at: string;
      updated_at: string;
    }>`
      select id, public_hash, edit_hash, title, source_locale, payload, created_at::text, updated_at::text
      from trips where edit_hash = ${data.hash} limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      publicHash: row.public_hash,
      editHash: row.edit_hash,
      title: row.title,
      sourceLocale: row.source_locale as Locale,
      payload: asPayload(row.payload),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

export const saveTrip = createServerFn({ method: "POST" })
  .validator(
    z.object({
      editHash: z.string().min(8).max(64),
      title: z.string().min(1).max(120),
      sourceLocale: z.string().min(2).max(8),
      payload: payloadSchema,
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true; updatedAt: string } | { ok: false }> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ updated_at: string }>`
      update trips
      set title = ${data.title},
          source_locale = ${data.sourceLocale},
          payload = ${JSON.stringify(data.payload)}::jsonb,
          updated_at = now()
      where edit_hash = ${data.editHash}
      returning updated_at::text
    `;
    const row = rows[0];
    if (!row) return { ok: false };
    return { ok: true, updatedAt: row.updated_at };
  });

export const listTrips = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<TripListItem[]> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      public_hash: string;
      edit_hash: string;
      title: string;
      source_locale: string;
      created_at: string;
      updated_at: string;
    }>`
      select id, public_hash, edit_hash, title, source_locale, created_at::text, updated_at::text
      from trips
      order by updated_at desc
    `;
    return rows.map((row) => ({
      id: row.id,
      publicHash: row.public_hash,
      editHash: row.edit_hash,
      title: row.title,
      sourceLocale: row.source_locale,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  });
