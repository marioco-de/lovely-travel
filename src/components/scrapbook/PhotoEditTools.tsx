import { useEffect, useRef, useState } from "react";
import { Recycle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLabel, type PhotoFormat } from "@/lib/album/layout";
import { useAlbum } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";
import { ConfirmDialog } from "./ConfirmDialog";

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
  photoId?: string;
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
  photoId,
  open,
  onOpenChange,
}: PhotoEditToolsProps) {
  const t = useT();
  const highlights = useAlbum((s) => s.highlights);
  const photoMap = useAlbum((s) => s.photos);
  const setPhotoUrl = useAlbum((s) => s.setPhotoUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [titleText, setTitleText] = useState(title);
  const [captionText, setCaptionText] = useState(caption);
  const hasNote = Boolean(title.trim() || caption.trim());

  useEffect(() => {
    setTitleText(title);
  }, [title]);
  useEffect(() => {
    setCaptionText(caption);
  }, [caption]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [menuOpen]);

  if (!hasSrc) return null;

  function saveTitle(value: string) {
    const cleaned = value.replace(/\u00a0/g, " ").trim();
    if (cleaned !== title) onTitle(cleaned);
  }
  function saveCaption(value: string) {
    const cleaned = value.replace(/\u00a0/g, " ").trim();
    if (cleaned !== caption) onCaption(cleaned);
  }

  return (
    <>
      {open ? (
        <div
          className="caption-strip photo-caption-editor"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <input
            value={titleText}
            aria-label={t("ui.photoTitle")}
            placeholder={t("ui.photoTitle")}
            className="photo-caption-title place-type text-center font-typewriter text-place leading-snug text-lagoon-deep"
            onChange={(event) => {
              setTitleText(event.target.value);
              saveTitle(event.target.value);
            }}
            onBlur={() => saveTitle(titleText)}
          />
          <textarea
            value={captionText}
            aria-label={t("ui.caption")}
            placeholder={t("ui.caption")}
            rows={3}
            className="photo-caption-body mt-1 text-center font-script text-caption leading-snug text-ink-soft"
            onChange={(event) => {
              setCaptionText(event.target.value);
              saveCaption(event.target.value);
            }}
            onBlur={() => saveCaption(captionText)}
          />
          {hasNote ? (
            <button
              type="button"
              className="photo-caption-clear"
              onClick={() => {
                setTitleText("");
                setCaptionText("");
                onClear();
                onOpenChange(false);
              }}
            >
              {t("ui.removeCaption")}
            </button>
          ) : null}
        </div>
      ) : null}
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
            <div className="photo-tab-menu">
              <label className="photo-tab-menu-item">
                {t("ui.changePhoto")}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="photo-file-input"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onFile(file);
                    event.target.value = "";
                    setMenuOpen(false);
                  }}
                />
              </label>
              {photoId && highlights.length ? (
                <div className="photo-highlight-picks">
                  <p className="px-2 pt-1 font-display text-[0.58rem] tracking-widest text-ink-soft uppercase">
                    {t("ui.highlights")}
                  </p>
                  <div className="flex flex-wrap gap-1 px-2 pb-2">
                    {highlights.map((id) => {
                      const src = photoMap[id];
                      if (!src) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          className="h-10 w-10 overflow-hidden border border-stamp/30"
                          onClick={() => {
                            setPhotoUrl(photoId, src);
                            setMenuOpen(false);
                          }}
                        >
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                className="photo-tab-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenChange(true);
                }}
              >
                {hasNote ? t("ui.changeCaption") : t("ui.addCaption")}
              </button>
              <button
                type="button"
                className="photo-tab-menu-item photo-tab-menu-item--danger"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirm(true);
                }}
              >
                {t("ui.deletePhoto")}
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
      </div>
      <ConfirmDialog
        open={confirm}
        title={t("ui.confirmPhoto")}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          onClear();
          onRemove();
        }}
      />
    </>
  );
}
