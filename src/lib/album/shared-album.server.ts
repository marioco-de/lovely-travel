export type SharedAlbumPhoto = {
  uid: string;
  url: string;
  thumb: string;
  takenAt: number;
};

function cleanUrl(raw: string) {
  return raw.replace(/\\u003d/g, "=").replace(/\\u0026/g, "&").split("=")[0] ?? raw;
}

function sized(url: string, spec: string) {
  return `${cleanUrl(url)}=${spec}`;
}

function walk(node: unknown, out: Map<string, SharedAlbumPhoto>) {
  if (!node) return;
  if (Array.isArray(node)) {
    let uid = "";
    let url = "";
    let takenAt = 0;
    let width = 0;
    for (const item of node) {
      if (typeof item === "string") {
        if (item.startsWith("AF1Qip") || item.startsWith("AF1Qip")) uid = item;
        else if (item.includes("lh3.googleusercontent.com")) url = item;
      } else if (typeof item === "number") {
        if (item > 1e11 && item < 2e13) takenAt = item;
        else if (item > 200 && item < 20000 && !width) width = item;
      }
    }
    if (url) {
      const id = uid || cleanUrl(url).slice(-24);
      if (!out.has(id)) {
        out.set(id, {
          uid: id,
          url: sized(url, "w1600"),
          thumb: sized(url, "w280"),
          takenAt: takenAt || 0,
        });
      }
    }
    for (const child of node) walk(child, out);
    return;
  }
  if (typeof node === "object") {
    for (const value of Object.values(node as Record<string, unknown>)) walk(value, out);
  }
}

function parseCallbacks(html: string) {
  const out = new Map<string, SharedAlbumPhoto>();
  const re = /AF_initDataCallback\((\{[\s\S]*?\})\)\s*;/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const raw = match[1] ?? "";
    const dataMatch = raw.match(/data:function\(\)\{return ([\s\S]*?)\}\s*(?:,|\})/);
    const jsonish = dataMatch?.[1] ?? raw.match(/data:([\s\S]*?)(?:,sideChannel|, hash:|\}\)$)/)?.[1];
    if (!jsonish) continue;
    try {
      walk(JSON.parse(jsonish), out);
    } catch {
      /* not every callback is photo data */
    }
  }
  if (out.size === 0) {
    const urls = html.match(/https:\/\/lh3\.googleusercontent\.com\/[^\s"'\\]+/g) ?? [];
    for (const raw of urls) {
      const url = cleanUrl(raw);
      if (!url.includes("lh3.googleusercontent.com")) continue;
      const id = url.slice(-28);
      if (out.has(id)) continue;
      out.set(id, { uid: id, url: sized(url, "w1600"), thumb: sized(url, "w280"), takenAt: 0 });
    }
  }
  return [...out.values()];
}

export async function fetchSharedAlbum(shareUrl: string): Promise<{ photos: SharedAlbumPhoto[]; needsAuth: boolean; title?: string }> {
  const url = shareUrl.trim();
  if (!/^https:\/\/(photos\.app\.goo\.gl|photos\.google\.com)\//i.test(url)) {
    return { photos: [], needsAuth: false };
  }
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      Accept: "text/html",
      "User-Agent": "Mozilla/5.0 (compatible; LovelyTravel/1.0)",
      "Accept-Language": "en,de;q=0.8",
    },
  });
  if (!response.ok) return { photos: [], needsAuth: response.status === 401 || response.status === 403 };
  const html = await response.text();
  const photos = parseCallbacks(html).slice(0, 120);
  const locked = photos.length === 0 && /accounts\.google\.com|ServiceLogin|sign in/i.test(html);
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.replace(/\s+-\s+Google Photos.*/i, "").trim();
  return { photos, needsAuth: locked, title };
}
