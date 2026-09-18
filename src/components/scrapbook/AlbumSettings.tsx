import { useEffect, useState } from "react";
import { albumEditHref, albumPublicHref } from "@/lib/album/featured";
import { googleStatus } from "@/lib/album/google-photos";
import { useAlbum } from "@/lib/album/store";
import { setTripPassword } from "@/lib/album/trips";
import { LocaleHydrator, useT } from "@/lib/i18n/locale";
import { AlbumMenu } from "./AlbumMenu";
import { EditGear, GearAction } from "./EditGear";
import { GoogleImport } from "./GoogleImport";
import { PlaceChip, PlacePicker } from "./PlacePicker";

type AlbumSettingsProps = {
  editHash: string;
};

export function AlbumSettings({ editHash }: AlbumSettingsProps) {
  const t = useT();
  const bindTrip = useAlbum((s) => s.bindTrip);
  const publicHash = useAlbum((s) => s.publicHash);
  const ready = useAlbum((s) => s.ready);
  const saveStatus = useAlbum((s) => s.saveStatus);
  const setText = useAlbum((s) => s.setText);
  const albumPlace = useAlbum((s) => s.albumPlace);
  const albumLat = useAlbum((s) => s.albumLat);
  const albumLng = useAlbum((s) => s.albumLng);
  const setAlbumPlace = useAlbum((s) => s.setAlbumPlace);
  const titleDe = useAlbum((s) => s.texts.de?.["album.title"] ?? "");
  const titleEn = useAlbum((s) => s.texts.en?.["album.title"] ?? "");
  const [title, setTitle] = useState("");
  const [placeOpen, setPlaceOpen] = useState(false);

  useEffect(() => {
    setTitle(titleDe || titleEn);
  }, [titleDe, titleEn]);

  useEffect(() => {
    void bindTrip({ mode: "edit", editHash });
  }, [bindTrip, editHash]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const flag = new URLSearchParams(window.location.search).get("google");
    if (flag !== "1") return;
    window.history.replaceState({}, "", window.location.pathname);
    void import("@/lib/album/google-client").then(({ runGoogleImport }) => runGoogleImport(editHash));
  }, [editHash]);

  const albumHref = albumPublicHref(publicHash);
  const statusKey =
    saveStatus === "saving" ? "ui.storageSaving" : saveStatus === "error" ? "ui.storageError" : "ui.storageSaved";

  return (
    <div className="album-sheet min-h-svh w-full">
      <LocaleHydrator />
      <AlbumMenu />
      <main className="w-full px-4 py-10 md:px-10 md:py-12 lg:px-14 xl:px-16">
        <header className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-xl">
            <p className="font-display text-kicker tracking-widest text-ink-soft uppercase">{t("ui.settingsKicker")}</p>
            <h1 className="mt-2 font-typewriter text-day text-lagoon-deep">{t("ui.settingsTitle")}</h1>
            <p className="mt-3 font-script text-caption text-ink-soft">{t("ui.settingsHint")}</p>
            <p className="mt-2 font-display text-kicker tracking-widest text-lagoon-deep uppercase">{t(statusKey)}</p>
            <a href={albumHref} className="day-full-link mt-5 inline-block">
              ← {t("ui.settingsBack")}
            </a>
          </div>
          <section className="grid w-full gap-4 lg:max-w-md">
            <h2 className="font-typewriter text-place text-lagoon-deep">{t("ui.albumMeta")}</h2>
            <label className="block">
              <span className="mb-1 block font-display text-kicker tracking-widest text-ink-soft uppercase">{t("ui.title")}</span>
              <input
                value={title}
                className="album-field w-full"
                onChange={(event) => setTitle(event.target.value)}
                onBlur={(event) => {
                  const value = event.target.value.trim();
                  if (value) {
                    setText("de", "album.title", value);
                    setText("en", "album.title", value);
                  }
                }}
                placeholder={t("ui.title")}
              />
            </label>
            <div>
              <span className="mb-1 block font-display text-kicker tracking-widest text-ink-soft uppercase">{t("ui.albumPlace")}</span>
              <PlaceChip label={albumPlace} onClick={() => setPlaceOpen(true)} />
            </div>
            <SettingsPassword editHash={editHash} publicHash={publicHash} />
          </section>
        </header>

        <section className="caption-strip mt-10 p-5 md:p-6 lg:p-8">
          <h2 className="font-typewriter text-place text-lagoon-deep">{t("ui.googleSection")}</h2>
          <p className="mt-2 max-w-2xl font-script text-sm text-ink-soft">{t("ui.googleAlbumHint")}</p>
          {ready ? <GoogleStatus editHash={editHash} /> : null}
          <div className="mt-5">
            <GoogleImport />
          </div>
        </section>
      </main>
      <PlacePicker
        open={placeOpen}
        value={{ name: albumPlace, lat: albumLat, lng: albumLng }}
        onClose={() => setPlaceOpen(false)}
        onSave={(hit) => {
          setAlbumPlace(hit);
          setPlaceOpen(false);
        }}
      />
    </div>
  );
}

function GoogleStatus({ editHash }: { editHash: string }) {
  const t = useT();
  const [state, setState] = useState<{ configured: boolean; connected: boolean } | null>(null);

  useEffect(() => {
    void googleStatus({ data: { editHash } })
      .then(setState)
      .catch(() => setState({ configured: false, connected: false }));
  }, [editHash]);

  if (!state) return null;
  if (!state.configured) {
    return <p className="mt-3 font-script text-sm text-coral">{t("ui.googleNeedEnv")}</p>;
  }
  return (
    <p className="mt-3 font-typewriter text-kicker tracking-wide text-ink">
      {state.connected ? t("ui.googleConnected") : t("ui.googleNotConnected")}
    </p>
  );
}

function SettingsPassword({ editHash, publicHash }: { editHash: string; publicHash?: string }) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    const secret = password.trim();
    if (secret.length < 4) return;
    const result = await setTripPassword({ data: { editHash, password: secret } });
    if (result?.ok) {
      setSaved(true);
      setPassword("");
    }
  }

  return (
    <div className="grid gap-2">
      <span className="font-display text-kicker tracking-widest text-ink-soft uppercase">{t("ui.editPassword")}</span>
      {publicHash ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-typewriter text-kicker tracking-wide text-ink-soft">{albumPublicHref(publicHash)}</p>
          <EditGear label={t("ui.albumSettings")}>
            {() => (
              <>
                <GearAction href={albumPublicHref(publicHash)}>{t("ui.viewPublic")}</GearAction>
                <GearAction href={albumEditHref(publicHash, editHash)}>{t("ui.edit")}</GearAction>
              </>
            )}
          </EditGear>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          autoComplete="new-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setSaved(false);
          }}
          className="album-field max-w-[14rem]"
          placeholder={t("ui.editPassword")}
        />
        <button type="button" className="album-btn" onClick={() => void save()}>
          {t("ui.done")}
        </button>
      </div>
      {saved ? <span className="font-script text-sm text-lagoon-deep">{t("ui.storageSaved")}</span> : null}
    </div>
  );
}

function publicLink(hash?: string) {
  return albumPublicHref(hash);
}
