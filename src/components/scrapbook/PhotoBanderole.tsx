import { cn } from "@/lib/utils";

type PhotoBanderoleProps = {
  className?: string;
};

const EDGES = ["top", "right", "bottom", "left"] as const;

export function PhotoBanderole({ className }: PhotoBanderoleProps) {
  return (
    <div className={cn("photo-banderole", className)} aria-hidden="true">
      {EDGES.map((edge) => (
        <span key={edge} className={cn("banderole-edge", `banderole-edge--${edge}`)} />
      ))}
      <img src="/corners/scallop.png" alt="" draggable={false} className="photo-corners-sheet" />
    </div>
  );
}
