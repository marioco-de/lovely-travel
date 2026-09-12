import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/use-in-view";

type DevelopingImageProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function DevelopingImage({ src, alt, className, priority = false }: DevelopingImageProps) {
  const { ref, inView } = useInView<HTMLImageElement>({
    threshold: 0.12,
    rootMargin: "0px 0px -6% 0px",
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el?.complete && el.naturalWidth > 0) setLoaded(true);
  }, [ref, src]);

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onLoad={() => setLoaded(true)}
      className={cn(
        "polaroid-emulsion h-full w-full object-cover",
        inView && loaded && "is-developed",
        className,
      )}
    />
  );
}
