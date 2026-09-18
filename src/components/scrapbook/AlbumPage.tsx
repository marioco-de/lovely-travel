import { useEffect, useState } from "react";
import { COVER_ID } from "@/lib/album/layout";
import { albumSettingsHref } from "@/lib/album/featured";
import { useAlbum } from "@/lib/album/store";
import { LocaleHydrator, useT } from "@/lib/i18n/locale";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { AlbumMenu } from "./AlbumMenu";
import { ConfirmDialog } from "./ConfirmDialog";
import { DayBlock } from "./DayBlock";
import { EditGear, GearAction } from "./EditGear";
import { HeroCollage } from "./HeroCollage";
import { MapInsert } from "./MapInsert";
import { PhotoLightbox } from "./PhotoLightbox";

type AlbumPageProps = {
  mode?: "demo" | "view" | "edit";
  publicHash?: string;
  editHash?: string;
};

export function AlbumPage({ mode = "demo", publicHash, editHash: routeEditHash }: AlbumPageProps) {
  const t = useT();
  const reduced = usePrefersReducedMotion();
  const days = useAlbum((s) => s.layout.days).filter((day) => day.id !== COVER_ID);
  const ready = useAlbum((s) => s.ready);
  const canEdit = useAlbum((s) => s.canEdit);
  const editHash = useAlbum((s) => s.editHash) ?? routeEditHash;
  const storePublicHash = useAlbum((s) => s.publicHash);
  const googleAlbumUrl = useAlbum((s) => s.googleAlbumUrl);
  const bindTrip = useAlbum((s) => s.bindTrip);
  const enableEdit = useAlbum((s) => s.enableEdit);
  const lockEdit = useAlbum((s) => s.lockEdit);
  const addDay = useAlbum((s) => s.addDay);
  const reset = useAlbum((s) => s.reset);
  const setPlaceEditId = useAlbum((s) => s.setPlaceEditId);
  const [activeId, setActiveId] = useState<string | null>(days[0]?.id ?? null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    void bindTrip({ mode, publicHash, editHash: routeEditHash });
  }, [bindTrip, mode, publicHash, routeEditHash]);

  useEffect(() => {
    if (mode === "edit") enableEdit();
  }, [mode, enableEdit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const flag = new URLSearchParams(window.location.search).get("google");
    if (flag !== "1" || !routeEditHash) return;
    window.history.replaceState({}, "", window.location.pathname);
    void import("@/lib/album/google-client").then(({ runGoogleImport }) => runGoogleImport(routeEditHash));
  }, [routeEditHash]);

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
    if (canEdit) setPlaceEditId(id);
    const el = document.getElementById(`day-${id}`);
    el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  function settingsHref() {
    return albumSettingsHref(publicHash || storePublicHash, editHash);
  }

  return (
    <div className="album-sheet min-h-svh w-full overflow-visible">
      <LocaleHydrator />
      <a href="#route-map" className="skip-link font-display text-sm">
        {t("ui.skipToMap")}
      </a>

      <AlbumMenu onEdit={enableEdit} onSave={lockEdit} />

      <HeroCollage />
      {canEdit || googleAlbumUrl ? (
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 pb-2 md:px-10 lg:px-16">
          {googleAlbumUrl ? (
            <a href={googleAlbumUrl} className="font-typewriter text-kicker tracking-wide text-lagoon-deep underline" target="_blank" rel="noreferrer">
              {t("ui.googleAlbum")}
            </a>
          ) : null}
          {canEdit ? (
            <EditGear label={t("ui.albumSettings")}>
              {(close) => (
                <>
                  {settingsHref() ? (
                    <GearAction href={settingsHref()}>{t("ui.settings")}</GearAction>
                  ) : null}
                  <GearAction
                    onClick={() => {
                      addDay();
                      close();
                    }}
                  >
                    {t("ui.addDay")}
                  </GearAction>
                  <GearAction
                    danger
                    onClick={() => {
                      close();
                      setConfirmReset(true);
                    }}
                  >
                    {t("ui.resetAlbum")}
                  </GearAction>
                </>
              )}
            </EditGear>
          ) : null}
        </div>
      ) : null}
      <MapInsert activeId={activeId} onSelect={openDay} />

      <section className="w-full overflow-visible">
        <div className="days-rail">
          {ready
            ? days.map((day, index) => (
                <DayBlock
                  key={day.id}
                  day={day}
                  index={index}
                  active={activeId === day.id}
                  onSelect={openDay}
                />
              ))
            : null}
        </div>
      </section>

      <PhotoLightbox />
      <ConfirmDialog
        open={confirmReset}
        title={t("ui.confirmRemove")}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          void reset();
        }}
      />
    </div>
  );
}
