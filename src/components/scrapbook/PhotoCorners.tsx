import { cn } from "@/lib/utils";
import type { CornerStyle } from "@/lib/album/data";

const corners = ["tl", "tr", "bl", "br"] as const;

type PhotoCornersProps = {
  variant?: CornerStyle;
  className?: string;
};

/** Kraft album photo-corner: chevron pocket the print tucks under. */
function AlbumCorner() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M0 0h48L17 17 0 48z" fill="#E4D3B0" />
      <path d="M0 0h48L17 17 0 48z" fill="#CDB892" opacity="0.4" />
      <path d="M0 0h20L0 20z" fill="#F7F2E8" opacity="0.55" />
      <path
        d="M48 0 17 17 0 48"
        fill="none"
        stroke="#6B4E3D"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M0 0h48L17 17 0 48z"
        fill="none"
        stroke="#4A2C18"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path d="M5 5h11" stroke="#C45C42" strokeWidth="0.85" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export function PhotoCorners({ variant = "classic", className }: PhotoCornersProps) {
  return (
    <div className={cn("photo-corners", `photo-corners--${variant}`, className)} aria-hidden="true">
      {corners.map((corner) => (
        <span key={corner} className={cn("photo-corner", `photo-corner--${corner}`)}>
          <AlbumCorner />
        </span>
      ))}
    </div>
  );
}
