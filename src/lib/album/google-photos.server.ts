import { createHmac } from "node:crypto";
import { env } from "@/lib/env.server";
import { newId } from "./layout";
import { uploadAlbumPhoto } from "./photo-store";

const SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const PICKER = "https://photospicker.googleapis.com/v1";

export function googleConfigured() {
  return Boolean(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET"));
}

function client() {
  const id = env("GOOGLE_CLIENT_ID");
  const secret = env("GOOGLE_CLIENT_SECRET");
  if (!id || !secret) return null;
  return { id, secret };
}

export function googleRedirectUri(request: Request) {
  return env("GOOGLE_REDIRECT_URI") || `${new URL(request.url).origin}/api/google/callback`;
}

function signState(payload: object) {
  const secret = env("GOOGLE_CLIENT_SECRET") || "lovely";
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function readState(raw: string) {
  const [body, mac] = raw.split(".");
  if (!body || !mac) return null;
  const secret = env("GOOGLE_CLIENT_SECRET") || "lovely";
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (expected.length !== mac.length) return null;
  const a = Buffer.from(expected);
  const b = Buffer.from(mac);
  if (a.length !== b.length) return null;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i]! ^ b[i]!;
  if (diff !== 0) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      editHash: string;
      returnTo: string;
      exp: number;
    };
  } catch {
    return null;
  }
}

async function sqlClient() {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql.query(`
    create table if not exists google_accounts (
      edit_hash text primary key,
      refresh_token text not null,
      access_token text,
      access_expires_at timestamptz,
      picker_session_id text,
      updated_at timestamptz not null default now()
    )
  `);
  return sql;
}

