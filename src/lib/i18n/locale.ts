import { useEffect } from "react";
import { create } from "zustand";
import { messages, type Locale, type MessageKey } from "./messages";

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

export function useT() {
  const locale = useLocale((s) => s.locale);
  return (key: MessageKey) => messages[locale][key] ?? messages.en[key];
}

export function hydrateLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "de" || stored === "en") {
      useLocale.getState().setLocale(stored);
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
