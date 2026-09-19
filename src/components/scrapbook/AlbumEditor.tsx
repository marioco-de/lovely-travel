import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { heroPhotos } from "@/lib/album/data";
import { catalogSrc, COLLAGE_MAX, COLLAGE_MIN, COVER_ID, type BlockKind, type I18nPair, type LayoutBlock, type LayoutDay } from "@/lib/album/layout";
import { useAlbum, usePhotoSrc } from "@/lib/album/store";
import { setTripPassword } from "@/lib/album/trips";
import { useT } from "@/lib/i18n/locale";
import { messages, type Locale, type MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./ConfirmDialog";
import { DayStarter } from "./DayStarter";
import { BulkImportButton } from "./BulkImport";
import { Stamp } from "./Stamp";

type AlbumEditorProps = {
  open: boolean;
  onClose: () => void;
};

const BLOCK_KINDS: { kind: BlockKind; label: MessageKey }[] = [
  { kind: "intro", label: "ui.addIntro" },
  { kind: "collage", label: "ui.addCollage" },
  { kind: "photo", label: "ui.addPhoto" },
  { kind: "polaroid", label: "ui.addPolaroid" },
  { kind: "place", label: "ui.addPlace" },
  { kind: "note", label: "ui.addNote" },
  { kind: "poi", label: "ui.addPoi" },
];

export function AlbumEditor({ open, onClose }: AlbumEditorProps) {
  const t = useT();
  const titleId = useId();
  const reset = useAlbum((s) => s.reset);
  const addDay = useAlbum((s) => s.addDay);
  const days = useAlbum((s) => s.layout.days).filter((day) => day.id !== COVER_ID);
  const hiddenPins = useAlbum((s) => s.hiddenPins);
  const togglePin = useAlbum((s) => s.togglePin);
  const saveStatus = useAlbum((s) => s.saveStatus);
  const editHash = useAlbum((s) => s.editHash);
  const publicHash = useAlbum((s) => s.publicHash);
  const [pickDay, setPickDay] = useState(false);

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

  const statusKey =
    saveStatus === "saving"
      ? "ui.storageSaving"
      : saveStatus === "error"
        ? "ui.storageError"
        : "ui.storageSaved";

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
            <h2 id={titleId} className="mt-2 font-typewriter text-day tracking-wide text-lagoon-deep">
              {t("ui.editorTitle")}
            </h2>
            <p className="mt-2 font-script text-caption text-ink-soft">{t("ui.storageHint")}</p>
            <p className="mt-1 font-display text-kicker tracking-widest text-lagoon-deep uppercase">
              {t(statusKey)}
            </p>
            {editHash ? <PasswordSetter editHash={editHash} publicHash={publicHash} /> : null}
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
            <Stamp as="button" variant="rect" labelKey="ui.save" rotation={4} pressed onClick={onClose} className="px-3 py-2" />
          </div>
        </header>

        <EditorSection title={t("ui.albumMeta")}>
          <PairField messageKey="album.title" labelKey="ui.title" typewriter />
          <PairField messageKey="album.kicker" labelKey="ui.line" />
          <PairField messageKey="album.year" labelKey="ui.year" typewriter />
        </EditorSection>

        <EditorSection title={t("ui.collage")}>
          {Object.values(heroPhotos).map((photo) => (
            <PhotoEditor key={photo.id} photoId={photo.id} placeKey={photo.placeKey} captionKey={photo.captionKey} />
          ))}
        </EditorSection>

        <EditorSection title={t("ui.pins")}>
          <div className="flex flex-wrap gap-2">
            {days.map((day) => {
              const hidden = Boolean(hiddenPins[day.id]);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => togglePin(day.id)}
                  className={cn(
                    "stamp-mark is-in is-settled border-2 border-double border-current px-3 py-2 font-display text-kicker font-semibold",
                    !hidden && "is-active",
                  )}
                >
                  {day.place.en || day.place.de}
                </button>
              );
            })}
          </div>
          <p className="font-script text-caption text-ink-soft">{t("ui.routeHint")}</p>
        </EditorSection>

        <EditorSection title={t("ui.days")}>
          {days.map((day) => (
            <DayEditor key={day.id} day={day} />
          ))}
          {pickDay ? (
            <DayStarter
              promptKey="ui.pickDayStart"
              onPick={(kind) => {
                addDay(kind);
                setPickDay(false);
              }}
            />
          ) : (
            <button type="button" className="album-btn self-start" onClick={() => setPickDay(true)}>
              {t("ui.addDay")}
            </button>
          )}
          <BulkImportButton className="self-start" />
        </EditorSection>
      </div>
    </div>
  );
}

