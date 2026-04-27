import { PlaceholderTile } from "@/components/placeholder-tile";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <PlaceholderTile label="Tesla" className="col-span-2 row-span-2 h-96" />
      <PlaceholderTile label="Lights all" className="h-28" />
      <PlaceholderTile label="Music" className="row-span-2 h-full" />
      <PlaceholderTile label="Lights kitchen" className="h-28" />
      <PlaceholderTile label="Wi-Fi" className="row-span-2 h-full" />
      <PlaceholderTile label="Temperature" className="h-44" />
      <PlaceholderTile label="Fan" className="h-44" />
      <PlaceholderTile label="Calendar" className="col-span-2 row-span-2 h-80" />
      <PlaceholderTile label="Cleaning" className="row-span-2 h-80" />
      <PlaceholderTile label="Events" className="row-span-2 h-80" />
      <PlaceholderTile label="Markets" className="col-span-2 h-48" />
      <PlaceholderTile label="Photos" className="col-span-2 h-48" />
    </div>
  );
}
