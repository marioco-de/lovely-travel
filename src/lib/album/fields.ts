import { en, type Locale, type MessageKey } from "@/lib/i18n/messages";
import type { AlbumLayout, I18nPair } from "./layout";

export type AlbumTexts = Partial<Record<Locale, Partial<Record<MessageKey, string>>>>;

const COVER_KEYS: MessageKey[] = ["album.title", "album.kicker", "album.year", "hero.place", "hero.caption", "polaroid.courtyard.place", "polaroid.courtyard.caption", "frame.fruit.place", "frame.fruit.caption", "map.title", "map.caption"];

export type FieldItem = { key: string; text: string };

export function pairValue(pair: I18nPair, locale: Locale) {
  return pair[locale] || pair.en || pair.de || "";
}

export function collectFields(source: Locale, texts: AlbumTexts, layout: AlbumLayout): FieldItem[] {
  const fields: FieldItem[] = [];
  for (const key of COVER_KEYS) {
    const text = texts[source]?.[key] || (source === "en" || source === "de" ? en[key] : texts.en?.[key] || en[key]);
    if (text) fields.push({ key, text });
  }
  for (const day of layout.days) {
    const place = pairValue(day.place, source);
    if (place) fields.push({ key: `day:${day.id}:place`, text: place });
    const label = pairValue(day.label, source);
    if (label) fields.push({ key: `day:${day.id}:label`, text: label });
    (day.places ?? []).forEach((item, index) => {
      const text = pairValue(item, source);
      if (text) fields.push({ key: `day:${day.id}:places:${index}`, text });
    });
    for (const block of day.blocks) {
      const blockPlace = pairValue(block.place, source);
      if (blockPlace) fields.push({ key: `block:${block.id}:place`, text: blockPlace });
      const caption = pairValue(block.caption, source);
      if (caption) fields.push({ key: `block:${block.id}:caption`, text: caption });
      const body = pairValue(block.body, source);
      if (body) fields.push({ key: `block:${block.id}:body`, text: body });
      for (const [photoId, note] of Object.entries(block.photoNotes ?? {})) {
        const title = pairValue(note.title, source);
        if (title) fields.push({ key: `block:${block.id}:photo:${photoId}:title`, text: title });
        const photoCaption = pairValue(note.caption, source);
        if (photoCaption) fields.push({ key: `block:${block.id}:photo:${photoId}:caption`, text: photoCaption });
      }
    }
  }
  return fields;
}

export function applyFields(layout: AlbumLayout, texts: AlbumTexts, locale: Locale, translated: Record<string, string>) {
  const nextTexts: AlbumTexts = {
    ...texts,
    [locale]: { ...texts[locale] },
  };
  const nextDays = layout.days.map((day) => {
    const place = translated[`day:${day.id}:place`];
    const label = translated[`day:${day.id}:label`];
    const places = (day.places ?? [day.place]).map((item, index) => {
      const text = translated[`day:${day.id}:places:${index}`];
      return text ? { ...item, [locale]: text } : item;
    });
    return {
      ...day,
      place: place ? { ...day.place, [locale]: place } : day.place,
      label: label ? { ...day.label, [locale]: label } : day.label,
      places,
      blocks: day.blocks.map((block) => {
        const blockPlace = translated[`block:${block.id}:place`];
        const caption = translated[`block:${block.id}:caption`];
        const body = translated[`block:${block.id}:body`];
        const photoNotes = { ...block.photoNotes };
        for (const photoId of block.photoIds) {
          const title = translated[`block:${block.id}:photo:${photoId}:title`];
          const photoCaption = translated[`block:${block.id}:photo:${photoId}:caption`];
          if (!title && !photoCaption) continue;
          const current = photoNotes[photoId] ?? { title: { en: "", de: "" }, caption: { en: "", de: "" } };
          photoNotes[photoId] = {
            title: title ? { ...current.title, [locale]: title } : current.title,
            caption: photoCaption ? { ...current.caption, [locale]: photoCaption } : current.caption,
          };
        }
        return {
          ...block,
          place: blockPlace ? { ...block.place, [locale]: blockPlace } : block.place,
          caption: caption ? { ...block.caption, [locale]: caption } : block.caption,
          body: body ? { ...block.body, [locale]: body } : block.body,
          photoNotes,
        };
      }),
    };
  });
  for (const [key, value] of Object.entries(translated)) {
    if (key.includes(":")) continue;
    nextTexts[locale] = { ...nextTexts[locale], [key as MessageKey]: value };
  }
  return { layout: { ...layout, days: nextDays }, texts: nextTexts };
}
