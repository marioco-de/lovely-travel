import { useState, type FormEvent } from "react";
import { unlockTrip } from "@/lib/album/trips";
import { useT } from "@/lib/i18n/locale";

type EditUnlockProps = {
  publicHash?: string;
};

export function EditUnlock({ publicHash }: EditUnlockProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!password.trim()) return;
    setBusy(true);
    setError(false);
    try {
      const result = await unlockTrip({ data: { publicHash, password: password.trim() } });
      if (result?.editHash) {
        window.location.href = `/e/${result.editHash}`;
        return;
      }
      setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
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
