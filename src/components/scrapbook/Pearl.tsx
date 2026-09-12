import { cn } from "@/lib/utils";

type PearlSize = "sm" | "md" | "lg";

const sizes: Record<PearlSize, string> = {
  sm: "size-2.5",
  md: "size-3.5",
  lg: "size-4.5",
};

type PearlProps = {
  size?: PearlSize;
  className?: string;
};

export function Pearl({ size = "md", className }: PearlProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("pearl inline-block rounded-full", sizes[size], className)}
    />
  );
}
