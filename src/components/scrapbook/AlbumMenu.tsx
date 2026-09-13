import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { FEATURED_SLUG } from "@/lib/album/featured";
import { useAlbum } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";
import { EditUnlock } from "./EditUnlock";
import { LanguageToggle } from "./LanguageToggle";

type AlbumMenuProps = {
  variant?: "album" | "home";
  onEdit?: () => void;
};

export function AlbumMenu({ variant = "album", onEdit }: AlbumMenuProps) {
  const t = useT();
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
        onClick={(event) => {
          event.stopPropagation();
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
          className="caption-strip album-menu-panel mt-2 min-w-[13.5rem] space-y-3 p-3"
        >
          <div className="album-menu-lang">
            <p className="mb-2 font-display text-[0.65rem] tracking-widest text-ink-soft uppercase">
              {t("ui.language")}
            </p>
            <LanguageToggle />
          </div>
          <button
            type="button"
            role="menuitem"
            className="menu-link flex min-h-11 w-full items-center"
            onClick={() => void share()}
          >
            — {copied ? t("ui.copied") : t("ui.share")}
          </button>
          {variant === "album" ? (
            <div>
              <button
                type="button"
                role="menuitem"
                className="menu-link flex min-h-11 w-full items-center gap-2"
                onClick={onEditClick}
                aria-label={t("ui.edit")}
              >
                — <Pencil size={16} strokeWidth={2.2} aria-hidden="true" />
                <span className="sr-only">{t("ui.edit")}</span>
              </button>
              {unlock && !canEdit && publicHash ? (
                <div className="mt-2">
                  <EditUnlock
                    publicHash={publicHash}
                    autoOpen
                    onUnlocked={() => {
                      onEdit?.();
                      setOpen(false);
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
