export type PhotoPlay = "loop" | "boomerang";

export function isVideoSrc(src: string, media?: string) {
  if (media === "video") return true;
  if (!src) return false;
  if (/^data:video\//i.test(src)) return true;
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(src)) return true;
  return /[=](dv|m18|m22|m37)\b/i.test(src);
}

export function mediaBase(src: string) {
  return src.split("=")[0] || src;
}

export function posterSrc(src: string) {
  if (!src || /^data:video\//i.test(src) || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src)) return src;
  if (src.includes("lh3.googleusercontent.com") || src.includes("googleusercontent.com")) {
    return `${mediaBase(src)}=w1600`;
  }
  return src;
}

export function videoSrc(src: string) {
  if (!src) return src;
  if (/^data:video\//i.test(src) || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src)) return src;
  if (src.includes("lh3.googleusercontent.com") || src.includes("googleusercontent.com")) {
    return `${mediaBase(src)}=m22`;
  }
  return src;
}

export function videoFallbacks(src: string) {
  if (!src) return [];
  if (/^data:video\//i.test(src) || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src)) return [src];
  if (src.includes("googleusercontent.com")) {
    const base = mediaBase(src);
    return [`${base}=m22`, `${base}=m18`, `${base}=dv`];
  }
  return [src];
}

export function nextPlay(current?: PhotoPlay): PhotoPlay {
  return current === "boomerang" ? "loop" : "boomerang";
}
