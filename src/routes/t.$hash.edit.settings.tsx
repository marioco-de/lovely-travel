import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/t/$hash/edit/settings")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/t/$hash/settings", params: { hash: params.hash } });
  },
  component: () => null,
});
