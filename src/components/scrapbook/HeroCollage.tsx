import { heroPhotos } from "@/lib/album/data";
import { useAlbum } from "@/lib/album/store";
import { useLocale, useT } from "@/lib/i18n/locale";
import { Frame } from "./Frame";
import { LiveText } from "./LiveText";
import { PhotoCaption } from "./PhotoCaption";
import { Polaroid } from "./Polaroid";
import { SlideIn } from "./SlideIn";
import { Stamp } from "./Stamp";

export function HeroCollage() {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const canEdit = useAlbum((s) => s.canEdit);
  const setText = useAlbum((s) => s.setText);

  return (
    <section className="relative mx-auto w-full max-w-7xl overflow-visible px-4 pt-4 pb-8 md:px-10 md:pt-6 md:pb-16 lg:px-16">
      <header className="relative mb-8 max-w-xl pr-28 md:mb-10 md:pr-36">
        <div className="block w-full text-left">
          {canEdit ? (
            <>
              <LiveText
                value={t("album.kicker")}
                onChange={(value) => setText(locale, "album.kicker", value)}
                placeholder="Lorem ipsum"
                className="font-display text-kicker tracking-widest text-ink-soft uppercase"
              />
              <LiveText
                tag="h1"
                value={t("album.title")}
                onChange={(value) => setText(locale, "album.title", value)}
                placeholder="Lorem ipsum"
                className="mt-2 font-display text-title leading-tight font-semibold tracking-tight text-ink"
              />
              <LiveText
                value={t("album.year")}
                onChange={(value) => setText(locale, "album.year", value)}
                placeholder="Lorem ipsum"
                className="place-type mt-3 font-typewriter text-place text-lagoon-deep"
              />
            </>
          ) : (
            <>
              <p className="font-display text-kicker tracking-widest text-ink-soft uppercase">{t("album.kicker")}</p>
              <h1 className="mt-2 font-display text-title leading-tight font-semibold tracking-tight text-ink">
                {t("album.title")}
              </h1>
              <p className="place-type mt-3 font-typewriter text-place text-lagoon-deep">{t("album.year")}</p>
            </>
          )}
        </div>
        <Stamp
          labelKey="stamp.azores"
          variant="round"
          rotation={12}
          className="absolute top-0 right-0 hidden md:grid"
          delayMs={180}
        />
      </header>

      <div className="relative flex flex-col">
        <div className="relative">
          <div className="relative w-[92%] max-w-3xl md:w-[72%]">
            <div className="photo-block">
              <SlideIn from="left">
                <Frame
                  photo={heroPhotos.lagoon}
                  priority
                  showCaption={false}
                  stamp={{ labelKey: "stamp.airmail", corner: "tr", variant: "postal", rotation: -12 }}
                  onPlaceChange={(value) => setText(locale, "hero.place", value)}
                  onCaptionChange={(value) => setText(locale, "hero.caption", value)}
                />
              </SlideIn>
              <PhotoCaption
                as="div"
                place={t("hero.place")}
                caption={t("hero.caption")}
                className="max-w-[13rem] sm:max-w-xs"
                onPlaceChange={(value) => setText(locale, "hero.place", value)}
                onCaptionChange={(value) => setText(locale, "hero.caption", value)}
              />
            </div>
          </div>
          <SlideIn
            from="right"
            delayMs={90}
            className="z-10 mt-5 ml-auto w-[72%] max-w-xs md:absolute md:top-16 md:right-0 md:mt-0 md:w-[37%] md:max-w-sm"
          >
            <Polaroid
              photo={heroPhotos.courtyard}
              onPlaceChange={(value) => setText(locale, "polaroid.courtyard.place", value)}
              onCaptionChange={(value) => setText(locale, "polaroid.courtyard.caption", value)}
            />
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
            onPlaceChange={(value) => setText(locale, "frame.fruit.place", value)}
            onCaptionChange={(value) => setText(locale, "frame.fruit.caption", value)}
          />
        </SlideIn>
      </div>
    </section>
  );
}