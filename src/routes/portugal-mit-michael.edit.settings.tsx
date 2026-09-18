import { createFileRoute } from "@tanstack/react-router";
import { AlbumSettings } from "@/components/scrapbook/AlbumSettings";
import { OwnerGate } from "@/components/scrapbook/OwnerGate";
import { PRIVATE_EDIT_HASH } from "@/lib/album/featured";

export const Route = createFileRoute("/portugal-mit-michael/edit/settings")({
  component: PrivateSettings,
});

function PrivateSettings() {
  return <OwnerGate hash={PRIVATE_EDIT_HASH}>{(editHash) => <AlbumSettings editHash={editHash} />}</OwnerGate>;
}
