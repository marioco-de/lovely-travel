import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Locale } from "@/lib/i18n/messages";
import { FEATURED_EDIT_HASH, FEATURED_PASSWORD, FEATURED_SLUG, FEATURED_TITLE, PRIVATE_EDIT_HASH, PRIVATE_SLUG, PRIVATE_TITLE } from "./featured";
import { seedLayout, type AlbumLayout } from "./layout";
import type { AlbumTexts } from "./store";

export type TripPayload = {
  layout: AlbumLayout;
  texts: AlbumTexts;
  hiddenPins: Record<string, boolean>;
  photos: Record<string, string>;
  translationMeta?: Record<string, Record<string, string>>;
  googleAlbumUrl?: string;
  googleAlbumUrls?: string[];
  allowUploads?: boolean;
  highlights?: string[];
  dayAlbums?: Record<string, { all: string[]; selected: string[] }>;
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
  googleAlbumUrls: z.array(z.string().max(500)).optional(),
  allowUploads: z.boolean().optional(),
  highlights: z.array(z.string()).optional(),
  dayAlbums: z.record(z.string(), z.object({ all: z.array(z.string()), selected: z.array(z.string()) })).optional(),
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
    googleAlbumUrl: parsed.googleAlbumUrl?.trim() || parsed.googleAlbumUrls?.[0] || undefined,
    googleAlbumUrls: parsed.googleAlbumUrls?.filter(Boolean) ?? (parsed.googleAlbumUrl ? [parsed.googleAlbumUrl] : undefined),
    allowUploads: parsed.allowUploads,
    highlights: parsed.highlights,
    dayAlbums: parsed.dayAlbums,
  };
}

async function withCatalog(tripId: string, payload: TripPayload): Promise<TripPayload> {
  try {
    const { getSql } = await import("@/lib/db");
    const { loadCatalog } = await import("./catalog.server");
    const sql = await getSql();
    const catalog = await loadCatalog(sql, tripId);
    if (!catalog.photos.length && !catalog.days.length) return payload;
    const photos = { ...payload.photos };
    for (const photo of catalog.photos) {
      if (photo.blobUrl) photos[photo.id] = photo.blobUrl;
    }
    const dayAlbums = { ...payload.dayAlbums };
    for (const day of catalog.days) {
      dayAlbums[day.id] = {
        all: day.photos.map((item) => item.photoId),
        selected: day.photos.filter((item) => item.inDayAlbum).map((item) => item.photoId),
      };
    }
    return {
      ...payload,
      photos,
      dayAlbums,
      highlights: catalog.highlights.length ? catalog.highlights.map((item) => item.photoId) : payload.highlights,
    };
  } catch {
    return payload;
  }
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
    const { issueOwnerSession } = await import("./owner-session.server");
    await issueOwnerSession(row.edit_hash);
    return {
      id: row.id,
      publicHash: row.public_hash,
      editHash: row.edit_hash,
      editPassword,
      title: row.title,
      sourceLocale: row.source_locale as Locale,
      payload: await withCatalog(row.id, asPayload(row.payload)),
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
      payload: await withCatalog(row.id, asPayload(row.payload)),
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
      payload: await withCatalog(row.id, asPayload(row.payload)),
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
      const { issueOwnerSession } = await import("./owner-session.server");
      await issueOwnerSession(FEATURED_EDIT_HASH);
      return { editHash: FEATURED_EDIT_HASH };
    }
    if (publicHash === PRIVATE_SLUG && password.toLowerCase() === FEATURED_PASSWORD) {
      try {
        await ensurePrivateTrip();
      } catch {
        /* still unlock */
      }
      const { issueOwnerSession } = await import("./owner-session.server");
      await issueOwnerSession(PRIVATE_EDIT_HASH);
      return { editHash: PRIVATE_EDIT_HASH };
    }
    const digest = hashPassword(password);
    const sql = await ensurePasswordColumn();
    const rows = await sql<{ edit_hash: string; edit_password_hash: string | null }>`
      select edit_hash, edit_password_hash from trips where public_hash = ${publicHash} limit 1
    `;
    const row = rows[0];
    if (!row?.edit_password_hash) return null;
    if (!sameSecret(row.edit_password_hash, digest)) return null;
    const { issueOwnerSession } = await import("./owner-session.server");
    await issueOwnerSession(row.edit_hash);
    return { editHash: row.edit_hash };
  });

export const unlockTripByEditHash = createServerFn({ method: "POST" })
  .validator(
    z.object({
      editHash: z.string().min(8).max(64),
      password: z.string().min(1).max(80),
    }),
  )
  .handler(async ({ data }): Promise<{ editHash: string; publicHash: string } | null> => {
    const password = data.password.trim();
    const editHash = data.editHash.trim();
    if (!password || !editHash) return null;
    if (editHash === FEATURED_EDIT_HASH && password.toLowerCase() === FEATURED_PASSWORD) {
      const { issueOwnerSession } = await import("./owner-session.server");
      await issueOwnerSession(FEATURED_EDIT_HASH);
      return { editHash: FEATURED_EDIT_HASH, publicHash: FEATURED_SLUG };
    }
    if (editHash === PRIVATE_EDIT_HASH && password.toLowerCase() === FEATURED_PASSWORD) {
      const { issueOwnerSession } = await import("./owner-session.server");
      await issueOwnerSession(PRIVATE_EDIT_HASH);
      return { editHash: PRIVATE_EDIT_HASH, publicHash: PRIVATE_SLUG };
    }
    const digest = hashPassword(password);
    const sql = await ensurePasswordColumn();
    const rows = await sql<{ edit_hash: string; public_hash: string; edit_password_hash: string | null }>`
      select edit_hash, public_hash, edit_password_hash from trips where edit_hash = ${editHash} limit 1
    `;
    const row = rows[0];
    if (!row?.edit_password_hash) return null;
    if (!sameSecret(row.edit_password_hash, digest)) return null;
    const { issueOwnerSession } = await import("./owner-session.server");
    await issueOwnerSession(row.edit_hash);
    return { editHash: row.edit_hash, publicHash: row.public_hash };
  });

