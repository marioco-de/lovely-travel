import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Locale } from "@/lib/i18n/messages";
import { FEATURED_EDIT_HASH, FEATURED_PASSWORD, FEATURED_SLUG, FEATURED_TITLE } from "./featured";
import { seedLayout, type AlbumLayout } from "./layout";
import type { AlbumTexts } from "./store";

export type TripPayload = {
  layout: AlbumLayout;
  texts: AlbumTexts;
  hiddenPins: Record<string, boolean>;
  photos: Record<string, string>;
  translationMeta?: Record<string, Record<string, string>>;
  googleAlbumUrl?: string;
};

export type TripRecord = {
  id: string;
  publicHash: string;
  editHash?: string;
  editPassword?: string;
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
  googleAlbumUrl: z.string().max(500).optional(),
});

function newId() {
  return crypto.randomUUID();
}

function token(bytes: number) {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("base64url");
}

function hashPassword(password: string) {
  return createHash("sha256").update(password.trim()).digest("hex");
}

function sameSecret(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function ensurePasswordColumn() {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql.query("alter table trips add column if not exists edit_password_hash text");
  return sql;
}

function asPayload(raw: unknown): TripPayload {
  const parsed = payloadSchema.parse(raw ?? {});
  return {
    layout: parsed.layout,
    texts: parsed.texts ?? { en: {}, de: {} },
    hiddenPins: parsed.hiddenPins ?? {},
    photos: parsed.photos ?? {},
    translationMeta: parsed.translationMeta,
    googleAlbumUrl: parsed.googleAlbumUrl?.trim() || undefined,
  };
}

export const createTrip = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().min(1).max(120),
      sourceLocale: z.string().min(2).max(8),
      password: z.string().min(4).max(80),
      payload: payloadSchema,
    }),
  )
  .handler(async ({ data }): Promise<TripRecord> => {
    const { getSql } = await import("@/lib/db");
    await ensurePasswordColumn();
    const sql = await getSql();
    const id = newId();
    const publicHash = token(8);
    const editHash = token(18);
    const editPassword = data.password.trim();
    const passwordHash = hashPassword(editPassword);
    const payloadJson = JSON.stringify(data.payload);
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
      insert into trips (id, public_hash, edit_hash, edit_password_hash, title, source_locale, payload)
      values (${id}, ${publicHash}, ${editHash}, ${passwordHash}, ${data.title}, ${data.sourceLocale}, ${payloadJson}::jsonb)
      returning id, public_hash, edit_hash, title, source_locale, payload, created_at::text, updated_at::text
    `;
    const row = rows[0];
    if (!row) throw new Error("Could not create album");
    return {
      id: row.id,
      publicHash: row.public_hash,
      editHash: row.edit_hash,
      editPassword,
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

export const unlockTrip = createServerFn({ method: "POST" })
  .validator(
    z.object({
      publicHash: z.string().min(4).max(64),
      password: z.string().min(1).max(80),
    }),
  )
  .handler(async ({ data }): Promise<{ editHash: string } | null> => {
    const password = data.password.trim();
    const publicHash = data.publicHash.trim();
    if (!password || !publicHash) return null;
    if (publicHash === FEATURED_SLUG && password.toLowerCase() === FEATURED_PASSWORD) {
      try {
        await ensureFeaturedTrip();
      } catch {
        /* still unlock the named album */
      }
      return { editHash: FEATURED_EDIT_HASH };
    }
    const digest = hashPassword(password);
    const sql = await ensurePasswordColumn();
    const rows = await sql<{ edit_hash: string; edit_password_hash: string | null }>`
      select edit_hash, edit_password_hash from trips where public_hash = ${publicHash} limit 1
    `;
    const row = rows[0];
    if (!row?.edit_password_hash) return null;
    if (!sameSecret(row.edit_password_hash, digest)) return null;
    return { editHash: row.edit_hash };
  });

export const ensureFeaturedTrip = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ publicHash: string }> => {
    const sql = await ensurePasswordColumn();
    const digest = hashPassword(FEATURED_PASSWORD);
    const existing = await sql<{ public_hash: string }>`
      select public_hash from trips where public_hash = ${FEATURED_SLUG} limit 1
    `;
    if (existing[0]) {
      await sql`
        update trips
        set edit_password_hash = ${digest},
            edit_hash = ${FEATURED_EDIT_HASH},
            title = ${FEATURED_TITLE},
            updated_at = now()
        where public_hash = ${FEATURED_SLUG}
      `;
      return { publicHash: FEATURED_SLUG };
    }
    const id = newId();
    const payload = JSON.stringify({
      layout: seedLayout(),
      texts: {
        en: { "album.title": FEATURED_TITLE },
        de: { "album.title": FEATURED_TITLE },
      },
      hiddenPins: {},
      photos: {},
    });
    await sql`
      insert into trips (id, public_hash, edit_hash, edit_password_hash, title, source_locale, payload)
      values (${id}, ${FEATURED_SLUG}, ${FEATURED_EDIT_HASH}, ${digest}, ${FEATURED_TITLE}, ${"de"}, ${payload}::jsonb)
    `;
    return { publicHash: FEATURED_SLUG };
  },
);

export const setTripPassword = createServerFn({ method: "POST" })
  .validator(
    z.object({
      editHash: z.string().min(8).max(64),
      password: z.string().min(4).max(80),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false }> => {
    const sql = await ensurePasswordColumn();
    const rows = await sql<{ id: string }>`
      update trips
      set edit_password_hash = ${hashPassword(data.password)}, updated_at = now()
      where edit_hash = ${data.editHash}
      returning id
    `;
    return rows[0] ? { ok: true } : { ok: false };
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

export const getStorageHealth = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: boolean; db: "neon" | "pglite" }> => {
    const { dbSource, getSql } = await import("@/lib/db");
    try {
      const sql = await getSql();
      await sql`select 1 as ok`;
      return { ok: true, db: dbSource };
    } catch {
      return { ok: false, db: dbSource };
    }
  },
);
