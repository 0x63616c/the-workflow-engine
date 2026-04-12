import { ArtClock } from "@/components/art-clock/art-clock";
import { CountdownCardExpanded } from "@/components/hub/countdown-card";
import { useSwipe } from "@/hooks/use-swipe";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { useRef } from "react";

function ExpandedWeather() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-light text-foreground mb-4">Weather</h2>
      <p className="text-muted-foreground">Detailed weather view</p>
    </div>
  );
}

function ExpandedLights() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-light text-foreground mb-4">Lights</h2>
      <p className="text-muted-foreground">Light controls</p>
    </div>
  );
}

function ExpandedMusic() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-light text-foreground mb-4">Music</h2>
      <p className="text-muted-foreground">Music controls</p>
    </div>
  );
}

function ExpandedCalendar() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-light text-foreground mb-4">Calendar</h2>
      <p className="text-muted-foreground">Calendar events</p>
    </div>
  );
}

const EXPANDED_VIEWS: Record<string, () => React.JSX.Element> = {
  weather: ExpandedWeather,
  countdown: CountdownCardExpanded,
  lights: ExpandedLights,
  music: ExpandedMusic,
  calendar: ExpandedCalendar,
};

export function CardOverlay() {
  const expandedCardId = useCardExpansionStore((s) => s.expandedCardId);
  const contractCard = useCardExpansionStore((s) => s.contractCard);
  const contentRef = useRef<HTMLDivElement>(null);

  useSwipe(contentRef, { onSwipeDown: contractCard }, { enabled: expandedCardId !== null });

  if (!expandedCardId) return null;

  const isClock = expandedCardId === "clock";

  if (isClock) {
    return (
      <div data-testid="card-overlay" className="fixed inset-0 z-50 bg-background">
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: tap to dismiss clock overlay */}
        <div
          ref={contentRef}
          data-testid="card-overlay-content"
          className="h-full w-full"
          onClick={contractCard}
        >
          <ArtClock />
        </div>
      </div>
    );
  }

  const ExpandedView = EXPANDED_VIEWS[expandedCardId];

  return (
    <div data-testid="card-overlay" className="fixed inset-0 z-50">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: tap backdrop to dismiss */}
      <div
        data-testid="card-overlay-backdrop"
        className="absolute inset-0 bg-black/50 transition-opacity duration-200"
        onClick={contractCard}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          ref={contentRef}
          data-testid="card-overlay-content"
          className="w-[90%] h-[90%] bg-card rounded-2xl border pointer-events-auto overflow-auto transition-all duration-300 ease-out"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          {ExpandedView ? <ExpandedView /> : null}
        </div>
      </div>
    </div>
  );
}
