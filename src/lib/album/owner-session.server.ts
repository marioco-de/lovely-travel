import { createHmac, timingSafeEqual } from "node:crypto";
import { env, isWorkspacePreview } from "@/lib/env.server";

export const OWNER_COOKIE = "lovely_owner";
const TTL_SEC = 60 * 60 * 24 * 30;

function secret() {
  return env("OWNER_SESSION_SECRET") || env("GOOGLE_CLIENT_SECRET") || env("DATABASE_URL") || "lovely-owner";
}

function sign(editHash: string, exp: number) {
  return createHmac("sha256", secret()).update(`${editHash}.${exp}`).digest("base64url");
}

function same(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function encodeOwnerToken(editHash: string, ttlSec = TTL_SEC) {
  const exp = Date.now() + ttlSec * 1000;
  return `${editHash}.${exp}.${sign(editHash, exp)}`;
}

export function decodeOwnerToken(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length < 3) return null;
  const mac = parts.pop() ?? "";
  const expRaw = parts.pop() ?? "";
  const editHash = parts.join(".");
  const exp = Number(expRaw);
  if (!editHash || !Number.isFinite(exp) || exp < Date.now()) return null;
  if (!same(sign(editHash, exp), mac)) return null;
  return editHash;
}

export async function issueOwnerSession(editHash: string) {
  const { setCookie } = await import("@tanstack/react-start/server");
  setCookie(OWNER_COOKIE, encodeOwnerToken(editHash), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: !isWorkspacePreview(),
    maxAge: TTL_SEC,
  });
}

export async function readOwnerSession(): Promise<string | null> {
  try {
    const { getCookie } = await import("@tanstack/react-start/server");
    return decodeOwnerToken(getCookie(OWNER_COOKIE));
  } catch {
    return null;
  }
}

export async function clearOwnerSession() {
  try {
    const { setCookie } = await import("@tanstack/react-start/server");
    setCookie(OWNER_COOKIE, "", { path: "/", httpOnly: true, sameSite: "lax", secure: !isWorkspacePreview(), maxAge: 0 });
  } catch {
    /* ignore */
  }
}

export async function requireOwner(editHash: string) {
  const session = await readOwnerSession();
  return Boolean(session && session === editHash);
}
