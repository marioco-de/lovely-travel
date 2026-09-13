import { useEffect, useState } from "react";
import { useAlbum } from "@/lib/album/store";
import { LocaleHydrator, useT } from "@/lib/i18n/locale";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { DayBlock } from "./DayBlock";
import { EditMenu } from "./EditMenu";
import { EditUnlock } from "./EditUnlock";
import { HeroCollage } from "./HeroCollage";
import { LanguageToggle } from "./LanguageToggle";
import { MapInsert } from "./MapInsert";
import { NewAlbum } from "./NewAlbum";
import { ShareStamp } from "./ShareStamp";

type AlbumPageProps = {
  mode?: "demo" | "view" | "edit";
  publicHash?: string;
  editHash?: string;
};

export function AlbumPage({ mode = "demo", publicHash, editHash }: AlbumPageProps) {
  const t = useT();
  const reduced = usePrefersReducedMotion();
  const days = useAlbum((s) => s.layout.days);
  const canEdit = useAlbum((s) => s.canEdit);
  const bindTrip = useAlbum((s) => s.bindTrip);
  const [activeId, setActiveId] = useState<string | null>(days[0]?.id ?? null);

  useEffect(() => {
    void bindTrip({ mode, publicHash, editHash });
  }, [bindTrip, mode, publicHash, editHash]);

  useEffect(() => {
    document.title = t("meta.title");
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", t("meta.description"));
  }, [t]);

  useEffect(() => {
    if (!days[0]) return;
    setActiveId((current) => (days.some((day) => day.id === current) ? current : (days[0]?.id ?? null)));
  }, [days]);

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
  }, [days]);

  function openDay(id: string) {
    setActiveId(id);
    const el = document.getElementById(`day-${id}`);
    el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  return (
    <div className="album-sheet min-h-svh w-full overflow-visible">
      <LocaleHydrator />
      <a href="#route-map" className="skip-link font-display text-sm">
        {t("ui.skipToMap")}
      </a>

      <div className="pointer-events-none sticky top-0 z-30 flex justify-end px-3 pt-3 md:px-6">
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <LanguageToggle />
          <ShareStamp />
          {canEdit ? <EditMenu /> : null}
        </div>
      </div>

      <HeroCollage />
      <MapInsert activeId={activeId} onSelect={openDay} />

      <section className="w-full overflow-visible">
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

      <footer className="mx-auto flex w-full max-w-7xl flex-col items-start gap-4 px-4 py-12 md:flex-row md:items-center md:justify-between md:px-10 lg:px-16">
        {mode === "demo" ? <NewAlbum /> : <span />}
        {!canEdit && publicHash ? <EditUnlock publicHash={publicHash} /> : null}
      </footer>
    </div>
  );
}
