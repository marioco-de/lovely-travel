import { useEffect, useRef, useState } from "react";
import type { BlockKind } from "@/lib/album/layout";
import { useAlbum } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";
import { ConfirmDialog } from "./ConfirmDialog";

const KINDS: { kind: BlockKind; key: "ui.addCollage" | "ui.addPhoto" | "ui.addPolaroid" | "ui.addPlace" | "ui.addNote" | "ui.addPoi" }[] = [
  { kind: "collage", key: "ui.addCollage" },
  { kind: "photo", key: "ui.addPhoto" },
  { kind: "polaroid", key: "ui.addPolaroid" },
  { kind: "place", key: "ui.addPlace" },
  { kind: "note", key: "ui.addNote" },
  { kind: "poi", key: "ui.addPoi" },
];

type BlockBarProps = {
  dayId: string;
  blockId: string;
};

export function BlockBar({ dayId, blockId }: BlockBarProps) {
  const t = useT();
  const insertBlock = useAlbum((s) => s.insertBlock);
  const moveBlock = useAlbum((s) => s.moveBlock);
  const removeBlock = useAlbum((s) => s.removeBlock);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [open]);

  return (
    <div ref={wrapRef} className="block-bar mt-6 flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-ink-soft">—</span>
        <button type="button" className="block-bar-btn" aria-label={t("ui.moveUp")} onClick={() => moveBlock(dayId, blockId, -1)}>
          ⬆︎
        </button>
        <button
          type="button"
          className="block-bar-btn"
          aria-label={t("ui.addSlot")}
          onClick={() => setOpen((value) => !value)}
        >
          +
        </button>
        <button type="button" className="block-bar-btn" aria-label={t("ui.moveDown")} onClick={() => moveBlock(dayId, blockId, 1)}>
          ⬇︎
        </button>
        <button type="button" className="block-bar-btn" aria-label={t("ui.remove")} onClick={() => setConfirm(true)}>
          ×
        </button>
        <span className="text-ink-soft">—</span>
      </div>
      {open ? (
        <div className="caption-strip relative z-10 flex flex-col items-center gap-2 px-3 py-3">
          <p className="font-display text-kicker tracking-widest text-ink-soft uppercase">{t("ui.addElement")}</p>
          <div className="flex flex-wrap justify-center gap-2">
          {KINDS.map((item) => (
            <button
              key={item.kind}
              type="button"
              className="album-btn album-btn--ghost"
              onClick={() => {
                insertBlock(dayId, blockId, item.kind);
                setOpen(false);
              }}
            >
              {t(item.key)}
            </button>
          ))}
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirm}
        title={t("ui.confirmBlock")}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          removeBlock(dayId, blockId);
          setConfirm(false);
        }}
      />
    </div>
  );
}
