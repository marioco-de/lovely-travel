import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/use-in-view";
import type { SlideFrom } from "@/lib/album/data";

type SlideInProps = {
  from: SlideFrom;
  className?: string;
  delayMs?: number;
  children: ReactNode;
};

export function SlideIn({ from, className, delayMs = 0, children }: SlideInProps) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn("slide-piece", from === "left" ? "from-left" : "from-right", inView && "is-in", className)}
      style={{ transitionDelay: inView ? `${delayMs}ms` : undefined }}
    >
      {children}
    </div>
  );
}
