import { Outlet, createFileRoute } from "@tanstack/react-router";
import { FEATURED_SLUG } from "@/lib/album/featured";
import { ensureFeaturedTrip } from "@/lib/album/trips";

export const Route = createFileRoute("/portugal-urlaub")({
  loader: async () => {
    try {
      return await ensureFeaturedTrip();
    } catch {
      return { publicHash: FEATURED_SLUG };
    }
  },
  component: () => <Outlet />,
});
