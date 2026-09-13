import { useT } from "@/lib/i18n/locale";

export function PortugalLocator() {
  const t = useT();

  return (
    <figure className="country-locator" aria-hidden="true">
      <span className="country-locator-art" />
      <figcaption className="country-locator-name">{t("map.country")}</figcaption>
    </figure>
  );
}
