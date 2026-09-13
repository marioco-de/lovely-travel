import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_EDIT_PASSWORD } from "@/lib/album/password";
import { useAlbum } from "@/lib/album/store";
import { setTripPassword } from "@/lib/album/trips";
import { useT } from "@/lib/i18n/locale";

export function EditMenu() {
  const t = useT();
  const addDay = useAlbum((s) => s.addDay);
  const reset = useAlbum((s) => s.reset);
  const publicHash = useAlbum((s) => s.publicHash);
  const editHash = useAlbum((s) => s.editHash);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState(DEFAULT_EDIT_PASSWORD);
  const wrapRef = useRef<HTMLDivElement>(null);

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

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={t("ui.menu")}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "stamp-mark is-settled min-h-11 min-w-11 border-2 border-double border-current px-3 py-2 font-display text-kicker font-semibold tracking-widest",
          open && "is-active",
        )}
        style={{ ["--stamp-rot" as string]: "-3deg" }}
      >
        ···
      </button>
      {open ? (
        <ul className="caption-strip absolute top-full right-0 z-40 mt-2 min-w-[13.5rem] space-y-2 p-3">
          <li>
            <button type="button" className="menu-link" onClick={() => addDay()}>
              {t("ui.addDay")}
            </button>
          </li>
          <li>
            <button
              type="button"
              className="menu-link"
              onClick={() => void copy(publicHash ? `${window.location.origin}/t/${publicHash}` : window.location.href)}
            >
              {t("ui.publicLink")}
            </button>
          </li>
          {editHash ? (
            <li>
              <button
                type="button"
                className="menu-link"
                onClick={() => void copy(`${window.location.origin}/e/${editHash}`)}
              >
                {t("ui.editLink")}
              </button>
            </li>
          ) : null}
          {editHash ? (
            <li className="space-y-1">
              <p className="font-display text-[0.65rem] tracking-widest text-ink-soft uppercase">{t("ui.setPassword")}</p>
              <form
                className="flex gap-1"
                onSubmit={(event) => {
                  event.preventDefault();
                  void setTripPassword({ data: { editHash, password } });
                }}
              >
                <input
                  type="text"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="album-field py-1 text-sm"
                />
              </form>
            </li>
          ) : null}
          {publicHash ? (
            <li>
              <a className="menu-link" href={`/t/${publicHash}`}>
                {t("ui.viewPublic")}
              </a>
            </li>
          ) : null}
          <li>
            <button type="button" className="menu-link" onClick={() => void reset()}>
              {t("ui.resetAlbum")}
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
