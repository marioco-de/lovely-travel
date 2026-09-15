import { createFileRoute } from "@tanstack/react-router";
import { AlbumSettings } from "@/components/scrapbook/AlbumSettings";

export const Route = createFileRoute("/s/$hash")({
  component: SettingsTrip,
});

function SettingsTrip() {
  const { hash } = Route.useParams();
  return <AlbumSettings editHash={hash} />;
}
