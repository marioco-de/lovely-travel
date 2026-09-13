import { useRef } from "react";
import { MessageCircle, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";
import { LiveText } from "./LiveText";

type PhotoEditToolsProps = {
  hasSrc: boolean;
  title: string;
  caption: string;
  onFile: (file: File) => void;
  onTitle: (value: string) => void;
  onCaption: (value: string) => void;
  onClear: () => void;
  onRemove: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PhotoEditTools({
  hasSrc,
  title,
  caption,
  onFile,
  onTitle,
  onCaption,
  onClear,
  onRemove,
  open,
  onOpenChange,
}: PhotoEditToolsProps) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const hasNote = Boolean(title.trim() || caption.trim());
  if (!hasSrc) return null;

  return (
    <>
      <div className="photo-tabs" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="photo-tab photo-tab--pencil"
          aria-label={t("ui.replacePhoto")}
          onClick={() => fileRef.current?.click()}
        >
          <Pencil size={14} strokeWidth={2.3} />
        </button>
        <button
          type="button"
          className={cn("photo-tab photo-tab--caption", open && "is-on")}
          aria-label={t("ui.addCaption")}
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
        >
          <MessageCircle size={14} strokeWidth={2.3} />
        </button>
        <button type="button" className="photo-tab photo-tab--trash" aria-label={t("ui.removeSlot")} onClick={onRemove}>
          <Trash2 size={14} strokeWidth={2.3} />
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
