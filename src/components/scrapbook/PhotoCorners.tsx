import { cn } from "@/lib/utils";
import type { CornerStyle } from "@/lib/album/data";

const corners = ["tl", "tr", "bl", "br"] as const;

type PhotoCornersProps = {
  variant?: CornerStyle;
  className?: string;
};

/** Solid album mount: right angle at the print's outer corner, hangs onto the page. */
function AlbumCorner() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M0 0h64L0 64Z" fill="#D4C09A" />
      <path d="M0 0h64L0 64Z" fill="#A89068" opacity="0.45" />
      <path d="M0 0h28L0 28Z" fill="#F4EBD8" opacity="0.35" />
      <path d="M64 0 0 64" stroke="#6B4E3D" strokeWidth="1.35" opacity="0.55" />
      <path d="M0 0h64" stroke="#4A2C18" strokeWidth="1.1" opacity="0.4" />
      <path d="M0 0v64" stroke="#4A2C18" strokeWidth="1.1" opacity="0.4" />
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
