import { SonosAlbumArt } from "@/components/sonos/sonos-album-art";
import { SonosControls } from "@/components/sonos/sonos-controls";
import { SonosProgressBar } from "@/components/sonos/sonos-progress-bar";
import { SonosSpeakerList } from "@/components/sonos/sonos-speaker-list";
import { useSonos } from "@/hooks/use-sonos";
import { useSwipe } from "@/hooks/use-swipe";
import { useNavigationStore } from "@/stores/navigation-store";
import { ChevronLeft } from "lucide-react";
import { useRef } from "react";

export function SonosPanel() {
  const { activeSpeaker, players, sendCommand, setVolume } = useSonos();
  const setView = useNavigationStore((s) => s.setView);
  const panelRef = useRef<HTMLDivElement>(null);

  useSwipe(panelRef, { onSwipeLeft: () => setView("hub") });

  return (
    <div
      ref={panelRef}
      className="relative h-full bg-background flex flex-col px-8 pt-6 pb-8 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          type="button"
          aria-label="Back"
          onClick={() => setView("hub")}
          className="text-white/60 active:text-white"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-sm text-muted-foreground">Music</span>
        <div className="w-6" />
      </div>

      {!activeSpeaker ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground/50">
          No speakers discovered
        </div>
      ) : (
        <>
          {/* Album Art */}
          <div className="flex justify-center mb-8">
            <SonosAlbumArt albumArtUrl={activeSpeaker.attributes.albumArtUrl} />
          </div>

          {/* Track Info */}
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

          {/* Progress Bar */}
          <div className="mb-8">
            <SonosProgressBar
              mediaPosition={activeSpeaker.attributes.mediaPosition}
              mediaDuration={activeSpeaker.attributes.mediaDuration}
              mediaPositionUpdatedAt={activeSpeaker.attributes.mediaPositionUpdatedAt}
              isPlaying={activeSpeaker.state === "playing"}
            />
          </div>

          {/* Controls */}
          <div className="mb-10">
            <SonosControls
              entityId={activeSpeaker.entityId}
              isPlaying={activeSpeaker.state === "playing"}
              shuffle={activeSpeaker.attributes.shuffle}
              repeat={activeSpeaker.attributes.repeat}
              sendCommand={sendCommand}
            />
          </div>

          {/* Speaker List */}
          <div className="border-t border-white/5 pt-6">
            <SonosSpeakerList players={players} setVolume={setVolume} />
          </div>
        </>
      )}
    </div>
  );
}
