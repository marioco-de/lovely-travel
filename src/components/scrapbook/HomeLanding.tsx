import { useEffect } from "react";
import { heroPhotos } from "@/lib/album/data";
import { LocaleHydrator, useT } from "@/lib/i18n/locale";
import { AlbumMenu } from "./AlbumMenu";
import { Frame } from "./Frame";
import { NewAlbum } from "./NewAlbum";
import { PhotoLightbox } from "./PhotoLightbox";
import { Polaroid } from "./Polaroid";
import { SlideIn } from "./SlideIn";
import { Stamp } from "./Stamp";
import { Tape } from "./Tape";

export function HomeLanding() {
  const t = useT();

  useEffect(() => {
    document.title = t("home.mark");
  }, [t]);

  return (
    <div className="album-sheet min-h-svh w-full overflow-visible">
      <LocaleHydrator />
      <AlbumMenu variant="home" />

      <section className="relative mx-auto w-full max-w-7xl overflow-visible px-4 pt-6 pb-10 md:px-10 md:pt-10 md:pb-16 lg:px-16">
        <Stamp
          labelKey="stamp.airmail"
          variant="postal"
          rotation={-10}
          className="pointer-events-none absolute top-8 right-8 hidden md:grid"
          delayMs={160}
        />
        <p className="font-display text-kicker tracking-widest text-ink-soft uppercase">{t("home.kicker")}</p>
        <h1 className="country-locator-name mt-3 text-left text-[clamp(3.2rem,8vw,6.4rem)]">{t("home.mark")}</h1>
        <p className="mt-4 max-w-xl font-display text-day leading-tight font-semibold text-ink">{t("home.title")}</p>
        <p className="mt-4 max-w-lg font-script text-caption text-ink-soft">{t("home.lead")}</p>
        <div className="mt-8">
          <NewAlbum />
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-7xl overflow-visible px-4 pb-10 md:px-10 lg:px-16">
        <p className="font-display text-kicker tracking-widest text-ink-soft uppercase">{t("home.featuredKicker")}</p>
        <h2 className="mt-2 font-typewriter text-day text-lagoon-deep">{t("home.featured")}</h2>
        <p className="mt-1 font-script text-caption text-ink-soft">{t("home.featuredLine")}</p>
        <p className="mt-1 font-typewriter text-kicker tracking-wide text-ink">{t("home.featuredDays")}</p>
        <a href="/portugal-urlaub" className="album-btn mt-4 inline-flex">
          {t("home.featuredOpen")}
        </a>
      </section>

      <section className="relative mx-auto w-full max-w-7xl overflow-visible px-4 pb-16 md:px-10 lg:px-16">
        <div className="relative w-[88%] max-w-2xl md:w-[58%]">
          <SlideIn from="left">
            <Frame photo={heroPhotos.lagoon} showCaption={false} priority />
          </SlideIn>
          <Tape variant="airmail" rotation={-18} className="-top-3 left-[18%] w-36 md:w-44" />
        </div>
        <div className="relative z-10 mt-[-18%] ml-auto w-[58%] max-w-sm md:mt-[-22%] md:w-[32%]">
          <SlideIn from="right" delayMs={90}>
            <Polaroid photo={heroPhotos.courtyard} />
          </SlideIn>
        </div>
      </section>
      <PhotoLightbox />
    </div>
  );
}
