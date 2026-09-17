import { useEffect } from "react";
import { create } from "zustand";
import { isDayKey } from "@/lib/album/exif";
import { useAlbum } from "@/lib/album/store";
import { messages, LOCALES, type Locale, type MessageKey } from "./messages";

const STORAGE_KEY = "album-locale";

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useLocale = create<LocaleState>((set) => ({
  locale: "en",
  setLocale: (locale) => {
    set({ locale });
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore quota / private mode */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  },
}));

export function formatDayKey(dateKey: string, locale: Locale) {
  if (!isDayKey(dateKey)) return dateKey;
  const [year, month, day] = dateKey.split("-");
  if (locale === "de") return `${day}.${month}.${year}`;
  return dateKey;
}

export function useFormatDay() {
  const locale = useLocale((s) => s.locale);
  return (dateKey: string) => formatDayKey(dateKey, locale);
}

export function useT() {
  const locale = useLocale((s) => s.locale);
  const texts = useAlbum((s) => s.texts);
  return (key: MessageKey) => {
    const override = texts[locale]?.[key];
    if (override !== undefined && override !== "") return override;
    return messages[locale]?.[key] ?? messages.en[key] ?? key;
  };
}

export function hydrateLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (LOCALES as readonly string[]).includes(stored)) {
      useLocale.getState().setLocale(stored as Locale);
      return;
    }
  } catch {
    /* ignore */
  }
  if (navigator.language.toLowerCase().startsWith("de")) {
    useLocale.getState().setLocale("de");
  }
}

export function LocaleHydrator() {
  useEffect(() => {
    hydrateLocale();
  }, []);
  return null;
}
