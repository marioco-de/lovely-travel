import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { FEATURED_SLUG } from "@/lib/album/featured";
import { useAlbum } from "@/lib/album/store";
import { useLocale, useT } from "@/lib/i18n/locale";
import { LOCALES, LOCALE_LABEL } from "@/lib/i18n/messages";
import { EditUnlock } from "./EditUnlock";

type AlbumMenuProps = {
  variant?: "album" | "home";
  onEdit?: () => void;
};

export function AlbumMenu({ variant = "album", onEdit }: AlbumMenuProps) {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const ensureLocale = useAlbum((s) => s.ensureLocale);
  const publicHash = useAlbum((s) => s.publicHash);
  const canEdit = useAlbum((s) => s.canEdit);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unlock, setUnlock] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function share() {
    const url =
      publicHash === FEATURED_SLUG || (!publicHash && variant === "home")
        ? `${window.location.origin}/portugal-mit-michael`
        : publicHash
          ? `${window.location.origin}/t/${publicHash}`
          : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: t("album.title"), url });
        return;
      }
    } catch {
      /* copy instead */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  function onEditClick() {
    if (canEdit) {
      onEdit?.();
      setOpen(false);
      return;
    }
    setUnlock(true);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("ui.menu")}
        onClick={() => {
          setOpen((value) => !value);
          setUnlock(false);
        }}
        className={cn(
          "stamp-mark is-settled grid min-h-11 min-w-11 place-items-center border-2 border-double border-current px-3 py-2 font-display text-lg font-semibold leading-none tracking-widest",
          open && "is-active",
        )}
        style={{ ["--stamp-rot" as string]: "-3deg" }}
      >
        ⋯
      </button>
      {open ? (
        <div
          role="menu"
          className="caption-strip absolute top-full right-0 z-40 mt-2 min-w-[12.5rem] space-y-3 p-3"
        >
          <div>
            <p className="mb-1 font-display text-[0.65rem] tracking-widest text-ink-soft uppercase">
              {t("ui.language")}
            </p>
            <div className="flex flex-wrap gap-1">
              {LOCALES.map((code) => (
                <button
                  key={code}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setLocale(code);
                    void ensureLocale(code);
                  }}
                  className={cn(
                    "min-h-9 min-w-9 px-2 font-typewriter text-kicker tracking-wide",
                    code === locale ? "text-lagoon-deep underline" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {t(LOCALE_LABEL[code])}
                </button>
              ))}
            </div>
          </div>
          <button type="button" role="menuitem" className="menu-link flex w-full items-center gap-2" onClick={() => void share()}>
            — {copied ? t("ui.copied") : t("ui.share")}
          </button>
          {variant === "album" ? (
            <div>
              <button
                type="button"
                role="menuitem"
                className="menu-link flex w-full items-center gap-2"
                onClick={onEditClick}
                aria-label={t("ui.edit")}
              >
                — <Pencil size={15} strokeWidth={2.2} />
                <span className="sr-only">{t("ui.edit")}</span>
              </button>
              {unlock && !canEdit && publicHash ? (
                <div className="mt-2">
                  <EditUnlock publicHash={publicHash} autoOpen />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
