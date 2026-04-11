import { ArtClock } from "@/components/art-clock/art-clock";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return <ArtClock />;
}
