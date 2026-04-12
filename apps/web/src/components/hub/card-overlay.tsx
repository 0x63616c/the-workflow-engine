import { ClockStateCarousel } from "@/components/art-clock/clock-state-carousel";
import { CountdownCardExpanded } from "@/components/hub/countdown-card";
import { SonosAlbumArt } from "@/components/sonos/sonos-album-art";
import { SonosControls } from "@/components/sonos/sonos-controls";
import { SonosProgressBar } from "@/components/sonos/sonos-progress-bar";
import { SonosSpeakerList } from "@/components/sonos/sonos-speaker-list";
import { TimerPanel } from "@/components/timer/timer-panel";
import { useBuildHash } from "@/hooks/use-build-hash";
import { useLights } from "@/hooks/use-lights";
import { useSonos } from "@/hooks/use-sonos";
import { useSwipe } from "@/hooks/use-swipe";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CONTROLS_VISIBLE_DURATION_MS = 1000;
const CONTROLS_FADE_DURATION_MS = 300;

function ExpandedWeather() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-light text-foreground mb-4">Weather</h2>
      <p className="text-muted-foreground">Detailed weather view</p>
    </div>
  );
}

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
          className="px-4 py-2 rounded-lg bg-white/10 text-white/60 text-sm disabled:opacity-40"
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
            <div className="text-xl font-medium text-white truncate">
              {activeSpeaker.attributes.mediaTitle ?? "Unknown"}
            </div>
            {activeSpeaker.attributes.mediaArtist && (
              <div className="text-sm text-white/50 mt-1 truncate">
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
          <div className="border-t border-white/5 pt-6">
            <SonosSpeakerList players={players} setVolume={setVolume} />
          </div>
        </>
      )}
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
  timer: TimerPanel,
};

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