export function googleAuthUrl(request: Request, editHash: string, returnTo: string) {
  const creds = client();
  if (!creds) return null;
  const state = signState({ editHash, returnTo, exp: Date.now() + 20 * 60 * 1000 });
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", creds.id);
  url.searchParams.set("redirect_uri", googleRedirectUri(request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function finishGoogleAuth(request: Request, code: string, stateRaw: string) {
  const creds = client();
  const state = readState(stateRaw);
  if (!creds || !state || state.exp < Date.now() || !state.editHash) return null;
  const body = new URLSearchParams({
    code,
    client_id: creds.id,
    client_secret: creds.secret,
    redirect_uri: googleRedirectUri(request),
    grant_type: "authorization_code",
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) return null;
  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!json.refresh_token && !json.access_token) return null;
  const sql = await sqlClient();
  const expires = new Date(Date.now() + Math.max(60, json.expires_in ?? 3600) * 1000).toISOString();
  const existing = await sql<{ refresh_token: string }>`
    select refresh_token from google_accounts where edit_hash = ${state.editHash} limit 1
  `;
  const refresh = json.refresh_token || existing[0]?.refresh_token;
  if (!refresh) return null;
  await sql.query(
    `insert into google_accounts (edit_hash, refresh_token, access_token, access_expires_at, updated_at)
     values ($1, $2, $3, $4, now())
     on conflict (edit_hash) do update set
       refresh_token = excluded.refresh_token,
       access_token = excluded.access_token,
       access_expires_at = excluded.access_expires_at,
       updated_at = now()`,
    [state.editHash, refresh, json.access_token ?? null, expires],
  );
  return state;
}

async function accessToken(editHash: string) {
  const creds = client();
  if (!creds) return null;
  const sql = await sqlClient();
  const rows = await sql<{
    refresh_token: string;
    access_token: string | null;
    access_expires_at: string | null;
  }>`
    select refresh_token, access_token, access_expires_at::text
    from google_accounts where edit_hash = ${editHash} limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  if (row.access_token && row.access_expires_at && Date.parse(row.access_expires_at) > Date.now() + 20_000) {
    return row.access_token;
  }
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.id,
      client_secret: creds.secret,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;
  const expires = new Date(Date.now() + Math.max(60, json.expires_in ?? 3600) * 1000).toISOString();
  await sql.query(
    `update google_accounts set access_token = $1, access_expires_at = $2, updated_at = now() where edit_hash = $3`,
    [json.access_token, expires, editHash],
  );
  return json.access_token;
}

export async function readGoogleStatus(editHash: string): Promise<{ configured: boolean; connected: boolean }> {
  if (!googleConfigured()) return { configured: false, connected: false };
  const sql = await sqlClient();
  const rows = await sql<{ edit_hash: string }>`
    select edit_hash from google_accounts where edit_hash = ${editHash} limit 1
  `;
  return { configured: true, connected: Boolean(rows[0]) };
}

export async function createPickerSession(editHash: string): Promise<{ pickerUri?: string; connected: boolean; configured: boolean }> {
  if (!googleConfigured()) return { connected: false, configured: false };
  const token = await accessToken(editHash);
  if (!token) return { connected: false, configured: true };
  const response = await fetch(`${PICKER}/sessions`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: "{}",
  });
  if (!response.ok) return { connected: true, configured: true };
  const json = (await response.json()) as { id?: string; pickerUri?: string };
  if (!json.id || !json.pickerUri) return { connected: true, configured: true };
  const sql = await sqlClient();
  await sql.query(`update google_accounts set picker_session_id = $1, updated_at = now() where edit_hash = $2`, [
    json.id,
    editHash,
  ]);
  return { pickerUri: json.pickerUri, connected: true, configured: true };
}

export async function pickerReady(editHash: string): Promise<{ ready: boolean }> {
  const token = await accessToken(editHash);
  if (!token) return { ready: false };
  const sql = await sqlClient();
  const rows = await sql<{ picker_session_id: string | null }>`
    select picker_session_id from google_accounts where edit_hash = ${editHash} limit 1
  `;
  const sessionId = rows[0]?.picker_session_id;
  if (!sessionId) return { ready: false };
  const response = await fetch(`${PICKER}/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) return { ready: false };
  const json = (await response.json()) as { mediaItemsSet?: boolean };
  return { ready: Boolean(json.mediaItemsSet) };
}

export type PickedPhoto = { id: string; url: string; takenAt: number; place: string };

export async function importPickedPhotos(editHash: string): Promise<{ photos: PickedPhoto[] }> {
  const token = await accessToken(editHash);
  if (!token) return { photos: [] };
  const sql = await sqlClient();
  const rows = await sql<{ picker_session_id: string | null }>`
    select picker_session_id from google_accounts where edit_hash = ${editHash} limit 1
  `;
  const sessionId = rows[0]?.picker_session_id;
  if (!sessionId) return { photos: [] };
  const items: { baseUrl: string; createTime?: string }[] = [];
  let pageToken = "";
  for (let page = 0; page < 8; page += 1) {
    const url = new URL(`${PICKER}/mediaItems`);
    url.searchParams.set("sessionId", sessionId);
    url.searchParams.set("pageSize", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) break;
    const json = (await response.json()) as {
      mediaItems?: { createTime?: string; mediaFile?: { baseUrl?: string } }[];
      nextPageToken?: string;
    };
    for (const item of json.mediaItems ?? []) {
      const baseUrl = item.mediaFile?.baseUrl;
      if (baseUrl) items.push({ baseUrl, createTime: item.createTime });
    }
    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
  }
  const photos: PickedPhoto[] = [];
  for (const item of items.slice(0, 80)) {
    const downloaded = await fetch(`${item.baseUrl}=d`, { headers: { authorization: `Bearer ${token}` } });
    if (!downloaded.ok) continue;
    const buffer = Buffer.from(await downloaded.arrayBuffer());
    if (buffer.length < 32 || buffer.length > 1_600_000) continue;
    const mime = downloaded.headers.get("content-type") || "image/jpeg";
    const photoId = newId("gph");
    const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
    const uploaded = await uploadAlbumPhoto({ data: { editHash, photoId, data: dataUrl } });
    if (!uploaded || !("url" in uploaded) || !uploaded.url) continue;
    photos.push({
      id: photoId,
      url: uploaded.url,
      takenAt: item.createTime ? Date.parse(item.createTime) : Date.now(),
      place: "Unbekannter Ort",
    });
  }
  return { photos };
}
