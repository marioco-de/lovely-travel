import { useId } from "react";
import { cn } from "@/lib/utils";
import type { PaperVariant } from "@/lib/album/data";

type PaperLayerProps = {
  variant: PaperVariant;
  className?: string;
};

function AzulejosTile() {
  return (
    <g fill="none" stroke="#155E55" strokeWidth="1.15" strokeLinejoin="round">
      <rect x="2.5" y="2.5" width="75" height="75" />
      <rect x="9" y="9" width="62" height="62" />
      <path d="M40 9L71 40 40 71 9 40Z" />
      <circle cx="40" cy="40" r="10" />
      <circle cx="40" cy="40" r="3.2" />
      <path d="M40 30C45 34 45 46 40 50C35 46 35 34 40 30Z" />
      <path d="M30 40C34 35 46 35 50 40C46 45 34 45 30 40Z" />
      <path d="M2.5 20C18 20 20 18 20 2.5" />
      <path d="M77.5 20C62 20 60 18 60 2.5" />
      <path d="M2.5 60C18 60 20 62 20 77.5" />
      <path d="M77.5 60C62 60 60 62 60 77.5" />
      <g stroke="#1F7A6E" strokeWidth="0.7" opacity="0.85">
        <path d="M40 9V71M9 40H71" />
        <circle cx="9" cy="9" r="1.6" />
        <circle cx="71" cy="9" r="1.6" />
        <circle cx="9" cy="71" r="1.6" />
        <circle cx="71" cy="71" r="1.6" />
      </g>
    </g>
  );
}

function SardinhasTile() {
  return (
    <g fill="none" stroke="#C45C42" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="30" cy="20" rx="18" ry="7.2" />
      <path d="M48 20L62 13V27Z" />
      <circle cx="20" cy="18.4" r="1.15" fill="#C45C42" />
      <path d="M24 20H38" />
      <ellipse cx="94" cy="20" rx="18" ry="7.2" />
      <path d="M112 20L126 13V27Z" />
      <circle cx="84" cy="18.4" r="1.15" fill="#C45C42" />
      <path d="M88 20H102" />
      <g transform="translate(128 60) scale(-1 1)">
        <ellipse cx="30" cy="20" rx="18" ry="7.2" />
        <path d="M48 20L62 13V27Z" />
        <circle cx="20" cy="18.4" r="1.15" fill="#C45C42" />
        <path d="M24 20H38" />
      </g>
      <g transform="translate(64 60) scale(-1 1)">
        <ellipse cx="30" cy="20" rx="18" ry="7.2" />
        <path d="M48 20L62 13V27Z" />
        <circle cx="20" cy="18.4" r="1.15" fill="#C45C42" />
        <path d="M24 20H38" />
      </g>
    </g>
  );
}

function VinesTile() {
  return (
    <g fill="none" stroke="#4F6B3A" strokeWidth="1.05" strokeLinecap="round">
      <path d="M12 66C18 50 22 40 24 24" />
      <path d="M24 40C30 36 36 38 40 44" />
      <path d="M22 28C16 24 14 16 16 10" />
      <path d="M48 62C52 46 58 38 64 24" />
      <path d="M58 40C64 36 68 30 66 22" />
      <ellipse cx="26" cy="22" rx="5" ry="3.2" transform="rotate(-28 26 22)" />
      <ellipse cx="18" cy="34" rx="4.5" ry="2.8" transform="rotate(18 18 34)" />
      <ellipse cx="62" cy="28" rx="5" ry="3" transform="rotate(-20 62 28)" />
      <ellipse cx="52" cy="46" rx="4.2" ry="2.6" transform="rotate(24 52 46)" />
    </g>
  );
}

function WavesTile() {
  return (
    <g fill="none" stroke="#155E55" strokeWidth="1.05" strokeLinecap="round">
      <path d="M2 14C12 8 20 20 30 14C40 8 48 20 58 14C68 8 76 20 86 14C90 12 93 12 96 14" />
      <path d="M2 30C12 24 20 36 30 30C40 24 48 36 58 30C68 24 76 36 86 30C90 28 93 28 96 30" />
      <path d="M-6 42C4 36 12 48 22 42C32 36 40 48 50 42C60 36 68 48 78 42C88 36 96 48 106 42" />
    </g>
  );
}

const TILE = {
  azulejos: { w: 80, h: 80, Tile: AzulejosTile },
  sardinhas: { w: 128, h: 80, Tile: SardinhasTile },
  vines: { w: 72, h: 72, Tile: VinesTile },
  waves: { w: 96, h: 48, Tile: WavesTile },
} as const;

export function PaperLayer({ variant, className }: PaperLayerProps) {
  const uid = useId().replace(/:/g, "");
  const { w, h, Tile } = TILE[variant];

  return (
    <div className={cn("paper-layer", `paper-layer--${variant}`, className)} aria-hidden="true">
      <svg className="paper-layer-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={uid} width={w} height={h} patternUnits="userSpaceOnUse">
            <Tile />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${uid})`} />
      </svg>
    </div>
  );
}
