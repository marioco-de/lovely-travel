import { useState, type FormEvent } from "react";
import { FEATURED_SLUG, matchesFeaturedPassword } from "@/lib/album/featured";
import { useAlbum } from "@/lib/album/store";
import { unlockTrip } from "@/lib/album/trips";
import { useT } from "@/lib/i18n/locale";

type EditUnlockProps = {
  publicHash: string;
  autoOpen?: boolean;
};

export function EditUnlock({ publicHash, autoOpen = false }: EditUnlockProps) {
  const t = useT();
  const unlockFeatured = useAlbum((s) => s.unlockFeatured);
  const [open, setOpen] = useState(autoOpen);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const secret = password.trim();
    if (!secret) return;
    if (publicHash === FEATURED_SLUG && matchesFeaturedPassword(secret)) {
      unlockFeatured();
      return;
    }
    setBusy(true);
    setError(false);
    try {
      const result = await unlockTrip({ data: { publicHash, password: secret } });
      if (result?.editHash) {
        window.location.href = `/e/${result.editHash}`;
        return;
      }
    } catch {
      /* wrong password */
    }
    setError(true);
    setBusy(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-typewriter text-kicker tracking-wide text-lagoon-deep underline-offset-4 hover:underline"
      >
        {t("ui.editAlbum")}
      </button>
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-wrap items-center gap-2">
      <input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder={t("ui.editPassword")}
        className="album-field max-w-[14rem] py-1.5 text-sm"
        autoFocus
      />
      <button
        type="submit"
        disabled={busy}
        className="font-typewriter text-kicker tracking-wide text-lagoon-deep underline-offset-4 hover:underline disabled:opacity-50"
      >
        {t("ui.editUnlock")}
      </button>
      {error ? <span className="font-script text-sm text-coral">{t("ui.editPasswordWrong")}</span> : null}
    </form>
  );
}