function DayEditor({ day }: { day: LayoutDay }) {
  const t = useT();
  const addBlock = useAlbum((s) => s.addBlock);
  const addCollageFromFiles = useAlbum((s) => s.addCollageFromFiles);
  const removeDay = useAlbum((s) => s.removeDay);
  const setDayPlaceAt = useAlbum((s) => s.setDayPlaceAt);
  const setDayLabel = useAlbum((s) => s.setDayLabel);
  const addDayPlace = useAlbum((s) => s.addDayPlace);
  const removeDayPlace = useAlbum((s) => s.removeDayPlace);
  const setDayPin = useAlbum((s) => s.setDayPin);
  const dropRef = useRef<HTMLDivElement>(null);
  const [confirm, setConfirm] = useState(false);

  return (
    <article className="caption-strip space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h4 className="place-type font-typewriter text-place text-lagoon-deep">
          {day.label.de || day.label.en}
        </h4>
        {day.id !== COVER_ID ? (
          <button type="button" onClick={() => setConfirm(true)} className="album-btn album-btn--danger">
            {t("ui.removeDay")}
          </button>
        ) : null}
      </div>

      <PairPlain pair={day.label} labelKey="ui.dayTitle" onChange={(locale, value) => setDayLabel(day.id, locale, value)} />

      <div className="space-y-3">
        <p className="font-display text-kicker tracking-widest text-ink-soft uppercase">{t("ui.places")}</p>
        {(day.places?.length ? day.places : [day.place]).map((item, index) => (
          <div key={`${day.id}-ed-place-${index}`} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <PairPlain
                pair={item}
                labelKey="ui.place"
                typewriter
                onChange={(locale, value) => setDayPlaceAt(day.id, index, locale, value)}
              />
            </div>
            {index > 0 ? (
              <button type="button" className="album-btn album-btn--tiny mb-1" onClick={() => removeDayPlace(day.id, index)}>
                ×
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" className="album-btn" onClick={() => addDayPlace(day.id)}>
          + {t("ui.addPlaceName")}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-display text-kicker tracking-widest text-ink-soft uppercase">{t("ui.pinX")}</span>
          <input
            type="number"
            min={20}
            max={80}
            value={Math.round(day.pin.x)}
            onChange={(event) => setDayPin(day.id, { ...day.pin, x: Number(event.target.value) })}
            className="album-field"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-display text-kicker tracking-widest text-ink-soft uppercase">{t("ui.pinY")}</span>
          <input
            type="number"
            min={20}
            max={90}
            value={Math.round(day.pin.y)}
            onChange={(event) => setDayPin(day.id, { ...day.pin, y: Number(event.target.value) })}
            className="album-field"
          />
        </label>
      </div>

      <div
        ref={dropRef}
        className="border border-dashed border-stamp/35 px-3 py-4 text-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith("image/"));
          if (files.length) void addCollageFromFiles(day.id, files);
        }}
      >
        <p className="font-script text-caption text-ink-soft">{t("ui.dropHint")}</p>
        <p className="mt-1 font-display text-kicker tracking-widest text-ink-soft uppercase">{t("ui.fromDrive")}</p>
        <input
          type="file"
          accept="image/*"
          multiple
          className="mx-auto mt-3 block w-full max-w-xs text-kicker"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            if (files.length) void addCollageFromFiles(day.id, files);
            event.target.value = "";
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {BLOCK_KINDS.map((item) => (
          <Stamp
            key={item.kind}
            as="button"
            variant="rect"
            labelKey={item.label}
            rotation={item.kind === "note" ? -6 : 4}
            onClick={() => addBlock(day.id, item.kind)}
            className="px-3 py-2"
          />
        ))}
      </div>

      {day.blocks.map((block, index) => (
        <BlockEditor key={block.id} dayId={day.id} block={block} index={index} total={day.blocks.length} />
      ))}
      <ConfirmDialog
        open={confirm}
        title={t("ui.confirmRemove")}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          removeDay(day.id);
          setConfirm(false);
        }}
      />
    </article>
  );
}

function BlockEditor({
  dayId,
  block,
  index,
  total,
}: {
  dayId: string;
  block: LayoutBlock;
  index: number;
  total: number;
}) {
  const t = useT();
  const patchBlock = useAlbum((s) => s.patchBlock);
  const removeBlock = useAlbum((s) => s.removeBlock);
  const moveBlock = useAlbum((s) => s.moveBlock);
  const addPhotoSlot = useAlbum((s) => s.addPhotoSlot);
  const removePhotoSlot = useAlbum((s) => s.removePhotoSlot);
  const kindKey = `ui.block.${block.kind}` as MessageKey;
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="space-y-3 border-t border-dashed border-stamp/25 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-kicker tracking-widest text-lagoon-deep uppercase">{t(kindKey)}</p>
        <div className="flex flex-wrap gap-2">
          {index > 0 ? (
            <button type="button" className="album-btn album-btn--ghost" onClick={() => moveBlock(dayId, block.id, -1)}>
              {t("ui.moveUp")}
            </button>
          ) : null}
          {index < total - 1 ? (
            <button type="button" className="album-btn album-btn--ghost" onClick={() => moveBlock(dayId, block.id, 1)}>
              {t("ui.moveDown")}
            </button>
          ) : null}
          <button type="button" className="album-btn album-btn--danger" onClick={() => setConfirm(true)}>
            {t("ui.remove")}
          </button>
        </div>
      </div>

      {block.kind !== "note" ? (
        <PairPlain pair={block.place} labelKey="ui.place" typewriter onChange={(locale, value) => patchBlock(dayId, block.id, { place: { ...block.place, [locale]: value } })} />
      ) : null}
      {block.kind === "note" ? (
        <PairPlain pair={block.body} labelKey="ui.note" multiline onChange={(locale, value) => patchBlock(dayId, block.id, { body: { ...block.body, [locale]: value } })} />
      ) : block.kind === "place" ? (
        <PairPlain pair={block.caption} labelKey="ui.caption" multiline onChange={(locale, value) => patchBlock(dayId, block.id, { caption: { ...block.caption, [locale]: value } })} />
      ) : null}

      {block.kind === "collage" || block.kind === "photo" || block.kind === "polaroid" ? (
        <div className="flex flex-wrap gap-3">
          {block.photoIds.map((id) => (
            <div key={id} className="relative">
              <SlotPicker photoId={id} />
              {block.kind === "collage" && block.photoIds.length > COLLAGE_MIN ? (
                <button
                  type="button"
                  className="absolute -top-1 -right-1 min-h-7 min-w-7 font-typewriter text-kicker text-coral"
                  onClick={() => removePhotoSlot(dayId, block.id, id)}
                  aria-label={t("ui.removeSlot")}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
          {block.kind === "collage" && block.photoIds.length < COLLAGE_MAX ? (
            <button
              type="button"
              onClick={() => addPhotoSlot(dayId, block.id)}
              className="album-btn grid h-24 w-24 place-items-center border border-dashed border-stamp/40"
            >
              +
            </button>
          ) : null}
        </div>
      ) : null}
      <ConfirmDialog
        open={confirm}
        title={t("ui.confirmBlock")}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          removeBlock(dayId, block.id);
          setConfirm(false);
        }}
      />
    </div>
  );
}

function SlotPicker({ photoId }: { photoId: string }) {
  const t = useT();
  const src = usePhotoSrc(photoId, catalogSrc(photoId));
  const setPhoto = useAlbum((s) => s.setPhoto);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="shrink-0">
      <button type="button" onClick={() => inputRef.current?.click()} className="photo-shadow relative block w-24 overflow-hidden bg-page-deep md:w-28">
        <span className="relative block aspect-square">
          {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center px-1 text-center font-typewriter text-[0.65rem] tracking-widest uppercase">{t("ui.addPhoto")}</span>}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void setPhoto(photoId, file);
          event.target.value = "";
        }}
      />
    </div>
  );
}

function PasswordSetter({ editHash, publicHash }: { editHash: string; publicHash?: string }) {
  const t = useT();
  const remembered = publicHash && typeof window !== "undefined" ? sessionStorage.getItem(`album-pw-${publicHash}`) : "";
  const [password, setPassword] = useState(remembered ?? "");
  const [saved, setSaved] = useState(false);

  async function save() {
    if (password.trim().length < 4) return;
    const result = await setTripPassword({ data: { editHash, password: password.trim() } });
    if (result.ok) {
      if (publicHash) sessionStorage.setItem(`album-pw-${publicHash}`, password.trim());
      setSaved(true);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <label className="font-display text-kicker tracking-widest text-ink-soft uppercase">
        {t("ui.setPassword")}
        <input
          type="text"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setSaved(false);
          }}
          className="album-field mt-1 block max-w-[14rem] py-1.5 text-sm normal-case tracking-normal"
        />
      </label>
      <button
        type="button"
        onClick={() => void save()}
        className="font-typewriter text-kicker tracking-wide text-lagoon-deep underline-offset-4 hover:underline"
      >
        {t("ui.done")}
      </button>
      {saved ? <span className="font-script text-sm text-lagoon-deep">{t("ui.storageSaved")}</span> : null}
    </div>
  );
}

