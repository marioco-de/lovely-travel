import { useState, type FormEvent } from "react";
import { useAlbum } from "@/lib/album/store";
import { useT } from "@/lib/i18n/locale";

export function NewAlbum() {
  const t = useT();
  const createRemote = useAlbum((s) => s.createRemote);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const secret = password.trim();
    if (secret.length < 4) {
      setError(true);
      return;
    }
    setBusy(true);
    setError(false);
    const created = await createRemote(secret);
    if (created?.editHash) {
      window.location.href = `/e/${created.editHash}`;
      return;
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
        {t("ui.newAlbum")}
      </button>
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex max-w-md flex-wrap items-center gap-2">
      <input
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder={t("ui.choosePassword")}
        minLength={4}
        className="album-field max-w-[14rem] py-1.5 text-sm"
        autoFocus
      />
      <button
        type="submit"
        disabled={busy}
        className="font-typewriter text-kicker tracking-wide text-lagoon-deep underline-offset-4 hover:underline disabled:opacity-50"
      >
        {t("ui.createAlbum")}
      </button>
      {error ? <span className="font-script text-sm text-coral">{t("ui.createFailed")}</span> : null}
    </form>
  );
}
