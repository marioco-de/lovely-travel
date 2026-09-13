import { createFileRoute } from "@tanstack/react-router";
import { HomeLanding } from "@/components/scrapbook/HomeLanding";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <HomeLanding />;
}
