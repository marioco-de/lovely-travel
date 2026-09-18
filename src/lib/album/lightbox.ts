import { create } from "zustand";
import type { Locale } from "@/lib/i18n/messages";
import { useLocale } from "@/lib/i18n/locale";
import { catalogSrc, noteForPhoto, type LayoutDay } from "./layout";
import { CLEARED_PHOTO, pairText, useAlbum } from "./store";

export type LightboxSlide =
  | { kind: "photo"; key: string; src: string; alt: string; place: string; caption: string; media?: "photo" | "video"; play?: "loop" | "boomerang" }
  | { kind: "note"; key: string; body: string; paper: string }
  | { kind: "poi"; key: string; name: string; category: string; rating?: number; photoUrl?: string; caption: string; skin: string; size: number }
  | { kind: "place"; key: string; place: string; caption: string };

export type LightboxPhoto = { src: string; alt: string; place: string; caption: string; key?: string };

type LightboxState = {
  slides: LightboxSlide[];
  index: number;
  open: (item: LightboxPhoto) => void;
  openAt: (slides: LightboxSlide[], index: number) => void;
  next: () => void;
  prev: () => void;
  close: () => void;
};

export function slidesForDay(
  day: LayoutDay,
  photos: Record<string, string>,
  locale: Locale,
): LightboxSlide[] {
  const slides: LightboxSlide[] = [];
  for (const block of day.blocks) {
    if (block.kind === "note") {
      const body = pairText(block.body, locale).trim();
      if (body) slides.push({ kind: "note", key: `note:${block.id}`, body, paper: block.writingPaper ?? "lined" });
      continue;
    }
    if (block.kind === "poi") {
      const poi = block.poi;
      if (!poi?.name.trim()) continue;
      slides.push({
        kind: "poi",
        key: `poi:${block.id}`,
        name: poi.name,
        category: poi.category,
        rating: poi.rating,
        photoUrl: poi.photoUrl,
        caption: pairText(block.caption, locale),
        skin: poi.skin ?? "ticket",
        size: poi.size ?? 2,
      });
      continue;
    }
    if (block.kind === "place") {
      const place = pairText(block.place, locale).trim();
      const caption = pairText(block.caption, locale).trim() || pairText(block.body, locale).trim();
      if (place || caption) slides.push({ kind: "place", key: `place:${block.id}`, place, caption });
      continue;
    }
    for (const [i, id] of block.photoIds.entries()) {
      const stored = photos[id];
      if (stored === CLEARED_PHOTO) continue;
      const src = stored || catalogSrc(id);
      if (!src) continue;
      const note = noteForPhoto(block, id, i);
      const title = pairText(note.title, locale);
      const caption = pairText(note.caption, locale);
      slides.push({
        kind: "photo",
        key: `photo:${id}`,
        src,
        alt: caption || title,
        place: title,
        caption,
        media: note.media,
        play: note.play,
      });
    }
  }
  return slides;
}

export const useLightbox = create<LightboxState>((set, get) => ({
  slides: [],
  index: 0,
  open: (item) =>
    set({
      slides: [
        {
          kind: "photo",
          key: item.key ?? `photo:${item.src}`,
          src: item.src,
          alt: item.alt,
          place: item.place,
          caption: item.caption,
        },
      ],
      index: 0,
    }),
  openAt: (slides, index) => {
    if (slides.length === 0) return;
    set({ slides, index: Math.min(Math.max(0, index), slides.length - 1) });
  },
  next: () => {
    const { slides, index } = get();
    if (slides.length < 2) return;
    set({ index: (index + 1) % slides.length });
  },
  prev: () => {
    const { slides, index } = get();
    if (slides.length < 2) return;
    set({ index: (index - 1 + slides.length) % slides.length });
  },
  close: () => set({ slides: [], index: 0 }),
}));

export function useOpenDayLightbox() {
  const days = useAlbum((s) => s.layout.days);
  const photos = useAlbum((s) => s.photos);
  const locale = useLocale((s) => s.locale);
  const openAt = useLightbox((s) => s.openAt);
  const open = useLightbox((s) => s.open);

  return (dayId: string | undefined, key: string, fallback?: LightboxPhoto) => {
    const day = dayId ? days.find((item) => item.id === dayId) : undefined;
    if (!day) {
      if (fallback) open(fallback);
      return;
    }
    const slides = slidesForDay(day, photos, locale);
    const index = slides.findIndex((slide) => slide.key === key);
    if (slides.length === 0) {
      if (fallback) open({ ...fallback, key });
      return;
    }
    openAt(slides, index >= 0 ? index : 0);
  };
}
