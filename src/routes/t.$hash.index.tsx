import { createFileRoute } from "@tanstack/react-router";
import { AlbumPage } from "@/components/scrapbook/AlbumPage";

export const Route = createFileRoute("/t/$hash/")({
  component: PublicTrip,
});

function PublicTrip() {
  const { hash } = Route.useParams();
  return <AlbumPage mode="view" publicHash={hash} />;
}
