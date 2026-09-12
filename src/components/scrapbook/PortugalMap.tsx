import { lazy, Suspense, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const PortugalLeaflet = lazy(() => import("./PortugalLeaflet"));

type PortugalMapProps = {
  variant?: "hero" | "aside";
  activeId: string | null;
  focusId?: string | null;
  onSelect: (id: string) => void;
  className?: string;
};

export function PortugalMap(props: PortugalMapProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const shell = cn(
    "portugal-map",
    props.variant === "hero" && "portugal-map--hero",
    props.variant === "aside" && "portugal-map--aside portugal-map--flush",
    props.className,
  );

  if (!ready) return <div className={shell} aria-hidden="true" />;

  return (
    <Suspense fallback={<div className={shell} aria-hidden="true" />}>
      <PortugalLeaflet {...props} />
    </Suspense>
  );
}
