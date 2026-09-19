import { createFileRoute } from "@tanstack/react-router";
import { AlbumPage } from "@/components/scrapbook/AlbumPage";
import { FEATURED_SLUG } from "@/lib/album/featured";

export const Route = createFileRoute("/portugal-urlaub/")({
  component: DemoAlbum,
});

function DemoAlbum() {
  return <AlbumPage mode="view" publicHash={FEATURED_SLUG} />;
}
