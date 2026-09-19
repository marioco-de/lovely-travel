import { createFileRoute } from "@tanstack/react-router";
import { AlbumPage } from "@/components/scrapbook/AlbumPage";
import { OwnerGate } from "@/components/scrapbook/OwnerGate";
import { PRIVATE_EDIT_HASH, PRIVATE_SLUG } from "@/lib/album/featured";

export const Route = createFileRoute("/portugal-mit-michael/edit/")({
  component: PrivateEdit,
});

function PrivateEdit() {
  return (
    <OwnerGate hash={PRIVATE_EDIT_HASH}>
      {(editHash) => <AlbumPage mode="edit" publicHash={PRIVATE_SLUG} editHash={editHash} />}
    </OwnerGate>
  );
}
