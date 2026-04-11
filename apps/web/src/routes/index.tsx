import { ArtClock } from "@/components/art-clock/art-clock";
import { WidgetGrid } from "@/components/hub/widget-grid";
import { useDragToDismiss } from "@/hooks/use-drag-to-dismiss";
import { useNavigationStore } from "@/stores/navigation-store";
import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const view = useNavigationStore((s) => s.view);
  const setView = useNavigationStore((s) => s.setView);
  const isHub = view === "hub";
  const hubRef = useRef<HTMLDivElement>(null);

  useDragToDismiss(hubRef, {
    enabled: isHub,
    onDismiss: () => setView("clock"),
  });

  return (
    <div className="relative h-full overflow-hidden">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: tap-to-open hub from clock */}
      <div
        data-testid="clock-layer"
        className="absolute inset-0"
        style={{
          pointerEvents: isHub ? "none" : "auto",
        }}
        onClick={() => setView("hub")}
      >
        <ArtClock />
      </div>

      <div
        ref={hubRef}
        data-testid="hub-layer"
        className="absolute inset-0 bg-background transition-transform duration-300 ease-out"
        style={{
          transform: isHub ? "translateX(0)" : "translateX(100%)",
          pointerEvents: isHub ? "auto" : "none",
        }}
      >
        <WidgetGrid />
      </div>
    </div>
  );
}