export const peekOwnerSession = createServerFn({ method: "GET" })
  .validator(z.object({ hash: z.string().min(4).max(64).optional() }))
  .handler(async ({ data }): Promise<{ editHash: string } | null> => {
    const { readOwnerSession } = await import("./owner-session.server");
    const session = await readOwnerSession();
    if (!session) return null;
    if (!data.hash || data.hash === session) return { editHash: session };
    const sql = await ensurePasswordColumn();
    const rows = await sql<{ edit_hash: string; public_hash: string }>`
      select edit_hash, public_hash from trips
      where edit_hash = ${data.hash} or public_hash = ${data.hash}
      limit 1
    `;
    const row = rows[0];
    if (row && row.edit_hash === session) return { editHash: session };
    if (data.hash === FEATURED_SLUG && session === FEATURED_EDIT_HASH) return { editHash: session };
    if (data.hash === PRIVATE_SLUG && session === PRIVATE_EDIT_HASH) return { editHash: session };
    return null;
  });

export const lockOwnerSession = createServerFn({ method: "POST" }).handler(async () => {
  const { clearOwnerSession } = await import("./owner-session.server");
  await clearOwnerSession();
  return { ok: true as const };
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
        set edit_password_hash = coalesce(edit_password_hash, ${digest}),
            edit_hash = ${FEATURED_EDIT_HASH},
            title = ${FEATURED_TITLE}
        where public_hash = ${FEATURED_SLUG}
      `;
      return { publicHash: FEATURED_SLUG };
    }
    const payload = JSON.stringify({
      layout: seedLayout(),
      texts: {
        en: { "album.title": FEATURED_TITLE },
        de: { "album.title": FEATURED_TITLE },
      },
      hiddenPins: {},
      photos: {},
    });
    const id = newId();
    await sql`
      insert into trips (id, public_hash, edit_hash, edit_password_hash, title, source_locale, payload)
      values (${id}, ${FEATURED_SLUG}, ${FEATURED_EDIT_HASH}, ${digest}, ${FEATURED_TITLE}, ${"de"}, ${payload}::jsonb)
    `;
    return { publicHash: FEATURED_SLUG };
  },
);

export const ensurePrivateTrip = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ publicHash: string }> => {
    const sql = await ensurePasswordColumn();
    const digest = hashPassword(FEATURED_PASSWORD);
    const existing = await sql<{ public_hash: string }>`
      select public_hash from trips where public_hash = ${PRIVATE_SLUG} limit 1
    `;
    if (existing[0]) {
      await sql`
        update trips
        set edit_hash = ${PRIVATE_EDIT_HASH},
            edit_password_hash = coalesce(edit_password_hash, ${digest})
        where public_hash = ${PRIVATE_SLUG}
      `;
      return { publicHash: PRIVATE_SLUG };
    }
    const id = newId();
    const payload = JSON.stringify({
      layout: seedLayout(),
      texts: {
        en: { "album.title": PRIVATE_TITLE },
        de: { "album.title": PRIVATE_TITLE },
      },
      hiddenPins: {},
      photos: {},
    });
    await sql`
      insert into trips (id, public_hash, edit_hash, edit_password_hash, title, source_locale, payload)
      values (${id}, ${PRIVATE_SLUG}, ${PRIVATE_EDIT_HASH}, ${digest}, ${PRIVATE_TITLE}, ${"de"}, ${payload}::jsonb)
    `;
    return { publicHash: PRIVATE_SLUG };
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
    const { requireOwner } = await import("./owner-session.server");
    if (!(await requireOwner(data.editHash))) return { ok: false };
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
    const { requireOwner } = await import("./owner-session.server");
    if (!(await requireOwner(data.editHash))) return { ok: false };
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
    if (row) return { ok: true, updatedAt: row.updated_at };
    const publicHash =
      data.editHash === FEATURED_EDIT_HASH
        ? FEATURED_SLUG
        : data.editHash === PRIVATE_EDIT_HASH
          ? PRIVATE_SLUG
          : data.editHash.replace(/-edit$/, "");
    const id = newId();
    await sql`
      insert into trips (id, public_hash, edit_hash, title, source_locale, payload)
      values (
        ${id},
        ${publicHash || token(9)},
        ${data.editHash},
        ${data.title},
        ${data.sourceLocale},
        ${JSON.stringify(data.payload)}::jsonb
      )
    `;
    return { ok: true, updatedAt: new Date().toISOString() };
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
  async (): Promise<{ ok: boolean; db: "neon" | "pglite"; blob: boolean; google: boolean }> => {
    const { dbSource, getSql } = await import("@/lib/db");
    const { blobConfigured } = await import("./blob-store");
    const { googleConfigured } = await import("./google-photos.server");
    try {
      const sql = await getSql();
      await sql`select 1 as ok`;
      return { ok: true, db: dbSource, blob: blobConfigured(), google: googleConfigured() };
    } catch {
      return { ok: false, db: dbSource, blob: blobConfigured(), google: googleConfigured() };
    }
  },
);
