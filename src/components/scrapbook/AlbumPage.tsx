import { useEffect, useState } from "react";
import { days } from "@/lib/album/data";
import { LocaleHydrator, useT } from "@/lib/i18n/locale";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { AlbumEditor } from "./AlbumEditor";
import { DayBlock } from "./DayBlock";
import { HeroCollage } from "./HeroCollage";
import { LanguageToggle } from "./LanguageToggle";
import { MapInsert } from "./MapInsert";
import { ShareStamp } from "./ShareStamp";
import { Stamp } from "./Stamp";

export function AlbumPage() {
  const t = useT();
  const reduced = usePrefersReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(days[0]?.id ?? null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    document.title = t("meta.title");
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", t("meta.description"));
  }, [t]);

  useEffect(() => {
    const sections = days
      .map((day) => document.getElementById(`day-${day.id}`))
      .filter((el): el is HTMLElement => Boolean(el));
    if (sections.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.getAttribute("data-day");
        if (id) setActiveId(id);
      },
      { threshold: [0.25, 0.45], rootMargin: "-18% 0px -42% 0px" },
    );
    for (const el of sections) io.observe(el);
    return () => io.disconnect();
  }, []);

  function openDay(id: string) {
    setActiveId(id);
    const el = document.getElementById(`day-${id}`);
    el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  return (
    <div className="album-sheet min-h-svh">
      <LocaleHydrator />
      <a href="#route-map" className="skip-link font-display text-sm">
        {t("ui.skipToMap")}
      </a>

      <div className="pointer-events-none sticky top-0 z-30 flex justify-end px-3 pt-3 md:px-6">
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <LanguageToggle />
          <Stamp
            as="button"
            variant="rect"
            labelKey="ui.edit"
            rotation={-3}
            pressed={editing}
            onClick={() => setEditing(true)}
            className="px-3 py-2"
          />
          <ShareStamp />
        </div>
      </div>

      <HeroCollage />
      <MapInsert activeId={activeId} onSelect={openDay} />

      <section className="mx-auto w-full max-w-5xl px-4 pb-8 md:px-8 md:pb-16">
        <div className="days-rail">
          {days.map((day, index) => (
            <DayBlock
              key={day.id}
              day={day}
              index={index}
              active={activeId === day.id}
              onSelect={openDay}
            />
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-12 md:flex-row md:items-center md:justify-between md:px-8">
        <p className="max-w-md font-script text-caption text-ink-soft">{t("footer.colophon")}</p>
        <Stamp labelKey="stamp.passport" variant="round" rotation={-6} />
      </footer>

      <AlbumEditor open={editing} onClose={() => setEditing(false)} />
    </div>
  );
}
