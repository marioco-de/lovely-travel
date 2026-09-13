import { cn } from "@/lib/utils";
import type { CornerSet, CornerStyle } from "@/lib/album/data";

const ALL = ["tl", "tr", "bl", "br"] as const;
const SETS: Record<string, readonly (typeof ALL)[number][]> = {
  all: ALL,
  diagonal: ["tl", "br"],
  slash: ["tr", "bl"],
};

function cornerSet(set?: CornerSet | string) {
  if (set === "diagonal") return SETS.diagonal;
  if (set === "slash" || set === "top" || set === "bottom") return SETS.slash;
  return SETS.all;
}

const SRC: Record<CornerStyle, string> = {
  classic: "/patterns/corner-classic.svg",
  black: "/patterns/corner-black.svg",
  kraft: "/patterns/corner-kraft.svg",
  gold: "/patterns/corner-gold.svg",
  scallop: "/patterns/corner-scalloped.svg",
  leather: "/patterns/corner-leather.svg",
  brass: "/patterns/corner-brass.svg",
  ivory: "/patterns/corner-ivory.svg",
  olive: "/patterns/corner-olive.svg",
  burgundy: "/patterns/corner-burgundy.svg",
  vellum: "/patterns/corner-vellum.svg",
};

type PhotoCornersProps = {
  variant?: CornerStyle;
  set?: CornerSet;
  className?: string;
};

export function PhotoCorners({ variant = "black", set = "all", className }: PhotoCornersProps) {
  return (
    <div className={cn("photo-corners", `photo-corners--${variant}`, className)} aria-hidden="true">
      {cornerSet(set).map((corner) => (
        <span key={corner} className={cn("photo-corner", `photo-corner--${corner}`)}>
          <img src={SRC[variant]} alt="" draggable={false} />
        </span>
      ))}
    </div>
  );
}
