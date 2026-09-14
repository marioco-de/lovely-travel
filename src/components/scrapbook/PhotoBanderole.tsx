import { cn } from "@/lib/utils";

type PhotoBanderoleProps = {
  className?: string;
};

export function PhotoBanderole({ className }: PhotoBanderoleProps) {
  return <div className={cn("photo-banderole", className)} aria-hidden="true" />;
}
