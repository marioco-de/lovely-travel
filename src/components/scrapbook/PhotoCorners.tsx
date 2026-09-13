import { cn } from "@/lib/utils";
import type { CornerSet, CornerStyle } from "@/lib/album/data";

type PhotoCornersProps = {
  variant?: CornerStyle;
  set?: CornerSet;
  className?: string;
};

export function PhotoCorners({ variant = "black", set = "all", className }: PhotoCornersProps) {
  return (
    <div
      className={cn("photo-corners", `photo-corners--${variant}`, `photo-corners-set--${set}`, className)}
      aria-hidden="true"
    >
      <img src={`/corners/${variant}.png`} alt="" draggable={false} className="photo-corners-sheet" />
    </div>
  );
}
