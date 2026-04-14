import { ClockStateCarousel } from "@/components/art-clock/clock-state-carousel";
import { getCardConfig } from "@/components/hub/card-registry";
import { CountdownCardExpanded } from "@/components/hub/countdown-card";
import { ExpandedStocks } from "@/components/hub/expanded-stocks";
import { ExpandedWeather } from "@/components/hub/expanded-weather";
import { SettingsCardExpanded } from "@/components/hub/settings-card";
import { SonosAlbumArt } from "@/components/sonos/sonos-album-art";
import { SonosControls } from "@/components/sonos/sonos-controls";
import { SonosProgressBar } from "@/components/sonos/sonos-progress-bar";
import { SonosSpeakerList } from "@/components/sonos/sonos-speaker-list";
import { useLights } from "@/hooks/use-lights";
import { useSonos } from "@/hooks/use-sonos";
import { useSwipe } from "@/hooks/use-swipe";
import { cardColorVar } from "@/lib/palette";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useRef } from "react";

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;
const BACKDROP_TRANSITION = { duration: 0.2, ease: "easeOut" } as const;
const CONTENT_TRANSITION = { ...SPRING } as const;

function ExpandedLights() {
  const { onCount, totalCount, isLoading, isError, turnOn, turnOff } = useLights();

  const disabled = isLoading || isError;
  const statusText = isLoading
    ? "Loading..."
    : isError
      ? "Unavailable"
      : `${onCount} of ${totalCount} on`;

  return (
    <div className="p-6">
      <h2 className="text-xl font-light text-foreground mb-4">Lights</h2>
      <p className="text-muted-foreground mb-6">{statusText}</p>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => turnOn()}
          className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-sm disabled:opacity-40"
        >
          All On
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => turnOff()}
          className="px-4 py-2 rounded-lg bg-foreground/10 text-muted-foreground text-sm disabled:opacity-40"
        >
          All Off
        </button>
      </div>
    </div>
  );
}

function ExpandedMusic() {
  const { activeSpeaker, players, sendCommand, setVolume } = useSonos();

  return (
    <div className="flex flex-col px-8 pt-6 pb-8 overflow-y-auto h-full">
      {!activeSpeaker ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground/50">
          No speakers discovered
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-8">
            <SonosAlbumArt albumArtUrl={activeSpeaker.attributes.albumArtUrl} />
          </div>
          <div className="text-center mb-6">
            <div className="text-xl font-medium text-foreground truncate">
              {activeSpeaker.attributes.mediaTitle ?? "Unknown"}
            </div>
            {activeSpeaker.attributes.mediaArtist && (
              <div className="text-sm text-muted-foreground mt-1 truncate">
                {activeSpeaker.attributes.mediaArtist}
              </div>
            )}
          </div>
          <div className="mb-8">
            <SonosProgressBar
              mediaPosition={activeSpeaker.attributes.mediaPosition}
              mediaDuration={activeSpeaker.attributes.mediaDuration}
              mediaPositionUpdatedAt={activeSpeaker.attributes.mediaPositionUpdatedAt}
              isPlaying={activeSpeaker.state === "playing"}
            />
          </div>
          <div className="mb-10">
            <SonosControls
              entityId={activeSpeaker.entityId}
              isPlaying={activeSpeaker.state === "playing"}
              shuffle={activeSpeaker.attributes.shuffle}
              repeat={activeSpeaker.attributes.repeat}
              sendCommand={sendCommand}
            />
          </div>
          <div className="border-t border-border pt-6">
            <SonosSpeakerList players={players} setVolume={setVolume} />
          </div>
        </>
      )}
    </div>
  );
}

const EXPANDED_VIEWS: Record<string, () => React.JSX.Element> = {
  countdown: CountdownCardExpanded,
  lights: ExpandedLights,
  music: ExpandedMusic,
  settings: SettingsCardExpanded,
  weather: ExpandedWeather,
  stocks: ExpandedStocks,
};

export function CardOverlay() {
  const expandedCardId = useCardExpansionStore((s) => s.expandedCardId);
  const contractCard = useCardExpansionStore((s) => s.contractCard);
  const contentRef = useRef<HTMLDivElement>(null);

  const swipeHandlers = useMemo(() => ({ onSwipeDown: contractCard }), [contractCard]);
  useSwipe(contentRef, swipeHandlers, { enabled: expandedCardId !== null });

  const handleDismiss = useCallback(() => {
    contractCard();
  }, [contractCard]);

  const isClock = expandedCardId === "clock";
  const cardConfig = expandedCardId ? getCardConfig(expandedCardId) : undefined;
  const paletteColor = cardConfig?.colorScheme.color;

  return (
    <AnimatePresence>
      {expandedCardId &&
        (isClock ? (
          <motion.div
            key="clock-overlay"
            data-testid="card-overlay"
            className="absolute inset-0 z-50 bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={BACKDROP_TRANSITION}
          >
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: full-screen clock tap to dismiss */}
            <div
              ref={contentRef}
              data-testid="card-overlay-content"
              className="h-full w-full relative"
              onClick={handleDismiss}
            >
              <ClockStateCarousel controlsVisible={true} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="card-overlay"
            data-testid="card-overlay"
            className="absolute inset-0 z-50"
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
                style={{
                  borderColor: paletteColor
                    ? cardColorVar(paletteColor, "border")
                    : "color-mix(in srgb, var(--color-foreground) 8%, transparent)",
                  backgroundColor: paletteColor ? cardColorVar(paletteColor, "tint") : undefined,
                }}
                initial={{ scale: 0.92, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 16 }}
                transition={CONTENT_TRANSITION}
              >
                {EXPANDED_VIEWS[expandedCardId] ? (
                  <motion.div
                    className="h-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.1, duration: 0.15 }}
                  >
                    {(() => {
                      const ExpandedView = EXPANDED_VIEWS[expandedCardId];
                      return <ExpandedView />;
                    })()}
                  </motion.div>
                ) : null}
              </motion.div>
            </div>
          </motion.div>
        ))}
    </AnimatePresence>
  );
}
