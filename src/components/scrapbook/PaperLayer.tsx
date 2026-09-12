import { cn } from "@/lib/utils";
import type { PaperVariant } from "@/lib/album/data";

type PaperLayerProps = {
  variant: PaperVariant;
  className?: string;
};

export function PaperLayer({ variant, className }: PaperLayerProps) {
  return (
    <div className={cn("paper-layer", `paper-layer--${variant}`, className)} aria-hidden="true" />
  );
}
