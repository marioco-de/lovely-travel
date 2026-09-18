import { useState } from "react";
import { cn } from "@/lib/utils";
import { COVER_ID, isDayNumberLabel, type LayoutDay } from "@/lib/album/layout";
import { PLACES, placeCaption } from "@/lib/album/places";
import { pairText, useAlbum } from "@/lib/album/store";
import { useLocale, useT } from "@/lib/i18n/locale";
import { BlockStack } from "./BlockStack";
import { ConfirmDialog } from "./ConfirmDialog";
import { DayMark } from "./DayMark";
import { DAY_CHOICES } from "./DayStarter";
import { EditGear, GearAction } from "./EditGear";
import { PaperLayer } from "./PaperLayer";
import { PlaceField } from "./PlaceField";
import { PortugalMap } from "./PortugalMap";

type DayBlockProps = {
  day: LayoutDay;
  index: number;
  active: boolean;
  onSelect: (id: string) => void;
};

export function DayBlock({ day, index, active, onSelect }: DayBlockProps) {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const canEdit = useAlbum((s) => s.canEdit);
  const publicHash = useAlbum((s) => s.publicHash);
  const setDayLabel = useAlbum((s) => s.setDayLabel);
  const setDayPlaceAt = useAlbum((s) => s.setDayPlaceAt);
  const setDayGeo = useAlbum((s) => s.setDayGeo);
  const addBlock = useAlbum((s) => s.addBlock);
  const addDayPlace = useAlbum((s) => s.addDayPlace);
  const removeDayPlace = useAlbum((s) => s.removeDayPlace);
  const removeDay = useAlbum((s) => s.removeDay);
  const reverse = index % 2 === 1;
  const [confirmDay, setConfirmDay] = useState(false);
  const titleRaw = pairText(day.label, locale);
  const title = isDayNumberLabel(titleRaw) ? "" : titleRaw;
  const stops = (day.places?.length ? day.places : [day.place]).map((item) => pairText(item, locale)).filter(Boolean);
  const catalog = PLACES[day.id];
  const pinLine = placeCaption(catalog, day.geo?.address);
  const extras = stops.filter((stop) => {
    const value = stop.toLowerCase();
    if (title && value === title.toLowerCase()) return false;
    return true;
  });
  const placeLine = extras.join(" · ") || pinLine;

  return (
    <article
      id={`day-${day.id}`}
      data-day={day.id}
      data-paper={day.paper}
      className={cn(
        "day-wash relative isolate w-full scroll-mt-8 py-12 md:py-20",
        `day-wash--${day.paper}`,
        canEdit && "is-editing",
      )}
    >
      <PaperLayer variant={day.paper} />
      <PortugalMap
        variant="aside"
        activeId={day.id}
        focusId={day.id}
        onSelect={onSelect}
        className="hidden md:block"
      />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-10 lg:px-16">
        <div className="min-w-0">
          <div className="relative z-20 mb-10 flex items-start gap-4 pl-8 md:mb-14 md:pl-16">
            <DayMark index={index} active={active} rotation={index % 2 === 0 ? -10 : 8} />
            <div className="day-heading-copy min-w-0">
              {canEdit ? (
                <input
                  value={title}
                  onChange={(event) => setDayLabel(day.id, locale, event.target.value)}
                  placeholder={t("ui.dayTitle")}
                  className="day-title-input place-type text-left font-typewriter text-day leading-[1.15] text-lagoon-deep"
                  aria-label={t("ui.dayTitle")}
                />
              ) : title ? (
                <h3 className="place-type m-0 text-left font-typewriter text-day leading-[1.15] text-lagoon-deep">
                  {title}
                </h3>
              ) : null}
              {canEdit ? (
                <div className="mt-1 space-y-1">
                  {(day.places?.length ? day.places : [day.place])
                    .map((item, placeIndex) => ({ item, placeIndex }))
                    .filter(({ item }) => {
                      const text = pairText(item, locale).trim();
                      if (/^(ort|place|lorem ipsum)$/i.test(text)) return false;
                      if (title && text.toLowerCase() === title.toLowerCase()) return false;
                      return true;
                    })
                    .map(({ item, placeIndex }) => (
                    <div key={`${day.id}-place-${placeIndex}`} className="flex items-center gap-2">
                      <PlaceField
                        value={pairText(item, locale)}
                        onChange={(value) => setDayPlaceAt(day.id, placeIndex, locale, value)}
                        onPick={(hit) => {
                          setDayPlaceAt(day.id, placeIndex, locale, hit.name);
                          if (placeIndex === 0) setDayGeo(day.id, hit);
                        }}
                      />
                      {placeIndex > 0 ? (
                        <button
                          type="button"
                          className="album-btn album-btn--tiny"
                          onClick={() => removeDayPlace(day.id, placeIndex)}
                          aria-label={t("ui.remove")}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : placeLine ? (
                <p className="day-place-line text-left font-typewriter text-kicker tracking-wide">
                  {placeLine}
                </p>
              ) : null}
            </div>
          </div>

          <BlockStack day={day} reverse={reverse} />
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a href={`/d/${encodeURIComponent(publicHash || "album")}/${encodeURIComponent(day.id)}`} className="day-full-link">
              {t("ui.fullDay")}
            </a>
            {canEdit ? (
              <EditGear label={t("ui.daySettings")}>
                {(close) => (
                  <>
                    {DAY_CHOICES.map((item) => (
                      <GearAction
                        key={item.kind}
                        onClick={() => {
                          addBlock(day.id, item.kind);
                          close();
                        }}
                      >
                        {t(item.key)}
                      </GearAction>
                    ))}
                    <GearAction
                      onClick={() => {
                        addDayPlace(day.id);
                        close();
                      }}
                    >
                      + {t("ui.addPlaceName")}
                    </GearAction>
                    {day.id !== COVER_ID ? (
                      <GearAction
                        danger
                        onClick={() => {
                          close();
                          setConfirmDay(true);
                        }}
                      >
                        {t("ui.removeDay")}
                      </GearAction>
                    ) : null}
                  </>
                )}
              </EditGear>
            ) : null}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDay}
        title={t("ui.confirmRemove")}
        onCancel={() => setConfirmDay(false)}
        onConfirm={() => {
          setConfirmDay(false);
          removeDay(day.id);
        }}
      />
    </article>
  );
}
