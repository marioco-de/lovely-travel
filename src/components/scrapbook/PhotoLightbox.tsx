import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLightbox, type LightboxSlide } from "@/lib/album/lightbox";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useT } from "@/lib/i18n/locale";
import { Stamp } from "./Stamp";
import { Tape } from "./Tape";

function PoiStars({ rating }: { rating?: number }) {
  if (rating == null || rating <= 0) return null;
  const filled = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <p className="poi-stars">
      {"★".repeat(filled)}
      {"☆".repeat(5 - filled)}
      <span> {rating.toFixed(1)}</span>
    </p>
  );
}

function SlideBody({ slide }: { slide: LightboxSlide }) {
  if (slide.kind === "photo") {
    return (
      <>
        <div className="lightbox-print">
          <img src={slide.src} alt={slide.alt} />
        </div>
        <figcaption className="lightbox-caption">
          {slide.place ? <p className="place-type font-typewriter text-place text-lagoon-deep">— {slide.place} —</p> : null}
          {slide.caption ? <p className="mt-1 font-script text-caption text-ink">{slide.caption}</p> : null}
        </figcaption>
      </>
    );
  }
  if (slide.kind === "note") {
    return (
      <div className={cn("write-paper lightbox-note", `write-paper--${slide.paper}`)}>
        <p className="write-paper-text text-left font-script text-caption leading-relaxed text-ink">{slide.body}</p>
      </div>
    );
  }
  if (slide.kind === "poi") {
    return (
      <>
        <div className={cn("poi-card lightbox-poi", `poi-card--${slide.skin}`, `poi-card--s${slide.size}`)}>
          <p className="poi-name place-type font-typewriter text-place text-lagoon-deep">{slide.name}</p>
          {slide.size >= 2 && slide.category ? (
            <p className="poi-cat font-display text-kicker tracking-widest text-ink-soft uppercase">{slide.category}</p>
          ) : null}
          {slide.size >= 2 ? <PoiStars rating={slide.rating} /> : null}
          {slide.size >= 3 && slide.photoUrl ? <img src={slide.photoUrl} alt="" className="poi-photo" /> : null}
        </div>
        {slide.caption ? (
          <figcaption className="lightbox-caption">
            <p className="font-script text-caption text-ink">{slide.caption}</p>
          </figcaption>
        ) : null}
      </>
    );
  }
  return (
    <div className="lightbox-place">
      {slide.place ? <p className="place-type font-typewriter text-day text-lagoon-deep">— {slide.place} —</p> : null}
      {slide.caption ? <p className="mt-2 font-script text-caption leading-snug text-ink">{slide.caption}</p> : null}
    </div>
  );
}

export function PhotoLightbox() {
  const t = useT();
  const slides = useLightbox((s) => s.slides);
  const index = useLightbox((s) => s.index);
  const close = useLightbox((s) => s.close);
  const next = useLightbox((s) => s.next);
  const prev = useLightbox((s) => s.prev);
  const reduced = usePrefersReducedMotion();
  const start = useRef({ x: 0, y: 0 });
  const slide = slides[index];
  const many = slides.length > 1;

  useEffect(() => {
    if (!slide) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [slide, close, next, prev]);

  if (!slide) return null;

  function onPointerDown(event: React.PointerEvent) {
    start.current = { x: event.clientX, y: event.clientY };
  }
  function onPointerUp(event: React.PointerEvent) {
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) next();
    else prev();
  }

  const label =
    slide.kind === "photo" ? slide.place || t("ui.lightbox") : slide.kind === "poi" ? slide.name : t("ui.lightbox");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="lightbox-scrim"
      onClick={close}
    >
      {many ? (
        <button type="button" className="lightbox-nav lightbox-nav--prev" aria-label={t("ui.prev")} onClick={(event) => { event.stopPropagation(); prev(); }}>
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
      ) : null}
      <figure
        className={reduced ? "lightbox-mat" : "lightbox-mat lightbox-mat--in"}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <Tape variant="airmail" rotation={-12} className="-top-3 left-[18%] w-36 md:w-44" />
        <button type="button" onClick={close} aria-label={t("ui.close")} className="lightbox-close">
          <X size={18} strokeWidth={2.2} />
        </button>
        <SlideBody slide={slide} />
        <Stamp
          labelKey="stamp.airmail"
          variant="postal"
          rotation={8}
          className="pointer-events-none absolute -right-2 -bottom-3 hidden sm:grid"
        />
      </figure>
      {many ? (
        <button type="button" className="lightbox-nav lightbox-nav--next" aria-label={t("ui.next")} onClick={(event) => { event.stopPropagation(); next(); }}>
          <ChevronRight size={22} strokeWidth={2.2} />
        </button>
      ) : null}
    </div>
  );
}
