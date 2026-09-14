import { createFileRoute } from "@tanstack/react-router";
import { googleAuthUrl, googleConfigured } from "@/lib/album/google-photos.server";

export const Route = createFileRoute("/api/google/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const editHash = url.searchParams.get("editHash")?.trim() ?? "";
        const returnTo = url.searchParams.get("return")?.trim() || (editHash ? `/e/${editHash}` : "/");
        if (!googleConfigured()) {
          return Response.redirect(`${returnTo}?google=missing`, 302);
        }
        if (editHash.length < 8) return new Response("Missing album", { status: 400 });
        const authUrl = googleAuthUrl(request, editHash, returnTo);
        if (!authUrl) return new Response("Google is not configured", { status: 500 });
        return Response.redirect(authUrl, 302);
      },
    },
  },
});
