import { ClockStateCarousel } from "@/components/art-clock/clock-state-carousel";
import { getExpandedView } from "@/components/hub/card-registry";
import { useBuildHash } from "@/hooks/use-build-hash";
import { useSwipe } from "@/hooks/use-swipe";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CONTROLS_VISIBLE_DURATION_MS = 1000;
const CONTROLS_FADE_DURATION_MS = 300;
const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;
const BACKDROP_TRANSITION = { duration: 0.2, ease: "easeOut" } as const;
const CONTENT_TRANSITION = { ...SPRING } as const;
const CLOSE_BUTTON_TRANSITION = { delay: 0.15, duration: 0.15 } as const;

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
    <motion.div
      key="clock-overlay"
      data-testid="card-overlay"
      className="fixed inset-0 z-50 bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={BACKDROP_TRANSITION}
      // biome-ignore lint/a11y/useKeyWithClickEvents: tap to show controls
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
    </motion.div>
  );
}

export function CardOverlay() {
  const expandedCardId = useCardExpansionStore((s) => s.expandedCardId);
  const contractCard = useCardExpansionStore((s) => s.contractCard);
  const contentRef = useRef<HTMLDivElement>(null);

  const swipeHandlers = useMemo(() => ({ onSwipeDown: contractCard }), [contractCard]);
  useSwipe(contentRef, swipeHandlers, { enabled: expandedCardId !== null });

  const isClock = expandedCardId === "clock";

  return (
    <AnimatePresence>
      {expandedCardId &&
        (isClock ? (
          <ClockOverlay />
        ) : (
          <motion.div
            key="card-overlay"
            data-testid="card-overlay"
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={BACKDROP_TRANSITION}
          >
            <motion.div
              data-testid="card-overlay-backdrop"
              className="absolute inset-0 bg-black/50"
              onClick={contractCard}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={BACKDROP_TRANSITION}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                ref={contentRef}
                data-testid="card-overlay-content"
                className="w-[90%] h-[90%] bg-card rounded-2xl border pointer-events-auto overflow-auto"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
                initial={{ scale: 0.92, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 16 }}
                transition={CONTENT_TRANSITION}
              >
                {(() => {
                  const ExpandedView = getExpandedView(expandedCardId);
                  return ExpandedView ? (
                    <motion.div
                      className="h-full"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: 0.1, duration: 0.15 }}
                    >
                      <ExpandedView />
                    </motion.div>
                  ) : null;
                })()}
              </motion.div>
            </div>
          </motion.div>
        ))}
    </AnimatePresence>
  );
}
