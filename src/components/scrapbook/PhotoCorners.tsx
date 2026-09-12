import { cn } from "@/lib/utils";
import type { CornerStyle } from "@/lib/album/data";

const corners = ["tl", "tr", "bl", "br"] as const;

type PhotoCornersProps = {
  variant?: CornerStyle;
  className?: string;
};

function ClassicPocket() {
  return (
    <svg viewBox="0 0 42 42" aria-hidden="true">
      <path d="M0 0h42L0 42Z" fill="#E4D3B0" />
      <path d="M0 0h42L0 42Z" fill="#CDB892" opacity="0.35" />
      <path d="M41.2 0L0 41.2" stroke="#3D2A1C" strokeWidth="1.35" opacity="0.55" />
      <path d="M0 0h30L0 30Z" fill="none" stroke="#4A2C18" strokeWidth="0.8" opacity="0.4" />
      <path d="M3.2 3.2h11" stroke="#C45C42" strokeWidth="0.75" opacity="0.45" strokeLinecap="round" />
    </svg>
  );
}

function ScallopedPocket() {
  return (
    <svg viewBox="0 0 42 42" aria-hidden="true">
      <path
        d="M0 0H42A7.4 7.4 0 0 1 34.6 7.4A7.4 7.4 0 0 1 27.2 14.8A7.4 7.4 0 0 1 19.8 22.2A7.4 7.4 0 0 1 12.4 29.6A7.4 7.4 0 0 1 5 37L0 42Z"
        fill="#FBF6EC"
      />
      <path
        d="M42 0A7.4 7.4 0 0 1 34.6 7.4A7.4 7.4 0 0 1 27.2 14.8A7.4 7.4 0 0 1 19.8 22.2A7.4 7.4 0 0 1 12.4 29.6A7.4 7.4 0 0 1 5 37L0 42"
        fill="none"
        stroke="#155E55"
        strokeWidth="1.15"
      />
      <path d="M0 0h28L0 28Z" fill="none" stroke="#4A2C18" strokeWidth="0.6" opacity="0.28" />
    </svg>
  );
}

function InkPocket() {
  return (
    <svg viewBox="0 0 42 42" aria-hidden="true">
      <path d="M2 2H30L2 30Z" fill="none" stroke="#4A2C18" strokeWidth="1.55" strokeLinejoin="round" />
      <path d="M2 2H23L2 23Z" fill="none" stroke="#4A2C18" strokeWidth="0.7" opacity="0.55" />
      <path d="M2 2h12v12H2" fill="none" stroke="#4A2C18" strokeWidth="0.55" opacity="0.4" />
    </svg>
  );
}

function CornerGlyph({ variant }: { variant: CornerStyle }) {
  if (variant === "scalloped") return <ScallopedPocket />;
  if (variant === "ink") return <InkPocket />;
  return <ClassicPocket />;
}

export function PhotoCorners({ variant = "classic", className }: PhotoCornersProps) {
  return (
    <div className={cn("photo-corners", `photo-corners--${variant}`, className)} aria-hidden="true">
      {corners.map((corner) => (
        <span key={corner} className={cn("photo-corner", `photo-corner--${corner}`)}>
          <CornerGlyph variant={variant} />
        </span>
      ))}
    </div>
  );
}
