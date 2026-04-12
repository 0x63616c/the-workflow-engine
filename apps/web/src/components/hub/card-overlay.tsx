import { ClockStateCarousel } from "@/components/art-clock/clock-state-carousel";
import { getExpandedView } from "@/components/hub/card-registry";
import { useSwipe } from "@/hooks/use-swipe";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { X } from "lucide-react";
import { useCallback, useMemo, useRef } from "react";

export function CardOverlay() {
  const expandedCardId = useCardExpansionStore((s) => s.expandedCardId);
  const contractCard = useCardExpansionStore((s) => s.contractCard);
  const contentRef = useRef<HTMLDivElement>(null);

  const swipeHandlers = useMemo(() => ({ onSwipeDown: contractCard }), [contractCard]);
  useSwipe(contentRef, swipeHandlers, { enabled: expandedCardId !== null });

  const handleClockTap = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        contractCard();
      }
    },
    [contractCard],
  );

  if (!expandedCardId) return null;

  const isClock = expandedCardId === "clock";

  if (isClock) {
    return (
      <div data-testid="card-overlay" className="fixed inset-0 z-50 bg-background">
        <div ref={contentRef} data-testid="card-overlay-content" className="h-full w-full relative">
          <ClockStateCarousel />
          <button
            type="button"
            data-testid="clock-dismiss"
            onClick={contractCard}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>
      </div>
    );
  }

  const ExpandedView = getExpandedView(expandedCardId);

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
