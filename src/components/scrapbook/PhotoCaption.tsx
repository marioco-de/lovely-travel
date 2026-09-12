import { cn } from "@/lib/utils";

type PhotoCaptionProps = {
  place: string;
  caption: string;
  className?: string;
  variant?: "strip" | "band";
  as?: "figcaption" | "div";
};

export function PhotoCaption({
  place,
  caption,
  className,
  variant = "strip",
  as,
}: PhotoCaptionProps) {
  const Tag = as ?? (variant === "band" ? "div" : "figcaption");
  return (
    <Tag
      className={cn(
        variant === "band"
          ? "relative z-20 px-1.5 pt-3 pb-3.5"
          : "caption-strip relative z-20 mx-3 -mt-3 px-3 py-2.5 -rotate-1 md:mx-5",
        className,
      )}
    >
      <p className="font-typewriter text-place leading-snug tracking-wide text-lagoon-deep">{place}</p>
      <p className="mt-1 font-script text-caption leading-snug text-ink-soft">{caption}</p>
    </Tag>
  );
}
