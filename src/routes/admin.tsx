import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listTrips, type TripListItem } from "@/lib/album/trips";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const [trips, setTrips] = useState<TripListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void listTrips()
      .then(setTrips)
      .catch(() => setError("Could not load trips"));
  }, [user]);

  if (isPending) {
    return (
      <main className="album-sheet grid min-h-svh place-items-center">
        <div className="h-10 w-40 animate-pulse bg-stamp/10" />
      </main>
    );
  }
  if (!user) return <RedirectToSignIn />;

  return (
    <main className="album-sheet min-h-svh px-4 py-10 md:px-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-kicker tracking-widest text-ink-soft uppercase">Lovely</p>
            <h1 className="mt-1 font-typewriter text-day text-lagoon-deep">Digital trips</h1>
            <p className="mt-2 font-script text-caption text-ink-soft">
              Public pages use a short hash. Editing needs the longer secret hash — no login for guests.
            </p>
          </div>
          <UserButton />
        </header>
        {error ? <p className="font-script text-coral">{error}</p> : null}
        <ul className="space-y-4">
          {(trips ?? []).map((trip) => (
            <li key={trip.id} className="caption-strip p-4">
              <h2 className="font-typewriter text-place text-lagoon-deep">{trip.title}</h2>
              <p className="mt-1 font-display text-kicker tracking-widest text-ink-soft uppercase">
                {trip.sourceLocale} · {trip.updatedAt.slice(0, 10)}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-typewriter text-kicker tracking-wide">
                <a href={`/t/${trip.publicHash}/`} className="underline-offset-4 hover:underline">
                  Public /t/{trip.publicHash}
                </a>
                <a href={`/e/${trip.editHash}/`} className="underline-offset-4 hover:underline">
                  Edit hash
                </a>
              </div>
            </li>
          ))}
        </ul>
        {trips?.length === 0 ? (
          <p className="font-script text-caption text-ink-soft">No albums yet. Open the Portugal page and start a new one.</p>
        ) : null}
      </div>
    </main>
  );
}
