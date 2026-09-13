import { createFileRoute } from "@tanstack/react-router";
import { AlbumPage } from "@/components/scrapbook/AlbumPage";

export const Route = createFileRoute("/e/$hash")({
  component: EditTrip,
});

function EditTrip() {
  const { hash } = Route.useParams();
  return <AlbumPage mode="edit" editHash={hash} />;
}
