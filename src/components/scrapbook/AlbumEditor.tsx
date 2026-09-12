import { useEffect, useId, useRef, type ReactNode } from "react";
import { days, heroPhotos, type AlbumPhoto } from "@/lib/album/data";
import { useAlbum, usePhotoSrc } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";
import { messages, type Locale, type MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import { Stamp } from "./Stamp";

type AlbumEditorProps = {
  open: boolean;
  onClose: () => void;
};

export function AlbumEditor({ open, onClose }: AlbumEditorProps) {
  const t = useT();
  const titleId = useId();
  const reset = useAlbum((s) => s.reset);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="album-sheet fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-4 py-6 md:px-8 md:py-10">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 sm:pr-6">
            <p className="font-display text-kicker tracking-widest text-ink-soft uppercase">
              {t("ui.editorHint")}
            </p>
            <h2
              id={titleId}
              className="mt-2 font-typewriter text-day tracking-wide text-lagoon-deep"
            >
              {t("ui.editorTitle")}
            </h2>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Stamp
              as="button"
              variant="postal"
              labelKey="ui.resetAlbum"
              rotation={-5}
              onClick={() => void reset()}
              className="px-3 py-2"
            />
            <Stamp
              as="button"
              variant="rect"
              labelKey="ui.done"
              rotation={4}
              pressed
              onClick={onClose}
              className="px-3 py-2"
            />
          </div>
        </header>

        <EditorSection title={t("ui.albumMeta")}>
          <PairField messageKey="album.title" labelKey="ui.title" typewriter />
          <PairField messageKey="album.kicker" labelKey="ui.line" />
          <PairField messageKey="album.year" labelKey="ui.year" typewriter />
        </EditorSection>

        <EditorSection title={t("ui.collage")}>
          {Object.values(heroPhotos).map((photo) => (
            <PhotoEditor key={photo.id} photo={photo} />
          ))}
        </EditorSection>

        {days.map((day) => (
          <EditorSection key={day.id} title={t(day.labelKey)}>
            <PairField messageKey={day.placeKey} labelKey="ui.place" typewriter />
            {day.photos.map((photo) => (
              <PhotoEditor key={photo.id} photo={photo} hidePlace={photo.placeKey === day.placeKey} />
            ))}
          </EditorSection>
        ))}
      </div>
    </div>
  );
}

function EditorSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h3 className="mb-4 font-typewriter text-place tracking-wide text-lagoon-deep">{title}</h3>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

function PhotoEditor({ photo, hidePlace = false }: { photo: AlbumPhoto; hidePlace?: boolean }) {
  return (
    <article className="caption-strip flex flex-col gap-3 p-3 md:flex-row md:items-start md:gap-5 md:p-4">
      <PhotoPicker photo={photo} />
      <div className="min-w-0 flex-1 space-y-3">
        {!hidePlace && <PairField messageKey={photo.placeKey} labelKey="ui.place" typewriter />}
        <PairField messageKey={photo.captionKey} labelKey="ui.caption" multiline />
      </div>
    </article>
  );
}

function PhotoPicker({ photo }: { photo: AlbumPhoto }) {
  const t = useT();
  const src = usePhotoSrc(photo);
  const setPhoto = useAlbum((s) => s.setPhoto);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="photo-shadow relative block w-28 overflow-hidden bg-page-deep md:w-36"
      >
        <span className="relative block aspect-square">
          <img src={src} alt={t(photo.altKey)} className="h-full w-full object-cover" />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void setPhoto(photo.id, file);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-2 font-typewriter text-kicker tracking-wide text-lagoon-deep uppercase underline-offset-4 hover:underline"
      >
        {t("ui.replacePhoto")}
      </button>
    </div>
  );
}

function PairField({
  messageKey,
  labelKey,
  multiline = false,
  typewriter = false,
}: {
  messageKey: MessageKey;
  labelKey: MessageKey;
  multiline?: boolean;
  typewriter?: boolean;
}) {
  const t = useT();
  const setText = useAlbum((s) => s.setText);
  const locales: Locale[] = ["en", "de"];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {locales.map((locale) => (
        <label key={locale} className="block">
          <span className="mb-1 block font-display text-kicker tracking-widest text-ink-soft uppercase">
            {t(labelKey)} · {t(locale === "en" ? "ui.lang.en" : "ui.lang.de")}
          </span>
          <LocaleInput
            locale={locale}
            messageKey={messageKey}
            multiline={multiline}
            typewriter={typewriter}
            onChange={(value) => setText(locale, messageKey, value)}
          />
        </label>
      ))}
    </div>
  );
}

function LocaleInput({
  locale,
  messageKey,
  multiline,
  typewriter,
  onChange,
}: {
  locale: Locale;
  messageKey: MessageKey;
  multiline: boolean;
  typewriter: boolean;
  onChange: (value: string) => void;
}) {
  const value = useAlbum((s) => s.texts[locale][messageKey] ?? messages[locale][messageKey]);
  const fieldClass = cn("album-field", typewriter ? "font-typewriter tracking-wide" : "font-script text-caption");

  if (multiline) {
    return (
      <textarea
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(fieldClass, "min-h-20 resize-y")}
      />
    );
  }

  return (
    <input type="text" value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass} />
  );
}
