import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { albumEditHref, albumPublicHref, albumSettingsHref } from "@/lib/album/featured";
import { useAlbum } from "@/lib/album/store";
import { peekOwnerSession } from "@/lib/album/trips";
import { useT } from "@/lib/i18n/locale";
import { EditUnlock } from "./EditUnlock";
import { LanguageToggle } from "./LanguageToggle";

type AlbumMenuProps = {
  variant?: "album" | "home";
  onEdit?: () => void;
  onSave?: () => void;
};

export function AlbumMenu({ variant = "album", onEdit, onSave }: AlbumMenuProps) {
  const t = useT();
  const publicHash = useAlbum((s) => s.publicHash);
  const canEdit = useAlbum((s) => s.canEdit);
  const editHash = useAlbum((s) => s.editHash);
  const lockEdit = useAlbum((s) => s.lockEdit);
  const becomeOwner = useAlbum((s) => s.becomeOwner);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unlock, setUnlock] = useState(false);
  const [unlockTo, setUnlockTo] = useState<"edit" | "settings">("edit");
  const [mounted, setMounted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    const path = albumPublicHref(publicHash);
    const url = path === "/" && variant !== "home" ? window.location.href : `${window.location.origin}${path === "/" ? "/portugal-urlaub" : path}`;
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

  async function onEditClick() {
    const href = albumEditHref(publicHash, editHash);
    if (canEdit && href && window.location.pathname.startsWith(href)) {
      onEdit?.();
      setOpen(false);
      return;
    }
    const key = publicHash || editHash;
    if (key) {
      const session = await peekOwnerSession({ data: { hash: key } }).catch(() => null);
      if (session?.editHash) {
        becomeOwner(session.editHash);
        if (href) {
          window.location.href = href;
          return;
        }
        onEdit?.();
        setOpen(false);
        return;
      }
    }
    setUnlockTo("edit");
    setUnlock(true);
  }

  function settingsHref() {
    return albumSettingsHref(publicHash, editHash);
  }

  function onSettingsClick() {
    const href = settingsHref();
    if (href) window.location.href = href;
    else {
      setUnlockTo("settings");
      setUnlock(true);
    }
  }

  function onSaveClick() {
    lockEdit();
    onSave?.();
    setOpen(false);
  }

  const menu = (
    <div ref={wrapRef} className="album-chrome-layer">
      <div className="album-chrome-fixed">
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
            "album-menu-trigger stamp-mark is-settled grid min-h-11 min-w-11 place-items-center border-2 border-double border-current px-3 py-2 font-display text-lg font-semibold leading-none tracking-widest",
            open && "is-active",
          )}
          style={{ ["--stamp-rot" as string]: "-3deg" }}
        >
          ⋯
        </button>
      </div>
      {open ? (
        <div role="menu" className="caption-strip album-menu-panel min-w-[13.5rem] space-y-3 p-3">
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
              {canEdit ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="menu-link flex min-h-11 w-full items-center"
                    onClick={onSettingsClick}
                  >
                    — {t("ui.settings")}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="menu-link flex min-h-11 w-full items-center"
                    onClick={onSaveClick}
                  >
                    — {t("ui.save")}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="menu-link flex min-h-11 w-full items-center"
                    onClick={onEditClick}
                  >
                    — {t("ui.edit")}
                  </button>
                </>
              )}
              {unlock && !canEdit && publicHash ? (
                <div className="mt-2">
                  <EditUnlock
                    publicHash={publicHash}
                    autoOpen
                    to={unlockTo}
                    onUnlocked={(hash) => {
                      becomeOwner(hash);
                      setOpen(false);
                      if (unlockTo === "edit") onEdit?.();
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

  if (!mounted) return null;
  return createPortal(menu, document.body);
}
