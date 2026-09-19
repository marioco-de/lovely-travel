import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/portugal-urlaub/edit/settings")({
  beforeLoad: () => {
    throw redirect({ to: "/portugal-urlaub/settings" });
  },
  component: () => null,
});
