import { lazy, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MapPin } from "lucide-react";
import { reversePlace, searchPlaces, type PlaceHit } from "@/lib/album/geocode";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const PlacePickerMap = lazy(() => import("./PlacePickerMap"));

export type PlaceValue = { name: string; lat?: number; lng?: number };

export function PlaceChip({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  const t = useT();
  return (
    <button type="button" className={cn("place-chip", className)} onClick={onClick}>
      <MapPin size={16} strokeWidth={2.2} />
      <span>{label.trim() || t("ui.setPlace")}</span>
    </button>
  );
}

export function PlacePicker({
  open,
  value,
  onClose,
  onSave,
}: {
  open: boolean;
  value: PlaceValue;
  onClose: () => void;
  onSave: (hit: PlaceValue) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState(value.name);
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [picked, setPicked] = useState<PlaceValue>(value);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setQuery(value.name);
    setPicked(value);
    setHits([]);
  }, [open, value.name, value.lat, value.lng]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void searchPlaces({ data: { q } }).then(setHits).catch(() => setHits([]));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  async function pickLatLng(lat: number, lng: number) {
    const hit = await reversePlace({ data: { lat, lng } }).catch(() => null);
    const next = { name: hit?.name || query || `${lat.toFixed(3)}, ${lng.toFixed(3)}`, lat, lng };
    setPicked(next);
    setQuery(next.name);
  }

  function choose(hit: PlaceHit) {
    const next = { name: hit.name, lat: hit.lat, lng: hit.lng };
    setPicked(next);
    setQuery(hit.name);
    setHits([]);
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="place-picker" role="dialog" aria-modal="true" aria-label={t("ui.place")}>
      <Suspense fallback={<div className="place-picker-map is-pending" />}>
        <PlacePickerMap lat={picked.lat} lng={picked.lng} onPick={(lat, lng) => void pickLatLng(lat, lng)} />
      </Suspense>
      <div className="place-picker-search">
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (hits[0]) choose(hits[0]);
              else onSave({ name: query.trim(), lat: picked.lat, lng: picked.lng });
            }
          }}
          className="album-field w-full"
          placeholder={t("ui.searchPlace")}
          aria-label={t("ui.searchPlace")}
        />
        {hits.length ? (
          <ul className="place-picker-hits">
            {hits.map((hit) => (
              <li key={`${hit.lat}-${hit.lng}-${hit.name}`}>
                <button type="button" onClick={() => choose(hit)}>
                  {hit.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className="album-btn album-btn--ghost" onClick={onClose}>
            {t("ui.close")}
          </button>
          <button
            type="button"
            className="album-btn"
            onClick={() => onSave({ name: query.trim() || picked.name, lat: picked.lat, lng: picked.lng })}
          >
            {t("ui.save")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
