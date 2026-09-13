import { useT } from "@/lib/i18n/locale";

export function PortugalLocator() {
  const t = useT();

  return (
    <figure className="country-locator" aria-hidden="true">
      <img src="/maps/portugal-outline.svg" alt="" className="block h-auto w-full" />
      <figcaption className="country-locator-name">{t("map.country")}</figcaption>
    </figure>
  );
}
