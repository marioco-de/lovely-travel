import { useEffect } from "react";
import { X } from "lucide-react";
import { useLightbox } from "@/lib/album/lightbox";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useT } from "@/lib/i18n/locale";
import { Stamp } from "./Stamp";
import { Tape } from "./Tape";

export function PhotoLightbox() {
  const t = useT();
  const item = useLightbox((s) => s.item);
  const close = useLightbox((s) => s.close);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!item) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [item, close]);

  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.place || t("ui.lightbox")}
      className="lightbox-scrim"
      onClick={close}
    >
      <figure
        className={reduced ? "lightbox-mat" : "lightbox-mat lightbox-mat--in"}
        onClick={(event) => event.stopPropagation()}
      >
        <Tape variant="airmail" rotation={-12} className="-top-3 left-[18%] w-36 md:w-44" />
        <button
          type="button"
          onClick={close}
          aria-label={t("ui.close")}
          className="lightbox-close"
        >
          <X size={18} strokeWidth={2.2} />
        </button>
        <div className="lightbox-print">
          <img src={item.src} alt={item.alt} />
        </div>
        <figcaption className="lightbox-caption">
          {item.place ? <p className="place-type font-typewriter text-place text-lagoon-deep">— {item.place} —</p> : null}
          {item.caption ? <p className="mt-1 font-script text-caption text-ink">{item.caption}</p> : null}
        </figcaption>
        <Stamp
          labelKey="stamp.airmail"
          variant="postal"
          rotation={8}
          className="pointer-events-none absolute -right-2 -bottom-3 hidden sm:grid"
        />
      </figure>
    </div>
  );
}
