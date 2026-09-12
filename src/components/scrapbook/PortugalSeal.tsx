import { useId, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/use-in-view";

type PortugalSealProps = {
  className?: string;
  rotation?: number;
  delayMs?: number;
};

export function PortugalSeal({ className, rotation = -9, delayMs = 0 }: PortugalSealProps) {
  const uid = useId();
  const { ref, inView } = useInView<HTMLDivElement>();
  const [settled, setSettled] = useState(false);
  const rimId = `${uid}-rim`;

  return (
    <div
      ref={ref}
      data-stamp="portugal-seal"
      aria-hidden="true"
      onAnimationEnd={() => setSettled(true)}
      className={cn("stamp-mark portugal-seal", inView && "is-in", settled && "is-settled", className)}
      style={{ "--stamp-rot": `${rotation}deg`, animationDelay: inView ? `${delayMs}ms` : undefined } as CSSProperties}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <path
            id={rimId}
            d="M50 50 m0 -39.2 a39.2 39.2 0 1 1 0 78.4 a39.2 39.2 0 1 1 0 -78.4"
          />
        </defs>
        <circle cx="50" cy="50" r="47.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="50" cy="50" r="43.2" fill="none" stroke="currentColor" strokeWidth="0.55" />
        <circle cx="50" cy="50" r="35.6" fill="none" stroke="currentColor" strokeWidth="0.7" />
        <text
          fill="currentColor"
          fontSize="5.7"
          fontFamily="Fraunces, Times New Roman, serif"
          fontWeight="700"
          letterSpacing="1.7"
        >
          <textPath href={`#${rimId}`}>PORTVGAL · CORREIOS · PORTVGAL · CORREIOS ·</textPath>
        </text>

        <g fill="none" stroke="currentColor" strokeWidth="0.85" transform="rotate(-16 50 50)">
          <circle cx="50" cy="50" r="21.5" />
          <ellipse cx="50" cy="50" rx="21.5" ry="7.4" />
          <ellipse cx="50" cy="50" rx="7.4" ry="21.5" />
          <path d="M50 27.2v45.6" />
          <path d="M29.6 46.2h40.8" />
          <circle cx="50" cy="27.2" r="1.35" fill="currentColor" stroke="none" />
          <circle cx="50" cy="72.8" r="1.35" fill="currentColor" stroke="none" />
        </g>

        <g fill="none" stroke="currentColor" strokeLinejoin="round">
          <path
            d="M38 39.2h24v8.2c0 7.4-8.2 13.6-12 16.2-3.8-2.6-12-8.8-12-16.2z"
            strokeWidth="1.15"
          />
          <path
            d="M40.2 40.8h19.6v7c0 6.2-6.8 11.4-9.8 13.6-3-2.2-9.8-7.4-9.8-13.6z"
            strokeWidth="0.55"
          />
          <g strokeWidth="0.7">
            <rect x="47.3" y="42.4" width="5.4" height="6.4" rx="0.6" />
            <rect x="41.6" y="47.2" width="5.4" height="6.4" rx="0.6" />
            <rect x="47.3" y="50.4" width="5.4" height="6.4" rx="0.6" />
            <rect x="53" y="47.2" width="5.4" height="6.4" rx="0.6" />
            <rect x="47.3" y="46.4" width="5.4" height="6.4" rx="0.6" />
          </g>
          <g fill="currentColor" stroke="none">
            <circle cx="50" cy="45.2" r="0.55" />
            <circle cx="48.8" cy="44.2" r="0.45" />
            <circle cx="51.2" cy="44.2" r="0.45" />
            <circle cx="48.8" cy="46.4" r="0.45" />
            <circle cx="51.2" cy="46.4" r="0.45" />
          </g>
          <g strokeWidth="0.7">
            <path d="M41 38.4h3.2l-.6 2.1h-2z" />
            <path d="M46.4 38.4h3.2l-.6 2.1h-2z" />
            <path d="M51.8 38.4h3.2l-.6 2.1h-2z" />
            <path d="M57.2 38.4h3.2l-.6 2.1h-2z" />
            <path d="M37.6 46.2h2.2l-.5 2.2h-1.2z" />
            <path d="M60.2 46.2h2.2l-.5 2.2h-1.2z" />
            <path d="M47.6 62.2h4.6l-1 2.2h-2.6z" />
          </g>
        </g>
      </svg>
    </div>
  );
}
