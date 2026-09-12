import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/locale";
import type { Locale } from "@/lib/i18n/messages";
import { Stamp } from "./Stamp";

export function LanguageToggle() {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);

  function select(next: Locale) {
    setLocale(next);
  }

  return (
    <div
      role="group"
      aria-label={t("ui.language")}
      className="flex items-center gap-2"
    >
      <Stamp
        as="button"
        variant="rect"
        labelKey="ui.lang.en"
        rotation={-6}
        pressed={locale === "en"}
        onClick={() => select("en")}
        className={cn("px-2.5 py-2", locale === "en" && "is-active")}
      />
      <Stamp
        as="button"
        variant="rect"
        labelKey="ui.lang.de"
        rotation={5}
        pressed={locale === "de"}
        onClick={() => select("de")}
        delayMs={80}
        className={cn("px-2.5 py-2", locale === "de" && "is-active")}
      />
    </div>
  );
}
