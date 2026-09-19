import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/portugal-urlaub/edit")({
  component: () => <Outlet />,
});
