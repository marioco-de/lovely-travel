import { createFileRoute } from "@tanstack/react-router";
import { AlbumPage } from "@/components/scrapbook/AlbumPage";
import { OwnerGate } from "@/components/scrapbook/OwnerGate";

export const Route = createFileRoute("/t/$hash/edit/")({
  component: PublicEdit,
});

function PublicEdit() {
  const { hash } = Route.useParams();
  return (
    <OwnerGate hash={hash}>
      {(editHash) => <AlbumPage mode="edit" publicHash={hash} editHash={editHash} />}
    </OwnerGate>
  );
}
