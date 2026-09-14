import { cn } from "@/lib/utils";
import type { CornerSet, CornerStyle } from "@/lib/album/data";

const ALL = ["tl", "tr", "bl", "br"] as const;

type PhotoCornersProps = {
  variant?: CornerStyle;
  set?: CornerSet;
  className?: string;
};

export function PhotoCorners({ variant = "classic", className }: PhotoCornersProps) {
  return (
    <div className={cn("photo-corners", `photo-corners--${variant}`, className)} aria-hidden="true">
      {ALL.map((corner) => (
        <span key={corner} className={cn("photo-corner", `photo-corner--${corner}`)} />
      ))}
    </div>
  );
}
