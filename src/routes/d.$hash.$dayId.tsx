import { createFileRoute } from "@tanstack/react-router";
import { DayAlbumPage } from "@/components/scrapbook/DayAlbumPage";

export const Route = createFileRoute("/d/$hash/$dayId")({
  component: DayAlbumRoute,
});

function DayAlbumRoute() {
  const { hash, dayId } = Route.useParams();
  return <DayAlbumPage publicHash={hash} dayId={dayId} />;
}
