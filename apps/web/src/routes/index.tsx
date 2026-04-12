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
  const isHub = view === "hub";

  return (
    <div className="relative h-full">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: tap-to-open hub from clock */}
      <div
        data-testid="clock-layer"
        className="absolute inset-0 transition-opacity duration-200 ease-out"
        style={{
          opacity: isHub ? 0 : 1,
          pointerEvents: isHub ? "none" : "auto",
        }}
        onClick={() => setView("hub")}
      >
        <ArtClock />
      </div>

      <div
        data-testid="hub-layer"
        className="absolute inset-0 transition-opacity duration-200 ease-out"
        style={{
          opacity: isHub ? 1 : 0,
          pointerEvents: isHub ? "auto" : "none",
        }}
      >
        <WidgetGrid />
      </div>
    </div>
  );
}
