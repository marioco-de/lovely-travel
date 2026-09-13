import { COVER_ID } from "@/lib/album/layout";
import { useAlbum } from "@/lib/album/store";
import { useLocale, useT } from "@/lib/i18n/locale";
import { BlockStack } from "./BlockStack";
import { DayStarter } from "./DayStarter";
import { LiveText } from "./LiveText";
import { Stamp } from "./Stamp";

export function HeroCollage() {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const canEdit = useAlbum((s) => s.canEdit);
  const setText = useAlbum((s) => s.setText);
  const cover = useAlbum((s) => s.layout.days.find((day) => day.id === COVER_ID));

  return (
    <section className="relative mx-auto w-full max-w-7xl overflow-visible px-4 pt-4 pb-8 md:px-10 md:pt-6 md:pb-16 lg:px-16">
      <header className="relative mb-8 max-w-xl pr-16 md:mb-10 md:pr-36">
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

      {cover ? <BlockStack day={cover} /> : canEdit ? <DayStarter dayId={COVER_ID} /> : null}
    </section>
  );
}
