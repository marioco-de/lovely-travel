import { createFileRoute } from "@tanstack/react-router";
import { AlbumSettings } from "@/components/scrapbook/AlbumSettings";
import { OwnerGate } from "@/components/scrapbook/OwnerGate";
import { FEATURED_EDIT_HASH } from "@/lib/album/featured";

export const Route = createFileRoute("/portugal-urlaub/settings")({
  component: FeaturedSettings,
});

function FeaturedSettings() {
  return <OwnerGate hash={FEATURED_EDIT_HASH}>{(editHash) => <AlbumSettings editHash={editHash} />}</OwnerGate>;
}
