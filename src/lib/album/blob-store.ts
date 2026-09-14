import { env } from "@/lib/env.server";

export function blobConfigured() {
  return Boolean(env("BLOB_READ_WRITE_TOKEN"));
}

export async function putPublicBlob(pathname: string, bytes: Uint8Array, mime: string): Promise<string | null> {
  const token = env("BLOB_READ_WRITE_TOKEN");
  if (!token) return null;
  const endpoint = env("BLOB_UPLOAD_URL") || "https://blob.vercel-storage.com";
  const url = new URL(endpoint);
  url.searchParams.set("pathname", pathname);
  url.searchParams.set("addRandomSuffix", "false");
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "access": "public",
      "x-api-version": "7",
      "x-content-type": mime || "image/jpeg",
    },
    body: Buffer.from(bytes),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { url?: string; downloadUrl?: string };
  return json.url || json.downloadUrl || null;
}

export async function deletePublicBlob(url: string) {
  const token = env("BLOB_READ_WRITE_TOKEN");
  if (!token || !url.includes("blob.vercel-storage.com")) return;
  try {
    await fetch(url, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}`, "x-api-version": "7" },
    });
  } catch {
    /* keep album save even if blob delete fails */
  }
}
