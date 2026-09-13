import { useEffect, useRef, useState } from "react";
import { Recycle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLabel, type PhotoFormat } from "@/lib/album/layout";
import { useT } from "@/lib/i18n/locale";
import { LiveText } from "./LiveText";

type PhotoEditToolsProps = {
  hasSrc: boolean;
  title: string;
  caption: string;
  format?: PhotoFormat;
  onFile: (file: File) => void;
  onTitle: (value: string) => void;
  onCaption: (value: string) => void;
  onClear: () => void;
  onRemove: () => void;
  onCycleFrame: () => void;
  onCycleFormat: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PhotoEditTools({
  hasSrc,
  title,
  caption,
  format,
  onFile,
  onTitle,
  onCaption,
  onClear,
  onRemove,
  onCycleFrame,
  onCycleFormat,
  open,
  onOpenChange,
}: PhotoEditToolsProps) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const hasNote = Boolean(title.trim() || caption.trim());

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [menuOpen]);

  if (!hasSrc) return null;

  return (
    <>
      <div
        className={cn("photo-tabs", menuOpen && "is-open")}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div ref={menuRef} className="photo-tab-more">
          <button
            type="button"
            className={cn("photo-tab photo-tab--more", menuOpen && "is-on")}
            aria-label={t("ui.photoActions")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span aria-hidden="true">⋯</span>
          </button>
          {menuOpen ? (
            <div className="photo-tab-menu caption-strip">
              <button
                type="button"
                className="photo-tab-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  fileRef.current?.click();
                }}
              >
                {t("ui.edit")}
              </button>
              <button
                type="button"
                className="photo-tab-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenChange(true);
                }}
              >
                {t("ui.addCaption")}
              </button>
              <button
                type="button"
                className="photo-tab-menu-item photo-tab-menu-item--danger"
                onClick={() => {
                  setMenuOpen(false);
                  onRemove();
                }}
              >
                {t("ui.delete")}
              </button>
            </div>
          ) : null}
        </div>
        <button type="button" className="photo-tab photo-tab--format" aria-label={t("ui.photoFormat")} onClick={onCycleFormat}>
          <span>{formatLabel(format)}</span>
        </button>
        <button type="button" className="photo-tab photo-tab--cycle" aria-label={t("ui.cycleFrame")} onClick={onCycleFrame}>
          <Recycle size={14} strokeWidth={2.4} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = "";
          }}
        />
      </div>
      {open ? (
        <div
          className="caption-strip photo-caption-editor"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <LiveText
            value={title}
            onChange={onTitle}
            placeholder={t("ui.photoTitle")}
            className="place-type text-center font-typewriter text-place leading-snug text-lagoon-deep"
          />
          <LiveText
            value={caption}
            onChange={onCaption}
            placeholder={t("ui.caption")}
            className="mt-1 text-center font-script text-caption leading-snug text-ink-soft"
          />
          {hasNote ? (
            <button type="button" className="photo-caption-clear" onClick={onClear}>
              {t("ui.removeCaption")}
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
