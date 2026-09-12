import { cn } from "@/lib/utils";
import type { CornerSet, CornerStyle } from "@/lib/album/data";

const ALL = ["tl", "tr", "bl", "br"] as const;
const SETS: Record<CornerSet, readonly (typeof ALL)[number][]> = {
  all: ALL,
  diagonal: ["tl", "br"],
  top: ["tl", "tr"],
};

type PhotoCornersProps = {
  variant?: CornerStyle;
  set?: CornerSet;
  className?: string;
};

export function PhotoCorners({ variant = "black", set = "all", className }: PhotoCornersProps) {
  return (
    <div className={cn("photo-corners", `photo-corners--${variant}`, className)} aria-hidden="true">
      {SETS[set].map((corner) => (
        <span key={corner} className={cn("photo-corner", `photo-corner--${corner}`)}>
          <img src={`/corners/${variant}.png`} alt="" draggable={false} />
        </span>
      ))}
    </div>
  );
}
