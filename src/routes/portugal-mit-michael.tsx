import { Outlet, createFileRoute } from "@tanstack/react-router";
import { PRIVATE_SLUG } from "@/lib/album/featured";
import { ensurePrivateTrip } from "@/lib/album/trips";

export const Route = createFileRoute("/portugal-mit-michael")({
  loader: async () => {
    try {
      return await ensurePrivateTrip();
    } catch {
      return { publicHash: PRIVATE_SLUG };
    }
  },
  component: () => <Outlet />,
});
