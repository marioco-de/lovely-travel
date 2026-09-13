import { cn } from "@/lib/utils";
import type { CornerSet, CornerStyle } from "@/lib/album/data";

const ALL = ["tl", "tr", "bl", "br"] as const;
const SETS: Record<CornerSet, readonly (typeof ALL)[number][]> = {
  all: ALL,
  diagonal: ["tl", "br"],
  top: ["tl", "tr"],
};

const SRC: Record<CornerStyle, string> = {
  black: "/patterns/corner-classic.svg",
  kraft: "/patterns/corner-classic.svg",
  gold: "/patterns/corner-classic.svg",
  leather: "/patterns/corner-classic.svg",
  brass: "/patterns/corner-classic.svg",
  ivory: "/patterns/corner-classic.svg",
  burgundy: "/patterns/corner-classic.svg",
  vellum: "/patterns/corner-classic.svg",
  olive: "/patterns/corner-ink.svg",
  scallop: "/patterns/corner-scalloped.svg",
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
          <img src={SRC[variant]} alt="" draggable={false} />
        </span>
      ))}
    </div>
  );
}
