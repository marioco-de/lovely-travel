import { heroPhotos } from "@/lib/album/data";
import { useT } from "@/lib/i18n/locale";
import { Frame } from "./Frame";
import { PaperLayer } from "./PaperLayer";
import { PhotoCaption } from "./PhotoCaption";
import { Polaroid } from "./Polaroid";
import { Pearl } from "./Pearl";
import { SlideIn } from "./SlideIn";
import { Stamp } from "./Stamp";

export function HeroCollage() {
  const t = useT();

  return (
    <section className="relative mx-auto w-full max-w-7xl px-4 pt-4 pb-8 md:px-10 md:pt-6 md:pb-16 lg:px-16">
      <header className="relative mb-8 max-w-xl pr-28 md:mb-10 md:pr-36">
        <p className="font-display text-kicker tracking-widest text-ink-soft uppercase">
          {t("album.kicker")}
        </p>
        <h1 className="mt-2 font-display text-title leading-tight font-semibold tracking-tight text-ink">
          {t("album.title")}
        </h1>
        <p className="place-type mt-3 font-typewriter text-place text-lagoon-deep">{t("album.year")}</p>
        <Stamp
          labelKey="stamp.azores"
          variant="round"
          rotation={12}
          className="absolute top-0 right-0 hidden md:grid"
          delayMs={180}
        />
      </header>

      <div className="relative flex flex-col">
        <div className="relative w-[92%] max-w-3xl self-start md:w-[78%]">
          <div className="photo-block">
            <SlideIn from="left">
              <Frame photo={heroPhotos.lagoon} priority showCaption={false} />
            </SlideIn>
            <PhotoCaption
              as="div"
              place={t("hero.place")}
              caption={t("hero.caption")}
              className="max-w-[13rem] sm:max-w-xs"
            />
          </div>
          <SlideIn
            from="right"
            delayMs={90}
            className="z-10 mt-5 ml-auto w-[72%] max-w-xs md:absolute md:top-14 md:right-[-10%] md:mt-0 md:w-[38%] md:max-w-sm"
          >
            <Polaroid photo={heroPhotos.courtyard} />
          </SlideIn>
        </div>

        <SlideIn
          from="left"
          delayMs={140}
          className="relative z-10 mt-10 w-[72%] max-w-sm self-start md:mt-12 md:ml-6 md:w-[38%] md:max-w-sm"
        >
          <div className="paper-patch relative px-5 py-5">
            <PaperLayer variant="sardinhas" />
            <div className="relative z-10">
              <Frame photo={heroPhotos.fruit} />
            </div>
          </div>
        </SlideIn>

        <Stamp
          labelKey="stamp.airmail"
          variant="postal"
          rotation={-14}
          delayMs={220}
          className="absolute top-[22%] right-4 z-20 hidden sm:block"
        />
        <Stamp
          labelKey="stamp.date"
          variant="rect"
          rotation={8}
          delayMs={280}
          className="absolute top-[18%] left-[38%] z-20 hidden md:block"
        />
        <Pearl size="lg" className="absolute top-1/4 right-1/4 hidden md:inline-block" />
        <Pearl size="md" className="absolute bottom-6 left-6" />
      </div>
    </section>
  );
}
