import type { BlockKind } from "@/lib/album/layout";
import { useAlbum } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";

const CHOICES: { kind: BlockKind; key: MessageKey }[] = [
  { kind: "photo", key: "ui.addPhoto" },
  { kind: "polaroid", key: "ui.addPolaroid" },
  { kind: "collage", key: "ui.addCollage" },
  { kind: "note", key: "ui.addNote" },
  { kind: "place", key: "ui.addPlace" },
];

type DayStarterProps = {
  dayId: string;
};

export function DayStarter({ dayId }: DayStarterProps) {
  const t = useT();
  const addBlock = useAlbum((s) => s.addBlock);

  return (
    <div className="caption-strip mx-auto max-w-md space-y-3 p-4 text-center">
      <p className="font-display text-kicker tracking-widest text-ink-soft uppercase">{t("ui.pickBlock")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {CHOICES.map((item) => (
          <button
            key={item.kind}
            type="button"
            className="menu-link min-h-11 px-2"
            onClick={() => addBlock(dayId, item.kind)}
          >
            {t(item.key)}
          </button>
        ))}
      </div>
    </div>
  );
}
