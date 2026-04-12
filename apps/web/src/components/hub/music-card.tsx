import { BentoCard } from "@/components/hub/bento-card";
import { useSonos } from "@/hooks/use-sonos";
import { useNavigationStore } from "@/stores/navigation-store";
import { Pause, Play } from "lucide-react";

function EqualizerBars({ active }: { active: boolean }) {
  const barHeights = [60, 100, 40, 80];

  return (
    <div className="flex items-end gap-0.5 h-4">
      {barHeights.map((height, i) => (
        <div
          key={height}
          className={`
            w-[3px] rounded-full bg-accent transition-all
            ${active ? "animate-[equalizer_1s_ease-in-out_infinite]" : ""}
          `}
          style={{
            height: active ? undefined : "3px",
            animationDelay: active ? `${i * 0.15}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}

export function MusicCard() {
  const { activeSpeaker, players, isError, sendCommand } = useSonos();
  const setView = useNavigationStore((s) => s.setView);

  const isPlaying = activeSpeaker?.state === "playing";
  const track = activeSpeaker?.attributes.mediaTitle;
  const artist = activeSpeaker?.attributes.mediaArtist;

  return (
    <BentoCard testId="widget-card-music" gridArea="music" onClick={() => setView("sonos")}>
      <div className="flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Music</div>
            <EqualizerBars active={isPlaying} />
          </div>
          {isError ? (
            <div className="text-sm text-muted-foreground/50">Unavailable</div>
          ) : players.length === 0 ? (
            <div className="text-sm text-muted-foreground/50">No speakers</div>
          ) : (
            <>
              <div className="text-sm text-foreground truncate">{track ?? "Not playing"}</div>
              {artist && (
                <div className="text-xs text-muted-foreground/70 mt-0.5 truncate">{artist}</div>
              )}
            </>
          )}
        </div>
        {activeSpeaker && !isError && (
          <div className="flex justify-end mt-2">
            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={(e) => {
                e.stopPropagation();
                sendCommand(activeSpeaker.entityId, isPlaying ? "pause" : "play");
              }}
            >
              {isPlaying ? (
                <Pause size={14} className="text-muted-foreground" />
              ) : (
                <Play size={14} className="text-muted-foreground" />
              )}
            </button>
          </div>
        )}
      </div>
    </BentoCard>
  );
}
