import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/t/$hash/edit")({
  component: () => <Outlet />,
});
