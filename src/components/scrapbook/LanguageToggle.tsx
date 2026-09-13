import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/locale";
import { useAlbum } from "@/lib/album/store";
import { LOCALES, LOCALE_LABEL } from "@/lib/i18n/messages";
import { Stamp } from "./Stamp";

export function LanguageToggle() {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const ensureLocale = useAlbum((s) => s.ensureLocale);
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
            labelKey={LOCALE_LABEL[code]}
            rotation={-14 - index * 8}
            delayMs={40}
            onClick={() => {
              setLocale(code);
              void ensureLocale(code);
              setOpen(false);
            }}
            className="lang-fan-leaf px-2.5 py-2"
          />
        ))}
      <Stamp
        as="button"
        variant="rect"
        labelKey={LOCALE_LABEL[locale]}
        rotation={-6}
        pressed
        onClick={() => setOpen((value) => !value)}
        className={cn("px-2.5 py-2", open && "is-active")}
      />
    </div>
  );
}
