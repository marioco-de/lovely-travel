import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/portugal-mit-michael/edit/settings")({
  beforeLoad: () => {
    throw redirect({ to: "/portugal-mit-michael/settings" });
  },
  component: () => null,
});
