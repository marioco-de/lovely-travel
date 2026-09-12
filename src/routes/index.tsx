import { createFileRoute } from "@tanstack/react-router";
import { AlbumPage } from "@/components/scrapbook/AlbumPage";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <AlbumPage />;
}
