import { createFileRoute } from "@tanstack/react-router";
import { AlbumPage } from "@/components/scrapbook/AlbumPage";
import { FEATURED_SLUG } from "@/lib/album/featured";
import { ensureFeaturedTrip } from "@/lib/album/trips";

export const Route = createFileRoute("/portugal-mit-michael")({
  loader: async () => {
    try {
      return await ensureFeaturedTrip();
    } catch {
      return { publicHash: FEATURED_SLUG };
    }
  },
  component: FeaturedAlbum,
});

function FeaturedAlbum() {
  return <AlbumPage mode="view" publicHash={FEATURED_SLUG} />;
}
