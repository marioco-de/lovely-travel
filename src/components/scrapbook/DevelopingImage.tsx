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
  const { ref, inView } = useInView<HTMLDivElement>({
    threshold: 0.12,
    rootMargin: "0px 0px -6% 0px",
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  useEffect(() => {
    const img = ref.current?.querySelector("img");
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, [ref, src]);

  const developed = inView && loaded;

  return (
    <div ref={ref} className={cn("develop-stage", developed && "is-developed", className)}>
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        className="polaroid-emulsion h-full w-full object-cover"
      />
      <span className="develop-cast" aria-hidden="true" />
      <span className="develop-veil" aria-hidden="true" />
    </div>
  );
}
