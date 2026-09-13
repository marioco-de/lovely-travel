import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n/messages";
import { Stamp } from "./Stamp";

type Corner = "tl" | "tr" | "bl" | "br";

type PhotoEdgeStampProps = {
  src: string;
  corner: Corner;
  labelKey: MessageKey;
  variant?: "round" | "rect" | "postal";
  rotation?: number;
};

export function PhotoEdgeStamp({ src, corner, labelKey, variant = "postal", rotation = -8 }: PhotoEdgeStampProps) {
  const [invert, setInvert] = useState(false);

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        const slice = Math.min(48, img.width * 0.18, img.height * 0.18);
        const sx = corner.includes("r") ? img.width - slice : 0;
        const sy = corner.includes("b") ? img.height - slice : 0;
        ctx.drawImage(img, sx, sy, slice, slice, 0, 0, 24, 24);
        const data = ctx.getImageData(0, 0, 24, 24).data;
        let sum = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
          n += 1;
        }
        setInvert(n > 0 && sum / n < 118);
      } catch {
        setInvert(false);
      }
    };
    img.src = src;
  }, [src, corner]);

  return (
    <Stamp
      labelKey={labelKey}
      variant={variant}
      rotation={rotation}
      className={cn("photo-edge-stamp", `photo-edge-stamp--${corner}`, invert && "stamp-invert")}
    />
  );
}
