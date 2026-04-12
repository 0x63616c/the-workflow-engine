import { ClockStateCarousel } from "@/components/art-clock/clock-state-carousel";
import { WidgetGrid } from "@/components/hub/widget-grid";
import { SonosPanel } from "@/components/sonos/sonos-panel";
import { useNavigationStore } from "@/stores/navigation-store";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const view = useNavigationStore((s) => s.view);
  const setView = useNavigationStore((s) => s.setView);
  const isHub = view === "hub";
  const isSonos = view === "sonos";

  return (
    <div className="relative h-full">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: tap-to-open hub from clock */}
      <div
        data-testid="clock-layer"
        className="absolute inset-0 transition-opacity duration-100 ease-out"
        style={{
          opacity: isHub || isSonos ? 0 : 1,
          pointerEvents: isHub || isSonos ? "none" : "auto",
        }}
        onClick={() => setView("hub")}
      >
        <ClockStateCarousel />
      </div>

      <div
        data-testid="hub-layer"
        className="absolute inset-0 transition-opacity duration-100 ease-out"
        style={{
          opacity: isHub ? 1 : 0,
          pointerEvents: isHub ? "auto" : "none",
        }}
      >
        <WidgetGrid />
      </div>

      <div
        data-testid="sonos-layer"
        className="absolute inset-0 transition-opacity duration-100 ease-out"
        style={{
          opacity: isSonos ? 1 : 0,
          pointerEvents: isSonos ? "auto" : "none",
        }}
      >
        <SonosPanel />
      </div>
    </div>
  );
}
