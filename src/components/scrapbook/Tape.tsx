import { cn } from "@/lib/utils";

type TapeProps = {
  className?: string;
  rotation?: number;
  variant?: "kraft" | "plaid";
};

export function Tape({ className, rotation = 3, variant = "kraft" }: TapeProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("washi-tape", variant === "plaid" && "washi-tape--plaid", className)}
      style={{ rotate: `${rotation}deg` }}
    />
  );
}
