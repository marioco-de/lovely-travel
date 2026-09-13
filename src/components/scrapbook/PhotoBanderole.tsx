import { cn } from "@/lib/utils";

type PhotoBanderoleProps = {
  className?: string;
};

const CORNERS = ["tl", "tr", "bl", "br"] as const;
const EDGES = ["top", "right", "bottom", "left"] as const;

export function PhotoBanderole({ className }: PhotoBanderoleProps) {
  return (
    <div className={cn("photo-banderole", className)} aria-hidden="true">
      {EDGES.map((edge) => (
        <span key={edge} className={cn("banderole-edge", `banderole-edge--${edge}`)} />
      ))}
      {CORNERS.map((corner) => (
        <span key={corner} className={cn("photo-corner", `photo-corner--${corner}`)}>
          <img src="/patterns/corner-scalloped.svg" alt="" draggable={false} />
        </span>
      ))}
    </div>
  );
}
