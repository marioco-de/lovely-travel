import { cn } from "@/lib/utils";
import type { CornerStyle } from "@/lib/album/data";

const corners = ["tl", "tr", "bl", "br"] as const;

type PhotoCornersProps = {
  variant?: CornerStyle;
  className?: string;
};

export function PhotoCorners({ variant = "classic", className }: PhotoCornersProps) {
  return (
    <div className={cn("photo-corners", `photo-corners--${variant}`, className)} aria-hidden="true">
      {corners.map((corner) => (
        <span key={corner} className={cn("photo-corner", `photo-corner--${corner}`)} />
      ))}
    </div>
  );
}
