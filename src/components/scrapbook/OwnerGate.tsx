import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { peekOwnerSession, unlockTripByEditHash } from "@/lib/album/trips";
import { useT } from "@/lib/i18n/locale";

type OwnerGateProps = {
  hash: string;
  children: (editHash: string) => ReactNode;
};

export function OwnerGate({ hash, children }: OwnerGateProps) {
  const t = useT();
  const [editHash, setEditHash] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let live = true;
    void peekOwnerSession({ data: { hash } })
      .then((session) => {
        if (!live) return;
        if (session?.editHash) setEditHash(session.editHash);
      })
      .finally(() => {
        if (live) setChecked(true);
      });
    return () => {
      live = false;
    };
  }, [hash]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const secret = password.trim();
    if (!secret) return;
    setBusy(true);
    setError(false);
    try {
      const result = await unlockTripByEditHash({ data: { editHash: hash, password: secret } });
      if (result?.editHash) {
        setEditHash(result.editHash);
        return;
      }
    } catch {
      /* stay locked */
    }
    setError(true);
    setBusy(false);
  }

  if (editHash) return <>{children(editHash)}</>;
  if (!checked) {
    return (
      <div className="album-sheet grid min-h-svh place-items-center px-4">
        <p className="font-script text-caption text-ink-soft">{t("ui.ownerChecking")}</p>
      </div>
    );
  }

  return (
    <div className="album-sheet grid min-h-svh place-items-center px-4">
      <form onSubmit={(event) => void onSubmit(event)} className="caption-strip confirm-card w-full max-w-sm p-6">
        <p className="font-display text-kicker tracking-widest text-ink-soft uppercase">{t("ui.ownerGate")}</p>
        <h1 className="mt-2 font-typewriter text-day text-lagoon-deep">{t("ui.ownerGateTitle")}</h1>
        <p className="mt-2 font-script text-sm text-ink-soft">{t("ui.ownerGateHint")}</p>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t("ui.editPassword")}
          className="album-field mt-4 w-full"
          autoFocus
        />
        <button type="submit" disabled={busy} className="album-btn mt-3 disabled:opacity-50">
          {t("ui.editUnlock")}
        </button>
        {error ? <p className="mt-2 font-script text-sm text-coral">{t("ui.editPasswordWrong")}</p> : null}
      </form>
    </div>
  );
}
