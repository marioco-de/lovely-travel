import { useEffect, useRef, useState } from "react";
import { searchPlaces, type PlaceHit } from "@/lib/album/geocode";
import { useT } from "@/lib/i18n/locale";

type PlaceFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onPick?: (hit: PlaceHit) => void;
};

export function PlaceField({ value, onChange, onPick }: PlaceFieldProps) {
  const t = useT();
  const [text, setText] = useState(value);
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<number>(undefined);
  const saveTimer = useRef<number>(undefined);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, []);

  function lookup(next: string) {
    window.clearTimeout(searchTimer.current);
    if (next.trim().length < 2) {
      setHits([]);
      return;
    }
    searchTimer.current = window.setTimeout(() => {
      void searchPlaces({ data: { q: next } })
        .then((rows) => {
          setHits(rows);
          setOpen(rows.length > 0);
        })
        .catch(() => setHits([]));
    }, 320);
  }

  function commit(next: string) {
    window.clearTimeout(saveTimer.current);
    const cleaned = next.replace(/\u00a0/g, " ").trim();
    saveTimer.current = window.setTimeout(() => onChange(cleaned), 200);
  }

  return (
    <div ref={wrapRef} className="place-field relative min-w-0 flex-1">
      <input
        value={text}
        aria-label={t("ui.placeHint")}
        placeholder={t("ui.placeHint")}
        className="place-field-input text-left font-typewriter text-kicker tracking-wide text-ink"
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          lookup(next);
          commit(next);
        }}
        onFocus={() => {
          if (hits.length) setOpen(true);
        }}
        onBlur={() => {
          window.clearTimeout(saveTimer.current);
          const cleaned = text.replace(/\u00a0/g, " ").trim();
          if (cleaned !== value) onChange(cleaned);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
            setOpen(false);
          }
        }}
      />
      {open && hits.length ? (
        <ul className="place-suggest caption-strip">
          {hits.map((hit) => (
            <li key={`${hit.lat}-${hit.lng}-${hit.name}`}>
              <button
                type="button"
                className="place-suggest-item"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setText(hit.name);
                  setOpen(false);
                  setHits([]);
                  onChange(hit.name);
                  onPick?.(hit);
                }}
              >
                <span className="place-type font-typewriter text-kicker text-lagoon-deep">{hit.name}</span>
                <span className="mt-0.5 block font-script text-[0.78rem] leading-snug text-ink-soft">{hit.address}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
