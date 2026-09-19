import { createFileRoute } from "@tanstack/react-router";
import { AlbumPage } from "@/components/scrapbook/AlbumPage";
import { PRIVATE_SLUG } from "@/lib/album/featured";

export const Route = createFileRoute("/portugal-mit-michael/")({
  component: PrivateAlbum,
});

function PrivateAlbum() {
  return <AlbumPage mode="view" publicHash={PRIVATE_SLUG} />;
}