function PhotoEditor({
  photoId,
  placeKey,
  captionKey,
}: {
  photoId: string;
  placeKey: MessageKey;
  captionKey: MessageKey;
}) {
  return (
    <article className="caption-strip flex flex-col gap-3 p-3 md:flex-row md:items-start md:gap-5 md:p-4">
      <SlotPicker photoId={photoId} />
      <div className="min-w-0 flex-1 space-y-3">
        <PairField messageKey={placeKey} labelKey="ui.place" typewriter />
        <PairField messageKey={captionKey} labelKey="ui.caption" multiline />
      </div>
    </article>
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

function PairPlain({
  pair,
  labelKey,
  multiline = false,
  typewriter = false,
  onChange,
}: {
  pair: I18nPair;
  labelKey: MessageKey;
  multiline?: boolean;
  typewriter?: boolean;
  onChange: (locale: Locale, value: string) => void;
}) {
  const t = useT();
  const locales: Locale[] = ["en", "de"];
  const fieldClass = cn("album-field", typewriter ? "font-typewriter tracking-wide" : "font-script text-caption");

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {locales.map((locale) => (
        <label key={locale} className="block">
          <span className="mb-1 block font-display text-kicker tracking-widest text-ink-soft uppercase">
            {t(labelKey)} · {t(locale === "en" ? "ui.lang.en" : "ui.lang.de")}
          </span>
          {multiline ? (
            <textarea rows={3} value={pair[locale]} onChange={(event) => onChange(locale, event.target.value)} className={cn(fieldClass, "min-h-20 resize-y")} />
          ) : (
            <input type="text" value={pair[locale]} onChange={(event) => onChange(locale, event.target.value)} className={fieldClass} />
          )}
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
  const value = useAlbum((s) => s.texts[locale]?.[messageKey] ?? messages[locale]?.[messageKey] ?? messages.en[messageKey] ?? "");
  const fieldClass = cn("album-field", typewriter ? "font-typewriter tracking-wide" : "font-script text-caption");

  if (multiline) {
    return (
      <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className={cn(fieldClass, "min-h-20 resize-y")} />
    );
  }

  return <input type="text" value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass} />;
}
