import { useEffect } from "react";
import { COVER_ID, rotateFor } from "@/lib/album/layout";
import { pairText, useAlbum, usePhotoSrc } from "@/lib/album/store";
import { useLocale, useT } from "@/lib/i18n/locale";
import { Frame } from "./Frame";
import { PaperLayer } from "./PaperLayer";
import { AlbumMenu } from "./AlbumMenu";

type DayAlbumPageProps = {
  publicHash: string;
  dayId: string;
};

export function DayAlbumPage({ publicHash, dayId }: DayAlbumPageProps) {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const bindTrip = useAlbum((s) => s.bindTrip);
  const day = useAlbum((s) => s.layout.days.find((item) => item.id === dayId));
  const dayAlbums = useAlbum((s) => s.dayAlbums);
  const index = useAlbum((s) => s.layout.days.filter((item) => item.id !== COVER_ID).findIndex((item) => item.id === dayId));

  useEffect(() => {
    void bindTrip({ mode: "view", publicHash });
  }, [bindTrip, publicHash]);

  const selected = dayAlbums[dayId]?.selected?.length
    ? dayAlbums[dayId]!.selected
    : (day?.blocks ?? []).flatMap((block) => block.photoIds);
  const title = day ? pairText(day.label, locale) || pairText(day.place, locale) : t("ui.dayAlbum");

  return (
    <div className="album-sheet min-h-svh w-full">
      <AlbumMenu />
      <article className={cnWash(day?.paper)} data-paper={day?.paper}>
        <PaperLayer variant={day?.paper ?? "azulejos"} />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-12 md:px-10 md:py-16">
          <p className="font-display text-kicker tracking-widest text-ink-soft uppercase">
            {t("ui.dayAlbum")}
            {index >= 0 ? ` · ${index + 1}` : ""}
          </p>
          <h1 className="place-type mt-2 font-typewriter text-day text-lagoon-deep">{title}</h1>
          <a href={publicLink(publicHash)} className="day-full-link mt-4 inline-block">
            ← {t("album.title")}
          </a>
          <div className="mt-10 columns-1 gap-6 sm:columns-2">
            {selected.map((id, photoIndex) => (
              <DayPhoto key={id} id={id} index={photoIndex} />
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}

function publicLink(hash: string) {
  if (hash === "portugal-urlaub") return "/portugal-urlaub";
  if (hash === "portugal-mit-michael") return "/portugal-mit-michael";
  return `/t/${hash}`;
}

function cnWash(paper?: string) {
  return `day-wash relative isolate w-full py-4 ${paper ? `day-wash--${paper}` : ""}`;
}

function DayPhoto({ id, index }: { id: string; index: number }) {
  const src = usePhotoSrc(id);
  if (!src) return null;
  return (
    <div className="mb-6 break-inside-avoid">
      <Frame
        photo={{
          id,
          src,
          alt: "",
          place: "",
          caption: "",
          kind: index % 3 === 0 ? "portrait" : "landscape",
          rotate: rotateFor(id),
        }}
      />
    </div>
  );
}
