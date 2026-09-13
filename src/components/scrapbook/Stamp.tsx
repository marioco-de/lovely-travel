import { useState, type ButtonHTMLAttributes, type CSSProperties, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/use-in-view";
import { useT } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";

type StampVariant = "round" | "rect" | "postal";

type StampProps = {
  labelKey?: MessageKey;
  label?: string;
  variant?: StampVariant;
  rotation?: number;
  className?: string;
  pressed?: boolean;
  delayMs?: number;
} & (
  | { as?: "div"; onClick?: never }
  | { as: "button"; onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"] }
);

function stampClass(
  variant: StampVariant,
  className: string | undefined,
  inView: boolean,
  settled: boolean,
  pressed: boolean | undefined,
  isButton: boolean,
) {
  return cn(
    "stamp-mark font-display text-center leading-none",
    inView && "is-in",
    settled && "is-settled",
    pressed && "is-active",
    variant === "round" &&
      "grid size-24 place-items-center rounded-full border-2 border-double border-current px-2 text-kicker font-semibold",
    variant === "rect" &&
      "border-2 border-double border-current px-3 py-2 text-kicker font-semibold",
    variant === "postal" &&
      "border-2 border-dashed border-current px-3 py-1.5 text-kicker font-semibold",
    isButton ? "min-h-11 min-w-11" : "pointer-events-none",
    className,
  );
}

export function Stamp(props: StampProps) {
  const {
    labelKey,
    label: labelText,
    variant = "rect",
    rotation = -8,
    className,
    pressed,
    delayMs = 0,
    as = "div",
  } = props;
  const t = useT();
  const { ref, inView } = useInView<HTMLElement>();
  const [settled, setSettled] = useState(false);
  const label = labelText || (labelKey ? t(labelKey) : "");
  const style = {
    "--stamp-rot": `${rotation}deg`,
    animationDelay: inView ? `${delayMs}ms` : undefined,
  } as CSSProperties;
  const cls = stampClass(variant, className, inView, settled, pressed, as === "button");

  if (as === "button") {
    return (
      <button
        ref={ref as RefObject<HTMLButtonElement>}
        type="button"
        onClick={props.onClick}
        aria-pressed={Boolean(pressed)}
        onAnimationEnd={() => setSettled(true)}
        className={cls}
        style={style}
      >
        {label}
      </button>
    );
  }

  return (
    <div
      ref={ref as RefObject<HTMLDivElement>}
      onAnimationEnd={() => setSettled(true)}
      className={cls}
      style={style}
    >
      {label}
    </div>
  );
}
