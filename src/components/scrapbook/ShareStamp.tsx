import { useState } from "react";
import { useAlbum } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";

export function ShareStamp() {
  const t = useT();
  const publicHash = useAlbum((s) => s.publicHash);
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = publicHash
      ? `${window.location.origin}/t/${publicHash}`
      : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: t("album.title"), url });
        return;
      }
    } catch {
      /* cancelled or failed — copy instead */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={t("ui.share")}
      className="stamp-mark is-settled min-h-11 border-2 border-double border-current px-3 py-2 font-display text-kicker font-semibold tracking-widest uppercase"
      style={{ ["--stamp-rot" as string]: "4deg" }}
    >
      {copied ? t("ui.copied") : t("ui.share")}
    </button>
  );
}
