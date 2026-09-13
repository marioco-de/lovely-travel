import type { CSSProperties } from "react";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

type DayMarkProps = {
  index: number;
  active?: boolean;
  rotation?: number;
  className?: string;
};

export function DayMark({ index, active, rotation = -8, className }: DayMarkProps) {
  const t = useT();

  return (
    <div
      className={cn(
        "stamp-mark day-mark is-in is-settled grid size-16 shrink-0 place-items-center rounded-full border-2 border-double border-current md:size-20",
        active && "is-active",
        className,
      )}
      style={{ "--stamp-rot": `${rotation}deg` } as CSSProperties}
    >
      <span className="flex flex-col items-center justify-center text-center leading-none">
        <span className="font-display text-[0.62rem] font-semibold tracking-[0.22em] uppercase md:text-kicker">
          {t("day.kicker")}
        </span>
        <span className="day-mark-num mt-0.5 font-display text-[1.55rem] leading-none font-bold tracking-tight md:text-[1.85rem]">
          {index + 1}
        </span>
      </span>
    </div>
  );
}
