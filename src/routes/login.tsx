import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0] || "Editor",
        });
        if (err) throw new Error(err.message ?? "Could not create account");
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message ?? "Could not sign in");
      }
      window.location.href = "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="album-sheet grid min-h-svh place-items-center px-4 py-12">
      <div className="caption-strip w-full max-w-sm space-y-4 p-6">
        <p className="font-display text-kicker tracking-widest text-ink-soft uppercase">Tropical Travel</p>
        <h1 className="font-typewriter text-day text-lagoon-deep">Admin</h1>
        {isPending ? <div className="h-10 animate-pulse bg-stamp/10" /> : null}
        {user ? (
          <div className="flex items-center justify-between gap-3">
            <a href="/admin" className="font-typewriter text-place text-lagoon-deep underline-offset-4 hover:underline">
              Open the trip list
            </a>
            <UserButton />
          </div>
        ) : authEnabled ? (
          <>
            <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
              <label className="block">
                <span className="mb-1 block font-display text-kicker tracking-widest text-ink-soft uppercase">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="album-field"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-display text-kicker tracking-widest text-ink-soft uppercase">Password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="album-field"
                />
              </label>
              {error ? <p className="font-script text-caption text-coral">{error}</p> : null}
              <button type="submit" disabled={busy} className="stamp-mark is-settled w-full border-2 border-double border-current px-3 py-2 font-display text-kicker font-semibold uppercase">
                {mode === "up" ? "Create account" : "Sign in"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setMode((value) => (value === "in" ? "up" : "in"))}
              className="font-typewriter text-kicker tracking-wide text-ink-soft underline-offset-4 hover:underline"
            >
              {mode === "in" ? "Need an account?" : "Already have an account?"}
            </button>
            <div className="space-y-2 pt-2">
              {GROK_PROVIDERS.map((provider) => (
                <button
                  key={provider.providerId}
                  type="button"
                  onClick={() => void signIn(provider.providerId, { callbackURL: "/admin" })}
                  className="w-full border border-stamp/30 px-3 py-2 font-display text-kicker tracking-widest uppercase"
                >
                  Continue with {provider.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="font-script text-caption text-ink-soft">Sign-in is disabled.</p>
        )}
      </div>
    </main>
  );
}
