import { createFileRoute } from "@tanstack/react-router";
import { AlbumSettings } from "@/components/scrapbook/AlbumSettings";
import { OwnerGate } from "@/components/scrapbook/OwnerGate";

export const Route = createFileRoute("/t/$hash/settings")({
  component: PublicSettings,
});

function PublicSettings() {
  const { hash } = Route.useParams();
  return <OwnerGate hash={hash}>{(editHash) => <AlbumSettings editHash={editHash} />}</OwnerGate>;
}
