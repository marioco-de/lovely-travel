import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/portugal-mit-michael/edit")({
  component: () => <Outlet />,
});
