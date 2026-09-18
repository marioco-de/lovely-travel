import { useState, type FormEvent } from "react";
import { albumSettingsHref } from "@/lib/album/featured";
import { useAlbum } from "@/lib/album/store";
import { unlockTrip } from "@/lib/album/trips";
import { useT } from "@/lib/i18n/locale";

type EditUnlockProps = {
  publicHash: string;
  autoOpen?: boolean;
  to?: "edit" | "settings";
  onUnlocked?: (editHash: string) => void;
};

export function EditUnlock({ publicHash, autoOpen = false, to = "edit", onUnlocked }: EditUnlockProps) {
  const t = useT();
  const becomeOwner = useAlbum((s) => s.becomeOwner);
  const [open, setOpen] = useState(autoOpen);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  function go(editHash: string) {
    becomeOwner(editHash);
    onUnlocked?.(editHash);
    if (to === "settings") window.location.href = albumSettingsHref(publicHash, editHash);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const secret = password.trim();
    if (!secret) return;
    setBusy(true);
    setError(false);
    try {
      const result = await unlockTrip({ data: { publicHash, password: secret } });
      if (result?.editHash) {
        go(result.editHash);
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
        aria-label={t("ui.edit")}
        className="menu-link flex min-h-11 items-center"
      >
        —
      </button>
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex w-full flex-col gap-2">
      <input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder={t("ui.editPassword")}
        className="album-field w-full py-2 text-sm"
        autoFocus
      />
      <button type="submit" disabled={busy} className="album-link min-h-11 text-left disabled:opacity-50 menu-link">
        {t("ui.editUnlock")}
      </button>
      {error ? <span className="font-script text-sm text-coral">{t("ui.editPasswordWrong")}</span> : null}
    </form>
  );
}
