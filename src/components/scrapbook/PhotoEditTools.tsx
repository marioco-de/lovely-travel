import { useRef } from "react";
import { MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
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
  open,
  onOpenChange,
}: PhotoEditToolsProps) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const hasNote = Boolean(title.trim() || caption.trim());

  return (
    <>
      <div className="photo-edit-tools" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="photo-tool"
          aria-label={hasSrc ? t("ui.replacePhoto") : t("ui.addPhoto")}
          onClick={() => fileRef.current?.click()}
        >
          {hasSrc ? <Pencil size={18} strokeWidth={2.2} /> : <Plus size={20} strokeWidth={2.4} />}
        </button>
        <button
          type="button"
          className={cn("photo-tool", open && "is-on")}
          aria-label={t("ui.addCaption")}
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
        >
          <MessageCircle size={18} strokeWidth={2.2} />
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
              <Trash2 size={14} strokeWidth={2.2} aria-hidden="true" />
              {t("ui.removeCaption")}
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
