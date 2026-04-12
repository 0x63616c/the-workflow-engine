import { ClockStateCarousel } from "@/components/art-clock/clock-state-carousel";
import { getExpandedView } from "@/components/hub/card-registry";
import { useBuildHash } from "@/hooks/use-build-hash";
import { useSwipe } from "@/hooks/use-swipe";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CONTROLS_VISIBLE_DURATION_MS = 1000;
const CONTROLS_FADE_DURATION_MS = 300;

function ClockOverlay() {
  const contractCard = useCardExpansionStore((s) => s.contractCard);
  const contentRef = useRef<HTMLDivElement>(null);
  const [controlsVisible, setControlsVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: buildData } = useBuildHash();

  const swipeHandlers = useMemo(() => ({ onSwipeDown: contractCard }), [contractCard]);
  useSwipe(contentRef, swipeHandlers, { enabled: true });

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(
      () => setControlsVisible(false),
      CONTROLS_VISIBLE_DURATION_MS,
    );
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: tap to show controls
    <div
      data-testid="card-overlay"
      className="fixed inset-0 z-50 bg-background"
      onClick={showControls}
    >
      <div ref={contentRef} data-testid="card-overlay-content" className="h-full w-full relative">
        <ClockStateCarousel controlsVisible={controlsVisible} />
        <button
          type="button"
          data-testid="clock-dismiss"
          onClick={contractCard}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          style={{
            opacity: controlsVisible ? 1 : 0,
            transition: `opacity ${CONTROLS_FADE_DURATION_MS}ms ease`,
            pointerEvents: controlsVisible ? "auto" : "none",
          }}
        >
          <X className="w-5 h-5 text-white/60" />
        </button>
        {buildData?.hash && (
          <span className="absolute bottom-2 right-3 z-20 font-mono text-xs text-white/30">
            (#{buildData.hash})
          </span>
        )}
      </div>
    </div>
  );
}

export function CardOverlay() {
  const expandedCardId = useCardExpansionStore((s) => s.expandedCardId);
  const contractCard = useCardExpansionStore((s) => s.contractCard);
  const contentRef = useRef<HTMLDivElement>(null);

  const swipeHandlers = useMemo(() => ({ onSwipeDown: contractCard }), [contractCard]);
  useSwipe(contentRef, swipeHandlers, { enabled: expandedCardId !== null });

  if (!expandedCardId) return null;

  if (expandedCardId === "clock") {
    return <ClockOverlay />;
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
