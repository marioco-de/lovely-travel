import { createFileRoute } from "@tanstack/react-router";
import { readAlbumPhoto } from "@/lib/album/photo-store";

export const Route = createFileRoute("/media/$hash/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const fromParams = params as { hash?: string; id?: string };
        const parts = new URL(request.url).pathname.split("/").filter(Boolean);
        const hash = decodeURIComponent(fromParams.hash || parts[1] || "");
        const id = decodeURIComponent(fromParams.id || parts[2] || "");
        if (!hash || !id) return new Response("Not found", { status: 404 });
        const row = await readAlbumPhoto(hash, id);
        if (!row) return new Response("Not found", { status: 404 });
        if (row.url && /^https?:\/\//.test(row.url)) {
          return Response.redirect(row.url, 302);
        }
        const body = row.bytes instanceof Uint8Array ? row.bytes : new Uint8Array(row.bytes);
        if (!body.length) return new Response("Not found", { status: 404 });
        return new Response(Buffer.from(body), {
          headers: {
            "Content-Type": row.mime || "image/jpeg",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
