import { WidgetGrid } from "@/components/hub/widget-grid";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="relative min-h-full">
      <WidgetGrid />
    </div>
  );
}
