import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/locale";
import type { Locale } from "@/lib/i18n/messages";
import { Stamp } from "./Stamp";

const LOCALES: Locale[] = ["en", "de"];

export function LanguageToggle() {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const others = LOCALES.filter((item) => item !== locale);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="lang-fan relative" role="group" aria-label={t("ui.language")}>
      {open &&
        others.map((code, index) => (
          <Stamp
            key={code}
            as="button"
            variant="rect"
            labelKey={code === "en" ? "ui.lang.en" : "ui.lang.de"}
            rotation={-14 - index * 8}
            delayMs={40}
            onClick={() => {
              setLocale(code);
              setOpen(false);
            }}
            className="lang-fan-leaf px-2.5 py-2"
          />
        ))}
      <Stamp
        as="button"
        variant="rect"
        labelKey={locale === "en" ? "ui.lang.en" : "ui.lang.de"}
        rotation={-6}
        pressed
        onClick={() => setOpen((value) => !value)}
        className={cn("px-2.5 py-2", open && "is-active")}
      />
    </div>
  );
}
