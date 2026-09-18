import { createFileRoute } from "@tanstack/react-router";
import { AlbumPage } from "@/components/scrapbook/AlbumPage";
import { OwnerGate } from "@/components/scrapbook/OwnerGate";
import { FEATURED_EDIT_HASH, FEATURED_SLUG } from "@/lib/album/featured";

export const Route = createFileRoute("/portugal-urlaub/edit")({
  component: FeaturedEdit,
});

function FeaturedEdit() {
  return (
    <OwnerGate hash={FEATURED_EDIT_HASH}>
      {(editHash) => <AlbumPage mode="edit" publicHash={FEATURED_SLUG} editHash={editHash} />}
    </OwnerGate>
  );
}
