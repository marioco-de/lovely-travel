import { heroPhotos } from "@/lib/album/data";
import { useT } from "@/lib/i18n/locale";
import { Frame } from "./Frame";
import { PhotoCaption } from "./PhotoCaption";
import { Polaroid } from "./Polaroid";
import { Pearl } from "./Pearl";
import { SlideIn } from "./SlideIn";
import { Stamp } from "./Stamp";
import { useAlbum } from "@/lib/album/store";

type HeroCollageProps = {
  onEditTitle?: () => void;
};

export function HeroCollage({ onEditTitle }: HeroCollageProps) {
  const t = useT();
  const canEdit = useAlbum((s) => s.canEdit);

  return (
    <section className="relative mx-auto w-full max-w-7xl overflow-x-clip px-4 pt-4 pb-8 md:px-10 md:pt-6 md:pb-16 lg:px-16">
      <header className="relative mb-8 max-w-xl pr-28 md:mb-10 md:pr-36">
        <button
          type="button"
          className="block w-full text-left"
          onClick={() => canEdit && onEditTitle?.()}
          disabled={!canEdit}
        >
          <p className="font-display text-kicker tracking-widest text-ink-soft uppercase">
            {t("album.kicker")}
          </p>
          <h1 className="mt-2 font-display text-title leading-tight font-semibold tracking-tight text-ink">
            {t("album.title")}
          </h1>
          <p className="place-type mt-3 font-typewriter text-place text-lagoon-deep">{t("album.year")}</p>
        </button>
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
              <Frame
                photo={heroPhotos.lagoon}
                priority
                showCaption={false}
                stamp={{ labelKey: "stamp.airmail", corner: "tr", variant: "postal", rotation: -12 }}
              />
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
            className="z-10 mt-5 ml-auto w-[72%] max-w-xs md:absolute md:top-14 md:right-2 md:mt-0 md:w-[38%] md:max-w-sm"
          >
            <Polaroid photo={heroPhotos.courtyard} />
          </SlideIn>
        </div>

        <SlideIn
          from="left"
          delayMs={140}
          className="relative z-10 mt-10 w-[72%] max-w-sm self-start md:mt-12 md:ml-6 md:w-[38%] md:max-w-sm"
        >
          <Frame
            photo={heroPhotos.fruit}
            stamp={{ labelKey: "stamp.date", corner: "bl", variant: "rect", rotation: 8 }}
          />
        </SlideIn>

        <Pearl size="lg" className="absolute top-1/4 right-1/4 hidden md:inline-block" />
        <Pearl size="md" className="absolute bottom-6 left-6" />
      </div>
    </section>
  );
}
