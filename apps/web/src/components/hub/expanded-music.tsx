import { SonosAlbumArt } from "@/components/sonos/sonos-album-art";
import { SonosControls } from "@/components/sonos/sonos-controls";
import { SonosProgressBar } from "@/components/sonos/sonos-progress-bar";
import { SonosSpeakerList } from "@/components/sonos/sonos-speaker-list";
import { useSonos } from "@/hooks/use-sonos";

export function ExpandedMusic() {
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
