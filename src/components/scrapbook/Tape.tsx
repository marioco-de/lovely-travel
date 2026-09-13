import { cn } from "@/lib/utils";
import { type TapeStyle, tapeFor } from "@/lib/album/tape";

type TapeProps = {
  className?: string;
  rotation?: number;
  variant?: TapeStyle;
  seed?: string;
};

export function Tape({ className, rotation = 3, variant, seed }: TapeProps) {
  const style = variant ?? tapeFor(seed ?? "tape", 0);
  return (
    <span
      aria-hidden="true"
      className={cn("washi-tape", `washi-tape--${style}`, className)}
      style={{ rotate: `${rotation}deg` }}
    />
  );
}
