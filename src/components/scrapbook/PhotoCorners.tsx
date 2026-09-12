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

/** Kraft triangle photo mount, like the black album corners. */
function ClassicCorner() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M0 0h64L0 64Z" fill="#CDB892" />
      <path d="M0 0h64L0 64Z" fill="#8C6E45" opacity="0.28" />
      <path d="M0 0h22L0 22Z" fill="#F4EBD8" opacity="0.4" />
      <path d="M64 0 0 64" stroke="#6B4E3D" strokeWidth="1.2" opacity="0.55" />
    </svg>
  );
}

/** Scalloped paper pocket — print tucks under a wavy inner edge. */
function ScallopedCorner() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M0 0h64L0 64Z" fill="#E4D3B0" />
      <path
        d="M64 0 C58 8 54 10 50 8 C46 16 42 18 38 16 C34 24 30 26 26 24 C22 32 18 34 14 32 C10 40 6 42 0 40 L0 64 64 0Z"
        fill="#F3E6C9"
        opacity="0.95"
      />
      <path
        d="M64 0 C58 8 54 10 50 8 C46 16 42 18 38 16 C34 24 30 26 26 24 C22 32 18 34 14 32 C10 40 6 42 0 40"
        fill="none"
        stroke="#6B4E3D"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <path d="M0 0h18L0 18Z" fill="#F7F2E8" opacity="0.5" />
    </svg>
  );
}

/** Ink-line L pocket, stamped onto the page. */
function InkCorner() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M3 3h50M3 3v50" fill="none" stroke="#4A2C18" strokeWidth="2.4" strokeLinecap="square" />
      <path d="M9 3h38M3 9v38" fill="none" stroke="#4A2C18" strokeWidth="0.9" opacity="0.55" />
      <path d="M3 3 18 18" fill="none" stroke="#4A2C18" strokeWidth="1.1" opacity="0.7" />
    </svg>
  );
}

function CornerMark({ variant }: { variant: CornerStyle }) {
  if (variant === "scalloped") return <ScallopedCorner />;
  if (variant === "ink") return <InkCorner />;
  return <ClassicCorner />;
}

export function PhotoCorners({ variant = "classic", set = "all", className }: PhotoCornersProps) {
  return (
    <div className={cn("photo-corners", `photo-corners--${variant}`, className)} aria-hidden="true">
      {SETS[set].map((corner) => (
        <span key={corner} className={cn("photo-corner", `photo-corner--${corner}`)}>
          <CornerMark variant={variant} />
        </span>
      ))}
    </div>
  );
}
