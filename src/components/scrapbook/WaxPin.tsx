import { cn } from "@/lib/utils";

type WaxPinProps = {
  active?: boolean;
  className?: string;
};

export function WaxPin({ active = false, className }: WaxPinProps) {
  return (
    <span className={cn("wax-pin inline-flex flex-col items-center", className)} aria-hidden="true">
      <span className={cn("wax-seal", active && "is-active")}>
        <span className="wax-impress" />
      </span>
      <span className={cn("wax-needle", active && "is-active")} />
    </span>
  );
}
