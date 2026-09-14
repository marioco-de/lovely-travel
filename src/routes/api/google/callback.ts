import { createFileRoute } from "@tanstack/react-router";
import { finishGoogleAuth } from "@/lib/album/google-photos.server";

export const Route = createFileRoute("/api/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code") ?? "";
        const state = url.searchParams.get("state") ?? "";
        const done = await finishGoogleAuth(request, code, state);
        const fallback = "/";
        if (!done) return Response.redirect(`${fallback}?google=error`, 302);
        const next = done.returnTo.startsWith("/") ? done.returnTo : fallback;
        return Response.redirect(`${next}?google=1`, 302);
      },
    },
  },
});
