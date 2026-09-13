import { useEffect, useRef, useState } from "react";
import type { BlockKind } from "@/lib/album/layout";
import { useAlbum } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";
import { ConfirmDialog } from "./ConfirmDialog";

const KINDS: { kind: BlockKind; key: "ui.addCollage" | "ui.addPhoto" | "ui.addPolaroid" | "ui.addPlace" | "ui.addNote" }[] = [
  { kind: "collage", key: "ui.addCollage" },
  { kind: "photo", key: "ui.addPhoto" },
  { kind: "polaroid", key: "ui.addPolaroid" },
  { kind: "place", key: "ui.addPlace" },
  { kind: "note", key: "ui.addNote" },
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
    <div ref={wrapRef} className="block-bar relative z-20 mt-3 flex flex-wrap items-center justify-center gap-2">
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
      {open ? (
        <div className="caption-strip absolute top-full z-30 mt-2 flex flex-wrap justify-center gap-2 px-3 py-2">
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
