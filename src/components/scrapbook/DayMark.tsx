import type { CSSProperties } from "react";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

type DayMarkProps = {
  index: number;
  active?: boolean;
  rotation?: number;
  className?: string;
  size?: "md" | "sm";
};

export function DayMark({ index, active, rotation = -8, className, size = "md" }: DayMarkProps) {
  const t = useT();

  return (
    <div
      className={cn(
        "stamp-mark day-mark is-in is-settled grid shrink-0 place-items-center rounded-full border-2 border-double border-current",
        size === "sm" ? "size-11" : "size-16 md:size-20",
        active && "is-active",
        className,
      )}
      style={{ "--stamp-rot": `${rotation}deg` } as CSSProperties}
    >
      <span className="flex flex-col items-center justify-center text-center leading-none">
        <span
          className={cn(
            "font-display font-semibold uppercase",
            size === "sm" ? "text-[0.45rem] tracking-[0.16em]" : "text-[0.62rem] tracking-[0.22em] md:text-kicker",
          )}
        >
          {t("day.kicker")}
        </span>
        <span
          className={cn(
            "day-mark-num mt-0.5 font-display leading-none font-bold tracking-tight",
            size === "sm" ? "text-[1.15rem]" : "text-[1.55rem] md:text-[1.85rem]",
          )}
        >
          {index + 1}
        </span>
      </span>
    </div>
  );
}
