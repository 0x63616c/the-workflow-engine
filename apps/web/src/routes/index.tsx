import { ArtClock } from "@/components/art-clock/art-clock";
import { WidgetGrid } from "@/components/hub/widget-grid";
import { useNavigationStore } from "@/stores/navigation-store";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const view = useNavigationStore((s) => s.view);
  const setView = useNavigationStore((s) => s.setView);

  return (
    <div className="relative h-full">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: tap-to-open hub from clock */}
      <div
        data-testid="clock-layer"
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: view === "clock" ? 1 : 0,
          pointerEvents: view === "clock" ? "auto" : "none",
        }}
        onClick={() => setView("hub")}
      >
        <ArtClock />
      </div>

      <div
        data-testid="hub-layer"
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: view === "hub" ? 1 : 0,
          pointerEvents: view === "hub" ? "auto" : "none",
        }}
      >
        <WidgetGrid />
      </div>
    </div>
  );
}
