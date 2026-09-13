import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type PhotoCaptionProps = {
  place: string;
  caption: string;
  className?: string;
  variant?: "strip" | "band";
  as?: "figcaption" | "div";
  onPlaceChange?: (value: string) => void;
  onCaptionChange?: (value: string) => void;
};

export function PhotoCaption({
  place,
  caption,
  className,
  variant = "strip",
  as,
}: PhotoCaptionProps) {
  const Tag = as ?? (variant === "band" ? "div" : "figcaption");
  if (!place.trim() && !caption.trim()) return null;
  return (
    <Tag
      className={cn(
        "min-w-0 text-center",
        variant === "band"
          ? "relative z-20 px-2 pt-5 pb-3.5"
          : "caption-strip relative z-[1] mx-3 mt-3 px-3.5 pt-6 pb-3.5 -rotate-1 md:mx-5",
        className,
      )}
    >
      {place.trim() ? (
        <p className="place-type font-typewriter text-place leading-snug text-lagoon-deep">— {place} —</p>
      ) : null}
      {caption.trim() ? <ScriptLine>{caption}</ScriptLine> : null}
    </Tag>
  );
}

export function ScriptLine({ children, className }: { children: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const style = getComputedStyle(el);
      const lh = Number.parseFloat(style.lineHeight) || 22;
      setWide(el.getBoundingClientRect().height > lh * 2.15);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  return (
    <p
      ref={ref}
      className={cn(
        "mt-1 font-script text-caption leading-snug text-ink-soft",
        wide ? "text-left" : "text-center",
        className,
      )}
    >
      {children}
    </p>
  );
}